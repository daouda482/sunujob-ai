
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import "./Notifications.css";

function formatDate(value) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "long",
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

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const navigate = useNavigate();

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("notifications/");
      const data = response.data;

      // Compatible avec une liste DRF classique ou paginée.
      const items = Array.isArray(data)
        ? data
        : Array.isArray(data?.results)
          ? data.results
          : [];

      setNotifications(items);
    } catch (err) {
      console.error("Erreur de chargement des notifications :", err);

      setError(
        err.response?.status === 401
          ? "Votre session a expiré. Veuillez vous reconnecter."
          : "Impossible de charger les notifications. Vérifiez votre connexion et réessayez."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const unreadCount = notifications.filter(
    (notification) => !notification.is_read
  ).length;

  async function markAsRead(notification) {
    if (notification.is_read) return;

    try {
      await api.patch(`notifications/${notification.id}/read/`);

      setNotifications((current) =>
        current.map((item) =>
          item.id === notification.id
            ? { ...item, is_read: true }
            : item
        )
      );
    } catch (err) {
      console.error("Erreur lors du marquage comme lu :", err);
      setError("Impossible de marquer cette notification comme lue.");
    }
  }

  async function markAllAsRead() {
    if (unreadCount === 0 || actionLoading) return;

    setActionLoading(true);
    setError("");

    try {
      await api.post("notifications/mark-all-read/");

      setNotifications((current) =>
        current.map((item) => ({ ...item, is_read: true }))
      );
    } catch (err) {
      console.error("Erreur lors du marquage global :", err);
      setError("Impossible de marquer toutes les notifications comme lues.");
    } finally {
      setActionLoading(false);
    }
  }

  async function openNotification(notification) {
    if (!notification.is_read) {
      await markAsRead(notification);
    }

    const target = notification.related_url?.trim();

    // N'autoriser que les chemins internes à l'application.
    if (target && target.startsWith("/") && !target.startsWith("//")) {
      navigate(target);
    }
  }

  return (
    <main className="sj-notifications-page">
      <section className="sj-notifications-hero">
        <div className="sj-notifications-hero-content">
          <span className="sj-notifications-eyebrow">
            SUNUJOB AI · CENTRE DE NOTIFICATIONS
          </span>

          <h1>Vos notifications</h1>

          <p>
            Retrouvez les nouvelles candidatures, les évolutions de vos
            dossiers et les informations importantes de votre espace.
          </p>
        </div>

        <div className="sj-notifications-hero-icon" aria-hidden="true">
          <span>🔔</span>
        </div>
      </section>

      <section className="sj-notifications-panel">
        <div className="sj-notifications-toolbar">
          <div>
            <h2>Centre de notifications</h2>
            <p>
              {loading
                ? "Chargement en cours..."
                : `${notifications.length} notification(s) · ${unreadCount} non lue(s)`}
            </p>
          </div>

          <button
            type="button"
            className="sj-mark-all-btn"
            onClick={markAllAsRead}
            disabled={loading || actionLoading || unreadCount === 0}
          >
            {actionLoading ? "Traitement..." : "Tout marquer comme lu"}
          </button>
        </div>

        {error && (
          <div className="sj-notifications-error" role="alert">
            <span>{error}</span>

            <button type="button" onClick={loadNotifications}>
              Réessayer
            </button>
          </div>
        )}

        {loading ? (
          <div className="sj-notifications-state">
            <span className="sj-notifications-spinner" />
            <p>Chargement de vos notifications...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="sj-notifications-state">
            <div className="sj-empty-notifications-icon">🔔</div>
            <h3>Tout est calme pour le moment</h3>
            <p>
              Vos nouvelles notifications apparaîtront ici dès qu'une
              activité sera enregistrée.
            </p>
          </div>
        ) : (
          <div className="sj-notifications-list">
            {notifications.map((notification) => (
              <article
                key={notification.id}
                className={`sj-notification-item ${
                  notification.is_read ? "is-read" : "is-unread"
                }`}
              >
                <div className="sj-notification-icon" aria-hidden="true">
                  {getNotificationIcon(notification.notification_type)}
                </div>

                <div className="sj-notification-content">
                  <div className="sj-notification-heading">
                    <h3>{notification.title}</h3>

                    {!notification.is_read && (
                      <span className="sj-unread-label">Nouveau</span>
                    )}
                  </div>

                  <p className="sj-notification-message">
                    {notification.message}
                  </p>

                  <time
                    className="sj-notification-date"
                    dateTime={notification.created_at}
                  >
                    {formatDate(notification.created_at)}
                  </time>

                  <div className="sj-notification-actions">
                    {!notification.is_read && (
                      <button
                        type="button"
                        className="sj-notification-text-btn"
                        onClick={() => markAsRead(notification)}
                      >
                        Marquer comme lue
                      </button>
                    )}

                    {notification.related_url && (
                      <button
                        type="button"
                        className="sj-notification-open-btn"
                        onClick={() => openNotification(notification)}
                      >
                        Voir les détails <span aria-hidden="true">→</span>
                      </button>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        {!loading && notifications.length > 0 && (
          <div className="sj-notifications-footer">
            <button
              type="button"
              onClick={loadNotifications}
              className="sj-refresh-notifications"
            >
              ↻ Actualiser les notifications
            </button>
          </div>
        )}
      </section>
    </main>
  );
}
