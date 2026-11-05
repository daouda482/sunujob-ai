
import axios from "axios";

const api = axios.create({
  baseURL:
    import.meta.env.VITE_API_BASE_URL ||
    "http://127.0.0.1:8000/api/",
  timeout: 30000,
  headers: {
    Accept: "application/json",
  },
});

// Ajout automatique du JWT à chaque requête.
api.interceptors.request.use(
  (config) => {
    const token =
      localStorage.getItem("access") ||
      sessionStorage.getItem("access");

    config.headers = config.headers || {};

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      delete config.headers.Authorization;
    }

    // Laisser Axios gérer automatiquement le Content-Type
    // et la boundary des fichiers FormData.
    if (
      typeof FormData !== "undefined" &&
      config.data instanceof FormData
    ) {
      delete config.headers["Content-Type"];
      delete config.headers["content-type"];
    }

    return config;
  },
  (error) => Promise.reject(error)
);

export default api;
