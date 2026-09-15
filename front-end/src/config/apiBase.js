const API_BASE_URL = (
  import.meta.env.VITE_API_URL ||
  `${window.location.protocol}//${window.location.hostname}:3001`
).replace(/\/$/, "");

export default API_BASE_URL;
