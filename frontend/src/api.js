
import axios from "axios";

// ============================================================
// CONFIGURATION DE L'API
// ============================================================

const LOCAL_API_URL = "http://127.0.0.1:8000/api/";

const PRODUCTION_API_URL =
  "https://sunujob-ai-backend.onrender.com/api/";

const envApiUrl = import.meta.env.VITE_API_BASE_URL;

const API_BASE_URL = (
  envApiUrl ||
  (import.meta.env.PROD ? PRODUCTION_API_URL : LOCAL_API_URL)
).replace(/\/+$/, "") + "/";

// ============================================================
// INSTANCES AXIOS
// ============================================================

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000,
  headers: {
    Accept: "application/json",
  },
});

const refreshClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000,
  headers: {
    Accept: "application/json",
  },
});

let refreshPromise = null;

// ============================================================
// ROUTES PUBLIQUES
// ============================================================

const publicRoutes = [
  "register",
  "auth/register",
  "users/register",
  "login",
  "auth/login",
  "users/login",
  "token",
  "token/refresh",
  "logout",
];

function normalizeUrl(url = "") {
  return String(url)
    .split(/[?#]/)[0]
    .replace(/\\/g, "/")
    .replace(/^\/+/, "")
    .replace(/\/+$/, "");
}

function isPublicRoute(url = "") {
  const cleanUrl = normalizeUrl(url);

  return publicRoutes.some(
    (route) =>
      cleanUrl === route ||
      cleanUrl.endsWith(`/${route}`)
  );
}

// ============================================================
// STOCKAGE DES JETONS
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

function clearAuthStorage() {
  ["access", "refresh", "user"].forEach((key) => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  });
}

// ============================================================
// REDIRECTION
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
// RENOUVELLEMENT JWT
// ============================================================

async function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const storage = getAuthStorage();

      if (!storage) {
        throw new Error("Session introuvable.");
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

    // Ne pas envoyer un ancien JWT sur les routes publiques.
    if (isPublicRoute(config.url)) {
      delete config.headers.Authorization;
      return config;
    }

    const storage = getAuthStorage();
    const accessToken = storage?.getItem("access");

    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    } else {
      delete config.headers.Authorization;
    }

    // Gestion correcte des formulaires multipart.
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
      isPublicRoute(originalRequest.url)
    ) {
      return Promise.reject(error);
    }

    const storage = getAuthStorage();

    if (!storage || !storage.getItem("refresh")) {
      clearAuthStorage();
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
