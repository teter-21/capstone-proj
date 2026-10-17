import { useEffect, useState } from 'react';
import api from '../api';
import '../css/ClinicalFeatures.css';
const money = value => Number(value || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export default function InvoiceEditor({ visitId, onClose, onSaved }) {
  const [invoice, setInvoice] = useState(null);
  const [items, setItems] = useState([]);
  const [denied, setDenied] = useState(false);
  const [verified, setVerified] = useState(false);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    let active = true;
    api.get(`/billing/${visitId}/invoice`).then(({ data }) => {
      if (!active) return;
      setInvoice(data); setItems(data.items); setDenied(data.discount_status === 'denied'); setReason(data.discount_reason || '');
    }).catch(error => { if (active && !error.nativeAlertHandled) window.alert(error.response?.data?.message || 'Unable to load invoice.'); });
    return () => { active = false; };
  }, [visitId]);
  if (!invoice) return <section className="invoice-editor"><p>Loading invoice…</p><button onClick={onClose}>Close</button></section>;
  const locked = invoice.invoice_status === 'legacy' || Number(invoice.amount_paid) > 0;
  const eligible = invoice.eligibility !== 'none';
  const subtotalCents = items.reduce((sum, item) => sum + Math.round(Number(item.amount || 0) * 100), 0);
  const discountCents = eligible && !denied ? Math.round(subtotalCents * .2) : 0;
  const save = async event => {
    event.preventDefault();
    if (saving) return;
    if (eligible && !denied && !verified) { window.alert('Verify a valid ID before applying the discount.'); return; }
    setSaving(true);
    try {
      const { data } = await api.put(`/billing/${visitId}/invoice`, { items, invoice_version: invoice.invoice_version,
        discount_status: denied ? 'denied' : verified ? 'verified' : 'ineligible', discount_reason: reason });
      window.alert(data.message); await onSaved(); onClose();
    } catch (error) { if (!error.nativeAlertHandled) window.alert(error.response?.data?.message || 'Unable to save invoice.'); }
    finally { setSaving(false); }
  };
  return <section className="invoice-editor" aria-label="Visit invoice"><h2>Invoice #{invoice.id} — {invoice.patient_name}</h2>
    <p>Visit: {String(invoice.visit_date).slice(0, 10)} · {invoice.invoice_status}</p>
    {locked ? <><p>This invoice is read-only because it is historical or already has payments.</p>
      <p>{invoice.procedure_name}</p><p>Subtotal: ₱{money(invoice.subtotal ?? (Number(invoice.amount_paid) + Number(invoice.balance)))} · Discount: ₱{money(invoice.discount_amount)}</p>
      <p>Paid: ₱{money(invoice.amount_paid)} · Balance: ₱{money(invoice.balance)}</p>
      {invoice.invoice_items && <ul>{items.map((item, index) => <li key={index}>{item.name}: ₱{money(item.amount)}</li>)}</ul>}</> :
      <form onSubmit={save}><table><thead><tr><th>Procedure</th><th>Charge (₱)</th></tr></thead><tbody>
        {items.map((item, index) => <tr key={item.name}><td>{item.name}</td><td><input aria-label={`Charge for ${item.name}`} type="number" min="0" max="99999999.99" step="0.01" required value={item.amount} onChange={event => setItems(current => current.map((entry, i) => i === index ? { ...entry, amount: event.target.value } : entry))} /></td></tr>)}
      </tbody></table>
      <p>Eligibility on the visit date: {invoice.eligibility === 'none' ? 'No eligible birthdate/PWD registration recorded' : invoice.eligibility === 'senior' ? 'Senior citizen (60+)' : 'PWD'}.</p>
      {eligible && <><label><input type="checkbox" checked={denied} onChange={event => setDenied(event.target.checked)} /> Remove / deny the 20% discount</label>
        {denied ? <label>Reason for denial<textarea maxLength={255} minLength={3} required value={reason} onChange={event => setReason(event.target.value)} placeholder="For example: valid ID not presented" /></label> :
          <label><input type="checkbox" required checked={verified} onChange={event => setVerified(event.target.checked)} /> I verified a valid ID and eligibility for this visit</label>}</>}
      <div className="invoice-totals" aria-live="polite"><span>Subtotal: ₱{money(subtotalCents / 100)}</span><span>Discount (20%): ₱{money(discountCents / 100)}</span><strong>Total: ₱{money((subtotalCents - discountCents) / 100)}</strong></div>
      <button disabled={saving}>{saving ? 'Saving…' : 'Save invoice'}</button>
      </form>}
    <details><summary>Invoice audit history</summary>{invoice.audit.length ? invoice.audit.map((entry, index) => {
      const snapshot = typeof entry.snapshot === 'string' ? JSON.parse(entry.snapshot) : entry.snapshot;
      return <p key={index}>{String(entry.created_at)} · Staff #{entry.actor_id} · {snapshot.discount_status} · Discount ₱{money(snapshot.discount_amount)} {snapshot.discount_reason ? `— ${snapshot.discount_reason}` : ''}</p>;
    }) : <p>No invoice revisions yet.</p>}</details>
    <button type="button" disabled={saving} onClick={onClose}>Close</button>
  </section>;
}
