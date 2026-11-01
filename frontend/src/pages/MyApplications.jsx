
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileText,
  Filter,
  LayoutDashboard,
  LoaderCircle,
  MapPin,
  RefreshCw,
  Search,
  Send,
  Sparkles,
  X,
  XCircle,
} from "lucide-react";
import api from "../api/axios";
import "./MyApplications.css";

const STATUS_CONFIG = {
  PENDING: {
    label: "En attente",
    className: "pending",
    icon: Clock3,
  },
  REVIEWING: {
    label: "En cours d'étude",
    className: "reviewing",
    icon: Search,
  },
  SHORTLISTED: {
    label: "Présélectionné(e)",
    className: "shortlisted",
    icon: Sparkles,
  },
  INTERVIEW: {
    label: "Entretien",
    className: "interview",
    icon: CalendarDays,
  },
  ACCEPTED: {
    label: "Acceptée",
    className: "accepted",
    icon: CheckCircle2,
  },
  REJECTED: {
    label: "Non retenue",
    className: "rejected",
    icon: XCircle,
  },
  WITHDRAWN: {
    label: "Retirée",
    className: "withdrawn",
    icon: X,
  },
};

function formatDate(value) {
  if (!value) return "Date non disponible";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Date non disponible";
  }

  return new Intl.DateTimeFormat("fr-SN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

function getInitials(name) {
  const words = String(name || "Entreprise")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  return words
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("") || "EN";
}

function getJobId(application) {
  const job = application?.job;

  if (typeof job === "number" || typeof job === "string") {
    return job;
  }

  return job?.id ?? application?.job_id ?? null;
}

function getJobTitle(application) {
  const job = application?.job;

  return (
    application?.job_title ||
    application?.title ||
    (typeof job === "object" ? job?.title : "") ||
    (typeof job === "object" ? job?.name : "") ||
    "Offre d'emploi"
  );
}

function getCompanyName(application) {
  const job = application?.job;

  return (
    application?.company_name ||
    application?.company?.name ||
    (typeof job === "object" ? job?.company_name : "") ||
    (typeof job === "object" ? job?.company?.name : "") ||
    "Entreprise recruteuse"
  );
}

function getJobLocation(application) {
  const job = application?.job;

  return (
    application?.job_location ||
    application?.location ||
    (typeof job === "object" ? job?.location : "") ||
    (typeof job === "object" ? job?.city : "") ||
    ""
  );
}

function getStatus(application) {
  const value = String(application?.status || "PENDING").toUpperCase();

  return STATUS_CONFIG[value]
    ? { ...STATUS_CONFIG[value], value }
    : {
        label: value.replaceAll("_", " "),
        className: "pending",
        icon: Clock3,
        value,
      };
}

function extractApplications(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.applications)) return data.applications;
  return [];
}

