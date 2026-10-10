const crypto = require('node:crypto');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const SESSION_SECONDS = 30 * 60;
const hashSession = (id) => crypto.createHash('sha256').update(id).digest('hex');
const credentialTag = (passwordHash) => crypto.createHmac('sha256', process.env.JWT_SECRET).update(passwordHash).digest('hex');
async function issueSession(user, passwordUpgradeRequired = false) {
  const id = crypto.randomBytes(32).toString('hex');
  const token = jwt.sign({ id: user.id, credential: credentialTag(user.password), passwordUpgradeRequired }, process.env.JWT_SECRET,
    { algorithm: 'HS256', issuer: 'clinic-api', audience: 'clinic-web', jwtid: id, expiresIn: SESSION_SECONDS });
  await db.promise().execute(`INSERT INTO auth_sessions (id, user_id, expires_at)
    VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 30 MINUTE))`, [hashSession(id), user.id]);
  return token;
}
function verifySessionToken(token) {
  const decoded = jwt.verify(token, process.env.JWT_SECRET,
    { algorithms: ['HS256'], issuer: 'clinic-api', audience: 'clinic-web' });
  if (!Number.isSafeInteger(decoded.id) || decoded.id < 1 || !/^[a-f0-9]{64}$/.test(decoded.jti || '')
    || !/^[a-f0-9]{64}$/.test(decoded.credential || '')) throw new Error('Invalid session');
  return decoded;
}
function credentialsMatch(tag, passwordHash) {
  const expected = credentialTag(passwordHash);
  return /^[a-f0-9]{64}$/.test(tag || '') && crypto.timingSafeEqual(Buffer.from(tag, 'hex'), Buffer.from(expected, 'hex'));
}
module.exports = { issueSession, verifySessionToken, hashSession, credentialsMatch };
