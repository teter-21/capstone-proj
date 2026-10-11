const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const frontend = path.join(__dirname, '../../front-end/src');
function handler(file, name, globals) {
  const source = fs.readFileSync(path.join(frontend, file), 'utf8');
  const expression = new RegExp(`const ${name} = async (?:event|e) => \\{([\\s\\S]*?)\\n  \\};`);
  const match = source.match(expression);
  assert.ok(match, `Actual ${name} handler not found in ${file}`);
  const context = { ...globals };
  vm.runInNewContext(`run = async event => { const e = event; ${match[1]} };`, context);
  return () => context.run({ preventDefault() {} });
}
function adminHarness(form, response = { data: { message: 'Admin account created successfully' } }) {
  const events = [];
  const run = handler('components/AdminAccountsSection.jsx', 'handleSubmit', {
    form, API_BASE_URL: 'https://api.test', headers: {}, emptyForm: {},
    window: { alert: message => events.push(['alert', message]) },
    setSaving() {}, setForm: () => events.push(['reset']), loadAdmins: async () => events.push(['refresh']),
    axios: { post: async () => { events.push(['post']); if (response instanceof Error) throw response; return response; } },
  });
  return { run, events };
}
test('admin creation alerts before resetting/reloading, including repeated identical successes', async () => {
  const h = adminHarness({ password: 'Long test password!', confirmPassword: 'Long test password!' });
  await h.run(); await h.run();
  assert.deepEqual(h.events.map(event => event[0]), ['post', 'alert', 'reset', 'refresh', 'post', 'alert', 'reset', 'refresh']);
});
test('invalid admin form alerts and does not send a request', async () => {
  const h = adminHarness({ password: 'Long test password!', confirmPassword: 'different' });
  await h.run(); assert.deepEqual(h.events, [['alert', 'The passwords do not match.']]);
});
test('AJAX failure shows the API message, but an interceptor-handled error does not alert twice', async () => {
  const error = new Error('failed'); error.response = { data: { message: 'Email is already registered.' } };
  const h = adminHarness({ password: 'Long test password!', confirmPassword: 'Long test password!' }, error);
  await h.run(); assert.equal(h.events[1][1], 'Email is already registered.');
  error.nativeAlertHandled = true; h.events.length = 0; await h.run(); assert.deepEqual(h.events, [['post']]);
});
test('successful password reset alerts before redirecting to login', async () => {
  const events = [];
  const run = handler('pages/public/ResetPassword.jsx', 'handleSubmit', {
    password: 'Long test password!', confirmPassword: 'Long test password!', token: 'mock-reset', API_BASE_URL: 'https://api.test',
    setLoading() {}, window: { alert: message => events.push(['alert', message]) }, navigate: route => events.push(['navigate', route]),
    axios: { post: async () => ({ data: { message: 'Password reset successfully.' } }) },
  });
  await run(); assert.deepEqual(events, [['alert', 'Password reset successfully.'], ['navigate', '/login']]);
});
test('session interceptors mark handled messages and redirect only once for parallel failures', async () => {
  const source = fs.readFileSync(path.join(frontend, 'api.js'), 'utf8').replace(/^import .*;\n/gm, '').replace('export default api;', '');
  const interceptors = [];
  const response = { use(success, failure) { interceptors.push({ success, failure }); } };
  const events = [];
  vm.runInNewContext(source, {
    axios: { create: () => ({ interceptors: { request: { use() {} }, response } }), interceptors: { response } },
    getAccessToken: () => 'mock-token', clearAccessToken() {}, API_BASE_URL: 'https://api.test',
    localStorage: { removeItem() {} }, window: { alert: message => events.push(message), location: { pathname: '/Settings', replace() {} }, dispatchEvent() {} },
    Promise,
  });
  for (let i = 0; i < 2; i++) {
    const error = { response: { status: 401 }, config: { url: '/patients' } };
    await assert.rejects(() => interceptors[0].failure(error)); assert.equal(error.nativeAlertHandled, true);
  }
  assert.equal(events.length, 1);
  const changed = { data: { sessionEnded: true }, config: {} };
  interceptors[0].success(changed); assert.equal(changed.nativeAlertHandled, true);
});