export default function MyApplications() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("ALL");

  const loadApplications = useCallback(async (isRefresh = false) => {
    setError("");

    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const response = await api.get("applications/my/");
      setApplications(extractApplications(response.data));
    } catch (err) {
      console.error(
        "Erreur de chargement des candidatures :",
        err.response?.data || err
      );

      const status = err.response?.status;

      if (status === 401) {
        setError(
          "Votre session a expiré ou vous n'êtes pas connecté. Connectez-vous, puis réessayez."
        );
      } else if (status === 403) {
        setError(
          "Votre compte ne dispose pas des droits nécessaires pour consulter cet espace candidat."
        );
      } else if (status === 404) {
        setError(
          "L'adresse de consultation des candidatures est introuvable. Vérifiez la route applications/my/ dans Django."
        );
      } else {
        setError(
          "Impossible de charger vos candidatures. Vérifiez que le serveur Django fonctionne, puis réessayez."
        );
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadApplications();
  }, [loadApplications]);

  const stats = useMemo(() => {
    const statuses = applications.map((application) =>
      getStatus(application).value
    );

    return {
      total: applications.length,
      pending: statuses.filter((status) => status === "PENDING").length,
      reviewing: statuses.filter((status) =>
        ["REVIEWING", "SHORTLISTED", "INTERVIEW"].includes(status)
      ).length,
      accepted: statuses.filter((status) => status === "ACCEPTED").length,
    };
  }, [applications]);

  const filteredApplications = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("fr");

    return applications.filter((application) => {
      const status = getStatus(application).value;

      const searchableValues = [
        getJobTitle(application),
        getCompanyName(application),
        getJobLocation(application),
        application?.candidate_email,
      ];

      const matchesSearch =
        !term ||
        searchableValues.some((value) =>
          String(value || "").toLocaleLowerCase("fr").includes(term)
        );

      const matchesStatus =
        activeFilter === "ALL" || status === activeFilter;

      return matchesSearch && matchesStatus;
    });
  }, [applications, search, activeFilter]);

  const resetFilters = () => {
    setSearch("");
    setActiveFilter("ALL");
  };

  return (
    <main className="my-applications-page">
      <header className="ma-topbar">
        <Link to="/candidate-dashboard" className="ma-brand">
          <span className="ma-brand-mark">
            <BriefcaseBusiness size={23} />
          </span>

          <span className="ma-brand-text">
            <span className="ma-brand-name">
              SunuJob <strong>AI</strong>
            </span>
            <small>Votre avenir commence ici</small>
          </span>
        </Link>

        <nav className="ma-topbar-actions" aria-label="Navigation principale">
          <Link to="/candidate-dashboard" className="ma-nav-link">
            <LayoutDashboard size={17} />
            <span>Tableau de bord</span>
          </Link>

          
            <Link to="/jobs" className="ma-hero-button">
            <span className="ma-hero-button-icon">
                <BriefcaseBusiness size={19} />
            </span>
            <span className="ma-hero-button-label">
                <strong>Explorer les offres</strong>
                <small>Découvrez votre prochaine opportunité</small>
            </span>
            <span className="ma-hero-button-arrow">
                <ArrowRight size={18} />
            </span>
            </Link>

        </nav>
      </header>

      <section className="ma-hero">
        <div className="ma-hero-inner">
          <div className="ma-breadcrumb">
            <Link to="/candidate-dashboard">Mon espace</Link>
            <span aria-hidden="true">/</span>
            <span>Mes candidatures</span>
          </div>

          <div className="ma-hero-row">
            <div className="ma-hero-copy">
              <div className="ma-eyebrow">
                <Sparkles size={15} />
                <span>Votre parcours professionnel</span>
              </div>

              <h1>
                Mes <span>candidatures</span>
              </h1>

              <p>
                Retrouvez vos dossiers, consultez leur statut et suivez
                l'évolution de vos démarches professionnelles en un seul endroit.
              </p>
            </div>

            <Link to="/jobs" className="ma-hero-button">
              <BriefcaseBusiness size={18} />
              <span>Trouver une opportunité</span>
              <ArrowRight size={17} />
            </Link>
          </div>

          <div className="ma-stats-grid">
            <article className="ma-stat-card">
              <div className="ma-stat-icon blue">
                <Send size={21} />
              </div>
              <div className="ma-stat-info">
                <span>Total des candidatures</span>
                <strong>{loading ? "—" : stats.total}</strong>
                <small>Tous vos dossiers envoyés</small>
              </div>
            </article>

            <article className="ma-stat-card">
              <div className="ma-stat-icon amber">
                <Clock3 size={21} />
              </div>
              <div className="ma-stat-info">
                <span>En attente</span>
                <strong>{loading ? "—" : stats.pending}</strong>
                <small>Dossiers à examiner</small>
              </div>
            </article>

            <article className="ma-stat-card">
              <div className="ma-stat-icon violet">
                <Search size={21} />
              </div>
              <div className="ma-stat-info">
                <span>En cours de suivi</span>
                <strong>{loading ? "—" : stats.reviewing}</strong>
                <small>Étude, présélection ou entretien</small>
              </div>
            </article>

            <article className="ma-stat-card">
              <div className="ma-stat-icon green">
                <CheckCircle2 size={21} />
              </div>
              <div className="ma-stat-info">
                <span>Candidatures acceptées</span>
                <strong>{loading ? "—" : stats.accepted}</strong>
                <small>Réponses positives reçues</small>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section className="ma-content">
        <div className="ma-section-heading">
          <div>
            <span className="ma-section-kicker">ESPACE CANDIDAT</span>
            <h2>Suivi de mes dossiers</h2>
            <p>
              {loading
                ? "Chargement de vos candidatures…"
                : `${filteredApplications.length} résultat(s) affiché(s)`}
            </p>
          </div>

          
            <button
            type="button"
            className="ma-refresh-button"
            onClick={() => loadApplications(true)}
            disabled={loading || refreshing}
            aria-label="Actualiser la liste des candidatures"
            >
            <span className="ma-refresh-icon">
                <RefreshCw
                size={17}
                className={refreshing ? "ma-spin" : ""}
                />
            </span>
            <span className="ma-refresh-label">
                {refreshing ? "Actualisation en cours…" : "Actualiser"}
            </span>
            </button>

        </div>

        <div className="ma-toolbar">
          <label className="ma-search-box">
            <Search size={19} aria-hidden="true" />

            <input
              type="search"
              placeholder="Rechercher un poste ou une entreprise…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              aria-label="Rechercher une candidature"
            />

            {search && (
              <button
                type="button"
                aria-label="Effacer la recherche"
                onClick={() => setSearch("")}
              >
                <X size={17} />
              </button>
            )}
          </label>

          <label className="ma-filter-box">
            <Filter size={17} aria-hidden="true" />

            <select
              value={activeFilter}
              onChange={(event) => setActiveFilter(event.target.value)}
              aria-label="Filtrer par statut"
            >
              <option value="ALL">Tous les statuts</option>
              {Object.entries(STATUS_CONFIG).map(([value, config]) => (
                <option key={value} value={value}>
                  {config.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {error && (
          <div className="ma-error-panel" role="alert">
            <XCircle size={22} />
            <div className="ma-error-copy">
              <strong>Chargement impossible</strong>
              <p>{error}</p>
            </div>
            <button
              type="button"
              onClick={() => loadApplications()}
              disabled={loading}
            >
              Réessayer
            </button>
          </div>
        )}

        {loading ? (
          <div className="ma-loading" aria-live="polite">
            <LoaderCircle size={34} className="ma-spin" />
            <strong>Nous préparons votre espace…</strong>
            <p>Récupération de vos candidatures en cours.</p>
          </div>
        ) : !error && filteredApplications.length === 0 ? (
          <div className="ma-empty-state">
            <div className="ma-empty-icon">
              <FileText size={34} />
            </div>

            <span className="ma-empty-kicker">
              {applications.length === 0
                ? "UNE NOUVELLE ÉTAPE"
                : "RECHERCHE"}
            </span>

            <h3>
              {applications.length === 0
                ? "Votre parcours commence ici"
                : "Aucun résultat trouvé"}
            </h3>

            <p>
              {applications.length === 0
                ? "Vous n'avez pas encore de candidature. Découvrez les offres et trouvez l'opportunité qui correspond à votre profil."
                : "Essayez un autre mot-clé ou modifiez le filtre de statut."}
            </p>

            {applications.length === 0 ? (
              <Link to="/jobs" className="ma-empty-button">
                Découvrir les offres
                <ArrowRight size={17} />
              </Link>
            ) : (
              <button
                type="button"
                className="ma-empty-button"
                onClick={resetFilters}
              >
                Réinitialiser les filtres
              </button>
            )}
          </div>
        ) : (
          !error && (
            <div className="ma-application-list">
              {filteredApplications.map((application, index) => {
                const status = getStatus(application);
                const StatusIcon = status.icon;
                const companyName = getCompanyName(application);
                const jobTitle = getJobTitle(application);
                const jobLocation = getJobLocation(application);
                const jobId = getJobId(application);

                return (
                  <article
                    className="ma-application-card"
                    key={application.id ?? `${jobTitle}-${index}`}
                    style={{ "--ma-card-index": index }}
                  >
                    <div className="ma-company-logo" aria-hidden="true">
                      {getInitials(companyName)}
                    </div>

                    <div className="ma-application-main">
                      <div className="ma-job-topline">
                        <span className="ma-company-name">
                          <Building2 size={15} />
                          <span>{companyName}</span>
                        </span>

                        <span className={`ma-status ${status.className}`}>
                          <StatusIcon size={15} />
                          {status.label}
                        </span>
                      </div>

                      <h3>{jobTitle}</h3>

                      <div className="ma-application-meta">
                        <span>
                          <CalendarDays size={15} />
                          <span>
                            Envoyée le {formatDate(application.applied_at)}
                          </span>
                        </span>

                        {jobLocation && (
                          <span>
                            <MapPin size={15} />
                            <span>{jobLocation}</span>
                          </span>
                        )}

                        {application.id != null && (
                          <span>
                            <FileText size={15} />
                            <span>Réf. #{application.id}</span>
                          </span>
                        )}
                      </div>

                      <div className="ma-application-footer">
                        <span className="ma-progress-note">
                          <span className="ma-progress-dot" />
                          Suivez les mises à jour dans votre espace candidat
                        </span>

                        {jobId != null ? (
                          
                        <Link
                        to={`/jobs/${jobId}`}
                        className="ma-view-job"
                        aria-label={`Consulter l'offre ${jobTitle}`}
                        >
                        <span>Consulter l'offre</span>
                        <span className="ma-view-job-arrow">
                            <ArrowRight size={17} />
                        </span>
                        </Link>

                        ) : (
                          <span className="ma-no-job-link">
                            Offre indisponible
                          </span>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )
        )}

        {!loading && !error && applications.length > 0 && (
          <div className="ma-bottom-tip">
            <div className="ma-tip-icon">
              <Sparkles size={22} />
            </div>

            <div className="ma-tip-copy">
              <strong>Continuez à multiplier vos opportunités</strong>
              <p>
                Consultez les nouvelles offres et postulez aux postes qui
                correspondent à vos compétences.
              </p>
            </div>

            <Link to="/jobs">
              Explorer les offres
              <ArrowRight size={16} />
            </Link>
          </div>
        )}
      </section>

      <footer className="ma-footer">
        <Link to="/candidate-dashboard" className="ma-footer-brand">
          SunuJob <strong>AI</strong>
        </Link>

        <span>
          © {new Date().getFullYear()} SunuJob AI · Votre avenir commence ici
        </span>
      </footer>
    </main>
  );
}
