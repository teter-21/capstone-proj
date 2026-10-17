const { selectTreatments } = require('./treatments');
const { validDate, clinicToday, fail } = require('./billing');
async function createVisit(connection, patientId, data) {
  if (!validDate(data.visit_date) || data.visit_date > clinicToday() || !/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(data.visit_time || '')) fail('Enter a valid visit date and time.');
  if (Number(data.amount_paid || 0) !== 0 || Number(data.balance || 0) !== 0) fail('Record charges and payments in Billing after saving the treatment.');
  const selected = selectTreatments(data.services, data.procedure_name);
  const [[patient]] = await connection.execute('SELECT id FROM patients WHERE id = ?', [patientId]);
  if (!patient) fail('Patient not found.', 404);
  const [result] = await connection.execute(`INSERT INTO visits
    (patient_id, visit_date, visit_time, procedure_name, complain, description, amount_paid, balance, treatment_items, invoice_status, discount_status)
    VALUES (?, ?, ?, ?, ?, ?, 0, 0, ?, 'draft', 'pending')`,
    [patientId, data.visit_date, data.visit_time, selected.service, String(data.complain || '').slice(0, 2000),
      String(data.description || '').slice(0, 10000), JSON.stringify(selected.treatments)]);
  return result.insertId;
}
module.exports = { createVisit };
