
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import "./Notifications.css";

function formatDate(value) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getNotificationIcon(type) {
  switch (type) {
    case "APPLICATION":
      return "📄";
    case "APPLICATION_STATUS":
      return "📌";
    case "INTERVIEW":
      return "📅";
    default:
      return "🔔";
  }
}

function getNotificationCategory(type) {
  switch (type) {
    case "APPLICATION":
      return "Candidature";
    case "APPLICATION_STATUS":
      return "Suivi de candidature";
    case "INTERVIEW":
      return "Entretien";
    default:
      return "Information";
  }
}

export default function Notifications() {
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState("ALL");
  const [processingId, setProcessingId] = useState(null);

  const loadNotifications = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);
    else setRefreshing(true);

    setError("");

    try {
      const response = await api.get("notifications/");
      const data = response.data;

      const items = Array.isArray(data)
        ? data
        : Array.isArray(data?.results)
          ? data.results
          : [];

      setNotifications(items);
    } catch (err) {
      console.error("Erreur de chargement :", err);

      setError(
        err.response?.status === 401
          ? "Votre session a expiré. Veuillez vous reconnecter."
          : "Impossible de charger les notifications. Veuillez réessayer."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();

    const interval = window.setInterval(() => {
      loadNotifications(false);
    }, 30000);

    return () => window.clearInterval(interval);
  }, [loadNotifications]);

  const unreadCount = notifications.filter(
    (item) => !item.is_read
  ).length;

  const readCount = notifications.length - unreadCount;

  const filteredNotifications = useMemo(() => {
    if (selectedFilter === "UNREAD") {
      return notifications.filter((item) => !item.is_read);
    }

    if (selectedFilter === "READ") {
      return notifications.filter((item) => item.is_read);
    }

    return notifications;
  }, [notifications, selectedFilter]);

  async function markAsRead(notification) {
    if (notification.is_read || processingId === notification.id) {
      return true;
    }

    setProcessingId(notification.id);

    try {
      await api.patch(`notifications/${notification.id}/read/`);

      setNotifications((current) =>
        current.map((item) =>
          item.id === notification.id
            ? { ...item, is_read: true }
            : item
        )
      );

      return true;
    } catch (err) {
      console.error("Erreur de lecture :", err);
      setError("Impossible de marquer cette notification comme lue.");
      return false;
    } finally {
      setProcessingId(null);
    }
  }

  async function markAllAsRead() {
    if (unreadCount === 0 || actionLoading) return;

    setActionLoading(true);
    setError("");

    try {
      await api.post("notifications/mark-all-read/");

      setNotifications((current) =>
        current.map((item) => ({
          ...item,
          is_read: true,
        }))
      );
    } catch (err) {
      console.error("Erreur de lecture globale :", err);
      setError("Impossible de marquer toutes les notifications comme lues.");
    } finally {
      setActionLoading(false);
    }
  }

  async function openNotification(notification) {
    if (!notification.is_read) {
      const success = await markAsRead(notification);

      if (!success) return;
    }

    const target = notification.related_url?.trim();

    // Accepter uniquement les chemins internes.
    if (target && target.startsWith("/") && !target.startsWith("//")) {
      navigate(target);
    }
  }

  return (
    <main className="sj-notifications-page">
      <section className="sj-notifications-hero">
        <div className="sj-notifications-hero-content">
          <span className="sj-notifications-eyebrow">
            SUNUJOB AI / ESPACE PERSONNEL
          </span>

          <h1>Centre de notifications</h1>

          <p>
            Restez informé de vos candidatures, entretiens et activités
            importantes sur SunuJob AI.
          </p>

          <div className="sj-hero-status">
            <span className="sj-status-dot" />
            Votre espace est à jour
          </div>
        </div>

        <div className="sj-notifications-hero-icon">
          <span>🔔</span>
          {unreadCount > 0 && (
            <span className="sj-hero-count">{unreadCount}</span>
          )}
        </div>
      </section>

      <section className="sj-notification-stats">
        <article className="sj-stat-card">
          <div className="sj-stat-icon total">📨</div>
          <div>
            <span>Total des notifications</span>
            <strong>{notifications.length}</strong>
          </div>
        </article>

        <article className="sj-stat-card">
          <div className="sj-stat-icon unread">🔵</div>
          <div>
            <span>Non lues</span>
            <strong>{unreadCount}</strong>
          </div>
        </article>

        <article className="sj-stat-card">
          <div className="sj-stat-icon read">✓</div>
          <div>
            <span>Déjà consultées</span>
            <strong>{readCount}</strong>
          </div>
        </article>
      </section>

      <section className="sj-notifications-panel">
        <div className="sj-notifications-toolbar">
          <div className="sj-toolbar-heading">
            <span className="sj-section-label">VOTRE ACTIVITÉ</span>
            <h2>Vos notifications</h2>
            <p>
              Retrouvez ici toutes les informations concernant votre compte.
            </p>
          </div>

          <button
            type="button"
            className="sj-mark-all-btn"
            onClick={markAllAsRead}
            disabled={loading || actionLoading || unreadCount === 0}
          >
            {actionLoading ? "Traitement..." : "✓ Tout marquer comme lu"}
          </button>
        </div>

        <div className="sj-notifications-filters">
          <div className="sj-filter-tabs">
            <button
              type="button"
              className={selectedFilter === "ALL" ? "active" : ""}
              onClick={() => setSelectedFilter("ALL")}
            >
              Toutes
              <span>{notifications.length}</span>
            </button>

            <button
              type="button"
              className={selectedFilter === "UNREAD" ? "active" : ""}
              onClick={() => setSelectedFilter("UNREAD")}
            >
              Non lues
              <span>{unreadCount}</span>
            </button>

            <button
              type="button"
              className={selectedFilter === "READ" ? "active" : ""}
              onClick={() => setSelectedFilter("READ")}
            >
              Lues
              <span>{readCount}</span>
            </button>
          </div>

          <button
            type="button"
            className="sj-refresh-notifications"
            onClick={() => loadNotifications(false)}
            disabled={refreshing}
          >
            <span className={refreshing ? "sj-refresh-spinning" : ""}>↻</span>
            {refreshing ? "Actualisation..." : "Actualiser"}
          </button>
        </div>

        {error && (
          <div className="sj-notifications-error" role="alert">
            <span>⚠️ {error}</span>
            <button type="button" onClick={() => loadNotifications()}>
              Réessayer
            </button>
          </div>
        )}

        {loading ? (
          <div className="sj-notifications-state">
            <span className="sj-notifications-spinner" />
            <h3>Chargement de vos notifications</h3>
            <p>Veuillez patienter quelques instants...</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="sj-notifications-state">
            <div className="sj-empty-notifications-icon">
              {selectedFilter === "UNREAD" ? "✓" : "🔔"}
            </div>

            <h3>
              {selectedFilter === "UNREAD"
                ? "Aucune notification non lue"
                : selectedFilter === "READ"
                  ? "Aucune notification consultée"
                  : "Aucune notification pour le moment"}
            </h3>

            <p>
              Les nouvelles informations concernant vos candidatures et
              entretiens apparaîtront automatiquement ici.
            </p>

            {selectedFilter !== "ALL" && (
              <button
                type="button"
                className="sj-empty-action"
                onClick={() => setSelectedFilter("ALL")}
              >
                Voir toutes les notifications
              </button>
            )}
          </div>
        ) : (
          <div className="sj-notifications-list">
            {filteredNotifications.map((notification) => (
              <article
                key={notification.id}
                className={`sj-notification-item ${
                  notification.is_read ? "is-read" : "is-unread"
                }`}
              >
                <div className="sj-notification-icon">
                  {getNotificationIcon(notification.notification_type)}
                </div>

                <div className="sj-notification-content">
                  <div className="sj-notification-heading">
                    <div>
                      <span className="sj-notification-category">
                        {getNotificationCategory(
                          notification.notification_type
                        )}
                      </span>

                      <h3>{notification.title}</h3>
                    </div>

                    {!notification.is_read && (
                      <span className="sj-unread-label">
                        <span /> Nouveau
                      </span>
                    )}
                  </div>

                  <p className="sj-notification-message">
                    {notification.message}
                  </p>

                  <div className="sj-notification-bottom">
                    <time dateTime={notification.created_at}>
                      <span>◷</span>
                      {formatDate(notification.created_at)}
                    </time>

                    <div className="sj-notification-actions">
                      {!notification.is_read && (
                        <button
                          type="button"
                          className="sj-notification-text-btn"
                          disabled={processingId === notification.id}
                          onClick={() => markAsRead(notification)}
                        >
                          {processingId === notification.id
                            ? "Traitement..."
                            : "Marquer comme lue"}
                        </button>
                      )}

                      {notification.related_url && (
                        <button
                          type="button"
                          className="sj-notification-open-btn"
                          onClick={() => openNotification(notification)}
                        >
                          Voir les détails <span>→</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        <div className="sj-notifications-footer">
          <span>
            🔄 Actualisation automatique toutes les 30 secondes
          </span>
          <span>Conçu au Sénégal 🇸🇳</span>
        </div>
      </section>
    </main>
  );
}
