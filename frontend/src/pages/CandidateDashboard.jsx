
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import api from "../api/axios";
import "./CandidateDashboard.css";

const API_ORIGIN = (
  import.meta.env.VITE_API_BASE_URL ||
  "http://127.0.0.1:8000/api/"
)
  .replace(/\/$/, "")
  .replace(/\/api$/i, "");

const NAV_GROUPS = [
  {
    title: "MON ESPACE",
    items: [
      {
        label: "Tableau de bord",
        path: "/candidate/dashboard",
        icon: "▦",
        exact: true,
      },
      {
        label: "Trouver un emploi",
        path: "/jobs",
        icon: "⌕",
      },
      {
        label: "Mes candidatures",
        path: "/candidate/applications",
        icon: "▤",
      },
      {
        label: "Recommandations IA",
        path: "/candidate/recommendations",
        icon: "✦",
      },
    ],
  },
  {
    title: "MON PROFIL ET MES DOCUMENTS",
    items: [
      {
        label: "Mon profil professionnel",
        path: "/candidate/profile",
        icon: "♙",
      },
      {
        label: "Mon CV",
        path: "/candidate/cv",
        icon: "▧",
      },
    ],
  },
  {
    title: "MES OUTILS CARRIÈRE",
    items: [
      {
        label: "Mes entretiens",
        path: "/candidate/interviews",
        icon: "◷",
      },
      {
        label: "Coach carrière IA",
        path: "/candidate/ai-coach",
        icon: "✧",
      },
      {
        label: "Analyse de CV par IA",
        path: "/candidate/cv-analysis",
        icon: "✦",
        badge: "IA",
      },
    ],
  },
  {
    title: "MON COMPTE",
    items: [
      {
        label: "Notifications",
        path: "/candidate/notifications",
        icon: "♢",
      },
      {
        label: "Centre de support",
        path: "/support",
        icon: "?",
      },
    ],
  },
];

function extractList(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.applications)) return data.applications;
  if (Array.isArray(data?.jobs)) return data.jobs;
  return [];
}

function getStatus(status) {
  const labels = {
    PENDING: "Envoyée",
    REVIEWING: "En cours d'examen",
    SHORTLISTED: "Présélectionnée",
    INTERVIEW: "Entretien",
    ACCEPTED: "Acceptée",
    REJECTED: "Refusée",
    WITHDRAWN: "Retirée",
  };

  return labels[status] || status || "En attente";
}

function getJobTitle(application) {
  return (
    application.job_title ||
    application.job?.title ||
    application.job?.name ||
    "Offre d'emploi"
  );
}

function getCompanyName(application) {
  return (
    application.company_name ||
    application.job?.company?.name ||
    application.job?.company_name ||
    "Entreprise"
  );
}

function profileCompletion(profile) {
  if (!profile) return 0;

  const fields = [
    profile.first_name || profile.user?.first_name,
    profile.last_name || profile.user?.last_name,
    profile.email || profile.user?.email,
    profile.city,
    profile.education_level,
    profile.field_of_study,
    profile.biography,
    profile.resume,
    profile.photo,
    profile.years_of_experience !== null &&
      profile.years_of_experience !== undefined,
  ];

  const complete = fields.filter((value) => {
    if (typeof value === "boolean") return value;
    if (typeof value === "number") return true;
    return Boolean(value && String(value).trim());
  }).length;

  return Math.round((complete / fields.length) * 100);
}

function initials(profile) {
  const first =
    profile?.first_name ||
    profile?.user?.first_name ||
    "";

  const last =
    profile?.last_name ||
    profile?.user?.last_name ||
    "";

  return (
    `${first.charAt(0)}${last.charAt(0)}`.toUpperCase() || "C"
  );
}

function mediaUrl(value) {
  if (!value) return "";

  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  return `${API_ORIGIN}${value.startsWith("/") ? value : `/${value}`}`;
}

