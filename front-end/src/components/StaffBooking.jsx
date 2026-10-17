import { useState } from 'react';
import api from '../api';
import TreatmentSelect from './TreatmentSelect';
export default function StaffBooking({ onClose, onSaved }) {
  const [form, setForm] = useState({ fullname: '', email: '', phone: '', preferred_date: '', preferred_time: '', services: [] });
  const [saving, setSaving] = useState(false);
  const submit = async event => {
    event.preventDefault(); if (saving) return; setSaving(true);
    try { const { data } = await api.post('/appointments', form); window.alert(data.message); onSaved(); onClose(); }
    catch (error) { if (!error.nativeAlertHandled) window.alert(error.response?.data?.message || 'Unable to book appointment.'); }
    finally { setSaving(false); }
  };
  return <form className="invoice-editor" onSubmit={submit}><h2>Book appointment</h2>
    {Object.entries({ fullname: 'Patient full name', email: 'Patient email', phone: 'Phone', preferred_date: 'Date', preferred_time: 'Time' }).map(([key, label]) =>
      <label key={key}>{label}<input required type={key === 'email' ? 'email' : key === 'preferred_date' ? 'date' : key === 'preferred_time' ? 'time' : 'text'} value={form[key]} onChange={event => setForm({ ...form, [key]: event.target.value })} /></label>)}
    <TreatmentSelect value={form.services} onChange={services => setForm({ ...form, services })} disabled={saving} />
    <button disabled={saving || !form.services.length}>Submit request</button><button type="button" disabled={saving} onClick={onClose}>Cancel</button>
  </form>;
}
