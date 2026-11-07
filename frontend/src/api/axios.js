
import axios from "axios";

const BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  "http://127.0.0.1:8000/api/";

// Instance Axios principale
const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: {
    Accept: "application/json",
  },
});

// Instance indépendante pour renouveler les JWT.
// Elle évite de déclencher les intercepteurs de l'instance principale.
const refreshClient = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: {
    Accept: "application/json",
  },
});

// Une seule opération de renouvellement à la fois.
let refreshPromise = null;


// ============================================================
// GESTION DU STOCKAGE
// ============================================================

function getAuthStorage() {
  if (localStorage.getItem("refresh")) {
    return localStorage;
  }

  if (sessionStorage.getItem("refresh")) {
    return sessionStorage;
  }

  if (localStorage.getItem("access")) {
    return localStorage;
  }

  if (sessionStorage.getItem("access")) {
    return sessionStorage;
  }

  return null;
}

function getAccessToken() {
  return (
    localStorage.getItem("access") ||
    sessionStorage.getItem("access")
  );
}

function clearAuthStorage() {
  ["access", "refresh", "user"].forEach((key) => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  });
}

function isAuthEndpoint(url = "") {
  const cleanUrl = String(url).split("?")[0];

  return (
    cleanUrl.endsWith("token/") ||
    cleanUrl.endsWith("token/refresh/")
  );
}


// ============================================================
// RENOUVELLEMENT DU TOKEN ACCESS
// ============================================================

async function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const storage = getAuthStorage();

      if (!storage) {
        throw new Error(
          "Aucun jeton de renouvellement disponible."
        );
      }

      const refreshToken = storage.getItem("refresh");

      if (!refreshToken) {
        throw new Error(
          "Refresh Token introuvable."
        );
      }

      const response = await refreshClient.post(
        "token/refresh/",
        {
          refresh: refreshToken,
        }
      );

      const newAccessToken = response.data?.access;

      if (!newAccessToken) {
        throw new Error(
          "Le serveur n'a pas retourné de nouveau Access Token."
        );
      }

      storage.setItem("access", newAccessToken);

      // Utile si la rotation des Refresh Tokens est activée
      // ultérieurement dans Django.
      if (response.data?.refresh) {
        storage.setItem(
          "refresh",
          response.data.refresh
        );
      }

      return newAccessToken;
    })().finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
}


// ============================================================
// INTERCEPTEUR DES REQUÊTES
// ============================================================

api.interceptors.request.use(
  (config) => {
    const token = getAccessToken();

    config.headers = config.headers || {};

    if (token && !isAuthEndpoint(config.url)) {
      config.headers.Authorization = `Bearer ${token}`;
    } else if (isAuthEndpoint(config.url)) {
      delete config.headers.Authorization;
    }

    // Axios gère lui-même le Content-Type des FormData.
    // Cela permet de conserver la bonne boundary multipart.
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


// ============================================================
// INTERCEPTEUR DES RÉPONSES
// ============================================================

api.interceptors.response.use(
  (response) => response,

  async (error) => {
    const originalRequest = error.config;

    if (
      error.response?.status !== 401 ||
      !originalRequest ||
      originalRequest._retry ||
      isAuthEndpoint(originalRequest.url)
    ) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    const hadSession = Boolean(
      getAccessToken() ||
      localStorage.getItem("refresh") ||
      sessionStorage.getItem("refresh")
    );

    try {
      const newAccessToken = await refreshAccessToken();

      originalRequest.headers =
        originalRequest.headers || {};

      originalRequest.headers.Authorization =
        `Bearer ${newAccessToken}`;

      // Rejoue la requête initiale avec le nouveau JWT.
      return api(originalRequest);

    } catch (refreshError) {
      clearAuthStorage();

      // Ne redirige pas les visiteurs non connectés
      // qui reçoivent simplement une erreur 401.
      if (
        hadSession &&
        typeof window !== "undefined" &&
        window.location.pathname !== "/login"
      ) {
        window.location.assign("/login");
      }

      return Promise.reject(refreshError);
    }
  }
);

export default api;
