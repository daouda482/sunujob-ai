
import React, { useCallback, useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import api from "../../api/axios";
import "./RecruiterDashboard.css";

const STATUS_LABELS = {
  PUBLISHED: "Publiée",
  PENDING: "En attente",
  DRAFT: "Brouillon",
  CLOSED: "Clôturée",
  OPEN: "Ouverte",
  ACTIVE: "Active",
  ACCEPTED: "Acceptée",
  REJECTED: "Refusée",
  REVIEWING: "En examen",
  SHORTLISTED: "Présélectionnée",
  INTERVIEW: "Entretien",
  SCHEDULED: "Programmé",
  COMPLETED: "Terminé",
  CANCELLED: "Annulé",
  CANCELED: "Annulé",
  WITHDRAWN: "Retirée",
};

function getStatusLabel(status) {
  const normalizedStatus = String(status || "")
    .trim()
    .toUpperCase();

  return STATUS_LABELS[normalizedStatus] || normalizedStatus || "Non défini";
}

function getJobStatus(job) {
  return String(job?.status || job?.publication_status || "")
    .trim()
    .toUpperCase();
}

function getApplicationStatus(application) {
  return String(application?.status || "")
    .trim()
    .toUpperCase();
}

function getInterviewStatus(interview) {
  return String(interview?.status || "")
    .trim()
    .toUpperCase();
}

function extractList(response) {
  const data = response?.data;

  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data?.results)) {
    return data.results;
  }

  if (Array.isArray(data?.jobs)) {
    return data.jobs;
  }

  if (Array.isArray(data?.applications)) {
    return data.applications;
  }

  if (Array.isArray(data?.interviews)) {
    return data.interviews;
  }

  if (Array.isArray(data?.candidatures)) {
    return data.candidatures;
  }

  return [];
}

function StatusBadge({ status }) {
  const normalizedStatus = String(status || "PENDING")
    .trim()
    .toUpperCase();

  const className = normalizedStatus
    .toLowerCase()
    .replace(/_/g, "-");

  return (
    <span className={`status-badge status-${className}`}>
      {getStatusLabel(normalizedStatus)}
    </span>
  );
}

function StatCard({ title, value, description, icon, loading }) {
  return (
    <article className="stat-card">
      <div className="stat-card-top">
        <div>
          <p className="stat-card-title">{title}</p>

          <h3 className="stat-card-value">
            {loading ? "..." : value}
          </h3>
        </div>

        <div className="stat-card-icon" aria-hidden="true">
          {icon}
        </div>
      </div>

      {description && (
        <p className="stat-card-description">{description}</p>
      )}
    </article>
  );
}

