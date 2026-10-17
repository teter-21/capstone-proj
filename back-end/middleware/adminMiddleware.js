const { can } = require('../services/permissions');
function permissionFor(path, method) {
  const read = method === 'GET';
  if (/^\/(reports|report-procedures|dashboard-revenue|dashboard-procedures)(\/|$)/.test(path)) return 'reports.read';
  if (path === '/dashboard-summary') return 'dashboard.read';
  if (/^\/billing(\/|$)/.test(path)) return 'billing.manage';
  if (/^\/(dental-chart|visits|add-visit)(\/|$)/.test(path)) return 'clinical.manage';
  if (/^\/(patients|recent-patients)$/.test(path)) return 'patients.read';
  if (/^\/(add-patient|update-patient|create-account)(\/|$)/.test(path)) return 'patients.write';
  if (/^\/appointments(\/|$)/.test(path)) return read ? 'appointments.read' : 'appointments.write';
  if (/^\/queue\/[^/]+\/(start|complete|complete-treatment)$/.test(path)) return 'clinical.manage';
  if (/^\/queue(\/|$)/.test(path)) return read ? 'queue.read' : 'queue.manage';
  if (/^\/admin\/notifications(\/|$)/.test(path)) return 'appointments.read';
  if (/^\/admin\/reviews(\/|$)/.test(path)) return 'reviews.manage';
  return null;
}
module.exports = (req, res, next) => {
  const permission = permissionFor(req.path, req.method);
  if (!req.user) return res.status(401).json({ message: 'Authentication required.' });
  if (!permission || !can(req.user, permission)) return res.status(403).json({ message: 'Your role does not permit this action.' });
  next();
};
module.exports.permissionFor = permissionFor;
