
import axios from "axios";

const BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  "http://127.0.0.1:8000/api/";

// ============================================================
// INSTANCES AXIOS
// ============================================================

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: {
    Accept: "application/json",
  },
});

// Client indépendant pour le renouvellement JWT.
const refreshClient = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
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
          "Le serveur n'a pas retourné de nouvel Access Token."
        );
      }

      storage.setItem("access", newAccessToken);

      // Gestion de la rotation éventuelle du Refresh Token.
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
    config.headers = config.headers || {};

    // Les routes publiques ne doivent pas recevoir
    // un ancien Access Token.
    if (isPublicAuthEndpoint(config.url)) {
      delete config.headers.Authorization;
      return config;
    }

    const accessToken = getAccessToken();

    if (accessToken) {
      config.headers.Authorization =
        `Bearer ${accessToken}`;
    } else {
      delete config.headers.Authorization;
    }

    // Laisser Axios définir automatiquement le Content-Type
    // et la boundary pour les données FormData.
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

    // Ne traiter que les erreurs 401.
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

    // Ne pas rediriger les visiteurs non connectés.
    if (!hadSession) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      const refreshToken = getRefreshToken();

      if (!refreshToken) {
        throw new Error(
          "Session expirée : Refresh Token indisponible."
        );
      }

      const newAccessToken = await refreshAccessToken();

      originalRequest.headers =
        originalRequest.headers || {};

      originalRequest.headers.Authorization =
        `Bearer ${newAccessToken}`;

      // Rejouer la requête avec le nouveau JWT.
      return api(originalRequest);

    } catch (refreshError) {
      clearAuthStorage();
      redirectToLogin();

      return Promise.reject(refreshError);
    }
  }
);

export default api;
