
import { useCallback, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import api from "../api/axios";

function getStoredValue(key) {
  return (
    localStorage.getItem(key) ||
    sessionStorage.getItem(key)
  );
}

function clearStoredSession() {
  const keys = ["access", "refresh", "user"];

  keys.forEach((key) => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  });
}

export default function ProtectedLayout() {
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const user = (() => {
    try {
      return JSON.parse(getStoredValue("user") || "null");
    } catch {
      return null;
    }
  })();

  const logout = useCallback(async () => {
    if (isLoggingOut) return;

    setIsLoggingOut(true);

    const refreshToken = getStoredValue("refresh");

    try {
      // Demander à Django d'invalider le refresh token.
      if (refreshToken) {
        await api.post("users/logout/", {
          refresh: refreshToken,
        });
      }
    } catch (error) {
      // La session locale sera tout de même nettoyée.
      console.error(
        "Erreur pendant la déconnexion côté serveur :",
        error.response?.data || error.message
      );
    } finally {
      // Nettoyer les deux stockages.
      clearStoredSession();

      // Retourner à la page de connexion.
      navigate("/login", {
        replace: true,
        state: { loggedOut: true },
      });
    }
  }, [isLoggingOut, navigate]);

  return (
    <Outlet
      context={{
        user,
        logout,
        isLoggingOut,
      }}
    />
  );
}
