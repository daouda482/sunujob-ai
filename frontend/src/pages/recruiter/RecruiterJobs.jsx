
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api";
import "./RecruiterJobs.css";

// =====================================================
// CONFIGURATION DES STATUTS
// =====================================================

const STATUS_LABELS = {
  DRAFT: "Brouillon",
  PUBLISHED: "Publiée",
  SUSPENDED: "Suspendue",
  CLOSED: "Fermée",
  EXPIRED: "Expirée",
  ARCHIVED: "Archivée",
};

const CONTRACT_LABELS = {
  CDI: "CDI",
  CDD: "CDD",
  INTERNSHIP: "Stage",
  APPRENTICESHIP: "Alternance",
  FREELANCE: "Freelance",
  TEMPORARY: "Intérim",
  VACATION: "Vacation",
};

const FILTER_OPTIONS = [
  { value: "ALL", label: "Tous les statuts" },
  { value: "DRAFT", label: "Brouillons" },
  { value: "PUBLISHED", label: "Publiées" },
  { value: "SUSPENDED", label: "Suspendues" },
  { value: "CLOSED", label: "Fermées" },
  { value: "EXPIRED", label: "Expirées" },
  { value: "ARCHIVED", label: "Archivées" },
];

// =====================================================
// FONCTIONS UTILITAIRES
// =====================================================

function getErrorMessage(err) {
  const status = err.response?.status;
  const data = err.response?.data;

  if (!err.response) {
    return "Serveur Django inaccessible. Vérifiez que le serveur fonctionne.";
  }

  if (status === 401) {
    return "Votre session a expiré. Veuillez vous reconnecter.";
  }

  if (status === 403) {
    return "Accès refusé. Vérifiez les droits de votre compte recruteur.";
  }

  if (status === 404) {
    return "Ressource introuvable. Vérifiez les routes Django.";
  }

  if (typeof data === "string") {
    return data;
  }

  if (data && typeof data === "object") {
    return Object.entries(data)
      .map(([field, messages]) => {
        const text = Array.isArray(messages)
          ? messages.join(", ")
          : typeof messages === "string"
            ? messages
            : JSON.stringify(messages);

        return `${field} : ${text}`;
      })
      .join(" | ");
  }

  return "Une erreur est survenue. Réessayez.";
}

function normalizeJobs(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.jobs)) return data.jobs;

  return [];
}

function normalizeStatus(status) {
  return String(status || "DRAFT").toUpperCase();
}

function getCompanyName(job) {
  if (job.company_name) {
    return job.company_name;
  }

  if (typeof job.company === "string") {
    return job.company;
  }

  if (job.company && typeof job.company === "object") {
    return (
      job.company.name ||
      job.company.company_name ||
      job.company.business_name ||
      "Entreprise"
    );
  }

  return "Entreprise";
}

function formatDate(value) {
  if (!value) return "Non définie";

  const date = new Date(
    String(value).length === 10 ? `${value}T12:00:00` : value
  );

  if (Number.isNaN(date.getTime())) {
    return "Non définie";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatSalary(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const number = Number(value);

  if (!Number.isFinite(number)) {
    return null;
  }

  return new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: 0,
  }).format(number);
}

// =====================================================
// BADGE DE STATUT
// =====================================================

function StatusBadge({ status }) {
  const normalizedStatus = normalizeStatus(status);

  return (
    <span
      className={`job-status job-status-${normalizedStatus.toLowerCase()}`}
    >
      <span className="job-status-dot" />
      {STATUS_LABELS[normalizedStatus] || normalizedStatus}
    </span>
  );
}

// =====================================================
// COMPOSANT PRINCIPAL
// =====================================================

