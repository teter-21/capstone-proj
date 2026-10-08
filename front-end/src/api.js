import API_BASE_URL from "./config/apiBase.js";
import axios from "axios";

const notifyDataUpdated = (config) => {
  if (typeof window === "undefined") return;

  const method = String(config?.method || "").toLowerCase();

  if (["post", "put", "patch", "delete"].includes(method)) {
    window.dispatchEvent(
      new CustomEvent("clinic:data-updated", {
        detail: {
          method,
          url: config?.url || "",
        },
      }),
    );
  }
};

const api = axios.create({
  baseURL: API_BASE_URL + "",
  timeout: 20000,
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error),
);

const clearExpiredSession = (error) => {
  const status = error?.response?.status;
  const requestUrl = String(error?.config?.url || "");

  // Do not redirect/clear the session for login or password-reset requests.
  const isPublicAuthRequest =
    requestUrl.includes("/login") ||
    requestUrl.includes("/forgot-password") ||
    requestUrl.includes("/reset-password") ||
    requestUrl.includes("/verify-reset-token");

  if (status === 401 && !isPublicAuthRequest) {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("patient_id");
    localStorage.removeItem("is_main_admin");
    localStorage.removeItem("fullname");

    // Send the user back to login once the stored JWT is no longer valid.
    if (typeof window !== "undefined" && window.location.pathname !== "/") {
      window.alert("Your session has expired. Please log in again.");
      window.location.replace("/login");
    }
  }

  return Promise.reject(error);
};

api.interceptors.response.use((response) => {
  notifyDataUpdated(response.config);
  return response;
}, clearExpiredSession);

/* Also cover pages that still use axios directly instead of the shared api instance. */
axios.interceptors.response.use((response) => {
  notifyDataUpdated(response.config);
  return response;
}, clearExpiredSession);

export default api;
