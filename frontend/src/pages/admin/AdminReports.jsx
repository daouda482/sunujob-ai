
import { useEffect, useState } from "react";
import api from "../../api/axios";
import "./adminReports.css";

const EXPORTS = [
  {
    type: "applications",
    title: "Candidatures",
    description: "Candidat, offre, entreprise, statut et date.",
    icon: "📨",
  },
  {
    type: "jobs",
    title: "Offres d'emploi",
    description: "Postes, contrats, entreprises et statuts.",
    icon: "💼",
  },
  {
    type: "users",
    title: "Utilisateurs",
    description: "Identité, rôle, état du compte et inscription.",
    icon: "👥",
  },
  {
    type: "companies",
    title: "Entreprises",
    description: "Entreprises référencées et informations disponibles.",
    icon: "🏢",
  },
];

const numberFormat = new Intl.NumberFormat("fr-FR");

function formatNumber(value) {
  return numberFormat.format(Number(value) || 0);
}

function getErrorMessage(error) {
  if (!error.response) {
    return "Impossible de contacter Django. Vérifiez que le serveur fonctionne.";
  }

  if (error.response.status === 401) {
    return "Votre session a expiré. Reconnectez-vous.";
  }

  if (error.response.status === 403) {
    return "Cette page est réservée aux administrateurs.";
  }

  return (
    error.response.data?.detail ||
    "Impossible de charger les rapports. Réessayez."
  );
}

