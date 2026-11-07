
import { useCallback, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function ProtectedLayout() {
  const navigate = useNavigate();

  // Authentification centralisée.
  const {
    user,
    logout: authLogout,
  } = useAuth();

  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Déconnexion centralisée.
  const logout = useCallback(async () => {
    if (isLoggingOut) return;

    setIsLoggingOut(true);

    try {
      // AuthContext se charge de contacter Django,
      // d'invalider le refresh token et de nettoyer la session.
      await authLogout();
    } catch (error) {
      console.error(
        "Erreur pendant la déconnexion :",
        error.message
      );
    } finally {
      // Retour à la page de connexion.
      navigate("/login", {
        replace: true,
        state: { loggedOut: true },
      });

      setIsLoggingOut(false);
    }
  }, [authLogout, isLoggingOut, navigate]);

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