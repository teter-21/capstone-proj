const configuredUrl = import.meta.env.VITE_API_URL;
if (import.meta.env.PROD && !configuredUrl) {
  throw new Error("VITE_API_URL is required in the frontend build environment.");
}
const API_BASE_URL = (configuredUrl || `${window.location.protocol}//${window.location.hostname}:3001`).replace(/\/$/, "");
export default API_BASE_URL;
