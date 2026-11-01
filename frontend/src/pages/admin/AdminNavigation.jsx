
import { useEffect, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import "./adminNavigation.css";

const ADMIN_LINKS = [
  {
    label: "Tableau de bord",
    path: "/admin/dashboard",
    icon: "▦",
    end: true,
  },
  {
    label: "Utilisateurs",
    path: "/admin/users",
    icon: "♙",
  },
  {
    label: "Entreprises",
    path: "/admin/companies",
    icon: "▤",
  },
  {
    label: "Offres d'emploi",
    path: "/admin/jobs",
    icon: "▣",
  },
  {
    label: "Candidatures",
    path: "/admin/applications",
    icon: "☷",
  },
  {
    label: "Notifications",
    path: "/admin/notifications",
    icon: "♧",
  },
  {
    label: "Rapports",
    path: "/admin/reports",
    icon: "▥",
  },
  {
  label: "Journal d'activité",
  path: "/admin/audit-logs",
  icon: "◷",
},
{
  label: "Modération",
  path: "/admin/moderation",
  icon: "⚑",
},
{
  label: "Vérification des entreprises",
  path: "/admin/verifications",
  icon: "✓",
},
{ label: "Métiers et compétences", path: "/admin/catalog", icon: "◇" },
{ label: "Centre de support", path: "/admin/support", icon: "▤" },
{
  label: "Centre de support",
  path: "/admin/support",
  icon: "💬",
},
{
  label: "Paramètres de la plateforme",
  path: "/admin/settings",
  icon: "⚙️",
},
];

function hasStoredSession() {
  return Boolean(
    localStorage.getItem("access") ||
    sessionStorage.getItem("access")
  );
}

function getStoredUser() {
  try {
    const stored =
      localStorage.getItem("user") ||
      sessionStorage.getItem("user");

    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

export default function AdminNavigation() {
  const location = useLocation();
  const navigate = useNavigate();

  const [hasSession, setHasSession] = useState(hasStoredSession);
  const [menuOpen, setMenuOpen] = useState(false);

  // Actualise l'état lorsque l'utilisateur navigue après une connexion.
  useEffect(() => {
    setHasSession(hasStoredSession());
    setMenuOpen(false);
  }, [location.pathname, location.key]);

  // Cette barre reste visible sur les pages de l'espace administrateur.
  if (!location.pathname.startsWith("/admin")) {
    return null;
  }

  const user = getStoredUser();

  const displayName =
    [user?.first_name, user?.last_name].filter(Boolean).join(" ") ||
    user?.email ||
    "Administrateur";

  function handleLogout() {
    const confirmed = window.confirm(
      "Voulez-vous vraiment vous déconnecter de SunuJob AI ?"
    );

    if (!confirmed) return;

    // Nettoyage des informations de session utilisées par l'application.
    ["access", "refresh", "user"].forEach((key) => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    });

    setHasSession(false);
    setMenuOpen(false);

    navigate("/login", { replace: true });
  }

  function handleLogin() {
    navigate("/login", { replace: false });
  }

  return (
    <header className="admin-navigation">
      <div className="admin-navigation__top">
        <NavLink
          to="/admin/dashboard"
          className="admin-navigation__brand"
          aria-label="Retour au tableau de bord administrateur"
        >
          <span className="admin-navigation__logo">S</span>

          <span className="admin-navigation__brand-copy">
            <strong>SunuJob AI</strong>
            <small>ADMINISTRATION</small>
          </span>
        </NavLink>

        <button
          type="button"
          className="admin-navigation__menu-toggle"
          onClick={() => setMenuOpen((open) => !open)}
          aria-expanded={menuOpen}
          aria-label={
            menuOpen
              ? "Fermer le menu de navigation"
              : "Ouvrir le menu de navigation"
          }
        >
          {menuOpen ? "×" : "☰"}
        </button>

        <div className="admin-navigation__account">
          <span className="admin-navigation__avatar">
            {(displayName || "A").trim().charAt(0).toUpperCase()}
          </span>

          <span className="admin-navigation__identity">
            <strong>{displayName}</strong>
            <small>Administrateur</small>
          </span>

          {hasSession ? (
            <button
              type="button"
              className="admin-navigation__logout"
              onClick={handleLogout}
            >
              <span aria-hidden="true">↪</span>
              Déconnexion
            </button>
          ) : (
            <button
              type="button"
              className="admin-navigation__login"
              onClick={handleLogin}
            >
              Connexion
            </button>
          )}
        </div>
      </div>

      <nav
        className={`admin-navigation__links ${
          menuOpen ? "admin-navigation__links--open" : ""
        }`}
        aria-label="Navigation administrateur"
      >
        {ADMIN_LINKS.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.end || false}
            className={({ isActive }) =>
              `admin-navigation__link ${
                isActive ? "admin-navigation__link--active" : ""
              }`
            }
            onClick={() => setMenuOpen(false)}
          >
            <span
              className="admin-navigation__link-icon"
              aria-hidden="true"
            >
              {item.icon}
            </span>

            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </header>
  );
}
