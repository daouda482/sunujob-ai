import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api/axios";
import "./adminDashboard.css";

const STAT_CARDS = [
  { key: "total_users", label: "Utilisateurs", icon: "👥", color: "blue" },
  { key: "total_candidates", label: "Candidats", icon: "🎓", color: "violet" },
  { key: "total_recruiters", label: "Recruteurs", icon: "💼", color: "green" },
  { key: "total_training_providers", label: "Organismes de formation", icon: "📚", color: "orange" },
  { key: "total_companies", label: "Entreprises", icon: "🏢", color: "cyan" },
  { key: "total_jobs", label: "Offres d'emploi", icon: "📋", color: "pink" },
  { key: "published_jobs", label: "Offres publiées", icon: "✅", color: "green" },
  { key: "total_applications", label: "Candidatures", icon: "📨", color: "blue" },
];

const formatNumber = (value) =>
  new Intl.NumberFormat("fr-FR").format(Number(value) || 0);

const formatDate = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

const getStatusClass = (status) =>
  `admin-status admin-status--${String(status || "")
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "")}`;

const getActionLabel = (log) =>
  log.action_label ||
  ({
    APPLICATION_CREATED: "Candidature créée",
    APPLICATION_STATUS_CHANGED: "Statut de candidature modifié",
    APPLICATION_NOTE_UPDATED: "Note du recruteur modifiée",
    INTERVIEW_CREATED: "Entretien programmé",
    INTERVIEW_UPDATED: "Entretien modifié",
    INTERVIEW_CANCELLED: "Entretien annulé",
    INTERVIEW_DELETED: "Entretien supprimé",
    EVALUATION_CREATED: "Évaluation créée",
    EVALUATION_UPDATED: "Évaluation modifiée",
    OTHER: "Autre activité",
  }[log.action] || log.action || "Activité");

const getActionIcon = (action) => {
  if (String(action).includes("APPLICATION")) return "📨";
  if (String(action).includes("INTERVIEW")) return "📅";
  if (String(action).includes("EVALUATION")) return "⭐";
  return "⚙️";
};

const getLogs = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.data)) return data.data;
  return [];
};

