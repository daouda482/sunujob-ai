
import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { notificationService } from "../services/notificationService";
import "../styles/notifications.css";

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [markingAll, setMarkingAll] = useState(false);
  const [processingId, setProcessingId] = useState(null);

  const navigate = useNavigate();

  const unreadCount = notifications.filter(
    (item) => !item.is_read
  ).length;

  const readCount = notifications.length - unreadCount;

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const data = await notificationService.getAll();

      const items = Array.isArray(data)
        ? data
        : Array.isArray(data?.results)
          ? data.results
          : [];

      setNotifications(items);
    } catch (err) {
      if (err.response?.status === 401) {
        setError(
          "Votre session a expiré. Veuillez vous reconnecter."
        );
      } else if (err.response?.status === 403) {
        setError(
          "Vous n'avez pas l'autorisation d'accéder à ces notifications."
        );
      } else {
        setError(
          "Impossible de charger les notifications. Vérifiez votre connexion."
        );
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  function openRelatedPage(notification) {
    const url = notification.related_url;

    if (
      typeof url === "string" &&
      url.startsWith("/") &&
      !url.startsWith("//")
    ) {
      navigate(url);
    }
  }

  async function handleMarkAsRead(notification) {
    if (processingId !== null || markingAll) return;

    if (notification.is_read) {
      openRelatedPage(notification);
      return;
    }

    setProcessingId(notification.id);
    setError("");

    try {
      await notificationService.markAsRead(notification.id);

      setNotifications((current) =>
        current.map((item) =>
          item.id === notification.id
            ? { ...item, is_read: true }
            : item
        )
      );

      openRelatedPage({
        ...notification,
        is_read: true,
      });
    } catch (err) {
      setError(
        err.response?.status === 401
          ? "Votre session a expiré. Veuillez vous reconnecter."
          : "Impossible de marquer cette notification comme lue. Réessayez."
      );
    } finally {
      setProcessingId(null);
    }
  }

  async function handleMarkAllAsRead() {
    if (markingAll || unreadCount === 0 || processingId !== null) {
      return;
    }

    setMarkingAll(true);
    setError("");

    try {
      await notificationService.markAllAsRead();

      setNotifications((current) =>
        current.map((item) => ({
          ...item,
          is_read: true,
        }))
      );
    } catch (err) {
      setError(
        err.response?.status === 401
          ? "Votre session a expiré. Veuillez vous reconnecter."
          : "Impossible de mettre à jour les notifications. Réessayez."
      );
    } finally {
      setMarkingAll(false);
    }
  }

  function getNotificationIcon(type) {
    switch (type) {
      case "INTERVIEW":
        return "📅";
      case "APPLICATION_STATUS":
        return "📋";
      case "APPLICATION":
        return "💼";
      default:
        return "🔔";
    }
  }

  function formatDate(dateValue) {
    if (!dateValue) return "Date indisponible";

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
      return "Date indisponible";
    }

    return new Intl.DateTimeFormat("fr-FR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  }

  const sessionExpired =
    error ===
    "Votre session a expiré. Veuillez vous reconnecter.";

  return (
    <main className="notifications-page">
      <header className="notifications-page__header">
        <div>
          <p className="notifications-page__eyebrow">
            SUNUJOB AI · VOTRE ESPACE
          </p>

          <h1>Centre de notifications</h1>

          <p>
            Suivez vos candidatures, vos entretiens et les
            actualités de votre espace.
          </p>
        </div>

        <button
          type="button"
          className="notification-action"
          onClick={handleMarkAllAsRead}
          disabled={
            unreadCount === 0 ||
            markingAll ||
            loading ||
            processingId !== null
          }
        >
          {markingAll
            ? "Mise à jour..."
            : "✓ Tout marquer comme lu"}
        </button>
      </header>

      <section
        className="notifications-summary"
        aria-label="Résumé des notifications"
      >
        <span>
          <strong>{notifications.length}</strong>{" "}
          notification(s)
        </span>

        <span>
          <strong>{unreadCount}</strong> non lue(s)
        </span>

        <span>
          <strong>{readCount}</strong> lue(s)
        </span>

        <button
          type="button"
          onClick={loadNotifications}
          disabled={loading}
          aria-label="Actualiser les notifications"
        >
          {loading ? "Chargement..." : "↻ Actualiser"}
        </button>
      </section>

      {error && (
        <div className="notifications-error" role="alert">
          <p>{error}</p>

          {sessionExpired ? (
            <Link to="/login">Se reconnecter</Link>
          ) : (
            <button
              type="button"
              onClick={loadNotifications}
              disabled={loading}
            >
              Réessayer
            </button>
          )}
        </div>
      )}

      {loading && (
        <section
          className="notifications-empty notifications-loading"
          aria-live="polite"
        >
          <div aria-hidden="true">⏳</div>
          <h2>Chargement de vos notifications</h2>
          <p>Nous récupérons les dernières informations.</p>
        </section>
      )}

      {!loading && !error && notifications.length === 0 && (
        <section className="notifications-empty">
          <div aria-hidden="true">🔔</div>
          <h2>Aucune notification pour le moment</h2>
          <p>
            Les nouvelles informations concernant vos candidatures
            et vos entretiens apparaîtront ici.
          </p>
          <Link to="/jobs">Découvrir les offres d'emploi</Link>
        </section>
      )}

      {!loading && notifications.length > 0 && (
        <section
          className="notifications-list"
          aria-label="Liste des notifications"
        >
          {notifications.map((notification) => {
            const isUnread = !notification.is_read;
            const isProcessing =
              processingId === notification.id;

            return (
              <article
                key={notification.id}
                className={`notification-card ${
                  isUnread ? "is-unread" : "is-read"
                }`}
              >
                <div
                  className="notification-card__icon"
                  aria-hidden="true"
                >
                  {getNotificationIcon(
                    notification.notification_type
                  )}
                </div>

                <div className="notification-card__content">
                  <div className="notification-card__title">
                    <h2>
                      {notification.title ||
                        "Nouvelle notification"}
                    </h2>

                    {isUnread && (
                      <span className="notification-unread-dot">
                        Non lue
                      </span>
                    )}
                  </div>

                  <p>
                    {notification.message ||
                      "Consultez votre espace pour plus d'informations."}
                  </p>

                  <time
                    dateTime={
                      notification.created_at || undefined
                    }
                  >
                    {formatDate(notification.created_at)}
                  </time>
                </div>

                <button
                  type="button"
                  className="notification-card__button"
                  onClick={() =>
                    handleMarkAsRead(notification)
                  }
                  disabled={
                    isProcessing ||
                    processingId !== null ||
                    markingAll
                  }
                >
                  {isProcessing
                    ? "Traitement..."
                    : isUnread
                      ? "Marquer comme lue"
                      : "Consulter"}
                </button>
              </article>
            );
          })}
        </section>
      )}

      {!loading && !error && notifications.length > 0 && (
        <footer className="notifications-footer">
          <span aria-hidden="true">✓</span>
          <p>
            Vous avez {unreadCount} notification(s) non lue(s).
            Gardez votre espace à jour pour suivre vos démarches.
          </p>
        </footer>
      )}
    </main>
  );
}
