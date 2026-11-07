
import axios from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  "http://127.0.0.1:8000/api/";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

// Instance indépendante pour renouveler le JWT.
const refreshClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

// Ajouter automatiquement le jeton access.
api.interceptors.request.use(
  (config) => {
    const accessToken = localStorage.getItem("access");

    if (accessToken) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${accessToken}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

let refreshPromise = null;

// Ne jamais tenter un refresh sur ces routes.
const shouldSkipRefresh = (url = "") => {
  return (
    url.includes("token/") ||
    url.includes("logout/")
  );
};

api.interceptors.response.use(
  (response) => response,

  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;

    if (
      status !== 401 ||
      !originalRequest ||
      originalRequest._retry ||
      shouldSkipRefresh(originalRequest.url)
    ) {
      return Promise.reject(error);
    }

    const refreshToken = localStorage.getItem("refresh");

    // Aucun refresh disponible : déconnexion locale.
    if (!refreshToken) {
      localStorage.removeItem("access");
      localStorage.removeItem("refresh");
      localStorage.removeItem("user");

      if (window.location.pathname !== "/login") {
        window.location.assign("/login");
      }

      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      // Une seule demande de renouvellement pour les requêtes simultanées.
      if (!refreshPromise) {
        refreshPromise = refreshClient
          .post("token/refresh/", {
            refresh: refreshToken,
          })
          .then((response) => response.data)
          .finally(() => {
            refreshPromise = null;
          });
      }

      const tokenData = await refreshPromise;

      if (!tokenData?.access) {
        throw new Error(
          "Le serveur n'a pas retourné de nouveau jeton access."
        );
      }

      // Enregistrer le nouveau jeton.
      localStorage.setItem("access", tokenData.access);

      // Enregistrer le refresh si Django en retourne un nouveau.
      if (tokenData.refresh) {
        localStorage.setItem("refresh", tokenData.refresh);
      }

      // Rejouer la requête initiale avec le nouveau access.
      originalRequest.headers = originalRequest.headers || {};

      originalRequest.headers.Authorization =
        `Bearer ${tokenData.access}`;

      return api(originalRequest);

    } catch (refreshError) {
      // Le refresh est invalide, expiré ou blacklisté.
      localStorage.removeItem("access");
      localStorage.removeItem("refresh");
      localStorage.removeItem("user");

      if (window.location.pathname !== "/login") {
        window.location.assign("/login");
      }

      return Promise.reject(refreshError);
    }
  }
);

export default api;
