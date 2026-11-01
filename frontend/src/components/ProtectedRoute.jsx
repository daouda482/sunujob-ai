
import { Navigate, Outlet, useLocation } from "react-router-dom";

const VALID_ROLES = [
  "CANDIDATE",
  "RECRUITER",
  "TRAINING_PROVIDER",
  "ADMIN",
];

export default function ProtectedRoute({ allowedRoles = [] }) {
  const location = useLocation();

  const accessToken =
    localStorage.getItem("access") ||
    sessionStorage.getItem("access");

  const storedUser =
    localStorage.getItem("user") ||
    sessionStorage.getItem("user");

  const clearStoredSession = () => {
    ["access", "refresh", "user"].forEach((key) => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    });
  };

  if (!accessToken || !storedUser) {
    return (
      <Navigate
        to="/login"
        state={{ from: location }}
        replace
      />
    );
  }

  let user;

  try {
    user = JSON.parse(storedUser);

    if (
      !user ||
      typeof user !== "object" ||
      Array.isArray(user) ||
      !VALID_ROLES.includes(user.role)
    ) {
      throw new Error("Données utilisateur invalides.");
    }
  } catch {
    clearStoredSession();

    return <Navigate to="/login" replace />;
  }

  if (
    allowedRoles.length > 0 &&
    !allowedRoles.includes(user.role)
  ) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
