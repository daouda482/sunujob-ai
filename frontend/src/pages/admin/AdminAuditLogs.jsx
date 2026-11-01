import { useEffect, useState } from "react";
import api from "../../api/axios";
import "./adminAuditLogs.css";

const PAGE_SIZE = 20;

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getErrorMessage(error) {
  const data = error?.response?.data;

  if (data?.detail) return data.detail;
  if (data?.message) return data.message;

  if (error?.response?.status === 403) {
    return "Vous n'êtes pas autorisé à consulter ce journal.";
  }

  if (error?.response?.status === 401) {
    return "Votre session a expiré. Reconnectez-vous.";
  }

  return "Impossible de charger le journal d'activité. Vérifiez l'API.";
}

function MethodBadge({ method }) {
  return (
    <span className={`audit-method audit-method-${method?.toLowerCase()}`}>
      {method || "—"}
    </span>
  );
}

function ResultBadge({ succeeded, statusCode }) {
  return (
    <span
      className={`audit-result ${
        succeeded ? "audit-result-success" : "audit-result-failed"
      }`}
    >
      <span className="audit-result-dot" />
      {succeeded ? "Réussie" : "Échec"}
      {statusCode ? ` · ${statusCode}` : ""}
    </span>
  );
}

export default function AdminAuditLogs() {
  const [filters, setFilters] = useState({
    search: "",
    method: "",
    result: "",
    start_date: "",
    end_date: "",
  });

  const [appliedFilters, setAppliedFilters] = useState({
    search: "",
    method: "",
    result: "",
    start_date: "",
    end_date: "",
  });

  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadLogs() {
      setLoading(true);
      setError("");

      try {
        const params = {
          page,
          page_size: PAGE_SIZE,
        };

        Object.entries(appliedFilters).forEach(([key, value]) => {
          if (value) params[key] = value;
        });

        const response = await api.get("admin/audit-logs/", {
          params,
        });

        if (!active) return;

        const data = response.data;
        setLogs(Array.isArray(data.results) ? data.results : []);
        setTotal(Number(data.count) || 0);
      } catch (err) {
        if (!active) return;

        setLogs([]);
        setTotal(0);
        setError(getErrorMessage(err));
      } finally {
        if (active) setLoading(false);
      }
    }

    loadLogs();

    return () => {
      active = false;
    };
  }, [page, appliedFilters]);

  function handleChange(event) {
    const { name, value } = event.target;

    setFilters((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function handleSubmit(event) {
    event.preventDefault();

    if (
      filters.start_date &&
      filters.end_date &&
      filters.start_date > filters.end_date
    ) {
      setError("La date de début doit précéder la date de fin.");
      return;
    }

    setPage(1);
    setAppliedFilters({ ...filters });
  }

  function clearFilters() {
    const emptyFilters = {
      search: "",
      method: "",
      result: "",
      start_date: "",
      end_date: "",
    };

    setFilters(emptyFilters);
    setAppliedFilters(emptyFilters);
    setPage(1);
    setError("");
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <main className="audit-page">
      <section className="audit-hero">
        <div className="audit-hero-content">
          <div className="audit-eyebrow">
            <span className="audit-eyebrow-dot" />
            ADMINISTRATION · CONTRÔLE ET SÉCURITÉ
          </div>

          <h1>Journal d’activité</h1>

          <p>
            Retrouvez les opérations administratives, leur origine et
            leur résultat pour mieux suivre l’activité de SunuJob AI.
          </p>
        </div>

        <div className="audit-hero-icon" aria-hidden="true">
          <span>↻</span>
        </div>
      </section>

      <section className="audit-summary" aria-label="Résumé">
        <article className="audit-summary-card">
          <div className="audit-summary-icon audit-icon-purple">↻</div>
          <div>
            <span>Activités correspondantes</span>
            <strong>{loading ? "…" : total.toLocaleString("fr-FR")}</strong>
            <small>Selon les filtres appliqués</small>
          </div>
        </article>

        <article className="audit-summary-card">
          <div className="audit-summary-icon audit-icon-green">✓</div>
          <div>
            <span>Résultats de la page</span>
            <strong>
              {loading ? "…" : logs.filter((item) => item.succeeded).length}
            </strong>
            <small>Opérations réussies affichées</small>
          </div>
        </article>

        <article className="audit-summary-card">
          <div className="audit-summary-icon audit-icon-orange">!</div>
          <div>
            <span>Échecs sur la page</span>
            <strong>
              {loading ? "…" : logs.filter((item) => !item.succeeded).length}
            </strong>
            <small>À examiner si nécessaire</small>
          </div>
        </article>
      </section>

      <section className="audit-panel">
        <div className="audit-panel-heading">
          <div>
            <h2>Historique des opérations</h2>
            <p>Recherche et consultation des activités enregistrées.</p>
          </div>

          <span className="audit-live-label">
            <span /> Journal actif
          </span>
        </div>

        <form className="audit-filters" onSubmit={handleSubmit}>
          <label className="audit-search">
            <span>Recherche</span>
            <div className="audit-input-wrap">
              <span aria-hidden="true">⌕</span>
              <input
                type="search"
                name="search"
                value={filters.search}
                onChange={handleChange}
                placeholder="Utilisateur, route, action, adresse IP…"
              />
            </div>
          </label>

          <label>
            <span>Méthode</span>
            <select
              name="method"
              value={filters.method}
              onChange={handleChange}
            >
              <option value="">Toutes</option>
              <option value="POST">POST · Création/action</option>
              <option value="PUT">PUT · Modification</option>
              <option value="PATCH">PATCH · Modification</option>
              <option value="DELETE">DELETE · Suppression</option>
            </select>
          </label>

          <label>
            <span>Résultat</span>
            <select
              name="result"
              value={filters.result}
              onChange={handleChange}
            >
              <option value="">Tous les résultats</option>
              <option value="success">Réussies</option>
              <option value="failed">Échecs</option>
            </select>
          </label>

          <label>
            <span>Du</span>
            <input
              type="date"
              name="start_date"
              value={filters.start_date}
              onChange={handleChange}
            />
          </label>

          <label>
            <span>Au</span>
            <input
              type="date"
              name="end_date"
              value={filters.end_date}
              onChange={handleChange}
            />
          </label>

          <div className="audit-filter-actions">
            <button className="audit-apply-btn" type="submit">
              Appliquer les filtres
            </button>

            <button
              className="audit-clear-btn"
              type="button"
              onClick={clearFilters}
            >
              Réinitialiser
            </button>
          </div>
        </form>

        {error && (
          <div className="audit-error" role="alert">
            <span>!</span>
            <div>{error}</div>
            <button type="button" onClick={() => setError("")}>
              Fermer
            </button>
          </div>
        )}

        <div className="audit-table-info">
          <span>
            {loading
              ? "Chargement des activités…"
              : `${total.toLocaleString("fr-FR")} résultat(s)`}
          </span>

          <span>
            Page {page} sur {totalPages}
          </span>
        </div>

        <div className="audit-table-wrapper">
          <table className="audit-table">
            <thead>
              <tr>
                <th>Administrateur</th>
                <th>Action</th>
                <th>Méthode</th>
                <th>Résultat</th>
                <th>Adresse IP</th>
                <th>Date et heure</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" className="audit-state-cell">
                    <div className="audit-loading-spinner" />
                    Chargement du journal…
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan="6" className="audit-state-cell">
                    <div className="audit-empty-icon">⌕</div>
                    <strong>Aucune activité trouvée</strong>
                    <p>
                      Aucune opération ne correspond à ces critères,
                      ou aucune activité n’a encore été enregistrée.
                    </p>
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id}>
                    <td>
                      <div className="audit-user-cell">
                        <div className="audit-avatar">
                          {(log.actor_label || "A").charAt(0).toUpperCase()}
                        </div>

                        <div className="audit-user-text">
                          <strong>{log.actor_label || "Administrateur"}</strong>
                          <small>{log.actor_email || "Adresse indisponible"}</small>
                        </div>
                      </div>
                    </td>

                    <td>
                      <div className="audit-action-text">
                        <strong>{log.action || "Opération administrative"}</strong>
                        <small>{log.path}</small>
                      </div>
                    </td>

                    <td>
                      <MethodBadge method={log.method} />
                    </td>

                    <td>
                      <ResultBadge
                        succeeded={log.succeeded}
                        statusCode={log.status_code}
                      />
                    </td>

                    <td>
                      <code className="audit-ip">
                        {log.ip_address || "—"}
                      </code>
                    </td>

                    <td className="audit-date-cell">
                      {formatDate(log.created_at)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="audit-pagination">
          <span>
            {total === 0
              ? "Aucun résultat"
              : `Affichage de ${Math.min((page - 1) * PAGE_SIZE + 1, total)} à ${Math.min(
                  page * PAGE_SIZE,
                  total
                )} sur ${total}`}
          </span>

          <div className="audit-pagination-buttons">
            <button
              type="button"
              disabled={loading || page <= 1}
              onClick={() => setPage((current) => current - 1)}
            >
              ← Précédent
            </button>

            <span>{page}</span>

            <button
              type="button"
              disabled={loading || page >= totalPages}
              onClick={() => setPage((current) => current + 1)}
            >
              Suivant →
            </button>
          </div>
        </div>
      </section>

      <p className="audit-footnote">
        Le journal enregistre les opérations de modification détectées sur
        les routes administratives couvertes. Il ne remplace pas une
        sauvegarde de la base de données ni une journalisation centralisée.
      </p>
    </main>
  );
}