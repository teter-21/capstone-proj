const db = require('../config/db');
const { verifySessionToken, hashSession, credentialsMatch } = require('../services/sessionSecurity');
module.exports = async (req, res, next) => {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ') || header.length > 4096)
    return res.status(401).json({ message: 'Authentication required.' });
  let decoded;
  try { decoded = verifySessionToken(header.slice(7).trim()); }
  catch { return res.status(401).json({ message: 'Invalid or expired session.' }); }
  try {
    const [[user]] = await db.promise().execute(`SELECT u.id, u.role, u.patient_id, u.is_main_admin, u.password
      FROM users u JOIN auth_sessions s ON s.user_id = u.id
      WHERE u.id = ? AND s.id = ? AND s.expires_at > NOW() LIMIT 1`, [decoded.id, hashSession(decoded.jti)]);
    if (!user || !credentialsMatch(decoded.credential, user.password))
      return res.status(401).json({ message: 'Session ended. Please log in again.' });
    req.user = { id: user.id, role: user.role, patient_id: user.patient_id, is_main_admin: Number(user.is_main_admin || 0) };
    req.sessionId = hashSession(decoded.jti);
    if (decoded.passwordUpgradeRequired && !['/account', '/logout', '/patient/profile', '/my-profile'].includes(req.path))
      return res.status(403).json({ code: 'PASSWORD_CHANGE_REQUIRED', message: 'Update your password in account settings before using the system.' });
    next();
  } catch (error) {
    console.error('Authentication unavailable:', error.code || error.name);
    return res.status(503).json({ message: 'Unable to verify your account. Please try again later.' });
  }
};
