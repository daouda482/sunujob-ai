
import { Navigate, Outlet, useLocation } from "react-router-dom";

const VALID_ROLES = [
  "CANDIDATE",
  "RECRUITER",
  "TRAINING_PROVIDER",
  "ADMIN",
];

const ROLE_DESTINATIONS = {
  CANDIDATE: "/candidate/dashboard",
  RECRUITER: "/recruiter/dashboard",
  TRAINING_PROVIDER: "/training-provider/dashboard",
  ADMIN: "/admin/dashboard",
};

function clearStoredSession() {
  ["access", "refresh", "user"].forEach((key) => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  });
}

export default function ProtectedRoute({ allowedRoles = [] }) {
  const location = useLocation();

  const accessToken =
    localStorage.getItem("access") ||
    sessionStorage.getItem("access");

  const storedUser =
    localStorage.getItem("user") ||
    sessionStorage.getItem("user");

  // 1. Vérifier la présence de la session.
  if (!accessToken || !storedUser) {
    return (
      <Navigate
        to="/login"
        state={{ from: location }}
        replace
      />
    );
  }

  // 2. Vérifier les informations utilisateur.
  let user;

  try {
    user = JSON.parse(storedUser);

    if (
      !user ||
      typeof user !== "object" ||
      Array.isArray(user)
    ) {
      throw new Error("Utilisateur invalide.");
    }

    user.role = String(user.role || "").toUpperCase();

    if (!VALID_ROLES.includes(user.role)) {
      throw new Error("Rôle utilisateur invalide.");
    }
  } catch {
    clearStoredSession();

    return (
      <Navigate
        to="/login"
        state={{ from: location }}
        replace
      />
    );
  }

  // 3. Vérifier les rôles autorisés.
  if (
    allowedRoles.length > 0 &&
    !allowedRoles.includes(user.role)
  ) {
    const destination =
      ROLE_DESTINATIONS[user.role] || "/login";

    return <Navigate to={destination} replace />;
  }

  // 4. Autoriser l'accès à la page.
  return <Outlet />;
}
