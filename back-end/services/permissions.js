const common = ['patients.read', 'appointments.read', 'queue.read', 'dashboard.read'];
const roles = Object.freeze({
  front_desk: [...common, 'patients.write', 'appointments.write', 'queue.manage', 'billing.manage'],
  dentist: [...common, 'clinical.manage', 'queue.manage'],
  admin: [...common, 'patients.write', 'appointments.write', 'queue.manage', 'clinical.manage', 'billing.manage', 'reports.read', 'reviews.manage'],
});
function permissionsFor(user) {
  if (user?.role !== 'admin') return [];
  if (Number(user.is_main_admin) === 1) return [...roles.admin, 'accounts.manage'];
  return roles[user.staff_role] || [];
}
function can(user, permission) { return permissionsFor(user).includes(permission); }
function redact(body, user) {
  if (user?.role !== 'admin' || !body || typeof body !== 'object') return body;
  if (Array.isArray(body)) return body.map(item => redact(item, user));
  const clinical = new Set(['complain', 'description', 'reason', 'condition', 'notes']);
  const financial = new Set(['amount_paid', 'balance', 'total_charge', 'subtotal', 'discount_amount', 'invoice_items', 'discount_reason', 'discount_status', 'discount_basis', 'totalRevenue']);
  return Object.fromEntries(Object.entries(body).filter(([key]) =>
    (!clinical.has(key) || can(user, 'clinical.manage')) &&
    (!financial.has(key) || can(user, 'billing.manage') || can(user, 'reports.read'))
  ).map(([key, value]) => [key, redact(value, user)]));
}
module.exports = { roles, permissionsFor, can, redact };
