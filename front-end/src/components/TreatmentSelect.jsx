import { useEffect, useState } from 'react';
import api from '../api';
import '../css/ClinicalFeatures.css';
export default function TreatmentSelect({ value = [], onChange, disabled = false }) {
  const [catalog, setCatalog] = useState([]);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    api.get('/treatments').then(({ data }) => { if (active) setCatalog(data); })
      .catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, []);
  const duration = catalog.filter(item => value.includes(item.name)).reduce((sum, item) => sum + item.duration_minutes, 0);
  return <fieldset className="treatment-select" disabled={disabled}>
    <legend>Treatments (select one or more)</legend>
    {failed ? <p>Unable to load treatments. Refresh before booking.</p> : !catalog.length ? <p>Loading treatments…</p> :
      catalog.map(item => <label key={item.name}>
        <input type="checkbox" checked={value.includes(item.name)} onChange={event => onChange(event.target.checked ? [...value, item.name] : value.filter(name => name !== item.name))} />
        <span>{item.name} <small>({item.duration_minutes} min)</small></span>
      </label>)}
    {catalog.length > 0 && value.filter(name => !catalog.some(item => item.name === name)).map(name => <label key={name}><input type="checkbox" checked onChange={() => onChange(value.filter(item => item !== name))} /><span>{name} — legacy selection; remove and choose a current treatment</span></label>)}
    <p aria-live="polite">Estimated duration: {duration} minutes</p>
  </fieldset>;
}
