
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowRight,
  Bell,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileText,
  Heart,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  MapPin,
  Menu,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  UserRound,
  Users,
  X,
  GraduationCap,
  Sparkles,
} from "lucide-react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import api from "../../api/axios";
import "./CandidateDashboard.css";

const API_ORIGIN = (
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api/"
).replace(/\/api\/?$/, "");

const NAV_GROUPS = [
  {
    title: "ESPACE CANDIDAT",
    items: [
      { label: "Tableau de bord", path: "/candidate/dashboard", icon: LayoutDashboard },
      { label: "Trouver un emploi", path: "/jobs", icon: Search },
      { label: "Mes candidatures", path: "/candidate/applications", icon: FileText },
      { label: "Offres favorites", path: "/candidate/favorites", icon: Heart },
      { label: "Alertes emploi", path: "/candidate/job-alerts", icon: Bell },
      { label: "Recommandations", path: "/candidate/recommendations", icon: Sparkles },
    ],
  },
  {
    title: "MON PROFIL",
    items: [
      { label: "Informations personnelles", path: "/candidate/profile", icon: UserRound },
      { label: "Mon CV", path: "/candidate/cv", icon: FileText },
    ],
  },
  {
    title: "OUTILS CARRIÈRE",
    items: [
      { label: "Entretiens", path: "/candidate/interviews", icon: CalendarDays },
      { label: "Coach carrière", path: "/candidate/ai-coach", icon: GraduationCap },
      { label: "Analyse de CV", path: "/candidate/cv-analysis", icon: Activity },
    ],
  },
  {
    title: "ASSISTANCE",
    items: [
      { label: "Notifications", path: "/candidate/notifications", icon: Bell },
      { label: "Centre d'aide", path: "/support", icon: LifeBuoy },
    ],
  },
];

function extractList(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
}

function getStatus(value) {
  const status = String(value || "").toUpperCase();

  const statuses = {
    PENDING: { label: "En attente", className: "pending" },
    REVIEWING: { label: "En cours d'étude", className: "reviewing" },
    SHORTLISTED: { label: "Présélectionné", className: "shortlisted" },
    INTERVIEW: { label: "Entretien", className: "interview" },
    ACCEPTED: { label: "Acceptée", className: "accepted" },
    REJECTED: { label: "Non retenue", className: "rejected" },
    WITHDRAWN: { label: "Retirée", className: "withdrawn" },
  };

  return statuses[status] || {
    label: value || "Non renseigné",
    className: "default",
  };
}

function getJobTitle(application) {
  return (
    application?.job?.title ||
    application?.job_title ||
    application?.title ||
    "Offre d'emploi"
  );
}

function getCompanyName(application) {
  return (
    application?.job?.company?.name ||
    application?.company?.name ||
    application?.company_name ||
    "Entreprise"
  );
}

function getRecommendedJobTitle(job) {
  return job?.title || job?.job_title || "Offre d'emploi";
}

function getRecommendedCompany(job) {
  return (
    job?.company?.name ||
    job?.company_name ||
    job?.recruiter?.company_name ||
    "Entreprise"
  );
}

function getRecommendedLocation(job) {
  return (
    job?.location ||
    job?.city ||
    job?.company?.city ||
    "Lieu non précisé"
  );
}

function profileCompletion(profile) {
  if (!profile) return 0;

  const fields = [
    profile.first_name || profile.user?.first_name,
    profile.last_name || profile.user?.last_name,
    profile.phone,
    profile.city || profile.address,
    profile.education_level,
    profile.field_of_study,
    profile.years_of_experience !== undefined &&
      profile.years_of_experience !== null,
    profile.biography,
    profile.resume,
  ];

  const completed = fields.filter((field) => {
    if (typeof field === "boolean") return field;
    return field !== undefined && field !== null && String(field).trim() !== "";
  }).length;

  return Math.round((completed / fields.length) * 100);
}

