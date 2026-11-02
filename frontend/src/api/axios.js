import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api/",
  timeout: 30000,
  headers: {
    Accept: "application/json",
  },
});

// Ajouter automatiquement le token JWT à chaque requête.
api.interceptors.request.use(
  (config) => {
    const token =
      localStorage.getItem("access") ||
      sessionStorage.getItem("access");

    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Pour les fichiers FormData, laisser Axios définir
    // automatiquement le Content-Type et sa boundary.
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