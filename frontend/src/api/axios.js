
import axios from "axios";

// ============================================================
// CONFIGURATION DE L'API
// ============================================================

const LOCAL_API_URL = "http://127.0.0.1:8000/api/";
const PRODUCTION_API_URL =
  "https://sunujob-ai-backend.onrender.com/api/";

const configuredApiUrl = import.meta.env.VITE_API_BASE_URL;

const BASE_URL = (
  configuredApiUrl ||
  (import.meta.env.PROD ? PRODUCTION_API_URL : LOCAL_API_URL)
).replace(/\/+$/, "") + "/";

// ============================================================
// INSTANCES AXIOS
// ============================================================

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 60000,
  headers: {
    Accept: "application/json",
  },
});

const refreshClient = axios.create({
  baseURL: BASE_URL,
  timeout: 60000,
  headers: {
    Accept: "application/json",
  },
});

let refreshPromise = null;

// ============================================================
// ROUTES PUBLIQUES D'AUTHENTIFICATION
// ============================================================

const publicAuthRoutes = [
  "register",
  "auth/register",
  "users/register",
  "login",
  "auth/login",
  "users/login",
  "token",
  "token/refresh",
];

function normalizeUrl(url = "") {
  return String(url)
    .split(/[?#]/)[0]
    .replace(/\\/g, "/")
    .replace(/^\/+/, "")
    .replace(/\/+$/, "");
}

function isPublicAuthEndpoint(url = "") {
  const cleanUrl = normalizeUrl(url);

  return publicAuthRoutes.some(
    (route) =>
      cleanUrl === route ||
      cleanUrl.endsWith(`/${route}`)
  );
}

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
  const storage = getAuthStorage();
  return storage ? storage.getItem("access") : null;
}

function getRefreshToken() {
  const storage = getAuthStorage();
  return storage ? storage.getItem("refresh") : null;
}

function clearAuthStorage() {
  ["access", "refresh", "user"].forEach((key) => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  });
}

// ============================================================
// REDIRECTION VERS LA CONNEXION
// ============================================================

function redirectToLogin() {
  if (
    typeof window !== "undefined" &&
    window.location.pathname !== "/login"
  ) {
    window.location.assign("/login");
  }
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
          "Aucun stockage d'authentification disponible."
        );
      }

      const refreshToken = storage.getItem("refresh");

      if (!refreshToken) {
        throw new Error("Refresh Token introuvable.");
      }

      const response = await refreshClient.post(
        "token/refresh/",
        { refresh: refreshToken }
      );

      const newAccessToken = response.data?.access;

      if (!newAccessToken) {
        throw new Error(
          "Le serveur n'a pas retourné de nouvel Access Token."
        );
      }

      storage.setItem("access", newAccessToken);

      if (response.data?.refresh) {
        storage.setItem("refresh", response.data.refresh);
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
    config.headers = config.headers || {};

    if (isPublicAuthEndpoint(config.url)) {
      delete config.headers.Authorization;
      return config;
    }

    const accessToken = getAccessToken();

    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    } else {
      delete config.headers.Authorization;
    }

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
      isPublicAuthEndpoint(originalRequest.url)
    ) {
      return Promise.reject(error);
    }

    const storage = getAuthStorage();

    const hadSession = Boolean(
      storage &&
      (
        storage.getItem("access") ||
        storage.getItem("refresh")
      )
    );

    if (!hadSession) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      const newAccessToken = await refreshAccessToken();

      originalRequest.headers =
        originalRequest.headers || {};

      originalRequest.headers.Authorization =
        `Bearer ${newAccessToken}`;

      return api(originalRequest);

    } catch (refreshError) {
      clearAuthStorage();
      redirectToLogin();

      return Promise.reject(refreshError);
    }
  }
);

// ============================================================
// EXPORT
// ============================================================

export default api;
