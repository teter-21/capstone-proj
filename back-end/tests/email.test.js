const test = require("node:test");
const assert = require("node:assert/strict");
const vm = require("node:vm");
const fs = require("node:fs");
const path = require("node:path");
function load(file, dependencies, globals = {}) {
  const module = { exports: {} };
  vm.runInNewContext(
    fs.readFileSync(path.join(__dirname, "..", file), "utf8"),
    {
      module,
      exports: module.exports,
      require(name) {
        if (!(name in dependencies)) throw Error(name);
        return dependencies[name];
      },
      console: { log() {}, error() {} },
      ...globals,
    },
  );
  return module.exports;
}
test("Brevo sends over HTTPS with Gmail reply-to and returns acceptance ID", async () => {
  let request;
  const transport = load(
    "services/emailTransport.js",
    {
      nodemailer: {
        createTransport() {
          throw Error("SMTP must not be used");
        },
      },
    },
    {
      process: {
        env: { EMAIL_USER: "clinic@gmail.com", BREVO_API_KEY: "test-api-key" },
      },
      AbortSignal,
      fetch: async (url, options) => {
        request = { url, options };
        return { ok: true, json: async () => ({ messageId: "accepted-1" }) };
      },
    },
  );
  const result = await transport.sendMail({
    to: "patient@gmail.com",
    subject: "Appointment",
    html: "<p>Hello</p>",
  });
  assert.equal(request.url, "https://api.brevo.com/v3/smtp/email");
  const body = JSON.parse(request.options.body);
  assert.equal(body.replyTo.email, "clinic@gmail.com");
  assert.equal(body.to[0].email, "patient@gmail.com");
  assert.equal(result.messageId, "accepted-1");
  assert.equal(request.options.headers["api-key"], "test-api-key");
});
for (const status of [401, 429, 503])
  test(`Brevo ${status} safely classifies retries`, async () => {
    const transport = load(
      "services/emailTransport.js",
      { nodemailer: {} },
      {
        process: {
          env: { EMAIL_FROM: "clinic@gmail.com", BREVO_API_KEY: "secret" },
        },
        AbortSignal,
        fetch: async () => ({
          ok: false,
          status,
          json: async () => ({ message: "secret patient payload" }),
        }),
      },
    );
    await assert.rejects(
      () =>
        transport.sendMail({
          to: "patient@gmail.com",
          subject: "Test",
          html: "Test",
        }),
      (error) => {
        assert.equal(error.retryable, status !== 401);
        assert.ok(!error.message.includes("secret patient payload"));
        return true;
      },
    );
  });
test("missing API key fails before any network request", async () => {
  const transport = load(
    "services/emailTransport.js",
    { nodemailer: {} },
    {
      process: { env: { EMAIL_FROM: "clinic@gmail.com" } },
      AbortSignal,
      fetch: async () => {
        throw Error("must not fetch");
      },
    },
  );
  await assert.rejects(
    () => transport.sendMail({ to: "patient@gmail.com" }),
    /BREVO_API_KEY/,
  );
});
for (const outcome of ["accepted", "retry", "failed"])
  test(`queue persists ${outcome} state with a lease`, async () => {
    let finish;
    const done = new Promise((resolve) => {
      finish = resolve;
    });
    const events = [];
    const c = {
      beginTransaction: async () => {},
      commit: async () => {},
      rollback: async () => {},
      release() {},
      query: async () => [
        [
          {
            id: 5,
            event_type: "submitted",
            payload: JSON.stringify({ email: "patient@gmail.com" }),
            attempts: 0,
          },
        ],
      ],
      execute: async (sql, args) => {
        events.push({ sql, args });
      },
    };
    const client = {
      getConnection: async () => c,
      query: async () => [],
      execute: async (sql, args) => {
        events.push({ sql, args });
        finish();
        return [{}];
      },
    };
    const send = async () => {
      if (outcome !== "accepted") {
        const e = Error("unavailable");
        e.retryable = outcome === "retry";
        e.code = "MOCK_ERROR";
        throw e;
      }
      return { messageId: "accepted-1" };
    };
    const queue = load(
      "services/emailQueue.js",
      {
        "node:crypto": { randomUUID: () => "lease-1" },
        "../config/db": { promise: () => client },
        "./emailService": { sendAppointmentSubmittedEmail: send },
      },
      { setInterval: () => ({ unref() {} }), clearInterval() {} },
    );
    queue.startEmailQueue();
    await done;
    queue.stopEmailQueue();
    assert.equal(events[0].args[0], "lease-1");
    const updated = events[1];
    if (outcome === "accepted") {
      assert.ok(updated.sql.includes("payload = '{}'"));
      assert.equal(updated.args[0], "accepted-1");
    } else {
      assert.equal(updated.args[0], outcome === "retry" ? "pending" : "failed");
      assert.equal(updated.args[1], "MOCK_ERROR");
    }
  });
