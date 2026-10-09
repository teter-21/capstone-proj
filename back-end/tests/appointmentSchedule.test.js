const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const schedule = require('../services/appointmentSchedule');
const date = '2099-10-15';
function controller(connection, queued = []) {
  const m = { exports: {} };
  vm.runInNewContext(fs.readFileSync(require('node:path').join(__dirname, '../controllers/appointmentController.js'), 'utf8'), {
    module: m, exports: m.exports, console,
    require: name => ({
      '../config/db': { promise: () => ({ getConnection: async () => connection }) },
      '../services/appointmentSchedule': schedule,
      '../services/emailQueue': { enqueueAppointmentEmail: async (...args) => queued.push(args) },
      '../services/notificationService': { createAdminNotification: async () => {} },
    })[name],
  });
  return m.exports;
}
const response = () => ({ code: 200, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } });
const booking = time => ({ fullname: 'Test', email: 'test@example.com', phone: '0917', service: 'Checkup', preferred_date: date, preferred_time: time });
function mock(times = [], acquired = 1) {
  const events = [];
  return {
    events,
    async execute(sql, args) {
      events.push(sql);
      if (sql.includes('GET_LOCK')) return [[{ acquired }]];
      if (sql.includes('RELEASE_LOCK')) return [[{ released: 1 }]];
      if (sql.includes('SELECT preferred_time')) { assert.ok(sql.includes("status = 'Approved'")); return [times.map(preferred_time => ({ preferred_time }))]; }
      if (sql.includes('SELECT * FROM appointments')) return [[{ id: 4, patient_id: 2, status: 'Pending', ...booking('10:00') }]];
      if (sql.includes('JOIN patients')) return [[booking('10:00')]];
      if (sql.includes('FROM users')) return [[]];
      return [{ insertId: 5 }];
    },
    async beginTransaction() { events.push('begin'); }, async commit() { events.push('commit'); },
    async rollback() { events.push('rollback'); }, release() { events.push('release'); }, destroy() { events.push('destroy'); },
  };
}
test('Sunday, invalid dates and out-of-hours times rejected; inclusive bounds accepted', () => {
  for (const time of ['10:00', '18:00', '18:00:00', '10:15']) assert.equal(schedule.validateSchedule(date, time), null);
  for (const time of ['09:59', '18:01', '18:00:01', '25:00']) assert.ok(schedule.validateSchedule(date, time));
  assert.match(schedule.validateSchedule('2099-10-18', '10:00'), /Monday to Saturday/);
  assert.ok(schedule.validateSchedule('2099-02-30', '10:00'));
  assert.ok(schedule.validateSchedule('2020-01-01', '10:00'));
});
test('exact duplicate warning takes precedence and seconds are normalized', async () => {
  assert.equal(await schedule.checkApprovedConflict(mock(['10:30:00', '11:00:00']), date, '11:00'), schedule.DUPLICATE_WARNING);
});
test('buffer rejects both sides below one hour and permits exactly one hour', async () => {
  for (const time of ['10:01', '10:59', '11:01', '11:59']) assert.equal(await schedule.checkApprovedConflict(mock(['11:00:00']), date, time), schedule.OVERLAP_WARNING);
  for (const time of ['10:00', '12:00']) assert.equal(await schedule.checkApprovedConflict(mock(['11:00:00']), date, time), null);
});
for (const portal of [false, true]) test(`${portal ? 'portal' : 'public'} conflict causes no insert, email or commit`, async () => {
  const c = mock(['10:00:00']), queued = [], res = response();
  await controller(c, queued)[portal ? 'createPatientAppointment' : 'createAppointment']({ body: booking('10:00'), user: { id: 2, patient_id: 2 } }, res);
  assert.equal(res.code, 409); assert.equal(res.body.message, schedule.DUPLICATE_WARNING);
  assert.equal(queued.length, 0);
  assert.ok(!c.events.some(sql => sql.includes('INSERT INTO appointments')));
  assert.ok(!c.events.includes('commit'));
  assert.equal(c.events.at(-1), 'release');
});
test('approval and reschedule reject conflicting approved slots before updating or notifying', async () => {
  for (const reschedule of [false, true]) {
    const c = mock(['10:00:00']), queued = [], res = response();
    await controller(c, queued)[reschedule ? 'rescheduleAppointment' : 'updateAppointmentStatus']({ params: { id: 4 }, body: reschedule ? booking('10:00') : { status: 'Approved' } }, res);
    assert.equal(res.code, 409);
    assert.ok(!c.events.some(sql => sql.startsWith('UPDATE appointments') || sql.startsWith('INSERT INTO notifications')));
    assert.equal(queued.length, 0);
  }
});
test('schedule lock timeout fails closed without beginning a transaction', async () => {
  const c = mock([], 0), res = response();
  await controller(c).createAppointment({ body: booking('10:00') }, res);
  assert.equal(res.code, 503); assert.ok(!c.events.includes('begin'));
  assert.ok(!c.events.some(sql => sql.includes('RELEASE_LOCK')));
  assert.equal(c.events.at(-1), 'release');
});
test('failed lock release destroys connection instead of returning a held lock to pool', async () => {
  const c = mock(); c.execute = async () => { throw Error('disconnected'); };
  await schedule.releaseScheduleConnection(c, true);
  assert.deepEqual(c.events, ['destroy']);
});
test('conflict query excludes only the appointment being updated', async () => {
  const c = { execute: async (sql, args) => { assert.deepEqual(args, [date, 4, 4]); assert.match(sql, /id <> \?/); return [[]]; } };
  assert.equal(await schedule.checkApprovedConflict(c, date, '10:00', 4), null);
});
test('simultaneous overlapping approvals serialize; only one commits', async () => {
  let tail = Promise.resolve();
  const approved = [];
  const queued = [];
  function client(id, time) {
    const c = mock(); let unlock;
    c.execute = async (sql, args) => {
      c.events.push(sql);
      if (sql.includes('GET_LOCK')) {
        const previous = tail;
        tail = new Promise(resolve => { unlock = resolve; });
        await previous;
        return [[{ acquired: 1 }]];
      }
      if (sql.includes('RELEASE_LOCK')) { unlock(); return [[{ released: 1 }]]; }
      if (sql.includes('SELECT * FROM appointments')) return [[{ id, patient_id: 2, status: 'Pending', ...booking(time) }]];
      if (sql.includes('SELECT preferred_time')) return [approved.filter(a => a.id !== args[1])];
      if (sql.startsWith('UPDATE appointments')) approved.push({ id, preferred_time: time });
      return [{}];
    };
    return c;
  }
  const first = client(4, '10:00'), second = client(5, '10:30');
  const responses = [response(), response()];
  await Promise.all([
    controller(first, queued).updateAppointmentStatus({ params: { id: 4 }, body: { status: 'Approved' } }, responses[0]),
    controller(second, queued).updateAppointmentStatus({ params: { id: 5 }, body: { status: 'Approved' } }, responses[1]),
  ]);
  assert.deepEqual(responses.map(r => r.code), [200, 409]);
  assert.equal(queued.length, 1);
  assert.equal(approved.length, 1);
  assert.ok(first.events.includes('commit')); assert.ok(second.events.includes('rollback'));
});
test('frontend sorting orders dates and times before status and applies identical schedule rules', async () => {
  const source = fs.readFileSync(require('node:path').join(__dirname, '../../front-end/src/utils/appointmentSchedule.js'), 'utf8');
  const ui = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
  const rows = [
    { id: 3, preferred_date: date, preferred_time: '12:00:00', status: 'Pending' },
    { id: 2, preferred_date: date, preferred_time: '10:00:00', status: 'Approved' },
    { id: 1, preferred_date: '2099-10-14', preferred_time: '18:00:00', status: 'Cancelled' },
  ];
  assert.deepEqual(rows.sort(ui.compareAppointments).map(row => row.id), [1, 2, 3]);
  for (const [d, t] of [[date, '10:00'], [date, '18:00'], [date, '09:59'], ['2099-10-18', '12:00']]) {
    assert.equal(ui.validateSchedule(d, t), schedule.validateSchedule(d, t));
  }
});
test('upcoming appointments of every status precede history, including today past times', async () => {
  const source = fs.readFileSync(require('node:path').join(__dirname, '../../front-end/src/utils/appointmentSchedule.js'), 'utf8');
  const ui = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
  const now = Date.parse('2026-10-09T11:00:00+08:00');
  const rows = [
    { id: 1, preferred_date: '2026-10-08', preferred_time: '10:00:00', status: 'Approved' },
    { id: 2, preferred_date: '2026-10-10', preferred_time: '10:00:00', status: 'Pending' },
    { id: 3, preferred_date: '2026-10-09', preferred_time: '12:00:00', status: 'Approved' },
    { id: 4, preferred_date: '2026-10-09', preferred_time: '10:00:00', status: 'Pending' },
    { id: 5, preferred_date: '2026-10-09', preferred_time: '11:00', status: 'Rescheduled' },
  ];
  assert.deepEqual(rows.sort((a,b) => ui.compareAppointments(a,b,now)).map(row => row.id), [5,3,2,1,4]);
});
test('active-only API filter composes with date range and leaves calendar history available', async () => {
  for (const active of [true, false]) {
    const m = { exports: {} }; const queries = [];
    vm.runInNewContext(fs.readFileSync(require('node:path').join(__dirname, '../controllers/appointmentController.js'), 'utf8'), {
      module: m, exports: m.exports, console,
      require: name => ({
        '../config/db': { promise: () => ({ execute: async (sql,args) => { queries.push({sql,args}); return [[]]; } }) },
        '../services/appointmentSchedule': schedule,
        '../services/emailQueue': {}, '../services/notificationService': {},
      })[name],
    });
    const res = response();
    await m.exports.getAppointments({ query: { start_date: '2026-10-01', end_date: '2026-10-31', ...(active ? {active_only:'true'} : {}) } },res);
    assert.equal(res.code,200);
    assert.match(queries[0].sql,/preferred_date BETWEEN \? AND \?/);
    assert.deepEqual(Array.from(queries[0].args),['2026-10-01','2026-10-31']);
    assert.equal(queries[0].sql.includes("status IN ('Pending', 'Rescheduled', 'Approved')"),active);
  }
});
