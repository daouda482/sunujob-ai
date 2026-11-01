
import { useEffect, useState } from "react";
import api from "../../api/axios";
import "./adminJobs.css";

const STATUS_LABELS = {
  DRAFT: "Brouillon",
  PUBLISHED: "Publiée",
  CLOSED: "Clôturée",
};

const CONTRACT_LABELS = {
  CDI: "CDI",
  CDD: "CDD",
  INTERNSHIP: "Stage",
  APPRENTICESHIP: "Alternance",
  FREELANCE: "Freelance",
  TEMPORARY: "Temporaire",
  VACATION: "Vacataire",
};

function formatDate(value) {
  if (!value) return "Non renseignée";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Non renseignée";

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function displayValue(value) {
  if (value === null || value === undefined || value === "") {
    return "Non renseigné";
  }

  if (Array.isArray(value)) return value.join(", ");

  if (typeof value === "object") return JSON.stringify(value);

  return String(value);
}

function getErrorMessage(error) {
  const data = error?.response?.data;

  if (typeof data?.detail === "string") return data.detail;
  if (typeof data === "string") return data;

  return "Une erreur est survenue. Vérifiez la connexion à l'API.";
}

export default function AdminJobs() {
  const [jobs, setJobs] = useState([]);
  const [summary, setSummary] = useState({
    total_jobs: 0,
    draft_jobs: 0,
    published_jobs: 0,
    closed_jobs: 0,
  });

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [contractFilter, setContractFilter] = useState("");
  const [sort, setSort] = useState("recent");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [selectedJob, setSelectedJob] = useState(null);

  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadJobs() {
      setLoading(true);
      setErrorMessage("");

      try {
        const response = await api.get("admin/jobs/", {
          params: {
            search,
            status: statusFilter,
            contract_type: contractFilter,
            sort,
            page,
            page_size: 10,
          },
        });

        if (cancelled) return;

        const data = response.data || {};

        setJobs(
          Array.isArray(data.results)
            ? data.results
            : Array.isArray(data.jobs)
              ? data.jobs
              : []
        );

        setSummary(
          data.summary || {
            total_jobs: 0,
            draft_jobs: 0,
            published_jobs: 0,
            closed_jobs: 0,
          }
        );

        setTotalResults(Number(data.count || 0));
        setTotalPages(Math.max(1, Number(data.total_pages || 1)));
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(getErrorMessage(error));
          setJobs([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadJobs();

    return () => {
      cancelled = true;
    };
  }, [
    search,
    statusFilter,
    contractFilter,
    sort,
    page,
    reloadKey,
  ]);

  function handleSearch(event) {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
    setSuccessMessage("");
  }

  function resetFilters() {
    setSearchInput("");
    setSearch("");
    setStatusFilter("");
    setContractFilter("");
    setSort("recent");
    setPage(1);
    setSuccessMessage("");
  }

  async function changeJobStatus(job, newStatus) {
    const actionLabels = {
      PUBLISHED: "publier",
      DRAFT: "remettre en brouillon",
      CLOSED: "clôturer",
    };

    const action = actionLabels[newStatus] || "modifier le statut de";
    const confirmed = window.confirm(
      `Voulez-vous vraiment ${action} l'offre « ${job.title} » ?`
    );

    if (!confirmed) return;

    setUpdatingId(job.id);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      await api.patch(`admin/jobs/${job.id}/status/`, {
        status: newStatus,
      });

      setSuccessMessage(
        `Le statut de « ${job.title} » a été mis à jour.`
      );

      if (selectedJob?.id === job.id) {
        setSelectedJob({
          ...selectedJob,
          status: newStatus,
          status_label: STATUS_LABELS[newStatus] || newStatus,
        });
      }

      setReloadKey((current) => current + 1);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setUpdatingId(null);
    }
  }

  function renderStatus(job) {
    const statusValue = job.status || "";
    const label =
      job.status_label || STATUS_LABELS[statusValue] || statusValue;

    return (
      <span
        className={`admin-jobs-status admin-jobs-status--${statusValue.toLowerCase()}`}
      >
        <span className="admin-jobs-status-dot" />
        {label || "Non renseigné"}
      </span>
    );
  }

  function renderActions(job) {
    const isUpdating = updatingId === job.id;

    return (
      <div className="admin-jobs-actions">
        <button
          type="button"
          className="admin-jobs-action admin-jobs-action--details"
          onClick={() => setSelectedJob(job)}
          title="Consulter les détails"
        >
          Détails
        </button>

        {job.status !== "PUBLISHED" && (
          <button
            type="button"
            className="admin-jobs-action admin-jobs-action--publish"
            onClick={() => changeJobStatus(job, "PUBLISHED")}
            disabled={isUpdating}
          >
            {isUpdating ? "Mise à jour…" : "Publier"}
          </button>
        )}

        {job.status === "PUBLISHED" && (
          <button
            type="button"
            className="admin-jobs-action admin-jobs-action--close"
            onClick={() => changeJobStatus(job, "CLOSED")}
            disabled={isUpdating}
          >
            {isUpdating ? "Mise à jour…" : "Clôturer"}
          </button>
        )}

        {job.status === "PUBLISHED" && (
          <button
            type="button"
            className="admin-jobs-action admin-jobs-action--draft"
            onClick={() => changeJobStatus(job, "DRAFT")}
            disabled={isUpdating}
          >
            Brouillon
          </button>
        )}
      </div>
    );
  }

  return (
    <main className="admin-jobs-page">
      <header className="admin-jobs-header">
        <div>
          <div className="admin-jobs-eyebrow">
            ESPACE ADMINISTRATEUR
          </div>

          <h1>Gestion des offres d'emploi</h1>

          <p>
            Contrôlez les offres, consultez les candidatures associées
            et gérez leur statut depuis un espace centralisé.
          </p>
        </div>

        <button
          type="button"
          className="admin-jobs-refresh"
          onClick={() => setReloadKey((current) => current + 1)}
          disabled={loading}
        >
          <span aria-hidden="true">↻</span>
          Actualiser
        </button>
      </header>

      <section className="admin-jobs-stats">
        <article className="admin-jobs-stat-card">
          <div className="admin-jobs-stat-icon admin-jobs-stat-icon--total">
            <span aria-hidden="true">▤</span>
          </div>
          <div>
            <p>Total des offres</p>
            <strong>{summary.total_jobs ?? 0}</strong>
            <span>Toutes les offres enregistrées</span>
          </div>
        </article>

        <article className="admin-jobs-stat-card">
          <div className="admin-jobs-stat-icon admin-jobs-stat-icon--published">
            <span aria-hidden="true">✓</span>
          </div>
          <div>
            <p>Offres publiées</p>
            <strong>{summary.published_jobs ?? 0}</strong>
            <span>Visibles par les candidats</span>
          </div>
        </article>

        <article className="admin-jobs-stat-card">
          <div className="admin-jobs-stat-icon admin-jobs-stat-icon--draft">
            <span aria-hidden="true">◷</span>
          </div>
          <div>
            <p>Brouillons</p>
            <strong>{summary.draft_jobs ?? 0}</strong>
            <span>En attente de publication</span>
          </div>
        </article>

        <article className="admin-jobs-stat-card">
          <div className="admin-jobs-stat-icon admin-jobs-stat-icon--closed">
            <span aria-hidden="true">▣</span>
          </div>
          <div>
            <p>Offres clôturées</p>
            <strong>{summary.closed_jobs ?? 0}</strong>
            <span>Publications terminées</span>
          </div>
        </article>
      </section>

      {errorMessage && (
        <div className="admin-jobs-alert admin-jobs-alert--error" role="alert">
          <span aria-hidden="true">!</span>
          {errorMessage}
        </div>
      )}

      {successMessage && (
        <div
          className="admin-jobs-alert admin-jobs-alert--success"
          role="status"
        >
          <span aria-hidden="true">✓</span>
          {successMessage}
        </div>
      )}

      <section className="admin-jobs-panel">
        <div className="admin-jobs-panel-heading">
          <div>
            <h2>Toutes les offres</h2>
            <p>
              {totalResults} résultat{totalResults > 1 ? "s" : ""} correspondant
              aux filtres
            </p>
          </div>
        </div>

        <form className="admin-jobs-filters" onSubmit={handleSearch}>
          <label className="admin-jobs-search">
            <span aria-hidden="true">⌕</span>
            <input
              type="search"
              placeholder="Rechercher un poste, une entreprise..."
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
            />
          </label>

          <button type="submit" className="admin-jobs-filter-button">
            Rechercher
          </button>

          <select
            aria-label="Filtrer par statut"
            value={statusFilter}
            onChange={(event) => {
              setPage(1);
              setStatusFilter(event.target.value);
            }}
          >
            <option value="">Tous les statuts</option>
            <option value="DRAFT">Brouillons</option>
            <option value="PUBLISHED">Publiées</option>
            <option value="CLOSED">Clôturées</option>
          </select>

          <select
            aria-label="Filtrer par contrat"
            value={contractFilter}
            onChange={(event) => {
              setPage(1);
              setContractFilter(event.target.value);
            }}
          >
            <option value="">Tous les contrats</option>
            {Object.entries(CONTRACT_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>

          <select
            aria-label="Trier les offres"
            value={sort}
            onChange={(event) => {
              setPage(1);
              setSort(event.target.value);
            }}
          >
            <option value="recent">Plus récentes</option>
            <option value="oldest">Plus anciennes</option>
            <option value="title">Titre A à Z</option>
            <option value="title_desc">Titre Z à A</option>
          </select>

          <button
            type="button"
            className="admin-jobs-reset"
            onClick={resetFilters}
          >
            Réinitialiser
          </button>
        </form>

        <div className="admin-jobs-table-wrapper">
          <table className="admin-jobs-table">
            <thead>
              <tr>
                <th>Offre</th>
                <th>Entreprise</th>
                <th>Localisation</th>
                <th>Contrat</th>
                <th>Candidatures</th>
                <th>Statut</th>
                <th>Publication</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" className="admin-jobs-empty">
                    <span className="admin-jobs-loader" />
                    Chargement des offres...
                  </td>
                </tr>
              ) : jobs.length === 0 ? (
                <tr>
                  <td colSpan="8" className="admin-jobs-empty">
                    <div className="admin-jobs-empty-icon" aria-hidden="true">
                      ▤
                    </div>
                    <strong>Aucune offre trouvée</strong>
                    <p>Modifiez vos filtres ou réinitialisez la recherche.</p>
                  </td>
                </tr>
              ) : (
                jobs.map((job) => (
                  <tr key={job.id}>
                    <td>
                      <div className="admin-jobs-title-cell">
                        <strong>{job.title || "Offre sans titre"}</strong>
                        <span>Référence #{job.id}</span>
                      </div>
                    </td>

                    <td>
                      <div className="admin-jobs-company-cell">
                        <span className="admin-jobs-company-avatar">
                          {(job.company_name || "E")
                            .trim()
                            .charAt(0)
                            .toUpperCase()}
                        </span>
                        <span>{job.company_name || "Entreprise inconnue"}</span>
                      </div>
                    </td>

                    <td>{job.location || "Non renseignée"}</td>

                    <td>
                      <span className="admin-jobs-contract">
                        {job.contract_type_label ||
                          CONTRACT_LABELS[job.contract_type] ||
                          job.contract_type ||
                          "Non renseigné"}
                      </span>
                    </td>

                    <td>
                      <span className="admin-jobs-application-count">
                        {job.application_count ?? 0}
                      </span>
                    </td>

                    <td>{renderStatus(job)}</td>

                    <td>{formatDate(job.created_at)}</td>

                    <td>{renderActions(job)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <footer className="admin-jobs-pagination">
          <span>
            Page {page} sur {totalPages}
          </span>

          <div>
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page <= 1 || loading}
            >
              ← Précédent
            </button>

            <button
              type="button"
              onClick={() =>
                setPage((current) => Math.min(totalPages, current + 1))
              }
              disabled={page >= totalPages || loading}
            >
              Suivant →
            </button>
          </div>
        </footer>
      </section>

      {selectedJob && (
        <div
          className="admin-jobs-modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setSelectedJob(null);
            }
          }}
        >
          <section
            className="admin-jobs-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-jobs-modal-title"
          >
            <header className="admin-jobs-modal-header">
              <div>
                <span className="admin-jobs-eyebrow">
                  DÉTAILS DE L'OFFRE #{selectedJob.id}
                </span>
                <h2 id="admin-jobs-modal-title">
                  {selectedJob.title || "Offre sans titre"}
                </h2>
              </div>

              <button
                type="button"
                className="admin-jobs-modal-close"
                aria-label="Fermer"
                onClick={() => setSelectedJob(null)}
              >
                ×
              </button>
            </header>

            <div className="admin-jobs-modal-body">
              <div className="admin-jobs-modal-status">
                {renderStatus(selectedJob)}
              </div>

              <div className="admin-jobs-detail-grid">
                <div>
                  <span>Entreprise</span>
                  <strong>{displayValue(selectedJob.company_name)}</strong>
                </div>
                <div>
                  <span>Recruteur</span>
                  <strong>{displayValue(selectedJob.recruiter_name)}</strong>
                </div>
                <div>
                  <span>E-mail du recruteur</span>
                  <strong>{displayValue(selectedJob.recruiter_email)}</strong>
                </div>
                <div>
                  <span>Localisation</span>
                  <strong>{displayValue(selectedJob.location)}</strong>
                </div>
                <div>
                  <span>Secteur</span>
                  <strong>{displayValue(selectedJob.sector)}</strong>
                </div>
                <div>
                  <span>Type de contrat</span>
                  <strong>
                    {displayValue(
                      selectedJob.contract_type_label ||
                        CONTRACT_LABELS[selectedJob.contract_type] ||
                        selectedJob.contract_type
                    )}
                  </strong>
                </div>
                <div>
                  <span>Expérience requise</span>
                  <strong>{displayValue(selectedJob.experience_required)}</strong>
                </div>
                <div>
                  <span>Niveau d'études</span>
                  <strong>{displayValue(selectedJob.education_level)}</strong>
                </div>
                <div>
                  <span>Date limite</span>
                  <strong>{formatDate(selectedJob.deadline)}</strong>
                </div>
                <div>
                  <span>Nombre de candidatures</span>
                  <strong>{selectedJob.application_count ?? 0}</strong>
                </div>
              </div>

              <div className="admin-jobs-detail-section">
                <h3>Description du poste</h3>
                <p>{displayValue(selectedJob.description)}</p>
              </div>

              <div className="admin-jobs-detail-section">
                <h3>Compétences recherchées</h3>
                <p>{displayValue(selectedJob.skills_required)}</p>
              </div>
            </div>

            <footer className="admin-jobs-modal-footer">
              <button
                type="button"
                className="admin-jobs-reset"
                onClick={() => setSelectedJob(null)}
              >
                Fermer
              </button>

              {selectedJob.status !== "PUBLISHED" && (
                <button
                  type="button"
                  className="admin-jobs-filter-button"
                  disabled={updatingId === selectedJob.id}
                  onClick={() =>
                    changeJobStatus(selectedJob, "PUBLISHED")
                  }
                >
                  Publier l'offre
                </button>
              )}

              {selectedJob.status === "PUBLISHED" && (
                <button
                  type="button"
                  className="admin-jobs-action admin-jobs-action--close"
                  disabled={updatingId === selectedJob.id}
                  onClick={() =>
                    changeJobStatus(selectedJob, "CLOSED")
                  }
                >
                  Clôturer l'offre
                </button>
              )}
            </footer>
          </section>
        </div>
      )}
    </main>
  );
}
