import { useEffect, useState } from 'react';
import api from '../api.js';
export default function PatientImage({ image, alt = 'Patient image', ...props }) {
  const [loaded, setLoaded] = useState(null);
  const source = loaded?.image === image ? loaded.url : null;
  useEffect(() => {
    let disposed = false;
    let objectUrl;
    const abort = new AbortController();
    if (/^\/patient-images\/\d+(\?v=[a-f0-9]+)?$/.test(image || '')) {
      api.get(image, { responseType: 'blob', signal: abort.signal }).then(({ data }) => {
        if (disposed || !data.type.startsWith('image/')) return;
        objectUrl = URL.createObjectURL(data);
        setLoaded({ image, url: objectUrl });
      }).catch(() => { /* Missing photos render a placeholder; authorization is enforced by the API. */ });
    }
    return () => { disposed = true; abort.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [image]);
  if (!source) return <span {...props} role="img" aria-label={alt} style={{ ...props.style, display: 'inline-block', background: '#e5e7eb' }} />;
  return <img {...props} src={source} alt={alt} />;
}
