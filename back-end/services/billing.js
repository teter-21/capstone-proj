function fail(message, status = 400) { throw Object.assign(new Error(message), { status }); }
function clinicToday(now = Date.now()) { return new Date(now + 8 * 3600000).toISOString().slice(0, 10); }
function validDate(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
}
function ageOn(birthdate, date = clinicToday()) {
  if (!validDate(birthdate) || birthdate > date) return null;
  return Number(date.slice(0, 4)) - Number(birthdate.slice(0, 4)) - (date.slice(5) < birthdate.slice(5) ? 1 : 0);
}
function eligibility(patient, date = clinicToday()) {
  if (ageOn(patient.birthdate, date) >= 60) return 'senior';
  return Number(patient.is_pwd) === 1 ? 'pwd' : 'none';
}
function cents(value) {
  if (!/^(0|[1-9]\d{0,7})(\.\d{1,2})?$/.test(String(value))) fail('Enter a valid non-negative amount with at most two decimal places.');
  return Math.round(Number(value) * 100);
}
function parseItems(value) { return typeof value === 'string' ? JSON.parse(value) : value; }
function calculateInvoice(patient, items, decision, reason, date = clinicToday()) {
  if (!Array.isArray(items) || !items.length || items.length > 20) fail('An invoice needs treatment items.');
  let subtotal = 0;
  const normalized = items.map(item => {
    const amount = cents(item.amount);
    if (typeof item.name !== 'string' || !item.name.trim() || item.name.length > 150) fail('Invalid treatment name.');
    subtotal += amount;
    return { name: item.name.trim(), amount: amount / 100 };
  });
  if (subtotal > 9999999999) fail('Invoice exceeds the supported amount.');
  const basis = eligibility(patient, date);
  const status = basis === 'none' ? 'ineligible' : decision;
  if (basis !== 'none' && !['verified', 'denied'].includes(status)) fail('Verify the eligible patient’s ID or deny the discount with a reason.');
  const explanation = String(reason || '').trim();
  if (status === 'denied' && (explanation.length < 3 || explanation.length > 255)) fail('Enter a discount denial reason (3–255 characters).');
  const discount = status === 'verified' ? Math.round(subtotal * 20 / 100) : 0;
  return { items: normalized, subtotal: subtotal / 100, discount_amount: discount / 100,
    total: (subtotal - discount) / 100, discount_basis: basis, discount_status: status,
    discount_reason: status === 'denied' ? explanation : null, assessed_on: date };
}
module.exports = { fail, clinicToday, validDate, ageOn, eligibility, cents, parseItems, calculateInvoice };
