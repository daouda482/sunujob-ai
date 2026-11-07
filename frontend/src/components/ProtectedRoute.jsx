
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const ROLE_DESTINATIONS = {
  CANDIDATE: "/candidate/dashboard",
  RECRUITER: "/recruiter/dashboard",
  TRAINING_PROVIDER: "/training-provider/dashboard",
  ADMIN: "/admin/dashboard",
};

export default function ProtectedRoute({ allowedRoles = [] }) {
  const { user, loading, isAuthenticated } = useAuth();
  const location = useLocation();

  // 1. Attendre la vérification de la session.
  if (loading) {
    return (
      <div
        className="d-flex justify-content-center align-items-center"
        style={{ minHeight: "60vh" }}
      >
        <div className="text-center">
          <div
            className="spinner-border text-primary mb-3"
            role="status"
          >
            <span className="visually-hidden">
              Chargement...
            </span>
          </div>

          <p className="text-muted mb-0">
            Vérification de votre session...
          </p>
        </div>
      </div>
    );
  }

  // 2. Vérifier si l'utilisateur est connecté.
  if (!isAuthenticated || !user) {
    return (
      <Navigate
        to="/login"
        state={{ from: location }}
        replace
      />
    );
  }

  // 3. Vérifier le rôle de l'utilisateur.
  const userRole = String(user.role || "").toUpperCase();

  if (!ROLE_DESTINATIONS[userRole]) {
    return <Navigate to="/login" replace />;
  }

  // 4. Vérifier les rôles autorisés pour cette route.
  if (
    allowedRoles.length > 0 &&
    !allowedRoles
      .map((role) => String(role).toUpperCase())
      .includes(userRole)
  ) {
    return (
      <Navigate
        to={ROLE_DESTINATIONS[userRole]}
        replace
      />
    );
  }

  // 5. Autoriser l'accès.
  return <Outlet />;
}
