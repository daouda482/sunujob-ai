
import { useCallback, useEffect, useMemo, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  ArrowDownUp,
  ArrowLeft,
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Download,
  Eye,
  FileText,
  Filter,
  LayoutDashboard,
  LoaderCircle,
  LogOut,
  Mail,
  MapPin,
  RefreshCw,
  Search,
  Send,
  Users,
  X,
  XCircle,
} from "lucide-react";

import api from "../../api/axios";
import "./RecruiterApplications.css";

const NAVIGATION = [
  { label: "Vue d'ensemble", path: "/recruiter/dashboard", icon: LayoutDashboard },
  { label: "Mes offres", path: "/recruiter/jobs", icon: BriefcaseBusiness },
  { label: "Candidatures", path: "/recruiter/applications", icon: Users },
  { label: "Entretiens", path: "/recruiter/interviews", icon: CalendarDays },
  { label: "Mon entreprise", path: "/recruiter/company", icon: Building2 },
];

const STATUS_CONFIG = {
  PENDING: {
    label: "En attente",
    className: "pending",
    icon: Clock3,
  },
  REVIEWING: {
    label: "En examen",
    className: "reviewing",
    icon: Eye,
  },
  SHORTLISTED: {
    label: "Présélectionné(e)",
    className: "shortlisted",
    icon: CheckCircle2,
  },
  INTERVIEW: {
    label: "Entretien",
    className: "interview",
    icon: CalendarDays,
  },
  ACCEPTED: {
    label: "Accepté(e)",
    className: "accepted",
    icon: CheckCircle2,
  },
  REJECTED: {
    label: "Refusé(e)",
    className: "rejected",
    icon: XCircle,
  },
  WITHDRAWN: {
    label: "Retirée",
    className: "withdrawn",
    icon: X,
  },
};

const FILTERS = [
  { value: "ALL", label: "Toutes" },
  { value: "PENDING", label: "En attente" },
  { value: "REVIEWING", label: "En examen" },
  { value: "SHORTLISTED", label: "Présélectionnées" },
  { value: "INTERVIEW", label: "Entretiens" },
  { value: "ACCEPTED", label: "Acceptées" },
  { value: "REJECTED", label: "Refusées" },
];

function extractApplications(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.applications)) return data.applications;
  if (Array.isArray(data?.candidatures)) return data.candidatures;
  return [];
}

function normalizeStatus(status) {
  return String(status || "PENDING").toUpperCase();
}

function getStatus(status) {
  return (
    STATUS_CONFIG[normalizeStatus(status)] || {
      label: normalizeStatus(status).replaceAll("_", " "),
      className: "unknown",
      icon: Clock3,
    }
  );
}

function getCandidateName(application) {
  const fullName = [
    application.first_name || application.candidate_first_name,
    application.last_name || application.candidate_last_name,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  return (
    application.candidate_name ||
    application.full_name ||
    fullName ||
    application.candidate_email ||
    "Candidat"
  );
}

function getJobTitle(application) {
  return (
    application.job_title ||
    application.job?.title ||
    application.job?.name ||
    (application.job ? `Offre #${application.job}` : "Offre d'emploi")
  );
}

function getCompanyName(application) {
  return (
    application.company_name ||
    application.job?.company_name ||
    application.job?.company?.name ||
    "Entreprise"
  );
}

function getInitials(name) {
  const initials = String(name || "C")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] || "")
    .join("")
    .toUpperCase();

  return initials || "C";
}

