
import React from "react";
import { NavLink, useNavigate } from "react-router-dom";

export default function RecruiterSidebar({ applicationsCount = 0 }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    localStorage.removeItem("user");

    sessionStorage.removeItem("access");
    sessionStorage.removeItem("refresh");
    sessionStorage.removeItem("user");

    navigate("/login", { replace: true });
  };

  const navClass = ({ isActive }) =>
    `recruiter-nav-link ${isActive ? "active" : ""}`;

  return (
    <aside className="recruiter-sidebar">
      <div className="recruiter-brand">
        <div className="recruiter-brand-logo">S</div>
        <div>
          <h2>SunuJob AI</h2>
          <p>Espace recruteur</p>
        </div>
      </div>

      <nav className="recruiter-nav" aria-label="Navigation recruteur">
        <p className="recruiter-nav-heading">MENU PRINCIPAL</p>

        <NavLink to="/recruiter/dashboard" end className={navClass}>
          <span aria-hidden="true">▦</span>
          Tableau de bord
        </NavLink>

        <NavLink to="/recruiter/jobs" className={navClass}>
          <span aria-hidden="true">▤</span>
          Mes offres d'emploi
        </NavLink>

        <NavLink to="/recruiter/applications" className={navClass}>
          <span aria-hidden="true">♙</span>
          Candidatures
          {applicationsCount > 0 && (
            <span className="nav-count">{applicationsCount}</span>
          )}
        </NavLink>

        <NavLink to="/recruiter/interviews" className={navClass}>
          <span aria-hidden="true">◷</span>
          Entretiens
        </NavLink>

        <p className="recruiter-nav-heading">ÉVALUATION ET SÉLECTION</p>

        <NavLink to="/recruiter/evaluations" className={navClass}>
          <span aria-hidden="true">★</span>
          Évaluations
        </NavLink>

        <NavLink to="/recruiter/evaluations/new" className={navClass}>
          <span aria-hidden="true">＋</span>
          Nouvelle évaluation
        </NavLink>

        <p className="recruiter-nav-heading">ENTREPRISE</p>

        <NavLink to="/recruiter/company" className={navClass}>
          <span aria-hidden="true">▧</span>
          Mon entreprise
        </NavLink>
      </nav>

      <div className="recruiter-sidebar-bottom">
        <div className="recruiter-help-card">
          <div className="recruiter-help-icon" aria-hidden="true">✦</div>
          <h3>Besoin d'aide ?</h3>
          <p>
            Gérez vos recrutements plus facilement avec SunuJob AI.
          </p>
        </div>

        <button
          type="button"
          className="recruiter-logout"
          onClick={handleLogout}
        >
          <span aria-hidden="true">↪</span>
          Se déconnecter
        </button>
      </div>
    </aside>
  );
}
