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
  GraduationCap,
  Sparkles,
  X,
  AlertCircle,
  TrendingUp,
  ExternalLink,
} from "lucide-react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import api from "../../api/axios";
// import "./CandidateDashboard.css";

const API_ORIGIN = (
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api/"
).replace(/\/api\/?$/, "");

const extractList = (response) => {
  const data = response?.data ?? response;

  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.jobs)) return data.jobs;
  if (Array.isArray(data?.applications)) return data.applications;

  return [];
};

const getStatus = (application) => {
  const status = String(application?.status || "PENDING").toUpperCase();

  const statuses = {
    PENDING: "En attente",
    REVIEWING: "En cours d'examen",
    SHORTLISTED: "Présélectionné",
    INTERVIEW: "Entretien",
    ACCEPTED: "Acceptée",
    REJECTED: "Non retenue",
    WITHDRAWN: "Retirée",
  };

  return {
    label: statuses[status] || status,
    className: status.toLowerCase(),
  };
};

const getJobTitle = (application) =>
  application?.job?.title ||
  application?.job_title ||
  application?.title ||
  "Offre d'emploi";

const getCompanyName = (application) =>
  application?.job?.company?.name ||
  application?.company?.name ||
  application?.company_name ||
  "Entreprise";

const getRecommendedJobTitle = (job) =>
  job?.job?.title ||
  job?.title ||
  job?.job_title ||
  "Offre recommandée";

const getRecommendedCompany = (job) =>
  job?.job?.company?.name ||
  job?.company?.name ||
  job?.company_name ||
  "Entreprise";

const getRecommendedLocation = (job) =>
  job?.job?.location ||
  job?.location ||
  job?.city ||
  "Localisation non précisée";

const profileCompletion = (profile, user) => {
  const fields = [
    profile?.first_name || user?.first_name,
    profile?.last_name || user?.last_name,
    profile?.email || user?.email,
    profile?.phone,
    profile?.city,
    profile?.education_level,
    profile?.field_of_study,
    profile?.years_of_experience !== undefined &&
      profile?.years_of_experience !== null,
    profile?.biography,
    profile?.resume,
  ];

  const completed = fields.filter(Boolean).length;
  return Math.round((completed / fields.length) * 100);
};

const initials = (name = "") =>
  name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "C";

const mediaUrl = (value) => {
  if (!value || typeof value !== "string") return "";
  if (value.startsWith("http://") || value.startsWith("https://")) {
    return value;
  }
  if (value.startsWith("/")) return `${API_ORIGIN}${value}`;
  return `${API_ORIGIN}/${value}`;
};

const formatDate = (value) => {
  if (!value) return "Date non précisée";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date non précisée";

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
};

