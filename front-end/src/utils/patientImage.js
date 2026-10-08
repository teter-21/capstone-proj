import API_BASE_URL from "../config/apiBase.js";
export const patientImageUrl = (value) => {
  if (!value) return "";
  const image = String(value).trim();
  if (/^https?:\/\//i.test(image)) return image;
  // Backwards compatibility only: legacy files must still exist or be migrated.
  return `${API_BASE_URL}/uploads/${encodeURIComponent(image)}`;
};
