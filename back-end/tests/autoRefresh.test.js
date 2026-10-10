const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const root = path.join(__dirname, '../../front-end/src');
function hookHarness(load) {
  const windowListeners = new Map(), documentListeners = new Map();
  let timer, cleanup;
  const window = { scrollY: 450, addEventListener: (event, cb) => windowListeners.set(event, cb), removeEventListener: event => windowListeners.delete(event), scrollTo() { throw Error('must not force scroll'); } };
  const document = { visibilityState: 'visible', addEventListener: (event, cb) => documentListeners.set(event, cb), removeEventListener: event => documentListeners.delete(event) };
  const source = fs.readFileSync(path.join(root, 'utils/useAutoRefresh.js'), 'utf8').replace(/^import .*;\n/, '').replace('export const useAutoRefresh', 'const useAutoRefresh');
  vm.runInNewContext(source + '\nuseAutoRefresh(load);', {
    load, window, document, console,
    useRef: current => ({ current }), useEffect: cb => { const result = cb(); if (result) cleanup = result; },
    setInterval: cb => { timer = cb; return 1; }, clearInterval: () => { timer = undefined; },
  });
  return { window, document, timer: () => timer?.(), event: event => windowListeners.get(event)?.(), visible: () => documentListeners.get('visibilitychange')?.(), cleanup: () => cleanup(), windowListeners, documentListeners };
}
test('timer and events request background refresh without overlapping or changing user scroll', async () => {
  const calls = []; let complete;
  const h = hookHarness(options => { calls.push(options); return new Promise(resolve => { complete = resolve; }); });
  const request = h.timer();
  assert.equal(calls[0].background, true);
  await h.event('focus'); await h.event('clinic:data-updated');
  assert.equal(calls.length, 1);
  h.window.scrollY = 800; complete(); await request;
  assert.equal(h.window.scrollY, 800);
  const next = h.event('clinic:data-updated'); assert.equal(calls.length, 2);
  complete(); await next; h.cleanup();
  assert.equal(h.windowListeners.size, 0); assert.equal(h.documentListeners.size, 0);
  assert.equal(h.timer(), undefined);
});
test('hidden pages skip requests and becoming visible refreshes quietly', async () => {
  let calls = 0;
  const h = hookHarness(async options => { assert.equal(options.background, true); calls++; });
  h.document.visibilityState = 'hidden'; await h.timer(); await h.event('focus'); assert.equal(calls, 0);
  h.document.visibilityState = 'visible'; h.visible(); await Promise.resolve(); assert.equal(calls, 1);
  h.cleanup();
});
// Execute the actual loader functions, not a copied implementation: refresh must
// keep data mounted and must not replace it with a loading/error screen.
const pages = [
  ['components/PatientTable.jsx','loadRecentPatients'],
  ['components/AdminNotification.jsx','fetchNotifications'],
  ['pages/admin/AppointmentMngmt.jsx','loadAppointments'],
  ['pages/admin/Report.jsx','loadReport'],
  ['pages/admin/QueueMngmt.jsx','fetchQueue'],
  ['pages/admin/Payment.jsx','loadBilling'],
  ['pages/patient/PatientDashboard.jsx','loadPatientData'],
  ['pages/patient/PatientNotification.jsx','fetchNotifications'],
];
for (const [file, name] of pages) test(`${file}: successful/failed background reload preserves content`, async () => {
  const source = fs.readFileSync(path.join(root,file),'utf8');
  const match = source.match(new RegExp(`const ${name} = (?:useCallback\\()?async (\\([^]*?\\)) => \\{`));
  assert.ok(match);
  const start = match.index + match[0].length - 1;
  let depth = 1, end = start + 1;
  while (depth) { if (source[end] === '{') depth++; if (source[end] === '}') depth--; end++; }
  const body = source.slice(start,end);
  const effects = []; let fail = false;
  const get = async () => { if (fail) throw Error('offline'); return { data: [] }; };
  const context = { API_BASE_URL: 'https://test.invalid', api:{get}, axios:{get}, console: {error(){}}, localStorage:{getItem:()=> 'test'}, getToken:()=> 'test', getAccessToken:()=> 'test',
    startDate:'2026-10-01', endDate:'2026-10-31', group:'month', procedure:'', search:'', status:'all', compareAppointments:()=>0 };
  for (const setter of new Set(body.match(/set[A-Z]\w+/g))) context[setter] = value => effects.push({ setter,value });
  vm.runInNewContext(`loader = async ${match[1]} => ${body}`,context);
  await context.loader({background:true});
  assert.ok(effects.some(e=>!['setLoading','setError'].includes(e.setter)), 'new data applied');
  assert.ok(!effects.some(e=> e.setter==='setLoading' && e.value===true));
  effects.length=0; fail=true; await context.loader({background:true});
  assert.ok(!effects.some(e=> e.setter==='setError' || e.setter==='setLoading' && e.value===true));
  assert.ok(!effects.some(e=>!['setLoading','setError'].includes(e.setter)), 'existing data retained after failure');
});
test('admin appointment loader displays only Pending, Rescheduled and Approved rows', async () => {
  const source = fs.readFileSync(path.join(root,'pages/admin/AppointmentMngmt.jsx'),'utf8');
  const match = source.match(/const loadAppointments = async (\([^]*?\)) => \{/);
  const start = match.index + match[0].length - 1;
  let depth=1,end=start+1;
  while(depth) { if(source[end]==='{') depth++; if(source[end]==='}') depth--; end++; }
  const rows = ['Completed','Pending','Cancelled','Approved','Rescheduled'].map((status,id)=>({status,id}));
  let displayed;
  const context = { api: {get:async(url,config)=>{ assert.equal(url,'/appointments');assert.equal(config.params.active_only,'true');return {data:rows}; }},
    setAppointments:value=>{displayed=value;}, setLoading(){},setError(){},compareAppointments:(a,b)=>a.id-b.id,console };
  vm.runInNewContext(`loader = async ${match[1]} => ${source.slice(start,end)}`,context);
  await context.loader({background:true});
  assert.deepEqual(Array.from(displayed,row=>row.status),['Pending','Approved','Rescheduled']);
  assert.equal(rows.length,5);
});
