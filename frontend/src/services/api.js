
import axios from "axios";

const api = axios.create({
  baseURL: "http://127.0.0.1:8000/api/",
  headers: {
    "Content-Type": "application/json",
  },
});

// Ces routes doivent fonctionner sans ancien jeton d'accès.
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

function isPublicAuthRoute(url = "") {
  const cleanUrl = url.split("?")[0].replace(/^\/+|\/+$/g, "");
  return publicAuthRoutes.some(
    (route) => cleanUrl === route || cleanUrl.endsWith(`/${route}`)
  );
}

api.interceptors.request.use(
  (config) => {
    config.headers = config.headers || {};

    if (isPublicAuthRoute(config.url)) {
      delete config.headers.Authorization;
      return config;
    }

    const accessToken = localStorage.getItem("access");

    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    } else {
      delete config.headers.Authorization;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      error.response?.status === 401 &&
      !isPublicAuthRoute(error.config?.url)
    ) {
      localStorage.removeItem("access");
      localStorage.removeItem("refresh");
    }

    return Promise.reject(error);
  }
);

export default api;
