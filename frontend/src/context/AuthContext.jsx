
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

// Utilisation du client Axios central.
import api from "../api/axios";

// ============================================================
// CONTEXTE D'AUTHENTIFICATION
// ============================================================

const AuthContext = createContext(null);

// Clés utilisées dans le Local Storage.
const STORAGE_KEYS = {
  ACCESS: "access",
  REFRESH: "refresh",
  USER: "user",
};


// ============================================================
// GESTION DU STOCKAGE
// ============================================================

// Nettoyer complètement la session locale.
const clearAuthStorage = () => {
  localStorage.removeItem(STORAGE_KEYS.ACCESS);
  localStorage.removeItem(STORAGE_KEYS.REFRESH);
  localStorage.removeItem(STORAGE_KEYS.USER);
};

// Enregistrer les informations de session.
const saveAuthStorage = (tokens, user) => {
  localStorage.setItem(
    STORAGE_KEYS.ACCESS,
    tokens.access
  );

  if (tokens.refresh) {
    localStorage.setItem(
      STORAGE_KEYS.REFRESH,
      tokens.refresh
    );
  }

  localStorage.setItem(
    STORAGE_KEYS.USER,
    JSON.stringify(user)
  );
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


// ============================================================
// FOURNISSEUR GLOBAL D'AUTHENTIFICATION
// ============================================================

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(getStoredUser);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);


  // ==========================================================
  // CHARGEMENT DE L'UTILISATEUR
  // ==========================================================

  const loadUser = useCallback(async () => {
    const accessToken = localStorage.getItem(
      STORAGE_KEYS.ACCESS
    );

    const refreshToken = localStorage.getItem(
      STORAGE_KEYS.REFRESH
    );

    if (!accessToken && !refreshToken) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      // Le client Axios central ajoute automatiquement
      // le JWT et renouvelle le token si nécessaire.
      const response = await api.get("users/profile/");

      setUser(response.data);

      localStorage.setItem(
        STORAGE_KEYS.USER,
        JSON.stringify(response.data)
      );

    } catch (err) {
      clearAuthStorage();
      setUser(null);

      console.error(
        "Erreur lors du chargement du profil :",
        err.response?.data || err.message
      );

    } finally {
      setLoading(false);
    }
  }, []);


  // Charger la session au démarrage.
  useEffect(() => {
    loadUser();
  }, [loadUser]);


  // ==========================================================
  // CONNEXION
  // ==========================================================

  const login = async (credentials) => {
    setError(null);

    try {
      // Demander les jetons JWT à Django.
      // La route token/ est publique : aucun ancien JWT
      // ne doit être envoyé par le client Axios.
      const tokenResponse = await api.post(
        "token/",
        credentials
      );

      const tokens = tokenResponse.data;

      if (!tokens?.access || !tokens?.refresh) {
        throw new Error(
          "Le serveur n'a pas retourné les jetons JWT attendus."
        );
      }

      // Enregistrer les jetons avant de récupérer le profil.
      localStorage.setItem(
        STORAGE_KEYS.ACCESS,
        tokens.access
      );

      localStorage.setItem(
        STORAGE_KEYS.REFRESH,
        tokens.refresh
      );

      // Récupérer le profil de l'utilisateur connecté.
      const profileResponse = await api.get(
        "users/profile/"
      );

      const userData = profileResponse.data;

      // Enregistrer les jetons et le profil.
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


  // ==========================================================
  // DÉCONNEXION
  // ==========================================================

  const logout = async () => {
    const refreshToken = localStorage.getItem(
      STORAGE_KEYS.REFRESH
    );

    try {
      if (refreshToken) {
        // Cette route est privée : le client central
        // ajoute automatiquement l'Access Token.
        await api.post(
          "users/logout/",
          {
            refresh: refreshToken,
          }
        );
      }

    } catch (err) {
      console.error(
        "Erreur lors de la déconnexion :",
        err.response?.data || err.message
      );

    } finally {
      clearAuthStorage();
      setUser(null);
      setError(null);
    }
  };


  // ==========================================================
  // ACTUALISATION DU PROFIL
  // ==========================================================

  const refreshUser = async () => {
    const response = await api.get("users/profile/");

    setUser(response.data);

    localStorage.setItem(
      STORAGE_KEYS.USER,
      JSON.stringify(response.data)
    );

    return response.data;
  };


  // ==========================================================
  // VALEURS DU CONTEXTE
  // ==========================================================

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


// ============================================================
// HOOK D'AUTHENTIFICATION
// ============================================================

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
