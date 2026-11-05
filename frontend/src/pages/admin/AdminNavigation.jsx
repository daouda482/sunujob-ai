import { useEffect, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import "./adminNavigation.css";

const ADMIN_SECTIONS = [
  {
    title: "GÉNÉRAL",
    links: [
      { label: "Tableau de bord", path: "/admin/dashboard", icon: "▦", end: true },
    ],
  },
  {
    title: "GESTION",
    links: [
      { label: "Utilisateurs", path: "/admin/users", icon: "♙" },
      { label: "Entreprises", path: "/admin/companies", icon: "▤" },
      { label: "Offres d'emploi", path: "/admin/jobs", icon: "▣" },
      { label: "Candidatures", path: "/admin/applications", icon: "☷" },
      { label: "Vérifications", path: "/admin/verifications", icon: "✓" },
      { label: "Modération", path: "/admin/moderation", icon: "⚑" },
      { label: "Métiers et compétences", path: "/admin/catalog", icon: "◇" },
    ],
  },
  {
    title: "SUIVI",
    links: [
      { label: "Notifications", path: "/admin/notifications", icon: "♧" },
      { label: "Rapports", path: "/admin/reports", icon: "▥" },
      { label: "Journal d'activité", path: "/admin/audit-logs", icon: "◷" },
      { label: "Centre de support", path: "/admin/support", icon: "▤" },
    ],
  },
];

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
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  if (!location.pathname.startsWith("/admin")) {
    return null;
  }

  const user = getStoredUser();

  const displayName =
    [user?.first_name, user?.last_name].filter(Boolean).join(" ") ||
    user?.email ||
    "Administrateur";

  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");

  function handleLogout() {
    const confirmed = window.confirm(
      "Voulez-vous vraiment vous déconnecter de SunuJob AI ?"
    );

    if (!confirmed) return;

    ["access", "refresh", "user"].forEach((key) => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    });

    navigate("/login", { replace: true });
  }

  return (
    <>
      <button
        type="button"
        className={`admin-sidebar-overlay ${menuOpen ? "is-visible" : ""}`}
        aria-label="Fermer le menu"
        onClick={() => setMenuOpen(false)}
      />

      <aside className={`admin-sidebar ${menuOpen ? "admin-sidebar--open" : ""}`}>
        <div className="admin-sidebar__brand">
          <NavLink to="/admin/dashboard" className="admin-sidebar__brand-link">
            <span className="admin-sidebar__logo">S</span>
            <span className="admin-sidebar__brand-text">
              <strong>SunuJob AI</strong>
              <small>ADMINISTRATION</small>
            </span>
          </NavLink>

          <button
            type="button"
            className="admin-sidebar__close"
            onClick={() => setMenuOpen(false)}
            aria-label="Fermer le menu"
          >
            ×
          </button>
        </div>

        <div className="admin-sidebar__profile">
          <div className="admin-sidebar__avatar">{initials || "A"}</div>
          <div className="admin-sidebar__profile-info">
            <strong>{displayName}</strong>
            <span>Administrateur</span>
          </div>
          <span className="admin-sidebar__online" title="Connecté" />
        </div>

        <nav className="admin-sidebar__nav" aria-label="Navigation administrateur">
          {ADMIN_SECTIONS.map((section) => (
            <div className="admin-sidebar__section" key={section.title}>
              <p className="admin-sidebar__section-title">{section.title}</p>

              {section.links.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.end || false}
                  className={({ isActive }) =>
                    `admin-sidebar__link ${isActive ? "is-active" : ""}`
                  }
                  onClick={() => setMenuOpen(false)}
                >
                  <span className="admin-sidebar__icon" aria-hidden="true">
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                  {item.path === "/admin/verifications" && (
                    <span className="admin-sidebar__link-dot" />
                  )}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="admin-sidebar__footer">
          <div className="admin-sidebar__footer-note">
            <span className="admin-sidebar__footer-icon">🇸🇳</span>
            <div>
              <strong>Conçu au Sénégal</strong>
              <small>La plateforme de l'emploi</small>
            </div>
          </div>

          <button
            type="button"
            className="admin-sidebar__logout"
            onClick={handleLogout}
          >
            <span aria-hidden="true">↪</span>
            Déconnexion
          </button>

          <p className="admin-sidebar__version">SunuJob AI · Espace administrateur</p>
        </div>
      </aside>

      <button
        type="button"
        className="admin-mobile-toggle"
        onClick={() => setMenuOpen(true)}
        aria-label="Ouvrir le menu administrateur"
      >
        <span>☰</span>
        <strong>SunuJob AI</strong>
      </button>
    </>
  );
}