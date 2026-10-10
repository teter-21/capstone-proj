import API_BASE_URL from '../config/apiBase.js';
// Never persist authentication tokens to localStorage/sessionStorage or URLs.
let accessToken = null;
export const getAccessToken = () => accessToken;
export function setAccessToken(token) {
  accessToken = typeof token === 'string' ? token : null;
  localStorage.removeItem('token');
}
export function clearAccessToken() {
  accessToken = null;
  for (const key of ['token', 'role', 'patient_id', 'is_main_admin', 'fullname', 'must_change_password']) localStorage.removeItem(key);
}
export async function endSession() {
  if (accessToken) {
    const response = await fetch(`${API_BASE_URL}/logout`, {
      method: 'POST', signal: AbortSignal.timeout(10000), headers: { Authorization: `Bearer ${accessToken}` }, credentials: 'omit',
    });
    if (!response.ok && response.status !== 401) throw new Error('Unable to log out. Please try again.');
  }
  clearAccessToken();
}
// Invalidate stale browser-stored credentials from older releases immediately.
localStorage.removeItem('token');