function formatDate(value) {
  if (!value) return "Date non renseignée";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date non renseignée";

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function getErrorMessage(error) {
  if (error.response?.status === 401) {
    return "Votre session a expiré ou vous n'êtes pas connecté. Reconnectez-vous pour consulter les candidatures.";
  }

  if (error.response?.status === 403) {
    return "L'accès est réservé au recruteur autorisé à consulter ces candidatures.";
  }

  if (error.response?.status === 404) {
    return "La route API des candidatures reçues est introuvable. Vérifiez l'URL configurée dans Django.";
  }

  if (!error.response) {
    return "Impossible de joindre le serveur. Vérifiez que Django est démarré.";
  }

  return (
    error.response?.data?.detail ||
    error.response?.data?.message ||
    "Une erreur est survenue lors du chargement des candidatures."
  );
}

function RecruiterSidebar({ onNavigate, onLogout }) {
  return (
    <aside className="ra-sidebar">
      <NavLink
        to="/recruiter/dashboard"
        className="ra-brand"
        onClick={onNavigate}
      >
        <span className="ra-brand-mark">S</span>
        <span className="ra-brand-copy">
          <strong>SunuJob AI</strong>
          <small>ESPACE RECRUTEUR</small>
        </span>
      </NavLink>

      <div className="ra-sidebar-label">ESPACE DE TRAVAIL</div>

      <nav className="ra-navigation" aria-label="Navigation recruteur">
        {NAVIGATION.map(({ label, path, icon: Icon }) => (
          <NavLink
            key={path}
            to={path}
            end={path === "/recruiter/dashboard"}
            onClick={onNavigate}
            className={({ isActive }) =>
              `ra-nav-link ${isActive ? "active" : ""}`
            }
          >
            <Icon size={19} />
            <span>{label}</span>
            {path === "/recruiter/applications" && (
              <span className="ra-nav-indicator">Suivi</span>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="ra-sidebar-promo">
        <span className="ra-promo-icon">✦</span>
        <strong>Recrutez plus efficacement</strong>
        <p>
          Centralisez les dossiers et suivez chaque candidature
          depuis un espace unique.
        </p>
        <span className="ra-promo-tag">SUNUJOB AI</span>
      </div>

      <div className="ra-sidebar-bottom">
        <div className="ra-sidebar-avatar">R</div>
        <div className="ra-sidebar-user">
          <strong>Espace recruteur</strong>
          <small>Gestion des recrutements</small>
        </div>
        <button
          type="button"
          className="ra-sidebar-logout"
          onClick={onLogout}
          title="Déconnexion"
          aria-label="Se déconnecter"
        >
          <LogOut size={17} />
        </button>
      </div>
    </aside>
  );
}

function StatusBadge({ status }) {
  const config = getStatus(status);
  const Icon = config.icon;

  return (
    <span className={`ra-status ra-status-${config.className}`}>
      <Icon size={14} />
      {config.label}
    </span>
  );
}

function StatCard({ label, value, description, icon: Icon, color }) {
  return (
    <article className="ra-stat-card">
      <div className={`ra-stat-icon ra-stat-icon-${color}`}>
        <Icon size={21} />
      </div>
      <div className="ra-stat-label">{label}</div>
      <div className="ra-stat-value">{value}</div>
      <div className="ra-stat-description">{description}</div>
    </article>
  );
}

function CandidateDetails({ application, onClose }) {
  if (!application) return null;

  const candidateName = getCandidateName(application);
  const email =
    application.candidate_email ||
    application.email ||
    application.candidate?.email ||
    "";

  const resume = application.resume;
  const coverLetter = application.cover_letter;

  return (
    <div
      className="ra-modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="ra-detail-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ra-detail-title"
      >
        <div className="ra-modal-header">
          <div>
            <span className="ra-modal-eyebrow">DOSSIER CANDIDAT</span>
            <h2 id="ra-detail-title">Détails de la candidature</h2>
          </div>
          <button
            type="button"
            className="ra-modal-close"
            onClick={onClose}
            aria-label="Fermer"
          >
            <X size={20} />
          </button>
        </div>

        <div className="ra-candidate-profile">
          <div className="ra-candidate-avatar">
            {getInitials(candidateName)}
          </div>
          <div className="ra-candidate-profile-copy">
            <h3>{candidateName}</h3>
            <p>
              <BriefcaseBusiness size={15} />
              {getJobTitle(application)}
            </p>
            {email && (
              <a href={`mailto:${email}`}>
                <Mail size={15} />
                {email}
              </a>
            )}
          </div>
        </div>

        <div className="ra-detail-grid">
          <div className="ra-detail-item">
            <span>Entreprise</span>
            <strong>{getCompanyName(application)}</strong>
          </div>
          <div className="ra-detail-item">
            <span>Date de candidature</span>
            <strong>{formatDate(application.applied_at)}</strong>
          </div>
          <div className="ra-detail-item">
            <span>Statut actuel</span>
            <div>
              <StatusBadge status={application.status} />
            </div>
          </div>
          <div className="ra-detail-item">
            <span>Référence du dossier</span>
            <strong>
              {application.id ? `CAND-${application.id}` : "Non disponible"}
            </strong>
          </div>
        </div>

        <div className="ra-detail-section">
          <h4>
            <FileText size={17} />
            Lettre de motivation
          </h4>
          <div className="ra-cover-letter">
            {coverLetter?.trim()
              ? coverLetter
              : "Aucune lettre de motivation n'a été renseignée."}
          </div>
        </div>

        <div className="ra-detail-footer">
          {resume ? (
            <a
              className="ra-resume-link"
              href={resume}
              target="_blank"
              rel="noreferrer"
            >
              <Download size={17} />
              Consulter le CV
            </a>
          ) : (
            <span className="ra-no-resume">
              <FileText size={17} />
              Aucun CV disponible
            </span>
          )}

          {email && (
            <a className="ra-contact-link" href={`mailto:${email}`}>
              <Send size={16} />
              Contacter le candidat
            </a>
          )}
        </div>
      </section>
    </div>
  );
}

export default function RecruiterApplications() {
  const navigate = useNavigate();

  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("ALL");
  const [sortOrder, setSortOrder] = useState("newest");
  const [updatingId, setUpdatingId] = useState(null);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const loadApplications = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");
    setSuccess("");

    try {
      // Correspond à la route Django applications/received/
      const response = await api.get("applications/received/");
      setApplications(extractApplications(response.data));
    } catch (err) {
      setError(getErrorMessage(err));
      setApplications([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadApplications();
  }, [loadApplications]);

  const handleLogout = () => {
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    localStorage.removeItem("user");
    sessionStorage.removeItem("access");
    sessionStorage.removeItem("refresh");
    sessionStorage.removeItem("user");
    navigate("/login");
  };

  const counts = useMemo(() => {
    const count = (status) =>
      applications.filter(
        (item) => normalizeStatus(item.status) === status
      ).length;

    return {
      total: applications.length,
      pending: count("PENDING"),
      reviewing: count("REVIEWING"),
      shortlisted: count("SHORTLISTED"),
      interviews: count("INTERVIEW"),
      accepted: count("ACCEPTED"),
      rejected: count("REJECTED"),
    };
  }, [applications]);

  const filteredApplications = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("fr");

    const filtered = applications.filter((application) => {
      const status = normalizeStatus(application.status);
      const candidateName = getCandidateName(application);
      const jobTitle = getJobTitle(application);
      const companyName = getCompanyName(application);
      const email =
        application.candidate_email ||
        application.email ||
        application.candidate?.email ||
        "";

      const matchesFilter =
        activeFilter === "ALL" || status === activeFilter;

      const searchableText = [
        candidateName,
        email,
        jobTitle,
        companyName,
        application.id,
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("fr");

      return matchesFilter && searchableText.includes(query);
    });

    return [...filtered].sort((a, b) => {
      const dateA = new Date(a.applied_at || 0).getTime() || 0;
      const dateB = new Date(b.applied_at || 0).getTime() || 0;

      return sortOrder === "oldest" ? dateA - dateB : dateB - dateA;
    });
  }, [applications, activeFilter, search, sortOrder]);

  const updateStatus = async (application, newStatus) => {
    if (!application?.id || !newStatus) return;

    const currentStatus = normalizeStatus(application.status);
    if (currentStatus === newStatus) return;

    setUpdatingId(application.id);
    setError("");
    setSuccess("");

    try {
      // Le backend doit accepter PATCH sur cette route.
      const response = await api.patch(
        `applications/received/${application.id}/status/`,
        { status: newStatus }
      );

      const updatedApplication = {
        ...application,
        ...(response.data || {}),
        status: response.data?.status || newStatus,
      };

      setApplications((previous) =>
        previous.map((item) =>
          item.id === application.id ? updatedApplication : item
        )
      );

      setSelectedApplication((previous) =>
        previous?.id === application.id ? updatedApplication : previous
      );

      setSuccess("Le statut de la candidature a été mis à jour.");
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          err.response?.data?.status?.[0] ||
          err.response?.data?.message ||
          getErrorMessage(err)
      );
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="ra-layout">
      {sidebarOpen && (
        <button
          type="button"
          className="ra-sidebar-overlay"
          aria-label="Fermer le menu"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className={`ra-sidebar-wrapper ${sidebarOpen ? "is-open" : ""}`}>
        <RecruiterSidebar
          onNavigate={() => setSidebarOpen(false)}
          onLogout={handleLogout}
        />
      </div>

      <main className="ra-main">
        <header className="ra-topbar">
          <button
            type="button"
            className="ra-mobile-menu"
            onClick={() => setSidebarOpen((open) => !open)}
            aria-label="Ouvrir ou fermer le menu"
          >
            <span />
            <span />
            <span />
          </button>

          <div className="ra-breadcrumb">
            <NavLink to="/recruiter/dashboard">Espace recruteur</NavLink>
            <span>/</span>
            <strong>Candidatures reçues</strong>
          </div>

          <div className="ra-topbar-actions">
            <span className="ra-online-indicator">
              <span />
              Espace professionnel
            </span>
            <button
              type="button"
              className="ra-topbar-logout"
              onClick={handleLogout}
            >
              <LogOut size={16} />
              Déconnexion
            </button>
          </div>
        </header>

        <div className="ra-content">
          <section className="ra-hero">
            <div className="ra-hero-decoration ra-hero-decoration-one" />
            <div className="ra-hero-decoration ra-hero-decoration-two" />

            <div className="ra-hero-content">
              <button
                type="button"
                className="ra-back-link"
                onClick={() => navigate("/recruiter/dashboard")}
              >
                <ArrowLeft size={15} />
                Retour au tableau de bord
              </button>

              <div className="ra-hero-eyebrow">
                <span className="ra-hero-eyebrow-dot" />
                VOTRE PIPELINE DE RECRUTEMENT
              </div>

              <h1>Les bons talents commencent ici.</h1>
              <p>
                Retrouvez les candidatures reçues, examinez les profils
                et accompagnez chaque candidat vers la prochaine étape.
              </p>

              <div className="ra-hero-actions">
                <a href="#ra-application-list" className="ra-hero-primary">
                  <Users size={18} />
                  <span>Explorer les candidatures</span>
                  <ArrowRight size={17} />
                </a>

                <button
                  type="button"
                  className="ra-hero-secondary"
                  onClick={() => loadApplications(true)}
                  disabled={loading || refreshing}
                >
                  <RefreshCw
                    size={16}
                    className={refreshing ? "ra-spin" : ""}
                  />
                  {refreshing ? "Actualisation…" : "Actualiser"}
                </button>
              </div>
            </div>

            <div className="ra-hero-visual" aria-hidden="true">
              <div className="ra-visual-orbit ra-orbit-one" />
              <div className="ra-visual-orbit ra-orbit-two" />
              <div className="ra-visual-card">
                <div className="ra-visual-card-top">
                  <span className="ra-visual-card-icon">
                    <Users size={21} />
                  </span>
                  <span className="ra-visual-card-live">EN DIRECT</span>
                </div>
                <span className="ra-visual-card-label">
                  Candidatures reçues
                </span>
                <strong>{loading ? "…" : counts.total}</strong>
                <div className="ra-visual-card-footer">
                  <span className="ra-visual-mini-avatars">
                    <i>A</i>
                    <i>M</i>
                    <i>S</i>
                  </span>
                  <span>Vos talents en un seul endroit</span>
                </div>
              </div>
              <span className="ra-floating-icon ra-floating-check">
                <Check size={19} />
              </span>
              <span className="ra-floating-icon ra-floating-star">✦</span>
            </div>
          </section>

          {error && (
            <div className="ra-alert ra-alert-error" role="alert">
              <XCircle size={20} />
              <div>
                <strong>Impossible de terminer l'opération</strong>
                <p>{error}</p>
              </div>
              <button
                type="button"
                onClick={() => loadApplications(true)}
                disabled={refreshing}
              >
                Réessayer
              </button>
            </div>
          )}

          {success && (
            <div className="ra-alert ra-alert-success" role="status">
              <CheckCircle2 size={20} />
              <p>{success}</p>
              <button
                type="button"
                onClick={() => setSuccess("")}
                aria-label="Fermer le message"
              >
                <X size={17} />
              </button>
            </div>
          )}

          <section className="ra-stats-grid" aria-label="Statistiques">
            <StatCard
              label="Total des candidatures"
              value={loading ? "…" : counts.total}
              description="Dossiers reçus"
              icon={Users}
              color="blue"
            />
            <StatCard
              label="En attente"
              value={loading ? "…" : counts.pending}
              description="À examiner"
              icon={Clock3}
              color="orange"
            />
            <StatCard
              label="En cours d'étude"
              value={loading ? "…" : counts.reviewing}
              description="Dossiers en traitement"
              icon={Eye}
              color="purple"
            />
            <StatCard
              label="Présélectionnés"
              value={loading ? "…" : counts.shortlisted}
              description="Profils retenus"
              icon={CheckCircle2}
              color="green"
            />
          </section>

          <section className="ra-list-section" id="ra-application-list">
            <div className="ra-section-heading">
              <div>
                <div className="ra-section-eyebrow">
                  SUIVI DES CANDIDATS
                </div>
                <h2>Vos candidatures</h2>
                <p>
                  Consultez les dossiers et mettez à jour leur progression.
                </p>
              </div>

              <div className="ra-total-pill">
                <Users size={16} />
                {filteredApplications.length} résultat
                {filteredApplications.length > 1 ? "s" : ""}
              </div>
            </div>

            <div className="ra-toolbar">
              <label className="ra-search-box">
                <Search size={19} />
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Rechercher un candidat, une offre..."
                  aria-label="Rechercher dans les candidatures"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    aria-label="Effacer la recherche"
                  >
                    <X size={16} />
                  </button>
                )}
              </label>

              <label className="ra-sort-box">
                <ArrowDownUp size={16} />
                <select
                  value={sortOrder}
                  onChange={(event) => setSortOrder(event.target.value)}
                  aria-label="Trier les candidatures"
                >
                  <option value="newest">Plus récentes</option>
                  <option value="oldest">Plus anciennes</option>
                </select>
                <ChevronDown size={15} />
              </label>
            </div>

            <div className="ra-filter-bar" aria-label="Filtrer par statut">
              <span className="ra-filter-label">
                <Filter size={16} />
                Statut :
              </span>
              <div className="ra-filter-options">
                {FILTERS.map((filter) => {
                  const count =
                    filter.value === "ALL"
                      ? applications.length
                      : applications.filter(
                          (item) =>
                            normalizeStatus(item.status) === filter.value
                        ).length;

                  return (
                    <button
                      key={filter.value}
                      type="button"
                      className={`ra-filter-chip ${
                        activeFilter === filter.value ? "active" : ""
                      }`}
                      onClick={() => setActiveFilter(filter.value)}
                      aria-pressed={activeFilter === filter.value}
                    >
                      {filter.label}
                      <span>{count}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="ra-application-list">
              {loading ? (
                <div className="ra-state-panel">
                  <LoaderCircle size={34} className="ra-spin" />
                  <h3>Chargement des candidatures</h3>
                  <p>Nous récupérons les dossiers depuis le serveur.</p>
                </div>
              ) : error && applications.length === 0 ? (
                <div className="ra-state-panel">
                  <span className="ra-state-icon ra-state-icon-error">
                    <XCircle size={27} />
                  </span>
                  <h3>Les candidatures ne sont pas disponibles</h3>
                  <p>Vérifiez la connexion au serveur et réessayez.</p>
                  <button
                    type="button"
                    className="ra-empty-button"
                    onClick={() => loadApplications(true)}
                    disabled={refreshing}
                  >
                    <RefreshCw
                      size={16}
                      className={refreshing ? "ra-spin" : ""}
                    />
                    Réessayer
                  </button>
                </div>
              ) : filteredApplications.length === 0 ? (
                <div className="ra-state-panel">
                  <span className="ra-state-icon">
                    {search || activeFilter !== "ALL" ? (
                      <Search size={27} />
                    ) : (
                      <Users size={27} />
                    )}
                  </span>
                  <h3>
                    {search || activeFilter !== "ALL"
                      ? "Aucun résultat trouvé"
                      : "Aucune candidature pour le moment"}
                  </h3>
                  <p>
                    {search || activeFilter !== "ALL"
                      ? "Essayez de modifier votre recherche ou de choisir un autre filtre."
                      : "Les candidatures envoyées à vos offres apparaîtront ici."}
                  </p>
                  {(search || activeFilter !== "ALL") && (
                    <button
                      type="button"
                      className="ra-empty-button"
                      onClick={() => {
                        setSearch("");
                        setActiveFilter("ALL");
                      }}
                    >
                      Réinitialiser les filtres
                    </button>
                  )}
                  {!search && activeFilter === "ALL" && (
                    <button
                      type="button"
                      className="ra-empty-button"
                      onClick={() => navigate("/recruiter/jobs")}
                    >
                      <BriefcaseBusiness size={16} />
                      Consulter mes offres
                    </button>
                  )}
                </div>
              ) : (
                filteredApplications.map((application) => {
                  const candidateName = getCandidateName(application);
                  const email =
                    application.candidate_email ||
                    application.email ||
                    application.candidate?.email ||
                    "";
                  const jobTitle = getJobTitle(application);
                  const companyName = getCompanyName(application);
                  const status = normalizeStatus(application.status);
                  const isUpdating = updatingId === application.id;

                  return (
                    <article
                      className="ra-application-card"
                      key={application.id}
                    >
                      <div className="ra-application-main">
                        <div className="ra-candidate-avatar">
                          {getInitials(candidateName)}
                        </div>

                        <div className="ra-application-identity">
                          <div className="ra-candidate-title-row">
                            <h3>{candidateName}</h3>
                            <StatusBadge status={application.status} />
                          </div>

                          <div className="ra-candidate-email">
                            {email ? (
                              <>
                                <Mail size={14} />
                                <span>{email}</span>
                              </>
                            ) : (
                              <span>Adresse e-mail non renseignée</span>
                            )}
                          </div>

                          <div className="ra-application-meta">
                            <span>
                              <BriefcaseBusiness size={15} />
                              {jobTitle}
                            </span>
                            <span>
                              <Building2 size={15} />
                              {companyName}
                            </span>
                            <span>
                              <CalendarDays size={15} />
                              {formatDate(application.applied_at)}
                            </span>
                            {application.job_location && (
                              <span>
                                <MapPin size={15} />
                                {application.job_location}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="ra-application-actions">
                        <button
                          type="button"
                          className="ra-details-button"
                          onClick={() =>
                            setSelectedApplication(application)
                          }
                        >
                          <Eye size={16} />
                          Détails
                        </button>

                        <label className="ra-status-select-wrap">
                          <span className="ra-sr-only">
                            Modifier le statut de {candidateName}
                          </span>
                          <select
                            className={`ra-status-select ra-select-${getStatus(status).className}`}
                            value={
                              STATUS_CONFIG[status] ? status : "PENDING"
                            }
                            onChange={(event) =>
                              updateStatus(application, event.target.value)
                            }
                            disabled={isUpdating || !application.id}
                            aria-label={`Modifier le statut de ${candidateName}`}
                          >
                            {Object.entries(STATUS_CONFIG).map(
                              ([value, config]) => (
                                <option key={value} value={value}>
                                  {config.label}
                                </option>
                              )
                            )}
                          </select>
                          {isUpdating ? (
                            <LoaderCircle size={15} className="ra-spin" />
                          ) : (
                            <ChevronDown size={15} />
                          )}
                        </label>
                      </div>
                    </article>
                  );
                })
              )}
            </div>

            <div className="ra-list-footer">
              <span>
                Affichage de <strong>{filteredApplications.length}</strong>{" "}
                sur <strong>{applications.length}</strong> candidature(s)
              </span>
              <button
                type="button"
                className="ra-footer-refresh"
                onClick={() => loadApplications(true)}
                disabled={loading || refreshing}
              >
                <RefreshCw
                  size={15}
                  className={refreshing ? "ra-spin" : ""}
                />
                {refreshing ? "Actualisation…" : "Actualiser la liste"}
              </button>
            </div>
          </section>

          <footer className="ra-footer">
            <span>© {new Date().getFullYear()} SunuJob AI</span>
            <span>La technologie au service de l'emploi au Sénégal.</span>
          </footer>
        </div>
      </main>

      <CandidateDetails
        application={selectedApplication}
        onClose={() => setSelectedApplication(null)}
      />
    </div>
  );
}
