const crypto = require('node:crypto');
const db = require('../config/db');
const bucketKey = (scope, value) => crypto.createHmac('sha256', process.env.JWT_SECRET).update(`${scope}:${value}`).digest('hex');
const clientIp = (req) => req.ip || req.socket?.remoteAddress || 'unknown';
// Row locking shares counters across instances and preserves them on restart.
async function consume(scope, value, max, windowMs) {
  const connection = await db.promise().getConnection();
  const now = Date.now();
  const key = bucketKey(scope, value);
  try {
    await connection.beginTransaction();
    await connection.execute(`INSERT IGNORE INTO security_rate_limits
      (bucket_key, window_started, hits, last_seen) VALUES (?, ?, 0, ?)`, [key, now, now]);
    const [[row]] = await connection.execute(`SELECT window_started, hits FROM security_rate_limits
      WHERE bucket_key = ? FOR UPDATE`, [key]);
    const expired = now - Number(row.window_started) >= windowMs;
    const start = expired ? now : Number(row.window_started);
    const hits = expired ? 1 : Number(row.hits) + 1;
    await connection.execute(`UPDATE security_rate_limits SET window_started = ?, hits = ?, last_seen = ?
      WHERE bucket_key = ?`, [start, hits, now, key]);
    await connection.commit();
    return { allowed: hits <= max, retryAfter: Math.max(1, Math.ceil((start + windowMs - now) / 1000)) };
  } catch (error) { await connection.rollback(); throw error; }
  finally { connection.release(); }
}
function limit(scope, max, windowMs, key = clientIp) {
  return async (req, res, next) => {
    try {
      const result = await consume(scope, key(req), max, windowMs);
      if (!result.allowed) {
        res.set('Retry-After', String(result.retryAfter));
        return res.status(429).json({ message: 'Too many requests. Please try again later.', retryAfter: result.retryAfter });
      }
      next();
    } catch (error) {
      console.error('Request limiter unavailable:', error.code || error.name);
      return res.status(503).json({ message: 'Service temporarily unavailable. Please try again later.' });
    }
  };
}
const loginIpLimit = limit('login-ip', 50, 15 * 60 * 1000);
const loginAccountLimit = limit('login-account-ip', 10, 15 * 60 * 1000,
  (req) => `${clientIp(req)}:${String(req.body?.email || '').trim().toLowerCase().slice(0, 100)}`);
const bookingLimit = limit('public-booking', 30, 15 * 60 * 1000);
const patientBookingLimit = limit('patient-booking', 10, 15 * 60 * 1000, (req) => String(req.user.id));
const resetLimit = limit('password-reset', 5, 15 * 60 * 1000);
const uploadLimit = limit('patient-upload', 20, 15 * 60 * 1000, (req) => String(req.user.id));
module.exports = { consume, limit, loginIpLimit, loginAccountLimit, bookingLimit, patientBookingLimit, resetLimit, uploadLimit };
