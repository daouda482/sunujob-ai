
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import api from "../services/api";

// Création du contexte d'authentification.
const AuthContext = createContext(null);

// Clés utilisées dans le Local Storage.
const STORAGE_KEYS = {
  ACCESS: "access",
  REFRESH: "refresh",
  USER: "user",
};

// Nettoyage de la session locale.
const clearAuthStorage = () => {
  localStorage.removeItem(STORAGE_KEYS.ACCESS);
  localStorage.removeItem(STORAGE_KEYS.REFRESH);
  localStorage.removeItem(STORAGE_KEYS.USER);
};

// Enregistrement des informations de session.
const saveAuthStorage = (tokens, user) => {
  localStorage.setItem(STORAGE_KEYS.ACCESS, tokens.access);

  if (tokens.refresh) {
    localStorage.setItem(STORAGE_KEYS.REFRESH, tokens.refresh);
  }

  localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
};

// Récupération sécurisée de l'utilisateur enregistré.
const getStoredUser = () => {
  try {
    const user = localStorage.getItem(STORAGE_KEYS.USER);
    return user ? JSON.parse(user) : null;
  } catch {
    return null;
  }
};

// Fournisseur global d'authentification.
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(getStoredUser);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Vérifier la session au chargement de l'application.
  const loadUser = useCallback(async () => {
    const accessToken = localStorage.getItem(STORAGE_KEYS.ACCESS);
    const refreshToken = localStorage.getItem(STORAGE_KEYS.REFRESH);

    if (!accessToken && !refreshToken) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const response = await api.get("users/profile/");

      setUser(response.data);

      localStorage.setItem(
        STORAGE_KEYS.USER,
        JSON.stringify(response.data)
      );
    } catch (err) {
      clearAuthStorage();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  // Connexion utilisateur.
  const login = async (credentials) => {
    setError(null);

    try {
      // Demande des jetons JWT à Django.
      const tokenResponse = await api.post("token/", credentials);

      const tokens = tokenResponse.data;

      if (!tokens?.access || !tokens?.refresh) {
        throw new Error(
          "Le serveur n'a pas retourné les jetons JWT attendus."
        );
      }

      // Enregistrer les jetons avant de demander le profil.
      localStorage.setItem(STORAGE_KEYS.ACCESS, tokens.access);
      localStorage.setItem(STORAGE_KEYS.REFRESH, tokens.refresh);

      // Récupérer le profil de l'utilisateur connecté.
      const profileResponse = await api.get("users/profile/");

      const userData = profileResponse.data;

      saveAuthStorage(tokens, userData);

      setUser(userData);

      return userData;
    } catch (err) {
      clearAuthStorage();
      setUser(null);

      const message =
        err.response?.data?.detail ||
        err.response?.data?.non_field_errors?.[0] ||
        err.message ||
        "Impossible de se connecter.";

      setError(message);
      throw err;
    }
  };

  // Déconnexion utilisateur.
  const logout = async () => {
    const refreshToken = localStorage.getItem(STORAGE_KEYS.REFRESH);

    try {
      if (refreshToken) {
        await api.post("users/logout/", {
          refresh: refreshToken,
        });
      }
    } catch (err) {
      console.error("Erreur lors de la déconnexion :", err);
    } finally {
      clearAuthStorage();
      setUser(null);
      setError(null);
    }
  };

  // Actualiser manuellement les informations du profil.
  const refreshUser = async () => {
    try {
      const response = await api.get("users/profile/");

      setUser(response.data);

      localStorage.setItem(
        STORAGE_KEYS.USER,
        JSON.stringify(response.data)
      );

      return response.data;
    } catch (err) {
      throw err;
    }
  };

  const value = {
    user,
    loading,
    error,
    isAuthenticated: Boolean(user),
    login,
    logout,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Hook pour utiliser l'authentification dans les composants.
export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth doit être utilisé à l'intérieur d'un AuthProvider."
    );
  }

  return context;
};

export default AuthContext;