const getDisplayName = (user, profile) => {
  const firstName =
    profile?.first_name || user?.first_name || user?.firstName || "";
  const lastName =
    profile?.last_name || user?.last_name || user?.lastName || "";

  const fullName = `${firstName} ${lastName}`.trim();

  return (
    fullName ||
    user?.full_name ||
    user?.username ||
    user?.email?.split("@")[0] ||
    "Candidat"
  );
};

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

  const accessToken =
    localStorage.getItem("access") || sessionStorage.getItem("access");

  const displayName = useMemo(
    () => getDisplayName(user, profile),
    [user, profile]
  );

  const firstName = displayName.split(" ")[0];

  const completion = useMemo(
    () => profileCompletion(profile || {}, user || {}),
    [profile, user]
  );

  const loadDashboard = useCallback(async (isRefresh = false) => {
    if (!accessToken) {
      navigate("/login", { replace: true });
      return;
    }

    if (isRefresh) setRefreshing(true);
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

    console.log("Résultat API du tableau de bord :", {
      user: userResult,
      profile: profileResult,
      applications: applicationsResult,
      recommendations: jobsResult,
    });

    let failedRequests = 0;

    if (userResult.status === "fulfilled") {
      const userData = userResult.value?.data;
      if (userData && typeof userData === "object") {
        setUser((previous) => ({ ...(previous || {}), ...userData }));
        try {
          const storage = localStorage.getItem("access")
            ? localStorage
            : sessionStorage;
          storage.setItem("user", JSON.stringify(userData));
        } catch {
          // Le tableau de bord reste utilisable même si le stockage échoue.
        }
      }
    } else {
      failedRequests += 1;
      console.error("Erreur users/profile/ :", userResult.reason);
    }

    if (profileResult.status === "fulfilled") {
      setProfile(profileResult.value?.data || null);
    } else {
      failedRequests += 1;
      console.error(
        "Erreur candidates/profile/me/ :",
        profileResult.reason
      );
    }

    if (applicationsResult.status === "fulfilled") {
      setApplications(extractList(applicationsResult.value));
    } else {
      failedRequests += 1;
      console.error(
        "Erreur applications/my/ :",
        applicationsResult.reason
      );
    }

    if (jobsResult.status === "fulfilled") {
      setRecommendedJobs(extractList(jobsResult.value));
    } else {
      failedRequests += 1;
      console.error(
        "Erreur matching/recommended-jobs/ :",
        jobsResult.reason
      );
    }

    if (failedRequests === requests.length) {
      setError(
        "Impossible de charger les données du tableau de bord. Vérifie ta connexion et l'authentification."
      );
    } else if (failedRequests > 0) {
      setError(
        "Certaines informations n'ont pas pu être chargées. Les autres sections restent disponibles."
      );
    }

    setLoading(false);
    setRefreshing(false);
  }, [accessToken, navigate]);

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

  const totalApplications = applications.length;
  const pendingApplications = applications.filter((item) =>
    ["PENDING", "REVIEWING"].includes(
      String(item?.status || "PENDING").toUpperCase()
    )
  ).length;
  const interviewApplications = applications.filter((item) =>
    ["INTERVIEW", "SHORTLISTED"].includes(
      String(item?.status || "").toUpperCase()
    )
  ).length;

  const navigation = [
    {
      label: "Vue d'ensemble",
      to: "/candidate/dashboard",
      icon: LayoutDashboard,
    },
    { label: "Trouver un emploi", to: "/jobs", icon: Search },
    {
      label: "Mes candidatures",
      to: "/candidate/applications",
      icon: FileText,
    },
    {
      label: "Mes recommandations",
      to: "/candidate/recommendations",
      icon: Sparkles,
    },
    {
      label: "Mon profil",
      to: "/candidate/profile",
      icon: UserRound,
    },
  ];

  if (loading) {
    return (
      <div className="candidate-dashboard-loading">
        <div className="candidate-loading-logo">
          <BriefcaseBusiness size={28} />
        </div>
        <div className="candidate-loading-spinner" />
        <h2>Préparation de votre espace</h2>
        <p>Nous récupérons vos informations...</p>
      </div>
    );
  }

  return (
    <div className="candidate-dashboard">
      {menuOpen && (
        <button
          type="button"
          className="candidate-sidebar-overlay"
          aria-label="Fermer le menu"
          onClick={() => setMenuOpen(false)}
        />
      )}

      <aside
        className={`candidate-sidebar ${
          menuOpen ? "candidate-sidebar-open" : ""
        }`}
      >
        <div className="candidate-brand">
          <div className="candidate-brand-icon">
            <BriefcaseBusiness size={23} />
          </div>
          <div className="candidate-brand-text">
            <strong>SunuJob<span> AI</span></strong>
            <small>Votre carrière, notre priorité</small>
          </div>
          <button
            type="button"
            className="candidate-mobile-close"
            onClick={() => setMenuOpen(false)}
            aria-label="Fermer le menu"
          >
            <X size={20} />
          </button>
        </div>

        <div className="candidate-sidebar-section">
          <span className="candidate-sidebar-label">ESPACE CANDIDAT</span>

          <nav className="candidate-navigation">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === "/candidate/dashboard"}
                  onClick={() => setMenuOpen(false)}
                  className={({ isActive }) =>
                    `candidate-nav-link ${
                      isActive ? "candidate-nav-link-active" : ""
                    }`
                  }
                >
                  <Icon size={19} />
                  <span>{item.label}</span>
                  {item.to === "/candidate/applications" &&
                    totalApplications > 0 && (
                      <span className="candidate-nav-count">
                        {totalApplications}
                      </span>
                    )}
                </NavLink>
              );
            })}
          </nav>
        </div>

        <div className="candidate-sidebar-help">
          <div className="candidate-help-icon">
            <LifeBuoy size={21} />
          </div>
          <strong>Besoin d'aide ?</strong>
          <p>Notre équipe est là pour vous accompagner.</p>
          <Link to="/support">
            Contacter le support <ArrowRight size={15} />
          </Link>
        </div>

        <div className="candidate-sidebar-bottom">
          <div className="candidate-sidebar-user">
            <div className="candidate-avatar">
              {initials(displayName)}
            </div>
            <div className="candidate-sidebar-user-info">
              <strong>{displayName}</strong>
              <span>Candidat</span>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="candidate-logout-icon"
              title="Se déconnecter"
              aria-label="Se déconnecter"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>

      <main className="candidate-main">
        <header className="candidate-topbar">
          <div className="candidate-topbar-left">
            <button
              type="button"
              className="candidate-menu-button"
              onClick={() => setMenuOpen(true)}
              aria-label="Ouvrir le menu"
            >
              <Menu size={22} />
            </button>
            <div>
              <span className="candidate-breadcrumb">
                Espace candidat <span>/</span> Tableau de bord
              </span>
              <h1>Tableau de bord</h1>
            </div>
          </div>

          <div className="candidate-topbar-actions">
            <button
              type="button"
              className="candidate-icon-button"
              onClick={() => loadDashboard(true)}
              title="Actualiser les données"
              aria-label="Actualiser"
              disabled={refreshing}
            >
              <RefreshCw
                size={19}
                className={refreshing ? "candidate-spin" : ""}
              />
            </button>
            <Link
              to="/notifications"
              className="candidate-icon-button"
              title="Notifications"
              aria-label="Notifications"
            >
              <Bell size={19} />
            </Link>
            <Link
              to="/candidate/profile"
              className="candidate-topbar-profile"
              title="Mon profil"
            >
              <div className="candidate-avatar candidate-avatar-small">
                {initials(displayName)}
              </div>
              <span>{firstName}</span>
            </Link>
          </div>
        </header>

        <div className="candidate-content">
          {error && (
            <div className="candidate-alert">
              <AlertCircle size={19} />
              <span>{error}</span>
              <button
                type="button"
                onClick={() => loadDashboard(true)}
                aria-label="Réessayer"
              >
                Réessayer
              </button>
            </div>
          )}

          <section className="candidate-welcome">
            <div className="candidate-welcome-content">
              <div className="candidate-welcome-tag">
                <Sparkles size={15} />
                <span>Votre espace carrière intelligent</span>
              </div>
              <h2>
                Bonjour {firstName} <span>👋</span>
              </h2>
              <p>
                Prêt à donner un nouvel élan à votre carrière ?
                Découvrez les opportunités qui correspondent à votre profil.
              </p>
              <div className="candidate-welcome-actions">
                <Link to="/jobs" className="candidate-primary-button">
                  Explorer les offres <ArrowRight size={17} />
                </Link>
                <Link
                  to="/candidate/profile"
                  className="candidate-secondary-button"
                >
                  Compléter mon profil
                </Link>
              </div>
            </div>
            <div className="candidate-welcome-visual" aria-hidden="true">
              <div className="candidate-visual-circle candidate-circle-one" />
              <div className="candidate-visual-circle candidate-circle-two" />
              <div className="candidate-visual-card">
                <div className="candidate-visual-card-icon">
                  <TrendingUp size={25} />
                </div>
                <strong>Votre avenir commence ici</strong>
                <span>Des opportunités à portée de main</span>
                <div className="candidate-visual-progress">
                  <span />
                </div>
              </div>
              <div className="candidate-visual-sparkle">
                <Sparkles size={24} />
              </div>
            </div>
          </section>

          <section className="candidate-stats-grid">
            <article className="candidate-stat-card">
              <div className="candidate-stat-top">
                <div className="candidate-stat-icon candidate-stat-blue">
                  <FileText size={21} />
                </div>
                <span className="candidate-stat-caption">Toutes vos demandes</span>
              </div>
              <strong className="candidate-stat-number">
                {totalApplications}
              </strong>
              <span className="candidate-stat-label">Candidatures envoyées</span>
              <Link to="/candidate/applications">
                Voir mes candidatures <ArrowRight size={14} />
              </Link>
            </article>

            <article className="candidate-stat-card">
              <div className="candidate-stat-top">
                <div className="candidate-stat-icon candidate-stat-orange">
                  <Clock3 size={21} />
                </div>
                <span className="candidate-stat-caption">En traitement</span>
              </div>
              <strong className="candidate-stat-number">
                {pendingApplications}
              </strong>
              <span className="candidate-stat-label">En attente ou en examen</span>
              <Link to="/candidate/applications">
                Suivre l'évolution <ArrowRight size={14} />
              </Link>
            </article>

            <article className="candidate-stat-card">
              <div className="candidate-stat-top">
                <div className="candidate-stat-icon candidate-stat-green">
                  <CalendarDays size={21} />
                </div>
                <span className="candidate-stat-caption">Étape suivante</span>
              </div>
              <strong className="candidate-stat-number">
                {interviewApplications}
              </strong>
              <span className="candidate-stat-label">Présélections et entretiens</span>
              <Link to="/candidate/applications">
                Consulter le suivi <ArrowRight size={14} />
              </Link>
            </article>

            <article className="candidate-stat-card">
              <div className="candidate-stat-top">
                <div className="candidate-stat-icon candidate-stat-purple">
                  <Sparkles size={21} />
                </div>
                <span className="candidate-stat-caption">Selon votre profil</span>
              </div>
              <strong className="candidate-stat-number">
                {recommendedJobs.length}
              </strong>
              <span className="candidate-stat-label">Offres recommandées</span>
              <Link to="/candidate/recommendations">
                Découvrir les offres <ArrowRight size={14} />
              </Link>
            </article>
          </section>

          <section className="candidate-main-grid">
            <div className="candidate-panel candidate-profile-panel">
              <div className="candidate-panel-heading">
                <div>
                  <span className="candidate-eyebrow">VOTRE PROFIL</span>
                  <h3>Complétez votre profil</h3>
                </div>
                <Link to="/candidate/profile" className="candidate-text-link">
                  Modifier <ArrowRight size={15} />
                </Link>
              </div>

              <div className="candidate-profile-progress-area">
                <div
                  className="candidate-progress-circle"
                  style={{ "--progress": `${completion}%` }}
                >
                  <div className="candidate-progress-inner">
                    <strong>{completion}%</strong>
                    <span>Complété</span>
                  </div>
                </div>
                <div className="candidate-progress-message">
                  <strong>
                    {completion >= 80
                      ? "Excellent travail !"
                      : "Encore quelques étapes"}
                  </strong>
                  <p>
                    Un profil complet aide les recruteurs à mieux comprendre
                    vos compétences et votre parcours.
                  </p>
                  <Link to="/candidate/profile">
                    Améliorer mon profil <ArrowRight size={15} />
                  </Link>
                </div>
              </div>

              <div className="candidate-profile-tip">
                <ShieldCheck size={18} />
                <span>
                  Vos informations sont utilisées pour améliorer la pertinence
                  des recommandations.
                </span>
              </div>
            </div>

            <div className="candidate-panel candidate-quick-panel">
              <div className="candidate-panel-heading">
                <div>
                  <span className="candidate-eyebrow">ACCÈS RAPIDE</span>
                  <h3>Que souhaitez-vous faire ?</h3>
                </div>
              </div>

              <div className="candidate-quick-links">
                <Link to="/jobs" className="candidate-quick-link">
                  <div className="candidate-quick-icon candidate-quick-blue">
                    <Search size={20} />
                  </div>
                  <div>
                    <strong>Rechercher un emploi</strong>
                    <span>Parcourir les nouvelles offres</span>
                  </div>
                  <ArrowRight size={17} />
                </Link>

                <Link
                  to="/candidate/profile"
                  className="candidate-quick-link"
                >
                  <div className="candidate-quick-icon candidate-quick-purple">
                    <UserRound size={20} />
                  </div>
                  <div>
                    <strong>Mettre à jour mon profil</strong>
                    <span>Valoriser mon parcours</span>
                  </div>
                  <ArrowRight size={17} />
                </Link>

                <Link
                  to="/candidate/applications"
                  className="candidate-quick-link"
                >
                  <div className="candidate-quick-icon candidate-quick-green">
                    <Activity size={20} />
                  </div>
                  <div>
                    <strong>Suivre mes candidatures</strong>
                    <span>Consulter leur avancement</span>
                  </div>
                  <ArrowRight size={17} />
                </Link>

                <Link
                  to="/candidate/recommendations"
                  className="candidate-quick-link"
                >
                  <div className="candidate-quick-icon candidate-quick-orange">
                    <Sparkles size={20} />
                  </div>
                  <div>
                    <strong>Mes recommandations IA</strong>
                    <span>Découvrir les offres adaptées</span>
                  </div>
                  <ArrowRight size={17} />
                </Link>
              </div>
            </div>
          </section>

          <section className="candidate-panel candidate-recommendations-panel">
            <div className="candidate-panel-heading">
              <div>
                <span className="candidate-eyebrow">INTELLIGENCE ARTIFICIELLE</span>
                <h3>
                  <Sparkles size={20} /> Offres recommandées pour vous
                </h3>
                <p>
                  Des opportunités sélectionnées selon votre profil et vos compétences.
                </p>
              </div>
              <Link
                to="/candidate/recommendations"
                className="candidate-text-link"
              >
                Tout voir <ArrowRight size={15} />
              </Link>
            </div>

            {recommendedJobs.length > 0 ? (
              <div className="candidate-recommendations-grid">
                {recommendedJobs.slice(0, 3).map((item, index) => {
                  const job = item?.job || item;
                  const jobId = job?.id || item?.job_id;
                  const score =
                    item?.score ??
                    item?.match_score ??
                    item?.compatibility_score;

                  return (
                    <article
                      className="candidate-job-card"
                      key={jobId || `recommended-${index}`}
                    >
                      <div className="candidate-job-card-top">
                        <div className="candidate-company-icon">
                          <Building2 size={22} />
                        </div>
                        {score !== undefined && score !== null && (
                          <span className="candidate-match-badge">
                            <Sparkles size={13} />
                            {Math.round(Number(score))}% compatible
                          </span>
                        )}
                      </div>
                      <h4>{getRecommendedJobTitle(item)}</h4>
                      <span className="candidate-job-company">
                        {getRecommendedCompany(item)}
                      </span>
                      <div className="candidate-job-location">
                        <MapPin size={15} />
                        {getRecommendedLocation(item)}
                      </div>
                      <div className="candidate-job-card-footer">
                        <span>
                          {job?.contract_type ||
                            job?.employment_type ||
                            "Opportunité"}
                        </span>
                        {jobId ? (
                          <Link to={`/jobs/${jobId}`} aria-label="Voir l'offre">
                            Voir l'offre <ArrowRight size={15} />
                          </Link>
                        ) : (
                          <Link to="/jobs">
                            Explorer <ArrowRight size={15} />
                          </Link>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="candidate-empty-state">
                <div className="candidate-empty-icon">
                  <Sparkles size={25} />
                </div>
                <strong>Aucune recommandation disponible pour le moment</strong>
                <p>
                  Complétez votre profil pour recevoir des offres mieux adaptées
                  à votre parcours.
                </p>
                <Link to="/candidate/profile" className="candidate-primary-button">
                  Compléter mon profil <ArrowRight size={16} />
                </Link>
              </div>
            )}
          </section>

          <section className="candidate-panel candidate-applications-panel">
            <div className="candidate-panel-heading">
              <div>
                <span className="candidate-eyebrow">SUIVI DE VOS DEMANDES</span>
                <h3>Mes dernières candidatures</h3>
                <p>Retrouvez ici les dernières offres auxquelles vous avez postulé.</p>
              </div>
              <Link
                to="/candidate/applications"
                className="candidate-text-link"
              >
                Toutes mes candidatures <ArrowRight size={15} />
              </Link>
            </div>

            {applications.length > 0 ? (
              <div className="candidate-table-wrapper">
                <table className="candidate-applications-table">
                  <thead>
                    <tr>
                      <th>Poste</th>
                      <th>Entreprise</th>
                      <th>Date d'envoi</th>
                      <th>Statut</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {applications.slice(0, 5).map((application, index) => {
                      const status = getStatus(application);
                      const applicationId = application?.id;

                      return (
                        <tr key={applicationId || `application-${index}`}>
                          <td>
                            <div className="candidate-table-job">
                              <div className="candidate-table-job-icon">
                                <BriefcaseBusiness size={17} />
                              </div>
                              <strong>{getJobTitle(application)}</strong>
                            </div>
                          </td>
                          <td>{getCompanyName(application)}</td>
                          <td>
                            {formatDate(
                              application?.created_at ||
                                application?.applied_at ||
                                application?.date
                            )}
                          </td>
                          <td>
                            <span
                              className={`candidate-status candidate-status-${status.className}`}
                            >
                              <span />
                              {status.label}
                            </span>
                          </td>
                          <td>
                            <Link
                              to="/candidate/applications"
                              className="candidate-table-action"
                              aria-label="Voir la candidature"
                            >
                              <ExternalLink size={17} />
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="candidate-empty-state candidate-empty-applications">
                <div className="candidate-empty-icon">
                  <FileText size={25} />
                </div>
                <strong>Vous n'avez pas encore envoyé de candidature</strong>
                <p>
                  Explorez les offres publiées et envoyez votre première candidature.
                </p>
                <Link to="/jobs" className="candidate-primary-button">
                  Découvrir les offres <ArrowRight size={16} />
                </Link>
              </div>
            )}
          </section>

          <footer className="candidate-footer">
            <div>
              <strong>SunuJob AI</strong>
              <span>Conçu au Sénégal 🇸🇳 pour accompagner les talents.</span>
            </div>
            <div className="candidate-footer-links">
              <Link to="/support">Assistance</Link>
              <Link to="/jobs">Offres d'emploi</Link>
              <Link to="/candidate/profile">Mon profil</Link>
            </div>
            <span className="candidate-copyright">
              © {new Date().getFullYear()} SunuJob AI
            </span>
          </footer>
        </div>
      </main>
    </div>
  );
}