export default function RecruiterDashboard() {
  const navigate = useNavigate();

  const [jobs, setJobs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [interviews, setInterviews] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");

    const requests = [
      {
        name: "offres",
        url: "jobs/",
        setter: setJobs,
      },
      {
        name: "candidatures",
        url: "applications/received/",
        setter: setApplications,
      },
      {
        name: "entretiens",
        url: "interviews/",
        setter: setInterviews,
      },
    ];

    const results = await Promise.allSettled(
      requests.map((request) => api.get(request.url))
    );

    const failedRequests = [];

    results.forEach((result, index) => {
      const request = requests[index];

      if (result.status === "fulfilled") {
        request.setter(extractList(result.value));
      } else {
        request.setter([]);
        failedRequests.push(request.name);

        console.error(
          `Erreur de chargement (${request.name}) :`,
          result.reason?.response?.data || result.reason?.message
        );
      }
    });

    if (failedRequests.length > 0) {
      setError(
        `Certaines données n'ont pas pu être chargées : ${failedRequests.join(
          ", "
        )}. Vérifie les routes de l'API et les autorisations du recruteur.`
      );
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const handleLogout = () => {
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    localStorage.removeItem("user");

    sessionStorage.removeItem("access");
    sessionStorage.removeItem("refresh");
    sessionStorage.removeItem("user");

    navigate("/login", { replace: true });
  };

  const publishedJobs = jobs.filter((job) =>
    ["PUBLISHED", "OPEN", "ACTIVE"].includes(getJobStatus(job))
  );

  const completedApplications = applications.filter((application) =>
    ["ACCEPTED", "HIRED", "RECRUITED"].includes(
      getApplicationStatus(application)
    )
  );

  const upcomingInterviews = interviews.filter((interview) => {
    const status = getInterviewStatus(interview);

    return !["CANCELLED", "CANCELED", "COMPLETED"].includes(status);
  });

  const recentApplications = [...applications]
    .sort((a, b) => {
      const dateA = new Date(
        a.created_at || a.created || a.application_date || 0
      ).getTime();

      const dateB = new Date(
        b.created_at || b.created || b.application_date || 0
      ).getTime();

      return dateB - dateA;
    })
    .slice(0, 5);

  return (
    <div className="recruiter-dashboard">
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

          <NavLink
            to="/recruiter/dashboard"
            className={({ isActive }) =>
              `recruiter-nav-link ${isActive ? "active" : ""}`
            }
          >
            <span aria-hidden="true">▦</span>
            Tableau de bord
          </NavLink>

          <NavLink
            to="/recruiter/jobs"
            className={({ isActive }) =>
              `recruiter-nav-link ${isActive ? "active" : ""}`
            }
          >
            <span aria-hidden="true">▤</span>
            Mes offres d'emploi
          </NavLink>

          <NavLink
            to="/recruiter/applications"
            className={({ isActive }) =>
              `recruiter-nav-link ${isActive ? "active" : ""}`
            }
          >
            <span aria-hidden="true">♙</span>
            Candidatures
            {applications.length > 0 && (
              <span className="nav-count">{applications.length}</span>
            )}
          </NavLink>

          <NavLink
            to="/recruiter/interviews"
            className={({ isActive }) =>
              `recruiter-nav-link ${isActive ? "active" : ""}`
            }
          >
            <span aria-hidden="true">◷</span>
            Entretiens
          </NavLink>

          <p className="recruiter-nav-heading">ENTREPRISE</p>

          <NavLink
            to="/recruiter/company"
            className={({ isActive }) =>
              `recruiter-nav-link ${isActive ? "active" : ""}`
            }
          >
            <span aria-hidden="true">▧</span>
            Mon entreprise
          </NavLink>
        </nav>

        <div className="recruiter-sidebar-bottom">
          <div className="recruiter-help-card">
            <div className="recruiter-help-icon" aria-hidden="true">
              ✦
            </div>

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

      <main className="recruiter-main">
        <header className="recruiter-topbar">
          <div>
            <p className="recruiter-breadcrumb">
              Espace recruteur / Tableau de bord
            </p>

            <h1>Tableau de bord</h1>
            <p className="recruiter-page-subtitle">
              Suivez vos offres, vos candidatures et vos recrutements.
            </p>
          </div>

          <div className="recruiter-topbar-actions">
            <button
              type="button"
              className="recruiter-refresh-btn"
              onClick={loadDashboard}
              disabled={loading}
            >
              {loading ? "Actualisation..." : "↻ Actualiser"}
            </button>

            <NavLink
              to="/recruiter/jobs/new"
              className="recruiter-primary-btn"
            >
              + Publier une offre
            </NavLink>
          </div>
        </header>

        {error && (
          <div className="recruiter-alert" role="alert">
            <p>{error}</p>

            <button type="button" onClick={loadDashboard}>
              Réessayer
            </button>
          </div>
        )}

        <section className="recruiter-welcome">
          <div>
            <span className="recruiter-welcome-label">
              VOTRE ESPACE DE RECRUTEMENT
            </span>

            <h2>Recrutez les meilleurs talents.</h2>

            <p>
              Retrouvez en un seul endroit les informations essentielles
              pour suivre votre processus de recrutement.
            </p>

            <NavLink to="/recruiter/jobs/new" className="welcome-cta">
              Créer une offre <span aria-hidden="true">→</span>
            </NavLink>
          </div>

          <div className="recruiter-welcome-art" aria-hidden="true">
            <div className="welcome-art-circle">
              <span>✦</span>
            </div>

            <div className="welcome-art-card welcome-art-card-one">
              <span>✓</span>
              Profil qualifié
            </div>

            <div className="welcome-art-card welcome-art-card-two">
              <span>↗</span>
              Nouveau talent
            </div>
          </div>
        </section>

        <section className="recruiter-stats-grid" aria-label="Statistiques">
          <StatCard
            title="Offres publiées"
            value={publishedJobs.length}
            description="Offres actuellement actives"
            icon="▤"
            loading={loading}
          />

          <StatCard
            title="Candidatures reçues"
            value={applications.length}
            description="Candidatures associées à vos offres"
            icon="♙"
            loading={loading}
          />

          <StatCard
            title="Entretiens à suivre"
            value={upcomingInterviews.length}
            description="Entretiens non annulés ou terminés"
            icon="◷"
            loading={loading}
          />

          <StatCard
            title="Candidatures acceptées"
            value={completedApplications.length}
            description="Candidatures retenues"
            icon="✓"
            loading={loading}
          />
        </section>

        <section className="recruiter-content-grid">
          <article className="recruiter-panel recruiter-applications-panel">
            <div className="recruiter-panel-header">
              <div>
                <h2>Candidatures récentes</h2>
                <p>Les dernières candidatures reçues sur vos offres.</p>
              </div>

              <NavLink to="/recruiter/applications" className="recruiter-view-all">
                Tout voir →
              </NavLink>
            </div>

            {loading ? (
              <div className="recruiter-empty-state">
                Chargement des candidatures...
              </div>
            ) : recentApplications.length === 0 ? (
              <div className="recruiter-empty-state">
                <span aria-hidden="true">♙</span>
                <h3>Aucune candidature pour le moment</h3>
                <p>
                  Les candidatures reçues apparaîtront ici dès qu'un candidat
                  postulera à l'une de vos offres.
                </p>
              </div>
            ) : (
              <div className="recruiter-table-wrapper">
                <table className="recruiter-table">
                  <thead>
                    <tr>
                      <th>Candidat</th>
                      <th>Offre</th>
                      <th>Date</th>
                      <th>Statut</th>
                    </tr>
                  </thead>

                  <tbody>
                    {recentApplications.map((application) => {
                      const candidate =
                        application.candidate_name ||
                        application.candidate?.full_name ||
                        application.candidate?.user?.full_name ||
                        application.candidate?.user?.username ||
                        application.applicant_name ||
                        "Candidat";

                      const jobTitle =
                        application.job_title ||
                        application.job?.title ||
                        application.job?.name ||
                        "Offre d'emploi";

                      const applicationDate =
                        application.created_at ||
                        application.created ||
                        application.application_date;

                      const formattedDate = applicationDate
                        ? new Date(applicationDate).toLocaleDateString("fr-FR")
                        : "—";

                      return (
                        <tr key={application.id}>
                          <td>
                            <div className="recruiter-candidate-cell">
                              <div className="candidate-avatar">
                                {String(candidate).charAt(0).toUpperCase()}
                              </div>

                              <span>{candidate}</span>
                            </div>
                          </td>

                          <td>{jobTitle}</td>
                          <td>{formattedDate}</td>

                          <td>
                            <StatusBadge status={application.status} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </article>

          <article className="recruiter-panel recruiter-quick-actions">
            <div className="recruiter-panel-header">
              <div>
                <h2>Actions rapides</h2>
                <p>Accédez directement aux fonctions essentielles.</p>
              </div>
            </div>

            <NavLink to="/recruiter/jobs/new" className="quick-action-item">
              <span className="quick-action-icon">＋</span>
              <span>
                <strong>Publier une offre</strong>
                <small>Attirez de nouveaux candidats</small>
              </span>
              <span className="quick-action-arrow">→</span>
            </NavLink>

            <NavLink
              to="/recruiter/applications"
              className="quick-action-item"
            >
              <span className="quick-action-icon">♙</span>
              <span>
                <strong>Examiner les candidatures</strong>
                <small>Consultez les profils reçus</small>
              </span>
              <span className="quick-action-arrow">→</span>
            </NavLink>

            <NavLink
              to="/recruiter/interviews"
              className="quick-action-item"
            >
              <span className="quick-action-icon">◷</span>
              <span>
                <strong>Gérer les entretiens</strong>
                <small>Organisez vos rendez-vous</small>
              </span>
              <span className="quick-action-arrow">→</span>
            </NavLink>

            <NavLink
              to="/recruiter/company"
              className="quick-action-item"
            >
              <span className="quick-action-icon">▧</span>
              <span>
                <strong>Profil de l'entreprise</strong>
                <small>Mettez à jour vos informations</small>
              </span>
              <span className="quick-action-arrow">→</span>
            </NavLink>
          </article>
        </section>

        <footer className="recruiter-footer">
          <p>© {new Date().getFullYear()} SunuJob AI — Conçu au Sénégal 🇸🇳</p>
          <p>La technologie au service de l'emploi.</p>
        </footer>
      </main>
    </div>
  );
}
