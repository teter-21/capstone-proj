const nodemailer = require("nodemailer");

/*  GMAIL TRANSPORTER  */

const transporter = nodemailer.createTransport({
  service: "gmail",

  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

/*  VERIFY EMAIL CONNECTION  */

const verifyEmailConnection = async () => {
  try {
    await transporter.verify();

    console.log("Email service connected successfully.");
  } catch (error) {
    console.error("Email service connection failed:");

    console.error(error.message);
  }
};

/*  BASE EMAIL STYLE  */

const emailTemplate = (title, message, details) => {
  return `

<!DOCTYPE html>

<html>

<head>

<meta charset="UTF-8">

<title>Magno Dental Clinic</title>

</head>


<body
style="
margin:0;
padding:0;
background:#f4f7fb;
font-family:Arial,Helvetica,sans-serif;
"
>


<table
width="100%"
cellpadding="0"
cellspacing="0"
style="padding:30px 10px;"
>

<tr>

<td align="center">


<table
width="600"
cellpadding="0"
cellspacing="0"
style="
max-width:600px;
background:#ffffff;
border-radius:12px;
overflow:hidden;
"
>


<!-- HEADER -->

<tr>

<td
style="
background:#2563eb;
padding:25px;
text-align:center;
color:white;
"
>

<h2
style="
margin:0;
font-size:22px;
"
>

Magno Dental Clinic

</h2>

<p
style="
margin:6px 0 0;
font-size:12px;
opacity:.9;
"
>

Appointment Notification

</p>

</td>

</tr>


<!-- CONTENT -->

<tr>

<td
style="
padding:30px;
color:#334155;
"
>

<h2
style="
margin-top:0;
color:#0f172a;
"
>

${title}

</h2>


<p
style="
font-size:14px;
line-height:1.7;
"
>

${message}

</p>


${details}


<p
style="
margin-top:30px;
font-size:13px;
color:#64748b;
line-height:1.6;
"
>

If you have any questions, please contact
<u>magno.dental2026@gmail.com</u> <br>
<u>0909090909090</u>

</p>

</td>

</tr>


<!-- FOOTER -->

<tr>

<td
style="
background:#f8fafc;
padding:18px;
text-align:center;
font-size:11px;
color:#94a3b8;
"
>

Magno Dental Clinic<br>

Parañaque City

</td>

</tr>


</table>

</td>

</tr>

</table>

</body>

</html>

`;
};

/*  EMAIL DATE / TIME FORMAT  */

/* Keep database dates and times unchanged; only format them for email display. */
const formatEmailDate = (value) => {
  if (!value) return "—";

  const text = String(value).trim();
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})/);

  if (!match) return text;

  const [, year, month, day] = match;
  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sept",
    "Oct",
    "Nov",
    "Dec",
  ];

  return `${monthNames[Number(month) - 1] || month}-${day}-${year}`;
};

const formatEmailTime = (value) => {
  if (!value) return "—";

  const text = String(value).trim();
  const match = text.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?/);

  if (!match) return text;

  let hours = Number(match[1]);
  const minutes = match[2];
  const period = hours >= 12 ? "PM" : "AM";

  hours = hours % 12 || 12;

  return `${hours}:${minutes} ${period}`;
};

/*  APPOINTMENT DETAILS  */

const appointmentDetails = (appointment) => {
  return `

<table
width="100%"
cellpadding="0"
cellspacing="0"
style="
background:#f8fafc;
border-radius:8px;
padding:15px;
"
>

<tr>

<td
style="
padding:7px 0;
font-size:13px;
color:#64748b;
"
>

<strong>Patient:</strong>

</td>

<td
style="
padding:7px 0;
font-size:13px;
color:#0f172a;
"
>

${appointment.fullname}

</td>

</tr>


<tr>

<td
style="
padding:7px 0;
font-size:13px;
color:#64748b;
"
>

<strong>Date:</strong>

</td>

<td
style="
padding:7px 0;
font-size:13px;
color:#0f172a;
"
>

${formatEmailDate(appointment.preferred_date)}

</td>

</tr>


<tr>

<td
style="
padding:7px 0;
font-size:13px;
color:#64748b;
"
>

<strong>Time:</strong>

</td>

<td
style="
padding:7px 0;
font-size:13px;
color:#0f172a;
"
>

${formatEmailTime(appointment.preferred_time)}

</td>

</tr>


<tr>

<td
style="
padding:7px 0;
font-size:13px;
color:#64748b;
"
>

<strong>Service:</strong>

</td>

<td
style="
padding:7px 0;
font-size:13px;
color:#0f172a;
"
>

${appointment.service}

</td>

</tr>


</table>

`;
};