export default function RecruiterJobs() {
  const navigate = useNavigate();

  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busyId, setBusyId] = useState(null);

  const [filter, setFilter] = useState("ALL");
  const [search, setSearch] = useState("");

  // ===================================================
  // CHARGEMENT DES OFFRES
  // ===================================================

  const loadJobs = useCallback(async (showLoading = true) => {
    if (showLoading) {
      setLoading(true);
    }

    setError("");

    try {
      const response = await api.get("jobs/");
      setJobs(normalizeJobs(response.data));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    loadJobs();

    return () => {
      // Aucun traitement supplémentaire à effectuer ici.
    };
  }, [loadJobs]);

  // ===================================================
  // MODIFICATION DU STATUT
  // ===================================================

  const updateStatus = async (job, newStatus) => {
    const currentStatus = normalizeStatus(job.status);

    // Transitions autorisées dans cette interface.
    const allowedTransitions = {
      DRAFT: ["PUBLISHED"],
      PUBLISHED: ["CLOSED"],
      CLOSED: ["DRAFT"],
    };

    if (!allowedTransitions[currentStatus]?.includes(newStatus)) {
      setError(
        "Cette transition de statut n'est pas autorisée depuis cette interface."
      );
      return;
    }

    const actionLabels = {
      PUBLISHED: "publier",
      CLOSED: "fermer",
      DRAFT: "remettre en brouillon",
    };

    const action = actionLabels[newStatus];

    const confirmed = window.confirm(
      `Voulez-vous ${action} l'offre « ${job.title} » ?`
    );

    if (!confirmed) return;

    setBusyId(job.id);
    setError("");
    setMessage("");

    try {
      await api.patch(`jobs/${job.id}/`, {
        status: newStatus,
      });

      setMessage(
        `L'offre « ${job.title} » est maintenant : ${
          STATUS_LABELS[newStatus] || newStatus
        }.`
      );

      await loadJobs(false);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  // ===================================================
  // RECHERCHE ET FILTRES
  // ===================================================

  const filteredJobs = useMemo(() => {
    const query = search.trim().toLowerCase();

    return jobs.filter((job) => {
      const status = normalizeStatus(job.status);

      const matchesStatus =
        filter === "ALL" || status === filter;

      const searchableValues = [
        job.title,
        job.location,
        getCompanyName(job),
        job.contract_type,
        job.sector,
      ];

      const matchesSearch =
        !query ||
        searchableValues.some((value) =>
          String(value ?? "").toLowerCase().includes(query)
        );

      return matchesStatus && matchesSearch;
    });
  }, [jobs, filter, search]);

  // ===================================================
  // STATISTIQUES
  // ===================================================

  const stats = useMemo(() => {
    const countByStatus = (status) =>
      jobs.filter(
        (job) => normalizeStatus(job.status) === status
      ).length;

    return [
      {
        label: "Total des offres",
        value: jobs.length,
        icon: "▤",
        tone: "blue",
        description: "Toutes vos offres",
      },
      {
        label: "Offres publiées",
        value: countByStatus("PUBLISHED"),
        icon: "↗",
        tone: "green",
        description: "Visibles par les candidats",
      },
      {
        label: "Brouillons",
        value: countByStatus("DRAFT"),
        icon: "✎",
        tone: "orange",
        description: "À finaliser ou publier",
      },
      {
        label: "Offres fermées",
        value: countByStatus("CLOSED"),
        icon: "✓",
        tone: "purple",
        description: "Publications terminées",
      },
    ];
  }, [jobs]);

  // ===================================================
  // RENDU
  // ===================================================

  return (
    <main className="recruiter-jobs-page">
      <div className="jobs-page-container">

        {/* EN-TÊTE */}

        <header className="jobs-page-header">
          <div className="jobs-heading">
            <div className="jobs-breadcrumb">
              <span>Espace recruteur</span>
              <span aria-hidden="true">/</span>
              <strong>Gestion des offres</strong>
            </div>

            <span className="jobs-eyebrow">
              VOTRE ESPACE DE RECRUTEMENT
            </span>

            <h1>Mes offres d'emploi</h1>

            <p>
              Publiez vos opportunités, gérez leur visibilité et
              retrouvez toutes vos offres au même endroit.
            </p>
          </div>

          <button
            type="button"
            className="jobs-primary-button"
            onClick={() => navigate("/recruiter/jobs/new")}
          >
            <span aria-hidden="true">＋</span>
            Créer une offre
          </button>
        </header>

        {/* MESSAGE DE SUCCÈS */}

        {message && (
          <div
            className="jobs-alert jobs-alert-success"
            role="status"
          >
            <span className="jobs-alert-icon" aria-hidden="true">
              ✓
            </span>

            <p>{message}</p>

            <button
              type="button"
              className="jobs-alert-close"
              onClick={() => setMessage("")}
              aria-label="Fermer le message"
            >
              ×
            </button>
          </div>
        )}

        {/* MESSAGE D'ERREUR */}

        {error && (
          <div
            className="jobs-alert jobs-alert-error"
            role="alert"
          >
            <span className="jobs-alert-icon" aria-hidden="true">
              !
            </span>

            <p>{error}</p>

            {error.includes("reconnecter") ? (
              <button
                type="button"
                className="jobs-alert-action"
                onClick={() => navigate("/login")}
              >
                Se connecter
              </button>
            ) : (
              <button
                type="button"
                className="jobs-alert-close"
                onClick={() => setError("")}
                aria-label="Fermer le message"
              >
                ×
              </button>
            )}
          </div>
        )}

        {/* STATISTIQUES */}

        <section
          className="jobs-summary"
          aria-label="Statistiques des offres"
        >
          {stats.map((stat) => (
            <article
              className="jobs-stat-card"
              key={stat.label}
            >
              <div className="jobs-stat-top">
                <span className="jobs-stat-label">
                  {stat.label}
                </span>

                <span
                  className={`jobs-stat-icon jobs-stat-icon-${stat.tone}`}
                  aria-hidden="true"
                >
                  {stat.icon}
                </span>
              </div>

              <strong className="jobs-stat-value">
                {loading ? "—" : stat.value}
              </strong>

              <span className="jobs-stat-description">
                {stat.description}
              </span>
            </article>
          ))}
        </section>

        {/* LISTE DES OFFRES */}

        <section className="jobs-list-panel">
          <div className="jobs-panel-header">
            <div>
              <span className="jobs-section-kicker">
                VOTRE ACTIVITÉ
              </span>

              <h2>Liste des offres</h2>

              <p>
                Retrouvez et gérez vos publications de recrutement.
              </p>
            </div>

            <span className="jobs-total-badge">
              {jobs.length} offre{jobs.length > 1 ? "s" : ""}
            </span>
          </div>

          {/* RECHERCHE ET FILTRES */}

          <div className="jobs-list-toolbar">
            <label className="jobs-search-field">
              <span
                className="jobs-search-icon"
                aria-hidden="true"
              >
                ⌕
              </span>

              <span className="sr-only">
                Rechercher une offre
              </span>

              <input
                type="search"
                placeholder="Rechercher un poste, une entreprise, un lieu..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />

              {search && (
                <button
                  type="button"
                  className="jobs-clear-search"
                  onClick={() => setSearch("")}
                  aria-label="Effacer la recherche"
                >
                  ×
                </button>
              )}
            </label>

            <div className="jobs-toolbar-actions">
              <label className="jobs-filter-field">
                <span className="sr-only">
                  Filtrer par statut
                </span>

                <select
                  value={filter}
                  onChange={(event) => setFilter(event.target.value)}
                >
                  {FILTER_OPTIONS.map((option) => (
                    <option
                      key={option.value}
                      value={option.value}
                    >
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <button
                type="button"
                className="jobs-refresh-button"
                onClick={() => loadJobs()}
                disabled={loading || busyId !== null}
              >
                <span aria-hidden="true">↻</span>
                Actualiser
              </button>
            </div>
          </div>

          {/* NOMBRE DE RÉSULTATS */}

          {!loading && !error && (
            <div className="jobs-results-line">
              <span>
                <strong>{filteredJobs.length}</strong> résultat
                {filteredJobs.length > 1 ? "s" : ""}
              </span>

              {(search || filter !== "ALL") && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setFilter("ALL");
                  }}
                >
                  Réinitialiser les filtres
                </button>
              )}
            </div>
          )}

          {/* CHARGEMENT */}

          {loading ? (
            <div className="jobs-loading-state">
              <span
                className="jobs-spinner"
                aria-hidden="true"
              />

              <strong>Chargement de vos offres</strong>

              <p>
                Nous récupérons les informations de votre espace.
              </p>
            </div>
          ) : error ? (
            <div className="jobs-empty-state">
              <h3>Impossible de charger les offres</h3>

              <p>
                Vérifiez votre connexion au serveur puis réessayez.
              </p>

              <button
                type="button"
                className="jobs-secondary-button"
                onClick={() => loadJobs()}
              >
                Réessayer
              </button>
            </div>
          ) : filteredJobs.length === 0 ? (
            /* AUCUN RÉSULTAT */

            <div className="jobs-empty-state">
              <div
                className="jobs-empty-illustration"
                aria-hidden="true"
              >
                <span>▤</span>
                <i />
              </div>

              <h3>
                {jobs.length === 0
                  ? "Commencez votre recrutement"
                  : "Aucune offre trouvée"}
              </h3>

              <p>
                {jobs.length === 0
                  ? "Créez votre première offre et donnez aux candidats l'occasion de rejoindre votre entreprise."
                  : "Essayez un autre mot-clé ou modifiez le filtre de statut."}
              </p>

              {jobs.length === 0 ? (
                <button
                  type="button"
                  className="jobs-primary-button"
                  onClick={() => navigate("/recruiter/jobs/new")}
                >
                  ＋ Créer ma première offre
                </button>
              ) : (
                <button
                  type="button"
                  className="jobs-secondary-button"
                  onClick={() => {
                    setSearch("");
                    setFilter("ALL");
                  }}
                >
                  Effacer les filtres
                </button>
              )}
            </div>
          ) : (
            /* TABLEAU DES OFFRES */

            <div className="jobs-table-wrapper">
              <table className="jobs-table">
                <thead>
                  <tr>
                    <th>OFFRE D'EMPLOI</th>
                    <th>LOCALISATION</th>
                    <th>CONTRAT</th>
                    <th>DATE LIMITE</th>
                    <th>STATUT</th>
                    <th className="jobs-actions-heading">
                      ACTIONS
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredJobs.map((job) => {
                    const status = normalizeStatus(job.status);

                    const salaryMin = formatSalary(job.salary_min);
                    const salaryMax = formatSalary(job.salary_max);

                    const canPublish = status === "DRAFT";
                    const canClose = status === "PUBLISHED";
                    const canReopen = status === "CLOSED";

                    return (
                      <tr key={job.id}>
                        {/* OFFRE */}

                        <td>
                          <div className="jobs-offer-cell">
                            <div
                              className="jobs-offer-avatar"
                              aria-hidden="true"
                            >
                              {(job.title || "O")
                                .trim()
                                .charAt(0)
                                .toUpperCase()}
                            </div>

                            <div className="jobs-offer-info">
                              <strong>
                                {job.title || "Sans titre"}
                              </strong>

                              <span>{getCompanyName(job)}</span>

                              {(salaryMin || salaryMax) && (
                                <small>
                                  {salaryMin && salaryMax
                                    ? `${salaryMin} – ${salaryMax} FCFA`
                                    : `${salaryMin || salaryMax} FCFA`}
                                </small>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* LOCALISATION */}

                        <td>
                          <span className="jobs-location">
                            <span aria-hidden="true">⌖</span>
                            {job.location || "Non précisée"}
                          </span>
                        </td>

                        {/* CONTRAT */}

                        <td>
                          <span className="jobs-contract">
                            {CONTRACT_LABELS[job.contract_type] ||
                              job.contract_type ||
                              "Non précisé"}
                          </span>
                        </td>

                        {/* DATE LIMITE */}

                        <td>
                          <span className="jobs-deadline">
                            {formatDate(job.deadline)}
                          </span>
                        </td>

                        {/* STATUT */}

                        <td>
                          <StatusBadge status={status} />
                        </td>

                        {/* ACTIONS */}

                        <td>
                          <div className="jobs-row-actions">
                            <button
                              type="button"
                              className="jobs-action-button jobs-edit-button"
                              onClick={() =>
                                navigate(
                                  `/recruiter/jobs/${job.id}/edit`
                                )
                              }
                              disabled={busyId !== null}
                              title="Modifier cette offre"
                            >
                              <span aria-hidden="true">✎</span>
                              <span>Modifier</span>
                            </button>

                            {canPublish && (
                              <button
                                type="button"
                                className="jobs-action-button jobs-publish-button"
                                onClick={() =>
                                  updateStatus(job, "PUBLISHED")
                                }
                                disabled={busyId !== null}
                                title="Publier cette offre"
                              >
                                <span aria-hidden="true">↗</span>
                                <span>Publier</span>
                              </button>
                            )}

                            {canClose && (
                              <button
                                type="button"
                                className="jobs-action-button jobs-close-button"
                                onClick={() =>
                                  updateStatus(job, "CLOSED")
                                }
                                disabled={busyId !== null}
                                title="Fermer cette offre"
                              >
                                <span aria-hidden="true">✓</span>
                                <span>Fermer</span>
                              </button>
                            )}

                            {canReopen && (
                              <button
                                type="button"
                                className="jobs-action-button jobs-edit-button"
                                onClick={() =>
                                  updateStatus(job, "DRAFT")
                                }
                                disabled={busyId !== null}
                                title="Remettre en brouillon"
                              >
                                <span aria-hidden="true">↶</span>
                                <span>Brouillon</span>
                              </button>
                            )}
                          </div>

                          {busyId === job.id && (
                            <span className="jobs-action-progress">
                              Traitement en cours...
                            </span>
                          )}

                          {["SUSPENDED", "EXPIRED", "ARCHIVED"].includes(
                            status
                          ) && (
                            <span className="jobs-action-progress">
                              Consultez les détails ou modifiez cette offre.
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* PIED DE PAGE */}

        <footer className="jobs-page-footer">
          <button
            type="button"
            className="jobs-back-button"
            onClick={() => navigate("/recruiter/dashboard")}
          >
            <span aria-hidden="true">←</span>
            Retour au tableau de bord
          </button>

          <span>
            SunuJob AI <span aria-hidden="true">·</span> Espace recruteur
          </span>
        </footer>
      </div>
    </main>
  );
}
