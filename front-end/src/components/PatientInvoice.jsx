const money = value => Number(value || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export default function PatientInvoice({ visit }) {
  if (visit.invoice_status === 'draft') return <p>Invoice awaiting preparation.</p>;
  const items = typeof visit.invoice_items === 'string' ? JSON.parse(visit.invoice_items) : visit.invoice_items;
  if (!items) return null;
  return <details><summary>View invoice #{visit.id}</summary><ul>{items.map((item, index) => <li key={index}>{item.name}: ₱{money(item.amount)}</li>)}</ul>
    <p>Subtotal: ₱{money(visit.subtotal)} · Discount: ₱{money(visit.discount_amount)} · Total: ₱{money(Number(visit.subtotal) - Number(visit.discount_amount))}</p>
  </details>;
}
