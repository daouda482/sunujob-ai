import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api/axios";
import "./Applications.css";

function getArray(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.applications)) return data.applications;
  return [];
}

function getJob(application) {
  return application?.job && typeof application.job === "object"
    ? application.job
    : null;
}

function getJobId(application) {
  const job = getJob(application);
  return job?.id ?? application?.job_id ??
    (typeof application?.job === "number" ? application.job : null);
}

function getJobTitle(application) {
  const job = getJob(application);
  return (
    job?.title ||
    application?.job_title ||
    application?.title ||
    `Candidature n°${application?.id ?? ""}`
  );
}

function getCompanyName(application) {
  const job = getJob(application);
  const company =
    job?.company && typeof job.company === "object"
      ? job.company.name
      : job?.company;

  return (
    job?.company_name ||
    company ||
    application?.company_name ||
    "Entreprise"
  );
}

function getStatus(status) {
  const value = String(status || "PENDING")
    .trim()
    .toUpperCase();

  const statuses = {
    PENDING: { label: "En attente", className: "pending" },
    REVIEWING: { label: "En cours d'examen", className: "reviewing" },
    IN_REVIEW: { label: "En cours d'examen", className: "reviewing" },
    UNDER_REVIEW: { label: "En cours d'examen", className: "reviewing" },
    SHORTLISTED: { label: "Présélectionnée", className: "shortlisted" },
    INTERVIEW: { label: "Entretien prévu", className: "interview" },
    INTERVIEW_SCHEDULED: {
      label: "Entretien prévu",
      className: "interview",
    },
    ACCEPTED: { label: "Acceptée", className: "accepted" },
    ACCEPTEE: { label: "Acceptée", className: "accepted" },
    "ACCEPTÉE": { label: "Acceptée", className: "accepted" },
    REJECTED: { label: "Refusée", className: "rejected" },
    REFUSED: { label: "Refusée", className: "rejected" },
    REJETEE: { label: "Refusée", className: "rejected" },
    "REJETÉE": { label: "Refusée", className: "rejected" },
    WITHDRAWN: { label: "Retirée", className: "withdrawn" },
  };

  return (
    statuses[value] || {
      label: value.replaceAll("_", " "),
      className: "unknown",
    }
  );
}

function getApplicationDate(application) {
  return (
    application?.created_at ||
    application?.submitted_at ||
    application?.applied_at ||
    application?.application_date ||
    null
  );
}