function initials(firstName, lastName, email) {
  const first = String(firstName || "").trim();
  const last = String(lastName || "").trim();

  if (first || last) {
    return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
  }

  return String(email || "C").charAt(0).toUpperCase();
}

function mediaUrl(value) {
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;

  const cleanPath = String(value).replace(/^\/+/, "");
  return `${API_ORIGIN}/${cleanPath}`;
}

function formatDate(value) {
  if (!value) return "Date non précisée";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date non précisée";

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function getDisplayName(user, profile) {
  const firstName =
    profile?.first_name ||
    profile?.user?.first_name ||
    user?.first_name ||
    "";
  const lastName =
    profile?.last_name ||
    profile?.user?.last_name ||
    user?.last_name ||
    "";

  return `${firstName} ${lastName}`.trim() || user?.email || "Candidat";
}

export default function CandidateDashboard() {
  const navigate = useNavigate();

  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(
        localStorage.getItem("user") ||
          sessionStorage.getItem("user") ||
          "null"
      );
    } catch {
      return null;
    }
  });

  const [profile, setProfile] = useState(null);
  const [applications, setApplications] = useState([]);
  const [recommendedJobs, setRecommendedJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

  const loadDashboard = useCallback(
    async ({ silent = false } = {}) => {
      const token =
        localStorage.getItem("access") || sessionStorage.getItem("access");

      if (!token) {
        navigate("/login", { replace: true });
        return;
      }

      if (silent) setRefreshing(true);
      else setLoading(true);

      setError("");

      const requests = await Promise.allSettled([
        api.get("users/profile/"),
        api.get("candidates/profile/me/"),
        api.get("applications/my/"),
        api.get("matching/recommended-jobs/"),
      ]);

      const [userResult, profileResult, applicationsResult, jobsResult] =
        requests;

      if (userResult.status === "fulfilled") {
        const userData = userResult.value.data;
        setUser((previous) => {
          const merged = { ...(previous || {}), ...(userData || {}) };
          localStorage.setItem("user", JSON.stringify(merged));
          sessionStorage.setItem("user", JSON.stringify(merged));
          return merged;
        });
      }

      if (profileResult.status === "fulfilled") {
        setProfile(profileResult.value.data || null);
      } else if (profileResult.reason?.response?.status === 404) {
        setProfile(null);
      }

      if (applicationsResult.status === "fulfilled") {
        setApplications(extractList(applicationsResult.value.data));
      }

      if (jobsResult.status === "fulfilled") {
        setRecommendedJobs(extractList(jobsResult.value.data));
      }

      const failedRequests = requests.filter(
        (result) => result.status === "rejected"
      );

      if (failedRequests.length === requests.length) {
        setError(
          "Impossible de charger les données du tableau de bord. Vérifie ta connexion puis réessaie."
        );
      } else if (failedRequests.length > 0) {
        setError(
          "Certaines informations n'ont pas pu être chargées. Tu peux actualiser le tableau de bord."
        );
      }

      setLoading(false);
      setRefreshing(false);
    },
    [navigate]
  );

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    if (!menuOpen) return undefined;

    const closeOnEscape = (event) => {
      if (event.key === "Escape") setMenuOpen(false);
    };

    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [menuOpen]);

  const displayName = useMemo(
    () => getDisplayName(user, profile),
    [user, profile]
  );

  const firstName =
    profile?.first_name ||
    profile?.user?.first_name ||
    user?.first_name ||
    displayName.split(" ")[0];

  const email =
    profile?.email || profile?.user?.email || user?.email || "";

  const avatar = mediaUrl(profile?.photo || profile?.avatar || user?.photo);
  const completion = profileCompletion(profile);

  const stats = useMemo(() => {
    const total = applications.length;
    const active = applications.filter((application) =>
      ["PENDING", "REVIEWING", "SHORTLISTED"].includes(
        String(application.status || "").toUpperCase()
      )
    ).length;
    const interviews = applications.filter(
      (application) =>
        String(application.status || "").toUpperCase() === "INTERVIEW"
    ).length;
    const accepted = applications.filter(
      (application) =>
        String(application.status || "").toUpperCase() === "ACCEPTED"
    ).length;

    return { total, active, interviews, accepted };
  }, [applications]);

  const handleLogout = () => {
    [
      "access",
      "refresh",
      "user",
    ].forEach((key) => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    });

    navigate("/login", { replace: true });
  };

  if (loading) {
    return (
      <div className="candidate-dashboard-loading">
        <div className="candidate-loading-spinner" />
        <p>Chargement de votre espace candidat...</p>
      </div>
    );
  }

  return (
    <div className="candidate-dashboard">
      {menuOpen && (
        <button
          className="candidate-sidebar-overlay"
          type="button"
          aria-label="Fermer le menu"
          onClick={() => setMenuOpen(false)}
        />
      )}

      <aside
        className={`candidate-sidebar ${menuOpen ? "is-open" : ""}`}
        aria-label="Navigation candidat"
      >
        <Link
          to="/candidate/dashboard"
          className="candidate-brand"
          onClick={() => setMenuOpen(false)}
        >
          <span className="candidate-brand-mark">
            <BriefcaseBusiness size={21} strokeWidth={2.2} />
          </span>
          <span className="candidate-brand-text">
            <strong>SunuJob</strong>
            <small>ESPACE CANDIDAT</small>
          </span>
        </Link>

        <div className="candidate-sidebar-user">
          <div className="candidate-avatar">
            {avatar ? (
              <img src={avatar} alt="Photo de profil" />
            ) : (
              initials(
                profile?.first_name || user?.first_name,
                profile?.last_name || user?.last_name,
                email
              )
            )}
          </div>
          <div className="candidate-sidebar-user-info">
            <strong>{displayName}</strong>
            <span>{email || "Compte candidat"}</span>
          </div>
          <span className="candidate-online-dot" title="Connecté" />
        </div>

        <nav className="candidate-navigation">
          {NAV_GROUPS.map((group) => (
            <div className="candidate-nav-group" key={group.title}>
              <p className="candidate-nav-heading">{group.title}</p>
              {group.items.map((item) => {
                const Icon = item.icon;

                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.path === "/candidate/dashboard"}
                    onClick={() => setMenuOpen(false)}
                    className={({ isActive }) =>
                      `candidate-nav-link ${isActive ? "active" : ""}`
                    }
                  >
                    <Icon size={18} strokeWidth={1.9} />
                    <span>{item.label}</span>
                    {item.path === "/candidate/cv-analysis" && (
                      <span className="candidate-nav-soon">Bientôt</span>
                    )}
                  </NavLink>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="candidate-sidebar-bottom">
          <div className="candidate-sidebar-help">
            <div className="candidate-help-icon">
              <LifeBuoy size={19} />
            </div>
            <strong>Besoin d'aide ?</strong>
            <p>Notre équipe est disponible pour vous accompagner.</p>
            <Link to="/support" onClick={() => setMenuOpen(false)}>
              Contacter le support <ArrowRight size={14} />
            </Link>
          </div>

          <button
            className="candidate-logout-button"
            type="button"
            onClick={handleLogout}
          >
            <LogOut size={18} />
            <span>Déconnexion</span>
          </button>

          <div className="candidate-sidebar-legal">
            <ShieldCheck size={13} />
            <span>Plateforme sécurisée</span>
          </div>
        </div>
      </aside>

      <main className="candidate-main">
        <header className="candidate-topbar">
          <div className="candidate-topbar-left">
            <button
              type="button"
              className="candidate-mobile-menu"
              onClick={() => setMenuOpen(true)}
              aria-label="Ouvrir le menu"
            >
              <Menu size={22} />
            </button>
            <div>
              <span className="candidate-breadcrumb">Mon espace</span>
              <h1>Tableau de bord</h1>
            </div>
          </div>

          <div className="candidate-topbar-actions">
            <span className="candidate-secure-label">
              <span />
              Espace sécurisé
            </span>
            <Link
              to="/candidate/notifications"
              className="candidate-topbar-icon"
              aria-label="Notifications"
              title="Notifications"
            >
              <Bell size={19} />
            </Link>
            <Link
              to="/candidate/profile"
              className="candidate-topbar-profile"
              title="Mon profil"
            >
              {avatar ? (
                <img src={avatar} alt="" />
              ) : (
                initials(
                  profile?.first_name || user?.first_name,
                  profile?.last_name || user?.last_name,
                  email
                )
              )}
            </Link>
          </div>
        </header>

        <div className="candidate-content">
          {error && (
            <div className="candidate-alert" role="alert">
              <div>
                <strong>Information</strong>
                <p>{error}</p>
              </div>
              <button
                type="button"
                onClick={() => loadDashboard({ silent: true })}
                disabled={refreshing}
              >
                <RefreshCw size={15} />
                Réessayer
              </button>
            </div>
          )}

          <section className="candidate-welcome">
            <div className="candidate-welcome-copy">
              <span className="candidate-eyebrow">
                VOTRE ESPACE PROFESSIONNEL
              </span>
              <h2>Bonjour {firstName || "et bienvenue"} !</h2>
              <p>
                Retrouvez ici vos candidatures, vos opportunités et les
                informations essentielles pour suivre votre parcours
                professionnel.
              </p>
              <div className="candidate-welcome-actions">
                <Link to="/jobs" className="candidate-primary-button">
                  <Search size={17} />
                  Explorer les offres
                </Link>
                <Link to="/candidate/profile" className="candidate-secondary-button">
                  Compléter mon profil <ArrowRight size={16} />
                </Link>
              </div>
            </div>
            <div className="candidate-welcome-aside">
              <div className="candidate-welcome-aside-icon">
                <BriefcaseBusiness size={25} />
              </div>
              <span>Votre carrière</span>
              <strong>Commence ici.</strong>
              <small>Des opportunités adaptées à votre profil.</small>
            </div>
          </section>

          <section className="candidate-section">
            <div className="candidate-section-heading">
              <div>
                <span className="candidate-section-kicker">VUE D'ENSEMBLE</span>
                <h2>Suivi de mes activités</h2>
                <p>Un aperçu de vos démarches sur SunuJob AI.</p>
              </div>
              <button
                type="button"
                className="candidate-refresh-button"
                onClick={() => loadDashboard({ silent: true })}
                disabled={refreshing}
              >
                <RefreshCw
                  size={16}
                  className={refreshing ? "is-spinning" : ""}
                />
                Actualiser
              </button>
            </div>

            <div className="candidate-stats-grid">
              <article className="candidate-stat-card">
                <div className="candidate-stat-top">
                  <span className="candidate-stat-icon blue">
                    <FileText size={20} />
                  </span>
                  <span className="candidate-stat-caption">Candidatures</span>
                </div>
                <strong className="candidate-stat-number">{stats.total}</strong>
                <span className="candidate-stat-description">
                  Total des candidatures envoyées
                </span>
              </article>

              <article className="candidate-stat-card">
                <div className="candidate-stat-top">
                  <span className="candidate-stat-icon amber">
                    <Clock3 size={20} />
                  </span>
                  <span className="candidate-stat-caption">En traitement</span>
                </div>
                <strong className="candidate-stat-number">{stats.active}</strong>
                <span className="candidate-stat-description">
                  Dossiers en cours de suivi
                </span>
              </article>

              <article className="candidate-stat-card">
                <div className="candidate-stat-top">
                  <span className="candidate-stat-icon violet">
                    <CalendarDays size={20} />
                  </span>
                  <span className="candidate-stat-caption">Entretiens</span>
                </div>
                <strong className="candidate-stat-number">
                  {stats.interviews}
                </strong>
                <span className="candidate-stat-description">
                  Candidatures avec entretien
                </span>
              </article>

              <article className="candidate-stat-card">
                <div className="candidate-stat-top">
                  <span className="candidate-stat-icon green">
                    <CheckCircle2 size={20} />
                  </span>
                  <span className="candidate-stat-caption">Acceptées</span>
                </div>
                <strong className="candidate-stat-number">{stats.accepted}</strong>
                <span className="candidate-stat-description">
                  Réponses positives reçues
                </span>
              </article>
            </div>
          </section>

          <div className="candidate-dashboard-columns">
            <section className="candidate-panel candidate-profile-panel">
              <div className="candidate-panel-heading">
                <div>
                  <span className="candidate-section-kicker">MON PROFIL</span>
                  <h2>Complétude du profil</h2>
                </div>
                <Link to="/candidate/profile" aria-label="Modifier mon profil">
                  <ArrowRight size={18} />
                </Link>
              </div>

              <div className="candidate-completion">
                <div
                  className="candidate-progress-ring"
                  style={{ "--completion": `${completion}%` }}
                  role="img"
                  aria-label={`Profil complété à ${completion} pour cent`}
                >
                  <div>
                    <strong>{completion}%</strong>
                    <span>complété</span>
                  </div>
                </div>
                <div className="candidate-completion-copy">
                  <strong>
                    {completion >= 80
                      ? "Votre profil est bien renseigné"
                      : "Améliorez votre visibilité"}
                  </strong>
                  <p>
                    Un profil complet aide les recruteurs à mieux comprendre
                    votre parcours et vos compétences.
                  </p>
                  <Link to="/candidate/profile">
                    Mettre à jour mon profil <ArrowRight size={15} />
                  </Link>
                </div>
              </div>

              <div className="candidate-profile-tip">
                <ShieldCheck size={17} />
                <span>
                  Vos informations sont utilisées pour faciliter le suivi de
                  vos candidatures.
                </span>
              </div>
            </section>

            <section className="candidate-panel candidate-quick-panel">
              <div className="candidate-panel-heading">
                <div>
                  <span className="candidate-section-kicker">ACCÈS RAPIDE</span>
                  <h2>Mes outils</h2>
                </div>
                <Settings size={18} className="candidate-panel-muted-icon" />
              </div>

              <div className="candidate-quick-links">
                <Link to="/candidate/profile" className="candidate-quick-link">
                  <span className="candidate-quick-icon blue">
                    <UserRound size={19} />
                  </span>
                  <span>
                    <strong>Mon profil</strong>
                    <small>Gérer mes informations</small>
                  </span>
                  <ArrowRight size={17} />
                </Link>
                <Link to="/candidate/cv" className="candidate-quick-link">
                  <span className="candidate-quick-icon violet">
                    <FileText size={19} />
                  </span>
                  <span>
                    <strong>Mon CV</strong>
                    <small>Consulter mes documents</small>
                  </span>
                  <ArrowRight size={17} />
                </Link>
                <Link
                  to="/candidate/interviews"
                  className="candidate-quick-link"
                >
                  <span className="candidate-quick-icon green">
                    <CalendarDays size={19} />
                  </span>
                  <span>
                    <strong>Mes entretiens</strong>
                    <small>Suivre mes rendez-vous</small>
                  </span>
                  <ArrowRight size={17} />
                </Link>
              </div>
            </section>
          </div>

          <section className="candidate-panel candidate-jobs-panel">
            <div className="candidate-panel-heading">
              <div>
                <span className="candidate-section-kicker">OPPORTUNITÉS</span>
                <h2>Offres recommandées</h2>
                <p>Des offres à découvrir selon les informations disponibles.</p>
              </div>
              <Link to="/candidate/recommendations" className="candidate-view-all">
                Voir toutes les recommandations <ArrowRight size={16} />
              </Link>
            </div>

            {recommendedJobs.length > 0 ? (
              <div className="candidate-recommended-list">
                {recommendedJobs.slice(0, 4).map((job, index) => (
                  <article
                    className="candidate-recommended-item"
                    key={job.id || job.pk || `${getRecommendedJobTitle(job)}-${index}`}
                  >
                    <div className="candidate-company-icon">
                      <Building2 size={21} />
                    </div>
                    <div className="candidate-job-main">
                      <Link
                        to={`/jobs/${job.id || job.pk}`}
                        className="candidate-job-title"
                      >
                        {getRecommendedJobTitle(job)}
                      </Link>
                      <span className="candidate-job-company">
                        {getRecommendedCompany(job)}
                      </span>
                      <span className="candidate-job-location">
                        <MapPin size={14} />
                        {getRecommendedLocation(job)}
                      </span>
                    </div>
                    <div className="candidate-job-meta">
                      {job?.employment_type && (
                        <span className="candidate-job-type">
                          {job.employment_type}
                        </span>
                      )}
                      <Link
                        to={`/jobs/${job.id || job.pk}`}
                        className="candidate-job-open"
                        aria-label={`Consulter ${getRecommendedJobTitle(job)}`}
                      >
                        <ArrowRight size={18} />
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="candidate-empty-state">
                <span>
                  <BriefcaseBusiness size={24} />
                </span>
                <strong>Aucune recommandation disponible</strong>
                <p>
                  Consultez les offres publiées et pensez à compléter votre
                  profil pour améliorer les recommandations.
                </p>
                <Link to="/jobs" className="candidate-primary-button">
                  Consulter les offres <ArrowRight size={16} />
                </Link>
              </div>
            )}
          </section>

          <section className="candidate-panel candidate-applications-panel">
            <div className="candidate-panel-heading">
              <div>
                <span className="candidate-section-kicker">MES DÉMARCHES</span>
                <h2>Dernières candidatures</h2>
                <p>Suivez l'évolution de vos candidatures récentes.</p>
              </div>
              <Link to="/candidate/applications" className="candidate-view-all">
                Toutes mes candidatures <ArrowRight size={16} />
              </Link>
            </div>

            {applications.length > 0 ? (
              <div className="candidate-table-wrap">
                <table className="candidate-applications-table">
                  <thead>
                    <tr>
                      <th>Poste</th>
                      <th>Entreprise</th>
                      <th>Date d'envoi</th>
                      <th>Statut</th>
                      <th aria-label="Détails" />
                    </tr>
                  </thead>
                  <tbody>
                    {applications.slice(0, 5).map((application, index) => {
                      const status = getStatus(application.status);

                      return (
                        <tr
                          key={
                            application.id ||
                            application.pk ||
                            `application-${index}`
                          }
                        >
                          <td>
                            <strong>{getJobTitle(application)}</strong>
                          </td>
                          <td>{getCompanyName(application)}</td>
                          <td>
                            {formatDate(
                              application.created_at ||
                                application.applied_at ||
                                application.date_applied
                            )}
                          </td>
                          <td>
                            <span
                              className={`candidate-status-badge ${status.className}`}
                            >
                              <span />
                              {status.label}
                            </span>
                          </td>
                          <td>
                            <Link
                              to="/candidate/applications"
                              className="candidate-table-action"
                              aria-label="Voir mes candidatures"
                            >
                              <ArrowRight size={17} />
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="candidate-empty-state compact">
                <span>
                  <FileText size={23} />
                </span>
                <strong>Vous n'avez pas encore de candidature</strong>
                <p>
                  Parcourez les offres disponibles et envoyez votre première
                  candidature depuis SunuJob AI.
                </p>
                <Link to="/jobs" className="candidate-primary-button">
                  Trouver un emploi <ArrowRight size={16} />
                </Link>
              </div>
            )}
          </section>

          <footer className="candidate-dashboard-footer">
            <span>© {new Date().getFullYear()} SunuJob AI</span>
            <span>La plateforme de recrutement pensée pour le Sénégal.</span>
            <Link to="/support">Assistance</Link>
          </footer>
        </div>
      </main>
    </div>
  );
}
