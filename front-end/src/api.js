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
                    url: config?.url || ""
                }
            })
        );
    }
};

const api = axios.create({
    baseURL: API_BASE_URL + ""
});

api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem("token");

        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        return config;
    },
    (error) => Promise.reject(error)
);

api.interceptors.response.use(
    (response) => {
        notifyDataUpdated(response.config);
        return response;
    },
    (error) => Promise.reject(error)
);

/* Also cover pages that still use axios directly instead of the shared api instance. */
axios.interceptors.response.use(
    (response) => {
        notifyDataUpdated(response.config);
        return response;
    },
    (error) => Promise.reject(error)
);

export default api;