function formatDate(value) {
  if (!value) return "Date non disponible";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date non disponible";

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

function getInitials(company) {
  return String(company || "Entreprise")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase();
}

export default function Applications() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedApplication, setSelectedApplication] = useState(null);

  const loadApplications = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("applications/my/");
      setApplications(getArray(response.data));
    } catch (err) {
      console.error(
        "Erreur lors du chargement des candidatures :",
        err.response?.data || err.message
      );

      if (err.response?.status === 401) {
        setError(
          "Votre session a expiré ou vous n'êtes pas connecté. Veuillez vous reconnecter."
        );
      } else {
        setError(
          err.response?.data?.detail ||
            "Impossible de charger vos candidatures. Vérifiez votre connexion et le serveur Django."
        );
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadApplications();
  }, [loadApplications]);

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === "Escape") setSelectedApplication(null);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const stats = useMemo(() => {
    const counts = {
      total: applications.length,
      pending: 0,
      reviewing: 0,
      interviews: 0,
      accepted: 0,
    };

    applications.forEach((application) => {
      const status = getStatus(application.status).className;

      if (status === "pending") counts.pending += 1;
      if (status === "reviewing" || status === "shortlisted") {
        counts.reviewing += 1;
      }
      if (status === "interview") counts.interviews += 1;
      if (status === "accepted") counts.accepted += 1;
    });

    return counts;
  }, [applications]);

  const filteredApplications = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("fr");

    return applications.filter((application) => {
      const title = getJobTitle(application).toLocaleLowerCase("fr");
      const company = getCompanyName(application).toLocaleLowerCase("fr");
      const status = getStatus(application.status);

      const matchesSearch =
        !term || title.includes(term) || company.includes(term);

      const matchesStatus =
        statusFilter === "ALL" ||
        status.className.toUpperCase() === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [applications, search, statusFilter]);

  return (
    <main className="app-page">
      <header className="app-topbar">
        <Link to="/" className="app-brand" aria-label="SunuJob AI - Accueil">
          <span className="app-brand-icon">S</span>
          <span>
            SunuJob <strong>AI</strong>
            <small>VOTRE AVENIR, AUTREMENT</small>
          </span>
        </Link>

        <nav className="app-navigation" aria-label="Navigation principale">
          <Link to="/">Accueil</Link>
          <Link to="/jobs">Offres d'emploi</Link>
          <Link to="/candidate/recommendations">Recommandations IA</Link>
          <Link to="/candidate/profile">Mon profil</Link>
        </nav>

        <Link to="/candidate/dashboard" className="app-back-link">
          ← Tableau de bord
        </Link>
      </header>

      <div className="app-container">
        <section className="app-hero">
          <div className="app-hero-text">
            <span className="app-eyebrow">
              VOTRE ESPACE CARRIÈRE
            </span>
            <h1>Mes candidatures</h1>
            <p>
              Retrouvez toutes vos demandes d'emploi au même endroit.
              Suivez leur évolution et préparez sereinement votre prochaine
              opportunité professionnelle.
            </p>
          </div>

          <div className="app-hero-icon" aria-hidden="true">
            <span>▤</span>
            <i>✓</i>
          </div>
        </section>

        <section className="app-stat-grid" aria-label="Résumé des candidatures">
          <article className="app-stat-card">
            <div className="app-stat-icon blue" aria-hidden="true">▤</div>
            <div>
              <span>Total des candidatures</span>
              <strong>{stats.total}</strong>
            </div>
          </article>

          <article className="app-stat-card">
            <div className="app-stat-icon orange" aria-hidden="true">◷</div>
            <div>
              <span>En attente</span>
              <strong>{stats.pending}</strong>
            </div>
          </article>

          <article className="app-stat-card">
            <div className="app-stat-icon purple" aria-hidden="true">⌕</div>
            <div>
              <span>En cours d'examen</span>
              <strong>{stats.reviewing}</strong>
            </div>
          </article>

          <article className="app-stat-card">
            <div className="app-stat-icon green" aria-hidden="true">✓</div>
            <div>
              <span>Candidatures acceptées</span>
              <strong>{stats.accepted}</strong>
            </div>
          </article>
        </section>

        <section className="app-list-panel">
          <div className="app-list-heading">
            <div>
              <h2>Historique de mes candidatures</h2>
              <p>
                Consultez le poste visé, l'entreprise et le statut de chaque
                demande.
              </p>
            </div>

            <Link to="/jobs" className="app-new-button">
              <span aria-hidden="true">＋</span>
              Nouvelle candidature
            </Link>
          </div>

          <div className="app-filters">
            <label className="app-search">
              <span aria-hidden="true">⌕</span>
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Rechercher un poste ou une entreprise..."
                aria-label="Rechercher une candidature"
              />
            </label>

            <select
              className="app-status-filter"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              aria-label="Filtrer par statut"
            >
              <option value="ALL">Tous les statuts</option>
              <option value="PENDING">En attente</option>
              <option value="REVIEWING">En cours d'examen</option>
              <option value="SHORTLISTED">Présélectionnée</option>
              <option value="INTERVIEW">Entretien prévu</option>
              <option value="ACCEPTED">Acceptée</option>
              <option value="REJECTED">Refusée</option>
              <option value="WITHDRAWN">Retirée</option>
            </select>
          </div>

          {error && (
            <div className="app-error" role="alert">
              <strong>Chargement impossible</strong>
              <p>{error}</p>
              <button type="button" onClick={loadApplications}>
                Réessayer
              </button>
            </div>
          )}

          {loading ? (
            <div className="app-loading" role="status">
              <div className="app-spinner" />
              Chargement de vos candidatures...
            </div>
          ) : !error && filteredApplications.length === 0 ? (
            <div className="app-empty">
              <div className="app-empty-icon" aria-hidden="true">
                {applications.length === 0 ? "▤" : "⌕"}
              </div>
              <h3>
                {applications.length === 0
                  ? "Votre parcours commence ici"
                  : "Aucun résultat trouvé"}
              </h3>
              <p>
                {applications.length === 0
                  ? "Vous n'avez pas encore envoyé de candidature. Explorez les offres disponibles et trouvez celle qui correspond à votre profil."
                  : "Essayez un autre mot-clé ou modifiez le filtre de statut."}
              </p>

              {applications.length === 0 ? (
                <Link to="/jobs" className="app-new-button">
                  Explorer les offres d'emploi →
                </Link>
              ) : (
                <button
                  type="button"
                  className="app-reset-button"
                  onClick={() => {
                    setSearch("");
                    setStatusFilter("ALL");
                  }}
                >
                  Réinitialiser les filtres
                </button>
              )}
            </div>
          ) : (
            !error && (
              <div className="app-table-wrapper">
                <table className="app-table">
                  <thead>
                    <tr>
                      <th scope="col">POSTE / ENTREPRISE</th>
                      <th scope="col">DATE D'ENVOI</th>
                      <th scope="col">STATUT</th>
                      <th scope="col">DÉTAILS</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredApplications.map((application, index) => {
                      const jobId = getJobId(application);
                      const title = getJobTitle(application);
                      const company = getCompanyName(application);
                      const status = getStatus(application.status);

                      return (
                        <tr key={application.id ?? `${title}-${index}`}>
                          <td>
                            <div className="app-job-cell">
                              <div className="app-company-icon" aria-hidden="true">
                                {getInitials(company)}
                              </div>
                              <div>
                                <strong>{title}</strong>
                                <span>{company}</span>
                              </div>
                            </div>
                          </td>

                          <td className="app-date-cell">
                            {formatDate(getApplicationDate(application))}
                          </td>

                          <td>
                            <span className={`app-status ${status.className}`}>
                              <i aria-hidden="true" />
                              {status.label}
                            </span>
                          </td>

                          <td>
                            <button
                              type="button"
                              className="app-detail-button"
                              onClick={() => setSelectedApplication(application)}
                            >
                              Voir les détails <span aria-hidden="true">↗</span>
                            </button>
                            {jobId && (
                              <Link
                                className="app-detail-button"
                                to={`/jobs/${jobId}`}
                                style={{ marginLeft: 6 }}
                              >
                                Voir l'offre
                              </Link>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )
          )}
        </section>

        <footer className="app-footer">
          <span>© {new Date().getFullYear()} SunuJob AI. Tous droits réservés.</span>
          <span>Conçu avec ♥ au Sénégal 🇸🇳</span>
        </footer>
      </div>

      {selectedApplication && (
        <div
          className="app-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setSelectedApplication(null);
            }
          }}
        >
          <section
            className="app-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="application-modal-title"
          >
            <div className="app-modal-heading">
              <div>
                <span className="app-eyebrow">SUIVI DE CANDIDATURE</span>
                <h2 id="application-modal-title">Détails de la demande</h2>
              </div>
              <button
                type="button"
                className="app-modal-close"
                aria-label="Fermer"
                onClick={() => setSelectedApplication(null)}
              >
                ×
              </button>
            </div>

            <div className="app-modal-body">
              <div className="app-detail-row">
                <span>Poste</span>
                <strong>{getJobTitle(selectedApplication)}</strong>
              </div>
              <div className="app-detail-row">
                <span>Entreprise</span>
                <strong>{getCompanyName(selectedApplication)}</strong>
              </div>
              <div className="app-detail-row">
                <span>Date d'envoi</span>
                <strong>
                  {formatDate(getApplicationDate(selectedApplication))}
                </strong>
              </div>
              <div className="app-detail-row">
                <span>Statut actuel</span>
                <strong>
                  {getStatus(selectedApplication.status).label}
                </strong>
              </div>

              {selectedApplication.cover_letter && (
                <div className="app-detail-block">
                  <h3>Lettre de motivation</h3>
                  <p>{selectedApplication.cover_letter}</p>
                </div>
              )}

              {selectedApplication.recruiter_note && (
                <div className="app-detail-block app-recruiter-note">
                  <h3>Note du recruteur</h3>
                  <p>{selectedApplication.recruiter_note}</p>
                </div>
              )}

              {selectedApplication.notes && (
                <div className="app-detail-block">
                  <h3>Informations complémentaires</h3>
                  <p>{selectedApplication.notes}</p>
                </div>
              )}
            </div>

            <button
              type="button"
              className="app-new-button app-modal-done"
              onClick={() => setSelectedApplication(null)}
            >
              Fermer les détails
            </button>
          </section>
        </div>
      )}
    </main>
  );
}
