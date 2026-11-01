import { useEffect, useState } from "react";
import api from "../../api/axios";
import "./adminNotifications.css";

function formatDate(value) {
  if (!value) return "Date non renseignée";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Date non renseignée";

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

  if (typeof data?.detail === "string") return data.detail;
  if (typeof data === "string") return data;

  if (error.response?.status === 401) {
    return "Votre session a expiré. Reconnectez-vous.";
  }

  if (error.response?.status === 403) {
    return "Cette page est réservée aux administrateurs.";
  }

  return "Impossible de charger les notifications. Vérifiez que le serveur Django fonctionne.";
}

export default function AdminNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [summary, setSummary] = useState({
    total: 0,
    read: null,
    unread: null,
  });

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [readFilter, setReadFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [readFilterAvailable, setReadFilterAvailable] = useState(true);

  const [selectedNotification, setSelectedNotification] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadNotifications() {
      setLoading(true);
      setError("");

      try {
        const response = await api.get("admin/notifications/", {
          params: {
            search,
            read: readFilter,
            page,
            page_size: 10,
          },
        });

        if (cancelled) return;

        const data = response.data || {};

        setNotifications(
          Array.isArray(data.results) ? data.results : []
        );

        setSummary(data.summary || {
          total: 0,
          read: null,
          unread: null,
        });

        setTotalResults(Number(data.count || 0));
        setTotalPages(Math.max(1, Number(data.total_pages || 1)));
        setReadFilterAvailable(data.read_filter_available !== false);
      } catch (requestError) {
        if (!cancelled) {
          setError(getErrorMessage(requestError));
          setNotifications([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadNotifications();

    return () => {
      cancelled = true;
    };
  }, [search, readFilter, page, reloadKey]);

  function handleSearch(event) {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  }

  function resetFilters() {
    setSearchInput("");
    setSearch("");
    setReadFilter("all");
    setPage(1);
  }

  function handleReadFilterChange(value) {
    setPage(1);
    setReadFilter(value);
  }

  return (
    <main className="admin-notifications-page">
      <header className="admin-notifications-header">
        <div>
          <span className="admin-notifications-eyebrow">
            ESPACE ADMINISTRATEUR
          </span>

          <h1>Centre de notifications</h1>

          <p>
            Consultez les notifications enregistrées sur la plateforme
            et suivez leur état de lecture sans modifier les comptes
            ni les préférences des utilisateurs.
          </p>
        </div>

        <button
          type="button"
          className="an-refresh-button"
          onClick={() => setReloadKey((value) => value + 1)}
          disabled={loading}
        >
          <span aria-hidden="true">↻</span>
          Actualiser
        </button>
      </header>

      <section className="an-stats-grid">
        <article className="an-stat-card">
          <span className="an-stat-icon an-stat-icon--total">▤</span>
          <div>
            <span>Total des notifications</span>
            <strong>{summary.total ?? 0}</strong>
            <small>Toutes les notifications</small>
          </div>
        </article>

        <article className="an-stat-card">
          <span className="an-stat-icon an-stat-icon--read">✓</span>
          <div>
            <span>Notifications lues</span>
            <strong>
              {summary.read === null || summary.read === undefined
                ? "—"
                : summary.read}
            </strong>
            <small>État enregistré en base</small>
          </div>
        </article>

        <article className="an-stat-card">
          <span className="an-stat-icon an-stat-icon--unread">●</span>
          <div>
            <span>Non lues</span>
            <strong>
              {summary.unread === null || summary.unread === undefined
                ? "—"
                : summary.unread}
            </strong>
            <small>À consulter par le destinataire</small>
          </div>
        </article>
      </section>

      {error && (
        <div className="an-alert" role="alert">
          <strong>Erreur de chargement</strong>
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setReloadKey((value) => value + 1)}
          >
            Réessayer
          </button>
        </div>
      )}

      <section className="an-panel">
        <div className="an-panel-heading">
          <div>
            <h2>Notifications enregistrées</h2>
            <p>
              {totalResults} résultat{totalResults > 1 ? "s" : ""}
            </p>
          </div>
        </div>

        <form className="an-filters" onSubmit={handleSearch}>
          <label className="an-search">
            <span aria-hidden="true">⌕</span>
            <input
              type="search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Rechercher un message ou un destinataire..."
            />
          </label>

          <button type="submit" className="an-primary-button">
            Rechercher
          </button>

          <select
            aria-label="Filtrer par état de lecture"
            value={readFilter}
            disabled={!readFilterAvailable}
            onChange={(event) => handleReadFilterChange(event.target.value)}
          >
            <option value="all">Toutes les notifications</option>
            <option value="unread">Non lues</option>
            <option value="read">Lues</option>
          </select>

          <button
            type="button"
            className="an-reset-button"
            onClick={resetFilters}
          >
            Réinitialiser
          </button>
        </form>

        {!readFilterAvailable && !error && (
          <div className="an-info">
            Le modèle de notifications ne possède pas de champ de lecture
            reconnu. Le filtre de lecture est donc désactivé.
          </div>
        )}

        <div className="an-table-wrapper">
          <table className="an-table">
            <thead>
              <tr>
                <th>Notification</th>
                <th>Destinataire</th>
                <th>Rôle</th>
                <th>Date</th>
                <th>Lecture</th>
                <th>Détails</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" className="an-empty">
                    <span className="an-loader" />
                    Chargement des notifications...
                  </td>
                </tr>
              ) : notifications.length === 0 ? (
                <tr>
                  <td colSpan="6" className="an-empty">
                    <div className="an-empty-icon">♧</div>
                    <strong>Aucune notification trouvée</strong>
                    <p>Essayez de modifier vos critères de recherche.</p>
                  </td>
                </tr>
              ) : (
                notifications.map((notification) => (
                  <tr key={notification.id}>
                    <td>
                      <div className="an-message-cell">
                        <strong>
                          {notification.title || "Notification"}
                        </strong>
                        <span>
                          {notification.message
                            ? `${notification.message.slice(0, 100)}${
                                notification.message.length > 100 ? "…" : ""
                              }`
                            : "Aucun message enregistré"}
                        </span>
                        <small>Référence #{notification.id}</small>
                      </div>
                    </td>

                    <td>
                      <div className="an-recipient-cell">
                        <span className="an-recipient-avatar">
                          {(notification.recipient_name || "U")
                            .trim()
                            .charAt(0)
                            .toUpperCase()}
                        </span>

                        <div>
                          <strong>
                            {notification.recipient_name ||
                              "Destinataire inconnu"}
                          </strong>
                          <span>
                            {notification.recipient_email ||
                              "E-mail non renseigné"}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td>
                      <span className="an-role">
                        {notification.recipient_role || "Non renseigné"}
                      </span>
                    </td>

                    <td>{formatDate(notification.created_at)}</td>

                    <td>
                      {notification.is_read === true ? (
                        <span className="an-read-status an-read-status--read">
                          <span />
                          Lue
                        </span>
                      ) : notification.is_read === false ? (
                        <span className="an-read-status an-read-status--unread">
                          <span />
                          Non lue
                        </span>
                      ) : (
                        <span className="an-read-status an-read-status--unknown">
                          Non disponible
                        </span>
                      )}
                    </td>

                    <td>
                      <button
                        type="button"
                        className="an-details-button"
                        onClick={() => setSelectedNotification(notification)}
                      >
                        Consulter
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <footer className="an-pagination">
          <span>
            Page {page} sur {totalPages}
          </span>

          <div>
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => setPage((value) => Math.max(1, value - 1))}
            >
              ← Précédent
            </button>

            <button
              type="button"
              disabled={page >= totalPages || loading}
              onClick={() =>
                setPage((value) => Math.min(totalPages, value + 1))
              }
            >
              Suivant →
            </button>
          </div>
        </footer>
      </section>

      {selectedNotification && (
        <div
          className="an-modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setSelectedNotification(null);
            }
          }}
        >
          <section
            className="an-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="an-modal-title"
          >
            <header className="an-modal-header">
              <div>
                <span className="admin-notifications-eyebrow">
                  NOTIFICATION #{selectedNotification.id}
                </span>

                <h2 id="an-modal-title">
                  {selectedNotification.title || "Notification"}
                </h2>
              </div>

              <button
                type="button"
                className="an-modal-close"
                aria-label="Fermer"
                onClick={() => setSelectedNotification(null)}
              >
                ×
              </button>
            </header>

            <div className="an-modal-body">
              <div className="an-detail-item">
                <span>Message</span>
                <p>
                  {selectedNotification.message ||
                    "Aucun contenu enregistré."}
                </p>
              </div>

              <div className="an-detail-grid">
                <div className="an-detail-item">
                  <span>Destinataire</span>
                  <strong>
                    {selectedNotification.recipient_name ||
                      "Non renseigné"}
                  </strong>
                </div>

                <div className="an-detail-item">
                  <span>Adresse e-mail</span>
                  <strong>
                    {selectedNotification.recipient_email ||
                      "Non renseignée"}
                  </strong>
                </div>

                <div className="an-detail-item">
                  <span>Rôle</span>
                  <strong>
                    {selectedNotification.recipient_role ||
                      "Non renseigné"}
                  </strong>
                </div>

                <div className="an-detail-item">
                  <span>Date d'enregistrement</span>
                  <strong>{formatDate(selectedNotification.created_at)}</strong>
                </div>

                <div className="an-detail-item">
                  <span>État de lecture</span>
                  <strong>
                    {selectedNotification.is_read === true
                      ? "Lue"
                      : selectedNotification.is_read === false
                        ? "Non lue"
                        : "Non disponible"}
                  </strong>
                </div>
              </div>

              {selectedNotification.related_url && (
                <div className="an-detail-item">
                  <span>Lien associé</span>
                  <p>{selectedNotification.related_url}</p>
                </div>
              )}
            </div>

            <footer className="an-modal-footer">
              <button
                type="button"
                className="an-primary-button"
                onClick={() => setSelectedNotification(null)}
              >
                Fermer
              </button>
            </footer>
          </section>
        </div>
      )}
    </main>
  );
}