export default function AdminReports() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState("");
  const [exportMessage, setExportMessage] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadReports() {
      setLoading(true);
      setError("");

      try {
        const response = await api.get("admin/reports/");

        if (!cancelled) {
          setReport(response.data);
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(getErrorMessage(requestError));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadReports();

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  async function exportCsv(type) {
    setExporting(type);
    setExportMessage("");
    setError("");

    try {
      const response = await api.get("admin/reports/export/", {
        params: { type },
        responseType: "blob",
      });

      const contentType =
        response.headers?.["content-type"] || "text/csv;charset=utf-8";

      const blob = new Blob([response.data], { type: contentType });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = downloadUrl;
      link.download = `sunujob_${type}_${new Date()
        .toISOString()
        .slice(0, 10)}.csv`;

      document.body.appendChild(link);
      link.click();
      link.remove();

      window.URL.revokeObjectURL(downloadUrl);

      setExportMessage(
        `L'export ${type} a été préparé pour le téléchargement.`
      );
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setExporting("");
    }
  }

  const summary = report?.summary || {};
  const applicationStatuses = report?.application_statuses || [];
  const jobStatuses = report?.job_statuses || [];
  const monthlyTrend = report?.monthly_trend || [];

  const maxStatus = Math.max(
    1,
    ...applicationStatuses.map((item) => Number(item.count) || 0)
  );

  const maxMonthly = Math.max(
    1,
    ...monthlyTrend.flatMap((item) => [
      Number(item.applications) || 0,
      Number(item.jobs) || 0,
      Number(item.users) || 0,
    ])
  );

  return (
    <main className="admin-reports-page">
      <header className="admin-reports-header">
        <div>
          <span className="admin-reports-eyebrow">
            ESPACE ADMINISTRATEUR
          </span>
          <h1>Rapports et statistiques</h1>
          <p>
            Analysez l'activité de SunuJob AI et exportez les données
            nécessaires à votre suivi administratif.
          </p>
          {report?.generated_at && (
            <small className="admin-reports-generated">
              Données actualisées le{" "}
              {new Date(report.generated_at).toLocaleString("fr-FR")}
            </small>
          )}
        </div>

        <button
          type="button"
          className="ar-refresh"
          onClick={() => setReloadKey((value) => value + 1)}
          disabled={loading}
        >
          ↻ Actualiser
        </button>
      </header>

      {error && (
        <div className="ar-alert ar-alert--error" role="alert">
          <strong>Erreur</strong>
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setReloadKey((value) => value + 1)}
          >
            Réessayer
          </button>
        </div>
      )}

      {exportMessage && (
        <div className="ar-alert ar-alert--success" role="status">
          <strong>✓</strong>
          <span>{exportMessage}</span>
        </div>
      )}

      {loading ? (
        <div className="ar-loading">
          <span className="ar-spinner" />
          <p>Calcul des indicateurs...</p>
        </div>
      ) : report ? (
        <>
          <section className="ar-kpis">
            <article className="ar-kpi">
              <span className="ar-kpi-icon ar-icon-blue">👥</span>
              <div>
                <span>Utilisateurs</span>
                <strong>{formatNumber(summary.total_users)}</strong>
                <small>
                  {summary.new_users_last_30_days === null ||
                  summary.new_users_last_30_days === undefined
                    ? "Inscription récente indisponible"
                    : `${formatNumber(summary.new_users_last_30_days)} sur 30 jours`}
                </small>
              </div>
            </article>

            <article className="ar-kpi">
              <span className="ar-kpi-icon ar-icon-violet">🏢</span>
              <div>
                <span>Entreprises</span>
                <strong>{formatNumber(summary.total_companies)}</strong>
                <small>Entreprises enregistrées</small>
              </div>
            </article>

            <article className="ar-kpi">
              <span className="ar-kpi-icon ar-icon-green">💼</span>
              <div>
                <span>Offres publiées</span>
                <strong>{formatNumber(summary.published_jobs)}</strong>
                <small>
                  {formatNumber(summary.total_jobs)} offres au total
                </small>
              </div>
            </article>

            <article className="ar-kpi">
              <span className="ar-kpi-icon ar-icon-orange">📨</span>
              <div>
                <span>Candidatures</span>
                <strong>{formatNumber(summary.total_applications)}</strong>
                <small>
                  {formatNumber(summary.pending_applications)} en attente
                </small>
              </div>
            </article>
          </section>

          <section className="ar-panel">
            <div className="ar-panel-header">
              <div>
                <h2>Évolution mensuelle</h2>
                <p>
                  Nombre de candidatures, d'offres créées et d'inscriptions
                  sur les six derniers mois.
                </p>
              </div>
            </div>

            <div className="ar-chart-legend">
              <span><i className="ar-legend-blue" /> Candidatures</span>
              <span><i className="ar-legend-green" /> Offres</span>
              <span><i className="ar-legend-orange" /> Utilisateurs</span>
            </div>

            {monthlyTrend.length === 0 ? (
              <p className="ar-empty">Aucune donnée mensuelle disponible.</p>
            ) : (
              <div className="ar-month-chart">
                {monthlyTrend.map((month) => {
                  const applications = Number(month.applications) || 0;
                  const jobs = Number(month.jobs) || 0;
                  const users = Number(month.users) || 0;

                  return (
                    <div className="ar-month-column" key={month.key}>
                      <div className="ar-bars">
                        <div className="ar-bar-wrap" title={`Candidatures : ${applications}`}>
                          <span>{applications}</span>
                          <div
                            className="ar-bar ar-bar--blue"
                            style={{
                              height: `${Math.max(
                                applications > 0 ? 5 : 0,
                                (applications / maxMonthly) * 100
                              )}%`,
                            }}
                          />
                        </div>

                        <div className="ar-bar-wrap" title={`Offres : ${jobs}`}>
                          <span>{jobs}</span>
                          <div
                            className="ar-bar ar-bar--green"
                            style={{
                              height: `${Math.max(
                                jobs > 0 ? 5 : 0,
                                (jobs / maxMonthly) * 100
                              )}%`,
                            }}
                          />
                        </div>

                        <div className="ar-bar-wrap" title={`Utilisateurs : ${users}`}>
                          <span>{users}</span>
                          <div
                            className="ar-bar ar-bar--orange"
                            style={{
                              height: `${Math.max(
                                users > 0 ? 5 : 0,
                                (users / maxMonthly) * 100
                              )}%`,
                            }}
                          />
                        </div>
                      </div>
                      <strong>{month.label}</strong>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section className="ar-two-columns">
            <article className="ar-panel">
              <div className="ar-panel-header">
                <div>
                  <h2>Suivi des candidatures</h2>
                  <p>Répartition de toutes les candidatures par statut.</p>
                </div>
              </div>

              {applicationStatuses.length === 0 ? (
                <p className="ar-empty">Aucune candidature enregistrée.</p>
              ) : (
                <div className="ar-status-list">
                  {applicationStatuses.map((item) => {
                    const count = Number(item.count) || 0;
                    const width = (count / maxStatus) * 100;

                    return (
                      <div className="ar-status-item" key={item.code}>
                        <div className="ar-status-top">
                          <span>{item.label}</span>
                          <strong>{formatNumber(count)}</strong>
                        </div>
                        <div className="ar-progress">
                          <div style={{ width: `${width}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </article>

            <article className="ar-panel">
              <div className="ar-panel-header">
                <div>
                  <h2>État des offres</h2>
                  <p>Situation actuelle du catalogue des emplois.</p>
                </div>
              </div>

              <div className="ar-job-status-list">
                {jobStatuses.map((item) => (
                  <div className="ar-job-status" key={item.code}>
                    <div>
                      <span className={`ar-job-dot ar-dot-${String(item.code).toLowerCase()}`} />
                      <span>{item.label}</span>
                    </div>
                    <strong>{formatNumber(item.count)}</strong>
                  </div>
                ))}
              </div>

              <div className="ar-month-summary">
                <span>Candidatures reçues ce mois</span>
                <strong>
                  {summary.applications_this_month === null ||
                  summary.applications_this_month === undefined
                    ? "—"
                    : formatNumber(summary.applications_this_month)}
                </strong>
              </div>
            </article>
          </section>

          <section className="ar-panel ar-export-panel">
            <div className="ar-panel-header">
              <div>
                <h2>Exporter les données</h2>
                <p>
                  Téléchargez les tableaux au format CSV pour Excel ou un
                  autre tableur.
                </p>
              </div>
            </div>

            <div className="ar-export-grid">
              {EXPORTS.map((item) => (
                <article className="ar-export-card" key={item.type}>
                  <span className="ar-export-icon">{item.icon}</span>
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                  <button
                    type="button"
                    className="ar-export-button"
                    onClick={() => exportCsv(item.type)}
                    disabled={Boolean(exporting)}
                  >
                    {exporting === item.type
                      ? "Préparation..."
                      : "↓ Exporter en CSV"}
                  </button>
                </article>
              ))}
            </div>
          </section>
        </>
      ) : null}
    </main>
  );
}
