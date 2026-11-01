
import { useCallback, useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import api from "../api/axios";
import "./Navbar.css";

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const location = useLocation();

  const storedUser = (() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  })();

  const isLoggedIn = Boolean(
    localStorage.getItem("access") && storedUser
  );

  const dashboardByRole = {
    CANDIDATE: "/candidate/dashboard",
    RECRUITER: "/recruiter/dashboard",
    TRAINING_PROVIDER: "/training-provider/dashboard",
    ADMIN: "/admin/dashboard",
  };

  const dashboardLink = dashboardByRole[storedUser?.role] || "/";

  const links = [
    { label: "Accueil", to: "/", end: true },
    { label: "Offres d'emploi", to: "/jobs" },
    { label: "Fonctionnalités", to: "/#fonctionnalites", anchor: true },
    { label: "À propos", to: "/#apropos", anchor: true },
  ];

  const closeMenu = () => setMenuOpen(false);

  const loadUnreadCount = useCallback(async () => {
    if (!localStorage.getItem("access")) {
      setUnreadCount(0);
      return;
    }

    try {
      const response = await api.get("notifications/unread-count/");
      setUnreadCount(Number(response.data?.unread_count) || 0);
    } catch (error) {
      if (error.response?.status === 401) {
        setUnreadCount(0);
      } else {
        console.error(
          "Impossible de charger le compteur de notifications.",
          error
        );
      }
    }
  }, []);

  useEffect(() => {
  if (!isLoggedIn) {
    setUnreadCount(0);
    return undefined;
  }

  loadUnreadCount();

  const intervalId = window.setInterval(() => {
    loadUnreadCount();
  }, 30000);

  return () => {
    window.clearInterval(intervalId);
  };
}, [isLoggedIn, loadUnreadCount]);

  return (
    <header className="sj-navbar">
      <div className="sj-navbar-inner">
        <Link
          to="/"
          className="sj-brand"
          aria-label="SunuJob AI - Accueil"
          onClick={closeMenu}
        >
          <span className="sj-brand-symbol" aria-hidden="true">
            <span>S</span>
            <i>✦</i>
          </span>

          <span className="sj-brand-text">
            <strong>SunuJob</strong>
            <span>AI</span>
            <small>VOTRE AVENIR, AUTREMENT</small>
          </span>
        </Link>

        <nav className="sj-desktop-nav" aria-label="Navigation principale">
          {links.map((link) =>
            link.anchor ? (
              <a
                key={link.label}
                href={link.to}
                className="sj-nav-link"
              >
                {link.label}
              </a>
            ) : (
              <NavLink
                key={link.label}
                to={link.to}
                end={link.end}
                className={({ isActive }) =>
                  `sj-nav-link${isActive ? " sj-nav-link-active" : ""}`
                }
              >
                {link.label}
              </NavLink>
            )
          )}
        </nav>

        <div className="sj-navbar-actions">
          {isLoggedIn ? (
            <>
              <Link
                to="/notifications"
                className="sj-notification-btn"
                aria-label={
                  unreadCount > 0
                    ? `Notifications, ${unreadCount} non lues`
                    : "Notifications"
                }
                title="Notifications"
                onClick={closeMenu}
              >
                <svg
                  viewBox="0 0 24 24"
                  width="21"
                  height="21"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
                  <path d="M10 21h4" />
                </svg>

                {unreadCount > 0 && (
                  <span className="sj-notification-badge">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </Link>

              <Link
                to={dashboardLink}
                className="sj-account-btn"
                onClick={closeMenu}
              >
                Mon espace <span aria-hidden="true">↗</span>
              </Link>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="sj-login-btn"
                onClick={closeMenu}
              >
                Connexion
              </Link>

              <Link
                to="/register"
                className="sj-register-btn"
                onClick={closeMenu}
              >
                <span>Créer un compte</span>
                <span className="sj-register-arrow" aria-hidden="true">
                  →
                </span>
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          className={`sj-menu-toggle${menuOpen ? " is-open" : ""}`}
          aria-label={menuOpen ? "Fermer le menu" : "Ouvrir le menu"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span />
          <span />
          <span />
        </button>
      </div>

      <div className={`sj-mobile-menu${menuOpen ? " is-open" : ""}`}>
        <nav aria-label="Navigation mobile">
          {links.map((link) =>
            link.anchor ? (
              <a
                key={link.label}
                href={link.to}
                className="sj-mobile-link"
                onClick={closeMenu}
              >
                {link.label}
              </a>
            ) : (
              <NavLink
                key={link.label}
                to={link.to}
                end={link.end}
                className={({ isActive }) =>
                  `sj-mobile-link${isActive ? " sj-mobile-link-active" : ""}`
                }
                onClick={closeMenu}
              >
                {link.label}
              </NavLink>
            )
          )}

          {isLoggedIn ? (
            <>
              <Link
                to="/notifications"
                className="sj-mobile-link"
                onClick={closeMenu}
              >
                Notifications
                {unreadCount > 0 && (
                  <span className="sj-mobile-notification-count">
                    {unreadCount} non lue(s)
                  </span>
                )}
              </Link>

              <Link
                to={dashboardLink}
                className="sj-register-btn sj-mobile-cta"
                onClick={closeMenu}
              >
                Mon espace <span aria-hidden="true">→</span>
              </Link>
            </>
          ) : (
            <div className="sj-mobile-actions">
              <Link
                to="/login"
                className="sj-login-btn"
                onClick={closeMenu}
              >
                Connexion
              </Link>

              <Link
                to="/register"
                className="sj-register-btn"
                onClick={closeMenu}
              >
                Créer un compte <span aria-hidden="true">→</span>
              </Link>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
