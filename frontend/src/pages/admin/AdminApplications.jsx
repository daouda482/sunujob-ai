
import { useEffect, useState } from "react";
import api from "../../api/axios";
import "./adminApplications.css";

const STATUS_LABELS = {
  PENDING: "En attente",
  REVIEWING: "En examen",
  SHORTLISTED: "Présélectionnée",
  INTERVIEW: "Entretien",
  ACCEPTED: "Acceptée",
  REJECTED: "Refusée",
  WITHDRAWN: "Retirée",
};

function formatDate(value) {
  if (!value) return "Non renseignée";

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) return "Non renseignée";

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsed);
}

function errorText(error) {
  const data = error?.response?.data;

  if (typeof data?.detail === "string") return data.detail;
  if (typeof data === "string") return data;

  return "Impossible de réaliser cette opération. Vérifiez l'API et vos droits.";
}

export default function AdminApplications() {
  const [applications, setApplications] = useState([]);
  const [summary, setSummary] = useState({});
  const [statusChoices, setStatusChoices] = useState(
    Object.entries(STATUS_LABELS).map(([value, label]) => ({
      value,
      label,
    }))
  );

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sort, setSort] = useState("recent");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);

  const [selectedApplication, setSelectedApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadApplications() {
      setLoading(true);
      setErrorMessage("");

      try {
        const response = await api.get("admin/applications/", {
          params: {
            search,
            status: statusFilter,
            sort,
            page,
            page_size: 10,
          },
        });

        if (cancelled) return;

        const data = response.data || {};
        setApplications(Array.isArray(data.results) ? data.results : []);
        setSummary(data.summary || {});
        setTotalResults(Number(data.count || 0));
        setTotalPages(Math.max(1, Number(data.total_pages || 1)));

        if (Array.isArray(data.status_choices) && data.status_choices.length) {
          setStatusChoices(data.status_choices);
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(errorText(error));
          setApplications([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadApplications();

    return () => {
      cancelled = true;
    };
  }, [search, statusFilter, sort, page, reloadKey]);

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
    setSort("recent");
    setPage(1);
    setSuccessMessage("");
  }

  async function changeStatus(application, newStatus) {
    const label = STATUS_LABELS[newStatus] || newStatus;

    if (
      !window.confirm(
        `Confirmer le passage de cette candidature au statut « ${label} » ?`
      )
    ) {
      return;
    }

    setUpdatingId(application.id);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const response = await api.patch(
        `admin/applications/${application.id}/status/`,
        { status: newStatus }
      );

      const updated =
        response.data?.application || {
          ...application,
          status: newStatus,
          status_label: label,
        };

      setApplications((current) =>
        current.map((item) =>
          item.id === application.id ? { ...item, ...updated } : item
        )
      );

      setSelectedApplication((current) =>
        current?.id === application.id
          ? { ...current, ...updated }
          : current
      );

      setSuccessMessage(
        `Candidature #${application.id} mise à jour : ${label}.`
      );

      setReloadKey((current) => current + 1);
    } catch (error) {
      setErrorMessage(errorText(error));
    } finally {
      setUpdatingId(null);
    }
  }

  function renderStatus(application) {
    const value = application.status || "";
    const label =
      application.status_label || STATUS_LABELS[value] || value;

    return (
      <span
        className={`admin-app-status admin-app-status--${value.toLowerCase()}`}
      >
        <span className="admin-app-status-dot" />
        {label || "Non renseigné"}
      </span>
    );
  }

  return (
    <main className="admin-applications-page">
      <header className="admin-applications-header">
        <div>
          <span className="admin-app-eyebrow">ESPACE ADMINISTRATEUR</span>
          <h1>Modération des candidatures</h1>
          <p>
            Suivez l'évolution des candidatures, examinez les dossiers
            et contrôlez les changements de statut.
          </p>
        </div>

        <button
          type="button"
          className="admin-app-refresh"
          onClick={() => setReloadKey((current) => current + 1)}
          disabled={loading}
        >
          <span aria-hidden="true">↻</span>
          Actualiser
        </button>
      </header>

      <section className="admin-app-stats">
        <article className="admin-app-stat">
          <span className="admin-app-stat-icon admin-app-stat-icon--total">
            ▤
          </span>
          <div>
            <span>Total des candidatures</span>
            <strong>{summary.total ?? 0}</strong>
            <small>Tous statuts confondus</small>
          </div>
        </article>

        <article className="admin-app-stat">
          <span className="admin-app-stat-icon admin-app-stat-icon--pending">
            ◷
          </span>
          <div>
            <span>En attente</span>
            <strong>{summary.pending ?? 0}</strong>
            <small>À examiner</small>
          </div>
        </article>

        <article className="admin-app-stat">
          <span className="admin-app-stat-icon admin-app-stat-icon--review">
            ◎
          </span>
          <div>
            <span>En examen</span>
            <strong>{summary.reviewing ?? 0}</strong>
            <small>En cours de traitement</small>
          </div>
        </article>

        <article className="admin-app-stat">
          <span className="admin-app-stat-icon admin-app-stat-icon--accepted">
            ✓
          </span>
          <div>
            <span>Acceptées</span>
            <strong>{summary.accepted ?? 0}</strong>
            <small>Candidatures acceptées</small>
          </div>
        </article>
      </section>

      {errorMessage && (
        <div className="admin-app-alert admin-app-alert--error" role="alert">
          <strong>Erreur</strong>
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div
          className="admin-app-alert admin-app-alert--success"
          role="status"
        >
          <strong>✓</strong>
          <span>{successMessage}</span>
        </div>
      )}

      <section className="admin-app-panel">
        <div className="admin-app-panel-heading">
          <div>
            <h2>Toutes les candidatures</h2>
            <p>
              {totalResults} résultat{totalResults > 1 ? "s" : ""}
            </p>
          </div>
        </div>

        <form className="admin-app-filters" onSubmit={handleSearch}>
          <label className="admin-app-search">
            <span aria-hidden="true">⌕</span>
            <input
              type="search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Candidat, e-mail, entreprise, offre..."
            />
          </label>

          <button type="submit" className="admin-app-primary-button">
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
            {statusChoices.map((item) => (
              <option value={item.value} key={item.value}>
                {item.label}
              </option>
            ))}
          </select>

          <select
            aria-label="Trier par date"
            value={sort}
            onChange={(event) => {
              setPage(1);
              setSort(event.target.value);
            }}
          >
            <option value="recent">Plus récentes</option>
            <option value="oldest">Plus anciennes</option>
          </select>

          <button
            type="button"
            className="admin-app-reset-button"
            onClick={resetFilters}
          >
            Réinitialiser
          </button>
        </form>

        <div className="admin-app-table-wrap">
          <table className="admin-app-table">
            <thead>
              <tr>
                <th>Candidat</th>
                <th>Offre / Entreprise</th>
                <th>Date de candidature</th>
                <th>Statut</th>
                <th>Modération</th>
                <th>Suivi</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" className="admin-app-empty">
                    <span className="admin-app-loader" />
                    Chargement des candidatures...
                  </td>
                </tr>
              ) : applications.length === 0 ? (
                <tr>
                  <td colSpan="6" className="admin-app-empty">
                    <div className="admin-app-empty-icon">▤</div>
                    <strong>Aucune candidature trouvée</strong>
                    <p>Essayez d'autres critères de recherche.</p>
                  </td>
                </tr>
              ) : (
                applications.map((application) => (
                  <tr key={application.id}>
                    <td>
                      <div className="admin-app-candidate">
                        <span className="admin-app-avatar">
                          {(application.candidate_name || "C")
                            .trim()
                            .charAt(0)
                            .toUpperCase()}
                        </span>
                        <div>
                          <strong>
                            {application.candidate_name || "Candidat"}
                          </strong>
                          <span>{application.candidate_email || "E-mail non renseigné"}</span>
                          <small>Réf. #{application.id}</small>
                        </div>
                      </div>
                    </td>

                    <td>
                      <div className="admin-app-job">
                        <strong>{application.job_title || "Offre inconnue"}</strong>
                        <span>{application.company_name || "Entreprise inconnue"}</span>
                      </div>
                    </td>

                    <td>{formatDate(application.created_at)}</td>

                    <td>{renderStatus(application)}</td>

                    <td>
                      <select
                        className="admin-app-status-select"
                        aria-label={`Changer le statut de la candidature ${application.id}`}
                        value={application.status || ""}
                        disabled={updatingId === application.id}
                        onChange={(event) =>
                          changeStatus(application, event.target.value)
                        }
                      >
                        {statusChoices.map((item) => (
                          <option value={item.value} key={item.value}>
                            {item.label}
                          </option>
                        ))}
                      </select>
                    </td>

                    <td>
                      <button
                        type="button"
                        className="admin-app-details-button"
                        onClick={() => setSelectedApplication(application)}
                      >
                        Examiner
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <footer className="admin-app-pagination">
          <span>
            Page {page} sur {totalPages}
          </span>
          <div>
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              ← Précédent
            </button>
            <button
              type="button"
              disabled={page >= totalPages || loading}
              onClick={() =>
                setPage((current) => Math.min(totalPages, current + 1))
              }
            >
              Suivant →
            </button>
          </div>
        </footer>
      </section>

      {selectedApplication && (
        <div
          className="admin-app-modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setSelectedApplication(null);
            }
          }}
        >
          <section
            className="admin-app-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-app-modal-title"
          >
            <header className="admin-app-modal-header">
              <div>
                <span className="admin-app-eyebrow">
                  CANDIDATURE #{selectedApplication.id}
                </span>
                <h2 id="admin-app-modal-title">
                  {selectedApplication.candidate_name || "Dossier candidat"}
                </h2>
                <p>{selectedApplication.candidate_email || "E-mail non renseigné"}</p>
              </div>

              <button
                type="button"
                className="admin-app-modal-close"
                onClick={() => setSelectedApplication(null)}
                aria-label="Fermer"
              >
                ×
              </button>
            </header>

            <div className="admin-app-modal-body">
              <div className="admin-app-modal-status">
                {renderStatus(selectedApplication)}
              </div>

              <div className="admin-app-detail-grid">
                <div>
                  <span>Offre concernée</span>
                  <strong>{selectedApplication.job_title || "Non renseignée"}</strong>
                </div>
                <div>
                  <span>Entreprise</span>
                  <strong>{selectedApplication.company_name || "Non renseignée"}</strong>
                </div>
                <div>
                  <span>Localisation du candidat</span>
                  <strong>{selectedApplication.candidate_city || "Non renseignée"}</strong>
                </div>
                <div>
                  <span>Téléphone</span>
                  <strong>{selectedApplication.candidate_phone || "Non renseigné"}</strong>
                </div>
                <div>
                  <span>Reçue le</span>
                  <strong>{formatDate(selectedApplication.created_at)}</strong>
                </div>
                <div>
                  <span>Dernière mise à jour</span>
                  <strong>{formatDate(selectedApplication.updated_at)}</strong>
                </div>
              </div>

              <div className="admin-app-detail-section">
                <h3>Lettre de motivation / message</h3>
                <p>
                  {selectedApplication.cover_letter ||
                    selectedApplication.motivation ||
                    selectedApplication.message ||
                    "Aucune lettre de motivation ou aucun message enregistré pour cette candidature."}
                </p>
              </div>

              {selectedApplication.resume_url && (
                <div className="admin-app-resume">
                  <span>Document du candidat</span>
                  <a
                    href={selectedApplication.resume_url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Consulter le CV
                  </a>
                </div>
              )}
            </div>

            <footer className="admin-app-modal-footer">
              <button
                type="button"
                className="admin-app-reset-button"
                onClick={() => setSelectedApplication(null)}
              >
                Fermer
              </button>

              <label className="admin-app-modal-status-control">
                <span>Modifier le statut</span>
                <select
                  value={selectedApplication.status || ""}
                  disabled={updatingId === selectedApplication.id}
                  onChange={(event) =>
                    changeStatus(selectedApplication, event.target.value)
                  }
                >
                  {statusChoices.map((item) => (
                    <option value={item.value} key={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
            </footer>
          </section>
        </div>
      )}
    </main>
  );
}