/*  SEND APPOINTMENT SUBMITTED EMAIL  */

const sendAppointmentSubmittedEmail = async (appointment) => {
  const details = appointmentDetails(appointment);

  await transporter.sendMail({
    from: `"Magno Dental Clinic" <${process.env.EMAIL_USER}>`,

    to: appointment.email,

    subject: "Appointment Request Received - Magno Dental Clinic",

    html: emailTemplate(
      "Appointment Request Received",

      `
                Hello ${appointment.fullname},
                <br><br>

                Thank you for requesting an
                appointment with Magno Dental Clinic.

                Your appointment request has been
                received and is currently
                <strong>Pending</strong> confirmation.
                `,

      details,
    ),
  });
};

/*  SEND APPROVED EMAIL  */

const sendAppointmentApprovedEmail = async (appointment) => {
  const details = appointmentDetails(appointment);

  await transporter.sendMail({
    from: `"Magno Dental Clinic" <${process.env.EMAIL_USER}>`,

    to: appointment.email,

    subject: "Appointment Approved - Magno Dental Clinic",

    html: emailTemplate(
      "Appointment Approved",

      `
                Hello ${appointment.fullname},
                <br><br>

                Good news! Your appointment with
                Magno Dental Clinic has been
                <strong>approved</strong>.
                <br><br>

                Please arrive a few minutes before
                your scheduled appointment.
                `,

      details,
    ),
  });
};

/*  SEND CANCELLED EMAIL  */

const sendAppointmentCancelledEmail = async (appointment) => {
  const details = appointmentDetails(appointment);

  await transporter.sendMail({
    from: `"Magno Dental Clinic" <${process.env.EMAIL_USER}>`,

    to: appointment.email,

    subject: "Appointment Cancelled - Magno Dental Clinic",

    html: emailTemplate(
      "Appointment Cancelled",

      `
                Hello ${appointment.fullname},
                <br><br>

                We are sorry to inform you that
                your appointment has been
                <strong>cancelled</strong>.
                <br><br>

                Please contact the clinic if you
                would like to request another
                appointment.
                `,

      details,
    ),
  });
};

/*  SEND RESCHEDULED EMAIL  */

const sendAppointmentRescheduledEmail = async (appointment) => {
  const details = appointmentDetails(appointment);

  await transporter.sendMail({
    from: `"Magno Dental Clinic" <${process.env.EMAIL_USER}>`,

    to: appointment.email,

    subject: "Appointment Rescheduled - Magno Dental Clinic",

    html: emailTemplate(
      "Appointment Rescheduled",

      `
                Hello ${appointment.fullname},
                <br><br>

                Your appointment has been
                <strong>rescheduled</strong>.
                <br><br>

                Please check the updated date
                and time below.
                `,

      details,
    ),
  });
};

/* Send the password reset link to the user's email. */
const sendPasswordResetEmail = async (user, resetUrl) => {
  await transporter.sendMail({
    from: `"Magno Dental Clinic" <${process.env.EMAIL_USER}>`,
    to: user.email,
    subject: "Reset Your Password - Magno Dental Clinic",
    html: emailTemplate(
      "Reset Your Password",
      `
            Hello ${user.fullname},
            <br><br>
            We received a request to reset your Magno Dental Clinic account password.
            <br><br>
            <a href="${resetUrl}" style="display:inline-block;padding:12px 20px;background:#4d87c7;color:#fff;text-decoration:none;border-radius:7px;">Reset Password</a>
            <br><br>
            This link will expire in 1 hour. If you did not request this, you can safely ignore this email.
            `,
      "",
    ),
  });
};

/*  EXPORT  */

module.exports = {
  verifyEmailConnection,

  sendAppointmentSubmittedEmail,

  sendAppointmentApprovedEmail,

  sendAppointmentCancelledEmail,

  sendAppointmentRescheduledEmail,

  sendPasswordResetEmail,
};