function formatDate(value) {
  if (!value) return "Date non renseignée";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Date non disponible";
  }

  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getApplicationDate(application) {
  return (
    application.applied_at ||
    application.created_at ||
    application.submitted_at
  );
}

export default function CandidateDashboard() {
  const navigate = useNavigate();
  const location = useLocation();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profile, setProfile] = useState(null);
  const [applications, setApplications] = useState([]);
  const [recommendedJobs, setRecommendedJobs] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadDashboard = useCallback(
    async (isRefresh = false) => {
      const token =
        localStorage.getItem("access") ||
        sessionStorage.getItem("access");

      if (!token) {
        navigate("/login", {
          replace: true,
          state: { from: location.pathname },
        });
        return;
      }

      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      try {
        const results = await Promise.allSettled([
          api.get("users/profile/"),
          api.get("candidates/profile/me/"),
          api.get("applications/my/"),
          api.get("matching/recommended-jobs/"),
        ]);

        const [
          userResult,
          candidateResult,
          applicationsResult,
          jobsResult,
        ] = results;

        const userData =
          userResult.status === "fulfilled"
            ? userResult.value.data || {}
            : {};

        const candidateData =
          candidateResult.status === "fulfilled"
            ? candidateResult.value.data || {}
            : {};

        const nestedUser = userData.user || userData;

        setProfile({
          ...nestedUser,
          ...userData,
          ...candidateData,
          user: {
            ...nestedUser,
            ...(candidateData.user || {}),
          },
        });

        if (applicationsResult.status === "fulfilled") {
          setApplications(extractList(applicationsResult.value.data));
        } else {
          setApplications([]);
        }

        if (jobsResult.status === "fulfilled") {
          setRecommendedJobs(extractList(jobsResult.value.data));
        } else {
          setRecommendedJobs([]);
        }

        const meaningfulFailures = results.filter((result, index) => {
          if (result.status !== "rejected") return false;

          // Le profil candidat peut ne pas encore exister.
          if (
            index === 1 &&
            result.reason?.response?.status === 404
          ) {
            return false;
          }

          return true;
        });

        if (meaningfulFailures.length === results.length) {
          setError(
            "Impossible de charger les données. Vérifiez votre connexion au serveur puis réessayez."
          );
        } else if (meaningfulFailures.length > 0) {
          setError(
            "Certaines données ne sont pas disponibles actuellement. Les autres sections restent consultables."
          );
        }
      } catch (err) {
        console.error("Erreur du tableau de bord candidat :", err);
        setError(
          "Une erreur est survenue pendant le chargement de votre espace candidat."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [navigate, location.pathname]
  );

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  function handleLogout() {
    ["access", "refresh", "user"].forEach((key) => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    });

    navigate("/login", { replace: true });
  }

  const fullName = useMemo(() => {
    const first =
      profile?.first_name ||
      profile?.user?.first_name ||
      "";

    const last =
      profile?.last_name ||
      profile?.user?.last_name ||
      "";

    return [first, last].filter(Boolean).join(" ");
  }, [profile]);

  const email =
    profile?.email ||
    profile?.user?.email ||
    "";

  const completion = useMemo(
    () => profileCompletion(profile),
    [profile]
  );

  const applicationStats = useMemo(
    () => ({
      total: applications.length,

      active: applications.filter((item) =>
        ["PENDING", "REVIEWING", "SHORTLISTED"].includes(
          String(item.status || "").toUpperCase()
        )
      ).length,

      interviews: applications.filter(
        (item) =>
          String(item.status || "").toUpperCase() === "INTERVIEW"
      ).length,

      accepted: applications.filter(
        (item) =>
          String(item.status || "").toUpperCase() === "ACCEPTED"
      ).length,
    }),
    [applications]
  );

  if (loading) {
    return (
      <main className="candidate-dashboard-loading">
        <span className="candidate-dashboard-spinner" />
        <strong>Préparation de votre espace candidat...</strong>
        <p>Nous chargeons vos candidatures et vos opportunités.</p>
      </main>
    );
  }

  return (
    <div className="candidate-dashboard-shell">
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Fermer le menu"
          className="candidate-sidebar-backdrop"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`candidate-sidebar ${
          sidebarOpen ? "candidate-sidebar--open" : ""
        }`}
        aria-label="Navigation principale du candidat"
      >
        <Link
          to="/candidate/dashboard"
          className="candidate-brand"
          onClick={() => setSidebarOpen(false)}
        >
          <span className="candidate-brand-mark">S</span>

          <span className="candidate-brand-copy">
            SunuJob <strong>AI</strong>
            <small>La carrière en mouvement</small>
          </span>
        </Link>

        <div className="candidate-sidebar-user">
          <div className="candidate-sidebar-avatar">
            {profile?.photo ? (
              <img src={mediaUrl(profile.photo)} alt="Photo de profil" />
            ) : (
              initials(profile)
            )}
          </div>

          <div className="candidate-sidebar-user-copy">
            <strong>{fullName || "Espace candidat"}</strong>
            <span>{email || "Profil professionnel"}</span>
          </div>

          <span
            className="candidate-user-status"
            title="Compte connecté"
          />
        </div>

        <nav className="candidate-side-nav">
          {NAV_GROUPS.map((group) => (
            <div className="candidate-nav-group" key={group.title}>
              <p className="candidate-nav-heading">{group.title}</p>

              {group.items.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.exact}
                  className={({ isActive }) =>
                    `candidate-nav-link ${
                      isActive ? "candidate-nav-link--active" : ""
                    }`
                  }
                  onClick={() => setSidebarOpen(false)}
                >
                  <span className="candidate-nav-icon" aria-hidden="true">
                    {item.icon}
                  </span>

                  <span className="candidate-nav-label">
                    {item.label}
                  </span>

                  {item.badge && (
                    <span className="candidate-nav-badge">
                      {item.badge}
                    </span>
                  )}

                  {item.path === "/candidate/applications" &&
                    applicationStats.total > 0 && (
                      <span className="candidate-nav-count">
                        {applicationStats.total}
                      </span>
                    )}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="candidate-sidebar-bottom">
          <div className="candidate-help-card">
            <span aria-hidden="true">✦</span>

            <strong>Votre prochain emploi commence ici.</strong>

            <p>
              Gardez votre profil et votre CV à jour pour mieux
              valoriser votre parcours.
            </p>

            <Link
              to="/candidate/profile"
              onClick={() => setSidebarOpen(false)}
            >
              Améliorer mon profil →
            </Link>
          </div>

          <button
            type="button"
            className="candidate-logout-button"
            onClick={handleLogout}
          >
            <span aria-hidden="true">↪</span>
            Déconnexion
          </button>

          <small className="candidate-sidebar-footnote">
            Conçu au Sénégal 🇸🇳
          </small>
        </div>
      </aside>

      <div className="candidate-dashboard-main">
        <header className="candidate-topbar">
          <button
            type="button"
            className="candidate-menu-toggle"
            aria-label="Ouvrir le menu de navigation"
            aria-expanded={sidebarOpen}
            onClick={() => setSidebarOpen(true)}
          >
            ☰
          </button>

          <div className="candidate-topbar-title">
            <span>ESPACE PERSONNEL</span>
            <strong>Tableau de bord</strong>
          </div>

          <div className="candidate-topbar-actions">
            <span className="candidate-topbar-online">
              <i />
              En ligne
            </span>

            <Link
              to="/candidate/notifications"
              className="candidate-topbar-icon"
              aria-label="Notifications"
            >
              ♢
            </Link>

            <Link
              to="/candidate/profile"
              className="candidate-topbar-profile"
            >
              <span>{initials(profile)}</span>
              <span className="candidate-topbar-profile-name">
                Mon compte
              </span>
            </Link>
          </div>
        </header>

        <main className="candidate-dashboard-content">
          {error && (
            <div className="candidate-dashboard-alert" role="alert">
              <span>{error}</span>

              <button
                type="button"
                onClick={() => loadDashboard(true)}
                disabled={refreshing}
              >
                {refreshing ? "Actualisation..." : "Réessayer"}
              </button>
            </div>
          )}

          <section className="candidate-welcome-hero">
            <div className="candidate-welcome-copy">
              <span className="candidate-welcome-eyebrow">
                <i />
                VOTRE ESPACE CARRIÈRE
              </span>

              <h1>
                Bonjour{fullName ? `, ${fullName}` : ""}{" "}
                <span aria-hidden="true">👋</span>
              </h1>

              <p>
                Suivez vos candidatures, découvrez les opportunités qui
                vous correspondent et faites avancer votre projet
                professionnel avec SunuJob AI.
              </p>

              <div className="candidate-welcome-actions">
                <Link
                  to="/jobs"
                  className="candidate-button candidate-button--white"
                >
                  Explorer les offres <span>→</span>
                </Link>

                <Link
                  to="/candidate/profile"
                  className="candidate-button candidate-button--outline"
                >
                  {completion < 70
                    ? "Compléter mon profil"
                    : "Mettre à jour mon profil"}
                </Link>
              </div>
            </div>

            <div className="candidate-hero-art" aria-hidden="true">
              <div className="candidate-hero-ring candidate-hero-ring--one" />
              <div className="candidate-hero-ring candidate-hero-ring--two" />

              <div className="candidate-hero-document">
                <span>CV</span>
                <i />
                <i />
                <i />
                <b>✓ Profil professionnel</b>
              </div>

              <div className="candidate-hero-float">
                ✦ Votre talent compte
              </div>
            </div>

            <div className="candidate-hero-bottom-label">
              Connecter les talents aux opportunités <span>🇸🇳</span>
            </div>
          </section>

          <section className="candidate-dashboard-section">
            <div className="candidate-section-heading">
              <div>
                <span className="candidate-section-kicker">
                  VOTRE ACTIVITÉ
                </span>
                <h2>Vue d'ensemble</h2>
                <p>
                  Les indicateurs essentiels de votre recherche d'emploi.
                </p>
              </div>

              <button
                type="button"
                className="candidate-refresh-button"
                onClick={() => loadDashboard(true)}
                disabled={refreshing}
              >
                <span className={refreshing ? "candidate-refresh-spin" : ""}>
                  ↻
                </span>
                {refreshing ? "Actualisation..." : "Actualiser"}
              </button>
            </div>

            <div className="candidate-stat-grid">
              <article className="candidate-stat-card">
                <div className="candidate-stat-top">
                  <span className="candidate-stat-icon candidate-stat-icon--blue">
                    ▤
                  </span>
                  <span className="candidate-stat-caption">
                    Mon activité
                  </span>
                </div>
                <strong>{applicationStats.total}</strong>
                <h3>Candidatures envoyées</h3>
                <p>Tous vos dossiers déposés</p>
                <Link to="/candidate/applications">
                  Voir mes candidatures <span>↗</span>
                </Link>
              </article>

              <article className="candidate-stat-card">
                <div className="candidate-stat-top">
                  <span className="candidate-stat-icon candidate-stat-icon--violet">
                    ◷
                  </span>
                  <span className="candidate-stat-caption">En suivi</span>
                </div>
                <strong>{applicationStats.active}</strong>
                <h3>En cours de traitement</h3>
                <p>En attente ou en examen</p>
                <Link to="/candidate/applications">
                  Suivre mes dossiers <span>↗</span>
                </Link>
              </article>

              <article className="candidate-stat-card">
                <div className="candidate-stat-top">
                  <span className="candidate-stat-icon candidate-stat-icon--orange">
                    ▣
                  </span>
                  <span className="candidate-stat-caption">
                    Rendez-vous
                  </span>
                </div>
                <strong>{applicationStats.interviews}</strong>
                <h3>Entretiens</h3>
                <p>Candidatures au stade entretien</p>
                <Link to="/candidate/interviews">
                  Préparer mes entretiens <span>↗</span>
                </Link>
              </article>

              <article className="candidate-stat-card">
                <div className="candidate-stat-top">
                  <span className="candidate-stat-icon candidate-stat-icon--green">
                    ✓
                  </span>
                  <span className="candidate-stat-caption">
                    Réponses positives
                  </span>
                </div>
                <strong>{applicationStats.accepted}</strong>
                <h3>Candidatures acceptées</h3>
                <p>Décisions favorables reçues</p>
                <Link to="/candidate/applications">
                  Consulter les réponses <span>↗</span>
                </Link>
              </article>
            </div>
          </section>

          <section className="candidate-dashboard-panels">
            <article className="candidate-panel candidate-profile-panel">
              <div className="candidate-panel-heading">
                <div>
                  <span className="candidate-section-kicker">
                    VOTRE PRÉSENCE
                  </span>
                  <h2>Profil professionnel</h2>
                  <p>Présentez un dossier complet et à jour.</p>
                </div>
                <span className="candidate-panel-heading-icon">♙</span>
              </div>

              <div className="candidate-profile-summary">
                <div className="candidate-profile-avatar">
                  {profile?.photo ? (
                    <img src={mediaUrl(profile.photo)} alt="Photo de profil" />
                  ) : (
                    initials(profile)
                  )}
                </div>

                <div className="candidate-profile-summary-copy">
                  <strong>{fullName || "Votre profil candidat"}</strong>
                  <span>{email || "Ajoutez votre adresse e-mail"}</span>
                  <small>
                    {profile?.field_of_study ||
                      "Domaine de formation à préciser"}
                  </small>
                </div>
              </div>

              <div className="candidate-progress-heading">
                <span>Complétion du profil</span>
                <strong>{completion}%</strong>
              </div>

              <div
                className="candidate-progress-track"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={completion}
                aria-label="Complétion du profil"
              >
                <span style={{ width: `${completion}%` }} />
              </div>

              <p className="candidate-profile-tip">
                {completion >= 90
                  ? "Très bien ! Maintenez vos informations et votre CV à jour."
                  : "Ajoutez votre photo, votre formation, votre expérience et votre CV pour présenter un profil plus complet."}
              </p>

              <Link
                to="/candidate/profile"
                className="candidate-button candidate-button--primary candidate-button--block"
              >
                {completion < 70
                  ? "Compléter mon profil"
                  : "Modifier mon profil"}{" "}
                <span>→</span>
              </Link>

              <Link to="/candidate/cv" className="candidate-secondary-action">
                <span>▧</span>
                <span>
                  <strong>Gérer mon CV</strong>
                  <small>
                    Consultez, importez ou remplacez votre CV professionnel.
                  </small>
                </span>
                <b>→</b>
              </Link>
            </article>

            <article className="candidate-panel candidate-jobs-panel">
              <div className="candidate-panel-heading">
                <div>
                  <span className="candidate-section-kicker">
                    OPPORTUNITÉS
                  </span>
                  <h2>Offres recommandées</h2>
                  <p>
                    Des postes à explorer pour la suite de votre parcours.
                  </p>
                </div>
                <span className="candidate-panel-heading-icon candidate-panel-heading-icon--violet">
                  ✦
                </span>
              </div>

              {recommendedJobs.length === 0 ? (
                <div className="candidate-empty-state">
                  <span>⌕</span>
                  <strong>
                    Aucune recommandation pour le moment
                  </strong>
                  <p>
                    Complétez votre profil et explorez les offres publiées
                    pour découvrir les opportunités.
                  </p>
                  <Link
                    to="/jobs"
                    className="candidate-button candidate-button--primary"
                  >
                    Découvrir les offres →
                  </Link>
                </div>
              ) : (
                <div className="candidate-jobs-list">
                  {recommendedJobs.slice(0, 4).map((job) => {
                    const company =
                      job.company_name ||
                      job.company?.name ||
                      "Entreprise";

                    return (
                      <article className="candidate-job-row" key={job.id}>
                        <div className="candidate-company-mark">
                          {company.charAt(0).toUpperCase()}
                        </div>

                        <div className="candidate-job-copy">
                          <strong>{job.title || "Offre d'emploi"}</strong>
                          <span>
                            {company}
                            {job.location ? ` · ${job.location}` : ""}
                          </span>

                          {job.match_score !== undefined &&
                            job.match_score !== null && (
                              <small>
                                Compatibilité estimée : {job.match_score}%
                              </small>
                            )}
                        </div>

                        <Link
                          to={`/jobs/${job.id}`}
                          className="candidate-job-arrow"
                          aria-label={`Consulter ${job.title || "l'offre"}`}
                        >
                          ↗
                        </Link>
                      </article>
                    );
                  })}

                  <Link
                    to="/candidate/recommendations"
                    className="candidate-panel-footer-link"
                  >
                    Toutes mes recommandations <span>→</span>
                  </Link>
                </div>
              )}
            </article>
          </section>

          <section className="candidate-dashboard-section candidate-applications-section">
            <div className="candidate-section-heading">
              <div>
                <span className="candidate-section-kicker">
                  SUIVI DES DOSSIERS
                </span>
                <h2>Mes dernières candidatures</h2>
                <p>
                  Consultez rapidement les dernières évolutions de vos
                  dossiers.
                </p>
              </div>

              <Link
                to="/candidate/applications"
                className="candidate-section-link"
              >
                Tout afficher →
              </Link>
            </div>

            <article className="candidate-panel candidate-application-panel">
              {applications.length === 0 ? (
                <div className="candidate-empty-state">
                  <span>▤</span>
                  <strong>Votre recherche commence ici</strong>
                  <p>
                    Vous n'avez pas encore envoyé de candidature. Parcourez
                    les offres et postulez aux postes qui vous correspondent.
                  </p>
                  <Link
                    to="/jobs"
                    className="candidate-button candidate-button--primary"
                  >
                    Explorer les offres d'emploi
                  </Link>
                </div>
              ) : (
                <div className="candidate-table-wrap">
                  <table className="candidate-application-table">
                    <thead>
                      <tr>
                        <th>Poste et entreprise</th>
                        <th>Date de candidature</th>
                        <th>Statut</th>
                        <th>Action</th>
                      </tr>
                    </thead>

                    <tbody>
                      {applications.slice(0, 5).map((application) => (
                        <tr key={application.id}>
                          <td>
                            <div className="candidate-table-job">
                              <span className="candidate-company-mark">
                                {getCompanyName(application)
                                  .charAt(0)
                                  .toUpperCase()}
                              </span>
                              <span>
                                <strong>{getJobTitle(application)}</strong>
                                <small>{getCompanyName(application)}</small>
                              </span>
                            </div>
                          </td>

                          <td>{formatDate(getApplicationDate(application))}</td>

                          <td>
                            <span
                              className={`candidate-status candidate-status--${String(
                                application.status || "pending"
                              ).toLowerCase()}`}
                            >
                              {getStatus(application.status)}
                            </span>
                          </td>

                          <td>
                            {application.job?.id ? (
                              <Link
                                to={`/jobs/${application.job.id}`}
                                className="candidate-table-link"
                              >
                                Détails ↗
                              </Link>
                            ) : (
                              <Link
                                to="/candidate/applications"
                                className="candidate-table-link"
                              >
                                Consulter ↗
                              </Link>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </article>
          </section>

          <footer className="candidate-dashboard-footer">
            <span>
              © {new Date().getFullYear()} SunuJob AI · Conçu au Sénégal 🇸🇳
            </span>
            <span>Chaque talent mérite une opportunité.</span>
          </footer>
        </main>
      </div>
    </div>
  );
}
