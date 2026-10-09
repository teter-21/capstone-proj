const test = require("node:test");
const assert = require("node:assert/strict");
const vm = require("node:vm");
const fs = require("node:fs");
const path = require("node:path");
function moduleUnderTest(file, dependencies, extras = {}) {
  const exports = {};
  vm.runInNewContext(
    fs.readFileSync(path.join(__dirname, "..", file), "utf8"),
    {
      module: { exports },
      exports,
      require(name) {
        if (!(name in dependencies))
          throw new Error(`Unexpected import: ${name}`);
        return dependencies[name];
      },
      console: { log() {}, error() {} },
      process: { env: {} },
      ...extras,
    },
  );
  return exports;
}
function response() {
  return {
    code: 200,
    status(code) {
      this.code = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    },
  };
}
function connectionMock({ failInsert = false, balance = 100 } = {}) {
  const events = [];
  return {
    events,
    async beginTransaction() {
      events.push("begin");
    },
    async commit() {
      events.push("commit");
    },
    async rollback() {
      events.push("rollback");
    },
    release() {
      events.push("release");
    },
    async execute(sql, args) {
      events.push(sql);
      if (sql.includes("GET_LOCK")) return [[{ acquired: 1 }]];
      if (sql.includes("RELEASE_LOCK")) return [[{ released: 1 }]];
      if (sql.includes("SELECT preferred_time FROM appointments")) return [[]];
      if (sql.includes("FROM visits"))
        return [[{ id: 1, patient_id: 2, amount_paid: 50, balance }]];
      if (sql.includes("INSERT INTO payments") && failInsert)
        throw new Error("insert failed");
      if (sql.includes("FROM users"))
        return [
          [
            {
              patient_id: 2,
              fullname: "Test Patient",
              email: "patient@gmail.com",
              phone: "09170000000",
            },
          ],
        ];
      if (sql.includes("SELECT * FROM appointments"))
        return [
          [
            {
              id: 8,
              patient_id: 2,
              fullname: "Test Patient",
              email: "patient@gmail.com",
              phone: "09170000000",
              service: "Checkup",
              status: "Pending",
              preferred_date: "2099-10-15",
              preferred_time: "10:00:00",
            },
          ],
        ];
      return [{ insertId: 8 }];
    },
  };
}
for (const scenario of [
  { name: "successful payment commits", opts: {}, status: 201, commits: true },
  {
    name: "failed ledger insert rolls back balances",
    opts: { failInsert: true },
    status: 500,
  },
  {
    name: "overpayment is rejected and rolled back",
    opts: { balance: 10 },
    status: 400,
  },
]) {
  test(scenario.name, async () => {
    const c = connectionMock(scenario.opts);
    const controller = moduleUnderTest("controllers/paymentController.js", {
      "../config/db": { promise: () => ({ getConnection: async () => c }) },
    });
    const res = response();
    await controller.recordPayment(
      { body: { visit_id: 1, amount: 20, payment_method: "Cash" } },
      res,
    );
    assert.equal(res.code, scenario.status);
    assert.equal(c.events.at(-1), "release");
    assert.equal(c.events.includes("commit"), Boolean(scenario.commits));
    assert.equal(c.events.includes("rollback"), !scenario.commits);
    if (scenario.commits) assert.equal(res.body.payment.balance, 80);
  });
}
for (const portal of [false, true]) {
  test(`${portal ? "portal" : "public"} booking atomically saves email without SMTP`, async () => {
    const c = connectionMock();
    const queued = [];
    const controller = moduleUnderTest("controllers/appointmentController.js", {
      "../config/db": { promise: () => ({ getConnection: async () => c }) },
      "../services/appointmentSchedule": require("../services/appointmentSchedule"),
      "../services/emailQueue": {
        enqueueAppointmentEmail: async (connection, type, data) => {
          assert.equal(connection, c);
          queued.push({ type, data });
        },
      },
      "../services/notificationService": {
        createAdminNotification: async () => {},
      },
    });
    const res = response();
    await controller[portal ? "createPatientAppointment" : "createAppointment"](
      {
        user: { id: 3, patient_id: 2 },
        body: {
          fullname: "Test Patient",
          email: "patient@gmail.com",
          phone: "09170000000",
          service: "Checkup",
          preferred_date: "2099-10-15",
          preferred_time: "10:00",
        },
      },
      res,
    );
    assert.equal(res.code, 201);
    assert.equal(res.body.emailStatus, "queued");
    assert.equal(queued[0].type, "submitted");
    assert.ok(c.events.indexOf("commit") < c.events.findIndex(e => e.includes("RELEASE_LOCK")));
    assert.equal(c.events.at(-1), "release");
  });
}
test("queue insert failure rolls back the booking", async () => {
  const c = connectionMock();
  const controller = moduleUnderTest("controllers/appointmentController.js", {
    "../config/db": { promise: () => ({ getConnection: async () => c }) },
    "../services/appointmentSchedule": require("../services/appointmentSchedule"),
    "../services/emailQueue": {
      enqueueAppointmentEmail: async () => {
        throw new Error("outbox missing");
      },
    },
    "../services/notificationService": {
      createAdminNotification: async () => {},
    },
  });
  const res = response();
  await controller.createAppointment(
    {
      body: {
        fullname: "Test",
        email: "patient@gmail.com",
        phone: "0917",
        service: "Checkup",
        preferred_date: "2099-10-15",
        preferred_time: "10:00",
      },
    },
    res,
  );
  assert.equal(res.code, 500);
  assert.ok(c.events.includes("rollback"));
  assert.ok(!c.events.includes("commit"));
  assert.equal(c.events.at(-1), "release");
});
test("approval persists in-app notification and email in the same transaction", async () => {
  const c = connectionMock();
  const queued = [];
  const controller = moduleUnderTest("controllers/appointmentController.js", {
    "../config/db": { promise: () => ({ getConnection: async () => c }) },
    "../services/appointmentSchedule": require("../services/appointmentSchedule"),
    "../services/emailQueue": {
      enqueueAppointmentEmail: async (conn, type) => {
        queued.push(type);
      },
    },
    "../services/notificationService": {
      createAdminNotification: async () => {},
    },
  });
  const res = response();
  await controller.updateAppointmentStatus(
    { params: { id: 8 }, body: { status: "Approved" } },
    res,
  );
  assert.equal(res.code, 200);
  assert.ok(c.events.some((e) => e.includes("INSERT INTO notifications")));
  assert.equal(queued[0], "approved");
  assert.ok(c.events.includes("commit"));
});
test("invalid dates are rejected before insertion", async () => {
  const c = connectionMock();
  const controller = moduleUnderTest("controllers/appointmentController.js", {
    "../config/db": { promise: () => ({ getConnection: async () => c }) },
    "../services/appointmentSchedule": require("../services/appointmentSchedule"),
    "../services/emailQueue": {
      enqueueAppointmentEmail: async () => {
        throw Error("must not queue");
      },
    },
    "../services/notificationService": {
      createAdminNotification: async () => {},
    },
  });
  const res = response();
  await controller.createAppointment(
    {
      body: {
        fullname: "Test",
        email: "patient@gmail.com",
        phone: "0917",
        service: "Checkup",
        preferred_date: "2099-02-30",
        preferred_time: "10:00",
      },
    },
    res,
  );
  assert.equal(res.code, 400);
  assert.ok(!c.events.some((e) => e.includes("INSERT INTO appointments")));
});
