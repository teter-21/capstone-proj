const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const root = path.join(__dirname, '..');
function load(file, deps = {}, extras = {}) {
  const filename = path.join(root, file); const module = { exports: {} };
  const actualRequire = createRequire(filename);
  vm.runInNewContext(fs.readFileSync(filename, 'utf8'), {
    module, exports: module.exports, require: (key) => key in deps ? deps[key] : actualRequire(key),
    Buffer, URL, AbortSignal, fetch, Date, setTimeout, clearTimeout,
    process: { env: { JWT_SECRET: 'f928dc921cbab06aa3ca7d19fdbe819d928a49aaf275c026670140f34cb75b1a', CLOUDINARY_CLOUD_NAME: 'test-cloud' } },
    console: { log() {}, error() {} }, ...extras,
  }, { filename });
  return module.exports;
}
const response = () => ({ code: 200, status(code) { this.code = code; return this; },
  json(body) { this.body = body; return this; }, set() {}, send(body) { this.body = body; return this; } });
function sessionHarness() {
  let user = { id: 7, role: 'patient', patient_id: 2, is_main_admin: 0, password: 'stored-password-hash' };
  const sessions = new Set();
  const db = { promise: () => ({ execute: async (sql, args) => {
    if (sql.includes('INSERT INTO auth_sessions')) { sessions.add(args[0]); return [{}]; }
    if (sql.includes('DELETE FROM auth_sessions')) { sessions.delete(args[0]); return [{}]; }
    if (sql.includes('JOIN auth_sessions')) return [sessions.has(args[1]) ? [user] : []];
    throw Error(sql);
  } }) };
  const security = load('services/sessionSecurity.js', { '../config/db': db });
  const auth = load('middleware/authMiddleware.js', { '../config/db': db, '../services/sessionSecurity': security });
  const controller = load('controllers/authController.js', { '../config/db': db, '../services/sessionSecurity': security,
    '../services/notificationService': {} });
  return { security, auth, controller, sessions, user, setUser(value) { user = value; } };
}
test('signed session is bound to database credentials and current permissions', async () => {
  const h = sessionHarness(); const token = await h.security.issueSession(h.user);
  const req = { headers: { authorization: `Bearer ${token}` } }; const res = response(); let next = 0;
  await h.auth(req, res, () => next++); assert.equal(next, 1); assert.equal(req.user.patient_id, 2);
  h.setUser({ ...h.user, role: 'admin', is_main_admin: 1 });
  await h.auth(req, response(), () => next++); assert.equal(req.user.role, 'admin');
  h.setUser({ ...h.user, password: 'new-password-hash' });
  const rejected = response(); await h.auth(req, rejected, () => next++);
  assert.equal(rejected.code, 401); assert.equal(next, 2);
});
test('logout deletes the server session and replay fails', async () => {
  const h = sessionHarness(); const token = await h.security.issueSession(h.user);
  const req = { headers: { authorization: `Bearer ${token}` } };
  await h.auth(req, response(), () => {}); await h.controller.logout(req, response());
  const replay = response(); await h.auth(req, replay, () => assert.fail('revoked token accepted'));
  assert.equal(replay.code, 401);
});
test('legacy, wrong-audience, wrong-algorithm and expired JWTs are rejected', async () => {
  const h = sessionHarness(); const jwt = require('jsonwebtoken');
  const secret = 'f928dc921cbab06aa3ca7d19fdbe819d928a49aaf275c026670140f34cb75b1a';
  const base = { id: 7, credential: 'a'.repeat(64) };
  const options = { issuer: 'clinic-api', audience: 'clinic-web', jwtid: 'b'.repeat(64) };
  for (const token of [jwt.sign({ id: 7 }, secret), jwt.sign(base, secret, { ...options, audience: 'other' }),
    jwt.sign(base, secret, { ...options, algorithm: 'HS384' }), jwt.sign(base, secret, { ...options, expiresIn: -1 })]) {
    const res = response(); await h.auth({ headers: { authorization: `Bearer ${token}` } }, res,
      () => assert.fail('invalid token accepted')); assert.equal(res.code, 401);
  }
});
test('password policy accepts passphrases and rejects weak or bcrypt-truncated input', () => {
  const { passwordError } = require('../services/passwordPolicy');
  assert.equal(passwordError('A long clinic passphrase 2048!'), null);
  for (const value of ['admin123', 'password123456789', 'aaaaaaaaaaaa', '😀'.repeat(20), null])
    assert.ok(passwordError(value));
});
function imageService(db = {}, cloudinary = {}) {
  return load('services/privateImages.js', { '../config/db': db, '../config/cloudinary': cloudinary });
}
test('real images are re-encoded; HTML, SVG and oversized images are rejected', async () => {
  const sharp = require('sharp'); const images = imageService();
  const png = await sharp({ create: { width: 16, height: 16, channels: 3, background: '#ffffff' } }).png().toBuffer();
  const clean = await images.sanitizeImage(png); const metadata = await sharp(clean).metadata();
  assert.equal(metadata.format, 'jpeg'); assert.equal(metadata.exif, undefined);
  for (const malicious of [Buffer.from('<html>fake jpeg</html>'), Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>'), Buffer.alloc(2 * 1024 * 1024 + 1)])
    await assert.rejects(() => images.sanitizeImage(malicious));
  const tooManyPixels = await sharp({ create: { width: 4001, height: 4001, channels: 3, background: '#ffffff' } }).png().toBuffer();
  await assert.rejects(() => images.sanitizeImage(tooManyPixels));
});
test('patient cannot fetch another patient image, including through a numeric-ID guess', async () => {
  let queried = false;
  const images = imageService({ promise: () => ({ execute: async () => { queried = true; return [[]]; } }) });
  const res = response(); await images.getPatientImage({ params: { id: '3' }, user: { role: 'patient', patient_id: 2 } }, res);
  assert.equal(res.code, 404); assert.equal(queried, false);
});
test('patient responses mask public URLs and image references reject foreign hosts/path traversal', () => {
  const images = imageService();
  const result = images.maskImages({ items: [{ id: 2, image: 'https://public.example/patient.jpg' }] });
  assert.match(result.items[0].image, /^\/patient-images\/2\?v=[a-f0-9]{16}$/);
  assert.ok(!JSON.stringify(result).includes('public.example'));
  for (const source of ['http://127.0.0.1/internal.jpg', 'https://res.cloudinary.com/other/image/upload/test.jpg',
    'https://res.cloudinary.com/test-cloud/image/upload/../internal.jpg', 'private:../../secret'])
    assert.throws(() => images.cloudReference(source));
});
test('new uploads use authenticated Cloudinary delivery and unpredictable public IDs', async () => {
  let options; const images = imageService({}, { uploader: { upload_stream(opts, callback) {
    options = opts; return { end() { callback(null, { public_id: 'test' }); } };
  } } });
  await images.uploadPrivateImage(Buffer.from('validated bytes'));
  assert.equal(options.type, 'authenticated'); assert.equal(options.resource_type, 'image');
  assert.match(options.public_id, /^[a-f0-9-]{36}$/);
});
test('persistent limit increments under a transaction and rejects the next request', async () => {
  const rows = new Map(); const events = [];
  const connection = { beginTransaction: async () => events.push('begin'), commit: async () => events.push('commit'),
    rollback: async () => events.push('rollback'), release() { events.push('release'); },
    async execute(sql, args) {
      if (sql.includes('INSERT IGNORE')) { if (!rows.has(args[0])) rows.set(args[0], { window_started: args[1], hits: 0 }); return [{}]; }
      if (sql.includes('FOR UPDATE')) { events.push('locked'); return [[rows.get(args[0])]]; }
      if (sql.includes('UPDATE security_rate_limits')) { rows.set(args[3], { window_started: args[0], hits: args[1] }); return [{}]; }
      throw Error(sql);
    } };
  const db = { promise: () => ({ getConnection: async () => connection }) };
  const limits = load('middleware/persistentLimits.js', { '../config/db': db });
  assert.equal((await limits.consume('test', 'account', 2, 60000)).allowed, true);
  assert.equal((await limits.consume('test', 'account', 2, 60000)).allowed, true);
  assert.equal((await limits.consume('test', 'account', 2, 60000)).allowed, false);
  assert.equal(events.filter(e => e === 'locked').length, 3); assert.equal(events.at(-1), 'release');
});
test('limiter database failure rejects requests instead of bypassing protection', async () => {
  const limits = load('middleware/persistentLimits.js', { '../config/db': { promise: () => ({ getConnection: async () => { throw Error('offline'); } }) } });
  const res = response(); await limits.loginIpLimit({ ip: '127.0.0.1' }, res, () => assert.fail('request bypassed protection'));
  assert.equal(res.code, 503);
});
test('browser token is memory-only and old persisted JWTs are cleared', () => {
  const source = fs.readFileSync(path.join(root, '../front-end/src/utils/session.js'), 'utf8')
    .replace(/^import .*;\n/, '').replace(/export /g, '');
  const removed = [];
  const context = { localStorage: { removeItem(key) { removed.push(key); }, setItem() { assert.fail('token persisted'); } },
    API_BASE_URL: 'https://test.invalid' };
  vm.runInNewContext(source + '\nsetAccessToken("test-jwt"); result = getAccessToken();', context);
  assert.equal(context.result, 'test-jwt'); assert.ok(removed.includes('token'));
  vm.runInNewContext('clearAccessToken(); result = getAccessToken();', context); assert.equal(context.result, null);
});
test('weak-password sessions can change credentials but cannot access clinic data', async () => {
  const h = sessionHarness(); const token = await h.security.issueSession(h.user, true);
  const header = { authorization: `Bearer ${token}` };
  const denied = response();
  await h.auth({ headers: header, path: '/patients' }, denied, () => assert.fail('weak account accessed clinic records'));
  assert.equal(denied.code, 403); assert.equal(denied.body.code, 'PASSWORD_CHANGE_REQUIRED');
  let allowed = false;
  await h.auth({ headers: header, path: '/account' }, response(), () => { allowed = true; });
  assert.equal(allowed, true);
});
test('anonymous image request fails before any patient lookup', async () => {
  const h = sessionHarness(); const res = response();
  await h.auth({ headers: {}, path: '/patient-images/2' }, res, () => assert.fail('anonymous image request accepted'));
  assert.equal(res.code, 401);
});
test('authorized image response streams sanitized bytes without exposing a Cloudinary URL', async () => {
  const sharp = require('sharp');
  const png = await sharp({ create: { width: 2, height: 2, channels: 3, background: '#ffffff' } }).png().toBuffer();
  const db = { promise: () => ({ execute: async () => [[{ image: 'private:magno-dental/patients/demo_123' }]] }) };
  const cloudinary = { utils: { private_download_url: () => 'https://api.cloudinary.com/signed-download' } };
  const images = load('services/privateImages.js', { '../config/db': db, '../config/cloudinary': cloudinary },
    { fetch: async () => new Response(png, { headers: { 'content-type': 'application/octet-stream' } }) });
  const res = response();
  await images.getPatientImage({ params: { id: '2' }, user: { role: 'patient', patient_id: 2 } }, res);
  assert.equal(res.code, 200); assert.ok(Buffer.isBuffer(res.body));
  assert.equal((await sharp(res.body).metadata()).format, 'jpeg');
});
