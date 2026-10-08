const nodemailer = require("nodemailer");
const provider = () => process.env.EMAIL_PROVIDER || "brevo";
const sender = () => process.env.EMAIL_FROM || process.env.EMAIL_USER;
const emailPattern = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;
let smtp;
const timeout = () =>
  Math.min(
    30000,
    Math.max(1000, Number(process.env.EMAIL_TIMEOUT_MS) || 10000),
  );
function configuration() {
  if (!["brevo", "smtp"].includes(provider()))
    throw new Error("EMAIL_PROVIDER must be brevo or smtp.");
  if (!emailPattern.test(sender() || ""))
    throw new Error("Set EMAIL_FROM to a verified sender address.");
  if (provider() === "brevo" && !process.env.BREVO_API_KEY)
    throw new Error("Set BREVO_API_KEY (API key, not SMTP password).");
  if (
    provider() === "smtp" &&
    (!process.env.EMAIL_USER || !process.env.EMAIL_PASS)
  )
    throw new Error("Set EMAIL_USER and EMAIL_PASS for SMTP.");
}
function smtpTransport() {
  if (!smtp)
    smtp = nodemailer.createTransport({
      service: "gmail",
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
      connectionTimeout: timeout(),
      greetingTimeout: timeout(),
      socketTimeout: timeout(),
    });
  return smtp;
}
async function brevoRequest(path, body) {
  const response = await fetch(`https://api.brevo.com/v3/${path}`, {
    method: body ? "POST" : "GET",
    headers: {
      "api-key": process.env.BREVO_API_KEY,
      "Content-Type": "application/json",
      accept: "application/json",
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(timeout()),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(
      `Brevo rejected the request (HTTP ${response.status}). Check sender verification, API key and email allowance.`,
    );
    error.code = `BREVO_${response.status}`;
    error.retryable = response.status === 429 || response.status >= 500;
    throw error;
  }
  return data;
}
async function sendMail(message) {
  configuration();
  if (!emailPattern.test(message.to || "")) {
    const error = new Error("Invalid recipient address.");
    error.retryable = false;
    throw error;
  }
  const replyTo =
    process.env.EMAIL_REPLY_TO || process.env.EMAIL_USER || sender();
  if (!emailPattern.test(replyTo))
    throw new Error("EMAIL_REPLY_TO must be an email address.");
  if (provider() === "smtp")
    return smtpTransport().sendMail({
      ...message,
      from: {
        name: process.env.EMAIL_FROM_NAME || "Magno Dental Clinic",
        address: sender(),
      },
      replyTo,
    });
  const result = await brevoRequest("smtp/email", {
    sender: {
      name: process.env.EMAIL_FROM_NAME || "Magno Dental Clinic",
      email: sender(),
    },
    to: [{ email: message.to }],
    replyTo: { email: replyTo },
    subject: message.subject,
    htmlContent: message.html,
  });
  if (!result.messageId)
    throw new Error("Email provider did not return a message ID.");
  return { messageId: result.messageId };
}
async function verifyEmailConnection() {
  configuration();
  if (provider() === "smtp") await smtpTransport().verify();
  else await brevoRequest("account");
  console.log(
    `Email provider authenticated: ${provider()} (sender/delivery still requires a real test).`,
  );
}
module.exports = { sendMail, verifyEmailConnection };
