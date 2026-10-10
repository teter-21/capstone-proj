const test = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path"),
  vm = require("node:vm");
function load(file, deps) {
  const m = { exports: {} };
  vm.runInNewContext(
    fs.readFileSync(path.join(__dirname, "..", file), "utf8"),
    {
      module: m,
      exports: m.exports,
      require(name) {
        if (name in deps) return deps[name];
        throw Error(name);
      },
      console: { log() {}, error() {} },
    },
  );
  return m.exports;
}
const response = () => ({
  code: 200,
  status(code) {
    this.code = code;
    return this;
  },
  json(data) {
    this.body = data;
    return this;
  },
});
test("patient pagination binds search, clamps pages and whitelists sorting", async () => {
  const queries = [];
  const client = {
    async query(sql, args) {
      queries.push({ sql, args });
      return sql.includes("COUNT(*)")
        ? [[{ total: 21 }]]
        : [[{ id: 21, name: "Test" }]];
    },
  };
  const controller = load("controllers/patientController.js", {
    "../config/db": { promise: () => client },
    "../services/privateImages": {},
  });
  const res = response();
  await controller.getPatients(
    {
      query: {
        page: "999",
        page_size: "10",
        search: "%'; DROP TABLE users;--",
        sort: "name; DROP TABLE patients",
        age: "18-30",
      },
    },
    res,
  );
  assert.equal(res.body.page, 3);
  assert.equal(res.body.totalPages, 3);
  assert.equal(queries[1].args.at(-1), 20);
  assert.ok(!queries[1].sql.includes("DROP TABLE"));
  assert.ok(queries[1].sql.includes("age BETWEEN 18 AND 30"));
  assert.ok(queries[1].sql.includes("ORDER BY id DESC"));
});
test("report summaries aggregate once and tell the client when the preview is truncated", async () => {
  const queries = [];
  const client = {
    async query(sql, args) {
      queries.push({ sql, args });
      if (sql.includes("totalPatients"))
        return [
          [
            {
              totalPatients: 3,
              totalVisits: 201,
              totalRevenue: 400,
              outstandingBalance: 50,
            },
          ],
        ];
      if (sql.includes("AS name") && sql.includes("COUNT(*)"))
        return [[{ name: "Checkup", value: 201 }]];
      if (sql.includes("AS value")) return [[{ name: "Oct", value: 400 }]];
      return [
        Array.from({ length: 200 }, (_, id) => ({
          id,
          amount_paid: 2,
          balance: 0,
        })),
      ];
    },
  };
  const controller = load("controllers/reportController.js", {
    "../config/db": { promise: () => client },
  });
  const res = response();
  await controller.getReports(
    {
      query: {
        start_date: "2026-10-01",
        end_date: "2026-10-31",
        procedure: "Checkup",
      },
    },
    res,
  );
  assert.equal(res.code, 200);
  assert.equal(res.body.summary.totalVisits, 201);
  assert.equal(res.body.details.length, 200);
  assert.equal(res.body.detailsTruncated, true);
  assert.equal(queries.length, 4);
  for (const query of queries) assert.equal(query.args.length, 3);
});
test("invalid report dates are rejected before database access", async () => {
  const controller = load("controllers/reportController.js", {
    "../config/db": {
      promise() {
        throw Error("must not query");
      },
    },
  });
  const res = response();
  await controller.getReports(
    { query: { start_date: "2026-02-30", end_date: "2026-10-31" } },
    res,
  );
  assert.equal(res.code, 400);
});
test("password reset rolls back the password if token consumption fails", async () => {
  const events = [];
  const c = {
    async beginTransaction() {
      events.push("begin");
    },
    async rollback() {
      events.push("rollback");
    },
    async commit() {
      events.push("commit");
    },
    release() {
      events.push("release");
    },
    async execute(sql) {
      if (sql.startsWith("SELECT")) return [[{ id: 1, user_id: 2 }]];
      if (sql.includes("UPDATE users")) {
        events.push("password");
        return [{}];
      }
      if (sql.includes("DELETE FROM auth_sessions")) return [{}];
      throw Error("token update failed");
    },
  };
  const controller = load("controllers/authController.js", {
    "../config/db": { promise: () => ({ getConnection: async () => c }) },
    bcrypt: { hash: async () => "hashed" },
    "../services/sessionSecurity": {},
    "../services/passwordPolicy": require("../services/passwordPolicy"),
    "node:crypto": require("node:crypto"),
    "../services/notificationService": {},
  });
  const res = response();
  await controller.resetPassword(
    { body: { token: "test-token", newPassword: "NewPassword123" } },
    res,
  );
  assert.equal(res.code, 500);
  assert.ok(events.includes("rollback"));
  assert.ok(!events.includes("commit"));
  assert.equal(events.at(-1), "release");
});
