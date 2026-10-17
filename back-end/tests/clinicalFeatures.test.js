const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const { createRequire } = require('node:module');
const { permissionsFor, can, redact } = require('../services/permissions');
const guard = require('../middleware/adminMiddleware');
const { calculateInvoice, ageOn, eligibility, cents } = require('../services/billing');
const { selectTreatments } = require('../services/treatments');
const schedule = require('../services/appointmentSchedule');
const staff = role => ({ id: 5, role: 'admin', staff_role: role, is_main_admin: 0 });
const response = () => ({ code: 200, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } });
function load(relative, db) {
  const file = path.join(__dirname, '..', relative);
  const module = { exports: {} };
  const actual = createRequire(file);
  vm.runInNewContext(fs.readFileSync(file, 'utf8'), { module, exports: module.exports,
    require: key => key === '../config/db' ? db : actual(key), console: { error() {} } });
  return module.exports;
}
test('role matrix denies unknown roles and patients; only main admin manages staff', () => {
  assert.deepEqual(permissionsFor({ role: 'patient', is_main_admin: 1 }), []);
  assert.deepEqual(permissionsFor(staff('invented')), []);
  assert.ok(can(staff('dentist'), 'clinical.manage'));
  assert.ok(!can(staff('dentist'), 'billing.manage'));
  assert.ok(can(staff('front_desk'), 'billing.manage'));
  assert.ok(!can(staff('front_desk'), 'clinical.manage'));
  assert.ok(!can(staff('front_desk'), 'reports.read'));
  assert.ok(!can(staff('admin'), 'accounts.manage'));
  assert.ok(can({ ...staff('admin'), is_main_admin: 1 }, 'accounts.manage'));
});
test('backend guard rejects direct clinical, report and billing URL bypasses', () => {
  const cases = [['front_desk','GET','/visits/1',false], ['front_desk','PUT','/dental-chart/1/12',false],
    ['front_desk','GET','/reports/export',false], ['front_desk','GET','/dashboard-revenue',false],
    ['front_desk','POST','/queue/1/complete-treatment',false], ['dentist','POST','/billing/payments',false],
    ['dentist','PUT','/appointments/1/status',false], ['dentist','GET','/appointments',true],
    ['front_desk','PUT','/billing/1/invoice',true], ['admin','GET','/new-unregistered-endpoint',false]];
  for (const [role, method, route, allowed] of cases) {
    const res = response(); let called = false;
    guard({ user: staff(role), method, path: route }, res, () => { called = true; });
    assert.equal(called, allowed, `${role} ${method} ${route}`);
    if (!allowed) assert.equal(res.code, 403);
  }
});
test('nested responses redact clinical notes for desk and financial amounts for dentist', () => {
  const source = { items: [{ name: 'Patient', complain: 'Private', reason: 'Private', description: 'Private', amount_paid: 100, balance: 50 }] };
  const desk = redact(source, staff('front_desk')).items[0];
  assert.equal(desk.amount_paid, 100); assert.ok(!('complain' in desk)); assert.ok(!('reason' in desk));
  const dentist = redact(source, staff('dentist')).items[0];
  assert.equal(dentist.description, 'Private'); assert.ok(!('amount_paid' in dentist));
  assert.equal(source.items[0].complain, 'Private');
});
test('staff cannot create, delete or reassign accounts by calling controllers directly', async () => {
  const controller = load('controllers/adminAccountController.js', { promise() { throw Error('must not access db'); } });
  for (const role of ['front_desk','dentist','admin']) for (const action of ['createAdmin','deleteAdmin','updateRole']) {
    const res = response(); await controller[action]({ user: staff(role), body: {}, params: { id: 1 } }, res); assert.equal(res.code, 403);
  }
});
test('senior eligibility uses birthdate at visit date and never the legacy age field', () => {
  assert.equal(ageOn('1966-10-17','2026-10-16'), 59);
  assert.equal(ageOn('1966-10-17','2026-10-17'), 60);
  assert.equal(ageOn('1964-02-29','2024-02-28'), 59);
  assert.equal(ageOn('1964-02-29','2024-02-29'), 60);
  assert.equal(eligibility({ age: 99 },'2026-10-17'), 'none');
  assert.equal(ageOn('2026-02-30'), null);
});
test('two procedures get one 20% discount, including a senior who is also PWD', () => {
  const bill = calculateInvoice({ birthdate: '1950-01-01', is_pwd: 1 }, [{ name: 'A', amount: '1000.00' }, { name: 'B', amount: '500.00' }], 'verified', '', '2026-10-17');
  assert.equal(bill.subtotal, 1500); assert.equal(bill.discount_amount, 300); assert.equal(bill.total, 1200); assert.equal(bill.discount_basis, 'senior');
});
test('PWD discount requires verification or a denial reason; ineligible input cannot force it', () => {
  const patient = { is_pwd: 1 }, items = [{ name: 'A', amount: '100.03' }];
  assert.throws(() => calculateInvoice(patient, items, 'pending'), /Verify/);
  assert.throws(() => calculateInvoice(patient, items, 'denied', ''), /reason/);
  assert.equal(calculateInvoice(patient, items, 'denied', 'ID not presented').discount_amount, 0);
  assert.equal(calculateInvoice(patient, items, 'verified').discount_amount, 20.01);
  assert.equal(calculateInvoice({}, items, 'verified').discount_amount, 0);
});
test('money input rejects negatives, infinity, excessive decimals and ambiguous notation', () => {
  for (const value of [-1, NaN, Infinity, '1e3', '0.001', 'abc', null, '']) assert.throws(() => cents(value));
  assert.equal(cents('123.45'), 12345);
});
test('treatment catalog rejects tampering and duplicate selections; duration is server-derived', () => {
  const selected = selectTreatments(['Dental Check-up', 'Tooth Extraction']);
  assert.equal(selected.duration_minutes, 120); assert.equal(selected.treatments.length, 2);
  for (const input of [[], ['Unknown'], ['Tooth Extraction','Tooth Extraction'], [{ name: 'Tooth Extraction', duration_minutes: 1 }]]) assert.throws(() => selectTreatments(input));
});
test('multi-treatment interval checks handle both directions and exact boundary', async () => {
  const conn = { execute: async () => [[{ preferred_time: '12:00:00', duration_minutes: 120 }]] };
  assert.equal(await schedule.checkApprovedConflict(conn, '2099-10-15', '10:00', null, 120), null);
  assert.equal(await schedule.checkApprovedConflict(conn, '2099-10-15', '10:30', null, 120), schedule.OVERLAP_WARNING);
  assert.equal(await schedule.checkApprovedConflict(conn, '2099-10-15', '13:30', null, 60), schedule.OVERLAP_WARNING);
  assert.equal(await schedule.checkApprovedConflict(conn, '2099-10-15', '14:00', null, 60), null);
  assert.equal(await schedule.checkApprovedConflict(conn, '2099-10-15', '12:00', null, 120), schedule.DUPLICATE_WARNING);
  assert.equal(schedule.validateDuration('18:00',60), null);
  assert.ok(schedule.validateDuration('18:00',120));
});
function invoiceHarness({ failAudit = false, paid = 0, version = 0, status = 'draft' } = {}) {
  const events = [];
  const c = { async beginTransaction() { events.push('begin'); }, async commit() { events.push('commit'); }, async rollback() { events.push('rollback'); }, release() { events.push('release'); },
    async execute(sql,args) { events.push({ sql,args });
      if (sql.includes('SELECT * FROM visits')) return [[{ id: 1, patient_id: 2, visit_date: '2026-10-17', invoice_status: status, invoice_version: version, amount_paid: paid, treatment_items: [{ name: 'Tooth Extraction' }] }]];
      if (sql.includes('SELECT birthdate')) return [[{ birthdate: '1950-01-01', is_pwd: 0 }]];
      if (sql.includes('INSERT INTO invoice_audit') && failAudit) throw Error('audit failed');
      return [{ affectedRows: 1 }];
    } };
  return { events, controller: load('controllers/paymentController.js', { promise: () => ({ getConnection: async () => c }) }) };
}
const invoiceRequest = () => ({ params: { id: 1 }, user: staff('front_desk'), body: { invoice_version: 0, items: [{ name: 'Tooth Extraction', amount: '1000' }], discount_status: 'verified' } });
test('invoice totals and audit snapshot commit together', async () => {
  const h = invoiceHarness(), res = response(); await h.controller.saveInvoice(invoiceRequest(), res);
  assert.equal(res.code,200); assert.equal(res.body.invoice.total,800); assert.ok(h.events.includes('commit'));
  const update = h.events.find(item => item.sql?.startsWith('UPDATE visits')); assert.equal(update.args[6],800);
  const audit = h.events.find(item => item.sql?.includes('INSERT INTO invoice_audit')); assert.equal(audit.args[1],5);
});
test('invoice audit failure rolls back all financial changes', async () => {
  const h = invoiceHarness({ failAudit: true }), res = response(); await h.controller.saveInvoice(invoiceRequest(),res);
  assert.equal(res.code,500); assert.ok(h.events.includes('rollback')); assert.ok(!h.events.includes('commit'));
});
for (const [name, options] of [['stale', { version: 1 }], ['paid', { paid: 100 }], ['historical', { status: 'legacy' }]]) test(`${name} invoice cannot be repriced`, async () => {
  const h = invoiceHarness(options), res = response(); await h.controller.saveInvoice(invoiceRequest(),res);
  assert.equal(res.code,409); assert.ok(!h.events.some(item => item.sql?.startsWith('UPDATE visits')));
});
test('invoice cannot substitute procedures or accept client-supplied totals', async () => {
  const h = invoiceHarness(), req = invoiceRequest(), res = response(); req.body.items[0].name = 'Forged'; req.body.total = 1;
  await h.controller.saveInvoice(req,res); assert.equal(res.code,400); assert.ok(!h.events.includes('commit'));
});
test('a completed queue cannot produce a second visit', async () => {
  const events = [];
  const c = { beginTransaction: async () => {}, rollback: async () => events.push('rollback'), release() {}, execute: async sql => {
    if (sql.startsWith('SELECT')) return [[{ id: 1, patient_id: 2, status: 'Completed' }]];
    events.push(sql); return [{}];
  } };
  const controller = load('controllers/queueController.js', { promise: () => ({ getConnection: async () => c }) });
  const res = response(); await controller.completeTreatmentWithVisit({ params: { id: 1 }, body: {} },res);
  assert.equal(res.code,409); assert.deepEqual(events,['rollback']);
});
test('feature migration can be rerun without duplicate columns or destructive statements', async () => {
  const columns = new Set(), queries = [];
  const db = { async execute(sql,args) {
    if (sql.includes('CHARACTER_MAXIMUM_LENGTH')) return [[{ size: 2000 }]];
    return [columns.has(args.join('.')) ? [{}] : []];
  }, async query(sql) {
    queries.push(sql);
    const match = sql.match(/ALTER TABLE `([^`]+)` ADD COLUMN `([^`]+)`/); if (match) columns.add(`${match[1]}.${match[2]}`);
  } };
  const migrate = require('../scripts/migrateFeatures'); await migrate(db); const additions = columns.size; await migrate(db);
  assert.ok(additions > 10); assert.equal(queries.filter(sql => sql.includes('ADD COLUMN')).length,additions);
  assert.ok(!queries.some(sql => /DROP|TRUNCATE|DELETE FROM/.test(sql)));
});