export default function AdminDashboard() {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [activeLogTab, setActiveLogTab] = useState("business");
  const [businessLogs, setBusinessLogs] = useState([]);
  const [technicalLogs, setTechnicalLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsError, setLogsError] = useState("");

  const [logSearch, setLogSearch] = useState("");
  const [methodFilter, setMethodFilter] = useState("");
  const [resultFilter, setResultFilter] = useState("");

  const loadDashboard = useCallback(async (isRefresh = false) => {
    setError("");

    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const response = await api.get("admin/dashboard/");
      setDashboard(response.data);
    } catch (err) {
      if (err.response?.status === 401) {
        setError("Votre session a expiré. Reconnectez-vous pour accéder au tableau de bord.");
      } else if (err.response?.status === 403) {
        setError("Accès refusé : cette page est réservée aux administrateurs.");
      } else {
        setError(
          err.response?.data?.detail ||
            "Impossible de charger les statistiques. Vérifiez que le serveur Django fonctionne."
        );
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const loadLogs = useCallback(async () => {
    setLogsLoading(true);
    setLogsError("");

    try {
      if (activeLogTab === "business") {
        const response = await api.get("audit-logs/");
        setBusinessLogs(getLogs(response.data));
      } else {
        const params = {};

        if (logSearch.trim()) params.search = logSearch.trim();
        if (methodFilter) params.method = methodFilter;
        if (resultFilter) params.result = resultFilter;

        const response = await api.get("admin/audit-logs/", { params });
        setTechnicalLogs(getLogs(response.data));
      }
    } catch (err) {
      if (err.response?.status === 401) {
        setLogsError("Votre session a expiré. Veuillez vous reconnecter.");
      } else if (err.response?.status === 403) {
        setLogsError(
          "Accès refusé. Vérifiez les permissions administrateur de cette API."
        );
      } else {
        setLogsError(
          err.response?.data?.detail ||
            "Impossible de récupérer les journaux d'activité."
        );
      }
    } finally {
      setLogsLoading(false);
    }
  }, [activeLogTab, logSearch, methodFilter, resultFilter]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const stats = dashboard?.stats || {};
  const statuses = dashboard?.application_statuses || [];
  const recentApplications = dashboard?.recent_applications || [];
  const recentJobs = dashboard?.recent_jobs || [];

  const maxStatusCount = Math.max(
    1,
    ...statuses.map((item) => Number(item.count) || 0)
  );

  const currentLogs =
    activeLogTab === "business" ? businessLogs : technicalLogs;

  const successfulLogs = technicalLogs.filter(
    (log) => log.succeeded === true
  ).length;

  const failedLogs = technicalLogs.filter(
    (log) => log.succeeded === false
  ).length;

  if (loading) {
    return (
      <main className="admin-dashboard">
        <div className="admin-loading">
          <span className="admin-spinner" />
          <p>Chargement du tableau de bord...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="admin-dashboard">
      <header className="admin-dashboard__header">
        <div>
          <div className="admin-eyebrow">
            <span className="admin-eyebrow__dot" />
            ESPACE ADMINISTRATION
          </div>

          <h1>Tableau de bord</h1>

          <p>
            Pilotez SunuJob AI et suivez l'activité globale de votre plateforme.
          </p>

          {dashboard?.generated_at && (
            <div className="admin-last-update">
              Dernière actualisation : {formatDate(dashboard.generated_at)}
            </div>
          )}
        </div>

        <button
          type="button"
          className="admin-refresh-button"
          onClick={() => {
            loadDashboard(true);
            loadLogs();
          }}
          disabled={refreshing || logsLoading}
        >
          <span className={refreshing ? "admin-refresh-icon spinning" : "admin-refresh-icon"}>
            ↻
          </span>
          {refreshing ? "Actualisation..." : "Actualiser"}
        </button>
      </header>

      {error && (
        <section className="admin-error" role="alert">
          <span className="admin-error__icon">!</span>
          <div>
            <strong>Chargement impossible</strong>
            <p>{error}</p>
          </div>
          <button type="button" onClick={() => loadDashboard(true)}>
            Réessayer
          </button>
        </section>
      )}

      {dashboard && (
        <>
          <section className="admin-section">
            <div className="admin-section-heading">
              <div>
                <h2>Vue d'ensemble</h2>
                <p>Les principaux indicateurs de la plateforme.</p>
              </div>

              <span className="admin-live-label">
                <span />
                Données réelles
              </span>
            </div>

            <div className="admin-stats-grid">
              {STAT_CARDS.map((card) => (
                <article className="admin-stat-card" key={card.key}>
                  <div className={`admin-stat-card__icon admin-stat-card__icon--${card.color}`}>
                    <span>{card.icon}</span>
                  </div>
                  <div className="admin-stat-card__label">{card.label}</div>
                  <div className="admin-stat-card__value">
                    {formatNumber(stats[card.key])}
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="admin-overview-grid">
            <article className="admin-panel">
              <div className="admin-panel__header">
                <div>
                  <h2>Statut des candidatures</h2>
                  <p>Répartition de toutes les candidatures.</p>
                </div>
                <div className="admin-panel__total">
                  {formatNumber(stats.total_applications)}
                </div>
              </div>

              {statuses.length === 0 ? (
                <div className="admin-empty">
                  Aucune donnée de candidature disponible.
                </div>
              ) : (
                <div className="admin-status-list">
                  {statuses.map((item) => {
                    const count = Number(item.count) || 0;
                    const width = (count / maxStatusCount) * 100;

                    return (
                      <div className="admin-status-row" key={item.code}>
                        <div className="admin-status-row__top">
                          <span>{item.label}</span>
                          <strong>{formatNumber(count)}</strong>
                        </div>
                        <div className="admin-progress">
                          <div
                            className={`admin-progress__bar admin-progress__bar--${String(
                              item.code
                            ).toLowerCase()}`}
                            style={{ width: `${width}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </article>

            <article className="admin-panel admin-panel--summary">
              <div className="admin-panel__header">
                <div>
                  <h2>Suivi des offres</h2>
                  <p>État actuel des offres enregistrées.</p>
                </div>
                <span className="admin-summary-icon">📊</span>
              </div>

              <div className="admin-job-summary">
                <div className="admin-job-summary__row">
                  <span className="admin-summary-dot admin-summary-dot--published" />
                  <span>Publiées</span>
                  <strong>{formatNumber(stats.published_jobs)}</strong>
                </div>
                <div className="admin-job-summary__row">
                  <span className="admin-summary-dot admin-summary-dot--draft" />
                  <span>Brouillons</span>
                  <strong>{formatNumber(stats.draft_jobs)}</strong>
                </div>
                <div className="admin-job-summary__row">
                  <span className="admin-summary-dot admin-summary-dot--closed" />
                  <span>Fermées</span>
                  <strong>{formatNumber(stats.closed_jobs)}</strong>
                </div>
              </div>

              <div className="admin-pending-box">
                <span className="admin-pending-box__icon">⏳</span>
                <div>
                  <span>Candidatures en attente</span>
                  <strong>{formatNumber(stats.pending_applications)}</strong>
                </div>
              </div>

              <div className="admin-admin-count">
                <span>Comptes administrateurs</span>
                <strong>{formatNumber(stats.total_admins)}</strong>
              </div>
            </article>
          </section>

          <section className="admin-section">
            <div className="admin-section-heading">
              <div>
                <h2>Gestion de la plateforme</h2>
                <p>Accédez rapidement aux fonctionnalités d'administration.</p>
              </div>
            </div>

            <div className="admin-shortcuts">
              <Link to="/admin/applications" className="admin-users-shortcut">
                📋 Modérer les candidatures
              </Link>
              <Link to="/admin/notifications" className="admin-users-shortcut">
                🔔 Centre de notifications
              </Link>
            </div>
          </section>

          {/* JOURNAL D'ACTIVITÉ */}
          <section className="admin-section admin-activity-section">
            <div className="admin-section-heading">
              <div>
                <h2>Journal d'activité</h2>
                <p>Suivez les opérations réalisées sur SunuJob AI.</p>
              </div>
              <button
                type="button"
                className="admin-log-refresh"
                onClick={loadLogs}
                disabled={logsLoading}
              >
                ↻ Actualiser les journaux
              </button>
            </div>

            <div className="admin-log-tabs">
              <button
                type="button"
                className={activeLogTab === "business" ? "active" : ""}
                onClick={() => setActiveLogTab("business")}
              >
                <span>📋</span>
                Activités métier
                <span className="admin-tab-count">{businessLogs.length}</span>
              </button>

              <button
                type="button"
                className={activeLogTab === "technical" ? "active" : ""}
                onClick={() => setActiveLogTab("technical")}
              >
                <span>⚙️</span>
                Activités techniques
                <span className="admin-tab-count">{technicalLogs.length}</span>
              </button>
            </div>

            {activeLogTab === "technical" && (
              <>
                <div className="admin-log-stats">
                  <div>
                    <span className="admin-log-stat-icon">📊</span>
                    <div>
                      <small>Journaux chargés</small>
                      <strong>{formatNumber(technicalLogs.length)}</strong>
                    </div>
                  </div>
                  <div>
                    <span className="admin-log-stat-icon success">✓</span>
                    <div>
                      <small>Opérations réussies</small>
                      <strong>{formatNumber(successfulLogs)}</strong>
                    </div>
                  </div>
                  <div>
                    <span className="admin-log-stat-icon failed">!</span>
                    <div>
                      <small>Opérations échouées</small>
                      <strong>{formatNumber(failedLogs)}</strong>
                    </div>
                  </div>
                </div>

                <div className="admin-log-filters">
                  <input
                    type="search"
                    placeholder="Rechercher un utilisateur, une action, une route..."
                    value={logSearch}
                    onChange={(event) => setLogSearch(event.target.value)}
                  />

                  <select
                    value={methodFilter}
                    onChange={(event) => setMethodFilter(event.target.value)}
                  >
                    <option value="">Toutes les méthodes</option>
                    <option value="POST">POST</option>
                    <option value="GET">GET</option>
                    <option value="PUT">PUT</option>
                    <option value="PATCH">PATCH</option>
                    <option value="DELETE">DELETE</option>
                  </select>

                  <select
                    value={resultFilter}
                    onChange={(event) => setResultFilter(event.target.value)}
                  >
                    <option value="">Tous les résultats</option>
                    <option value="success">Réussis</option>
                    <option value="failed">Échoués</option>
                  </select>
                </div>
              </>
            )}

            {logsError && (
              <div className="admin-log-error" role="alert">
                <strong>Impossible de charger les activités</strong>
                <p>{logsError}</p>
                <button type="button" onClick={loadLogs}>
                  Réessayer
                </button>
              </div>
            )}

            {logsLoading ? (
              <div className="admin-log-loading">
                <span className="admin-spinner" />
                <p>Chargement des activités...</p>
              </div>
            ) : !logsError && currentLogs.length === 0 ? (
              <div className="admin-empty admin-log-empty">
                <span>📭</span>
                <strong>Aucune activité trouvée</strong>
                <p>Les nouvelles opérations apparaîtront ici automatiquement.</p>
              </div>
            ) : !logsError ? (
              <div className="admin-log-list">
                {currentLogs.map((log) => {
                  const technical = activeLogTab === "technical";
                  const succeeded = log.succeeded;

                  return (
                    <article className="admin-log-item" key={log.id}>
                      <div className="admin-log-item__icon">
                        {technical ? "⚙️" : getActionIcon(log.action)}
                      </div>

                      <div className="admin-log-item__content">
                        <div className="admin-log-item__top">
                          <strong>
                            {technical
                              ? log.actor_label || log.actor_email || "Utilisateur"
                              : log.actor_email || "Utilisateur"}
                          </strong>
                          <time>{formatDate(log.created_at)}</time>
                        </div>

                        <p className="admin-log-description">
                          {technical
                            ? log.action || "Requête effectuée"
                            : getActionLabel(log)}
                        </p>

                        {!technical && (
                          <>
                            <p className="admin-log-details">
                              {log.description}
                            </p>
                            {(log.old_value || log.new_value) && (
                              <div className="admin-log-changes">
                                {log.old_value && (
                                  <span>
                                    Ancienne valeur : <strong>{log.old_value}</strong>
                                  </span>
                                )}
                                {log.new_value && (
                                  <span>
                                    Nouvelle valeur : <strong>{log.new_value}</strong>
                                  </span>
                                )}
                              </div>
                            )}
                            {(log.application || log.interview) && (
                              <small className="admin-log-reference">
                                {log.application && `Candidature #${log.application}`}
                                {log.application && log.interview && " · "}
                                {log.interview && `Entretien #${log.interview}`}
                              </small>
                            )}
                          </>
                        )}

                        {technical && (
                          <div className="admin-log-technical-details">
                            <span className="admin-method-badge">
                              {log.method || "—"}
                            </span>
                            <code>{log.path || "Route inconnue"}</code>
                            <span className="admin-http-code">
                              HTTP {log.status_code ?? "—"}
                            </span>
                            {log.ip_address && (
                              <span className="admin-ip-address">
                                IP : {log.ip_address}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {technical && (
                        <span
                          className={`admin-result-badge ${
                            succeeded ? "is-success" : "is-failed"
                          }`}
                        >
                          {succeeded ? "Réussi" : "Échec"}
                        </span>
                      )}
                    </article>
                  );
                })}
              </div>
            ) : null}
          </section>

          {/* CANDIDATURES RÉCENTES */}
          <section className="admin-panel admin-recent-panel">
            <div className="admin-panel__header">
              <div>
                <h2>Candidatures récentes</h2>
                <p>Les huit dernières candidatures enregistrées.</p>
              </div>
              <span className="admin-table-count">
                {recentApplications.length} résultat(s)
              </span>
            </div>

            {recentApplications.length === 0 ? (
              <div className="admin-empty">
                Aucune candidature n'a encore été enregistrée.
              </div>
            ) : (
              <div className="admin-table-wrapper">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Candidat</th>
                      <th>Offre</th>
                      <th>Entreprise</th>
                      <th>Statut</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentApplications.map((application) => (
                      <tr key={application.id}>
                        <td>
                          <div className="admin-candidate-cell">
                            <span className="admin-avatar">
                              {(application.candidate_name || "?").charAt(0).toUpperCase()}
                            </span>
                            <div>
                              <strong>{application.candidate_name}</strong>
                              <small>{application.candidate_email}</small>
                            </div>
                          </div>
                        </td>
                        <td>{application.job_title}</td>
                        <td>{application.company_name}</td>
                        <td>
                          <span className={getStatusClass(application.status)}>
                            {application.status_label}
                          </span>
                        </td>
                        <td className="admin-date-cell">
                          {formatDate(application.applied_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* OFFRES RÉCENTES */}
          <section className="admin-panel admin-recent-panel">
            <div className="admin-panel__header">
              <div>
                <h2>Dernières offres créées</h2>
                <p>Les six offres les plus récemment enregistrées.</p>
              </div>
              <span className="admin-table-count">
                {recentJobs.length} résultat(s)
              </span>
            </div>

            {recentJobs.length === 0 ? (
              <div className="admin-empty">
                Aucune offre n'a encore été créée.
              </div>
            ) : (
              <div className="admin-table-wrapper">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Intitulé du poste</th>
                      <th>Entreprise</th>
                      <th>Localisation</th>
                      <th>Contrat</th>
                      <th>Statut</th>
                      <th>Création</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentJobs.map((job) => (
                      <tr key={job.id}>
                        <td><strong>{job.title}</strong></td>
                        <td>{job.company_name}</td>
                        <td>{job.location}</td>
                        <td>{job.contract_type}</td>
                        <td>
                          <span className={getStatusClass(job.status)}>
                            {job.status_label}
                          </span>
                        </td>
                        <td className="admin-date-cell">
                          {formatDate(job.created_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}