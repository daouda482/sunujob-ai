
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { notificationService } from "../services/notificationService";
import "../styles/notifications.css";

function getAccessToken() {
  return (
    localStorage.getItem("access") ||
    sessionStorage.getItem("access")
  );
}

function formatNotificationDate(date) {
  if (!date) return "";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) return "";

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsedDate);
}

function getNotificationIcon(type) {
  const icons = {
    APPLICATION: "📄",
    APPLICATION_STATUS: "📌",
    INTERVIEW: "📅",
    SYSTEM: "🔔",
  };

  return icons[type] || "✉️";
}

function extractNotifications(data) {
  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data?.results)) {
    return data.results;
  }

  return [];
}

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const [error, setError] = useState("");

  const dropdownRef = useRef(null);
  const buttonRef = useRef(null);
  const loadingRef = useRef(false);

  const navigate = useNavigate();

  const loadNotifications = useCallback(async (silent = false) => {
    if (!getAccessToken()) {
      setNotifications([]);
      setUnreadCount(0);
      setError("");
      return;
    }

    if (loadingRef.current) return;

    loadingRef.current = true;

    if (!silent) {
      setLoading(true);
      setError("");
    }

    try {
      const [notificationsResult, countResult] =
        await Promise.allSettled([
          notificationService.getAll(),
          notificationService.getUnreadCount(),
        ]);

      if (notificationsResult.status === "fulfilled") {
        const list = extractNotifications(
          notificationsResult.value
        );

        setNotifications(list);

        // Valeur de secours si le compteur API échoue.
        if (countResult.status === "rejected") {
          setUnreadCount(
            list.filter((item) => !item.is_read).length
          );
        }
      } else {
        throw notificationsResult.reason;
      }

      if (countResult.status === "fulfilled") {
        setUnreadCount(countResult.value);
      }

      if (!silent) {
        setError("");
      }
    } catch (err) {
      console.error(
        "Erreur de chargement des notifications :",
        err
      );

      if (!silent) {
        setError(
          err.response?.status === 401
            ? "Votre session a expiré. Reconnectez-vous."
            : "Impossible de charger les notifications."
        );
      }
    } finally {
      loadingRef.current = false;

      if (!silent) {
        setLoading(false);
      }
    }
  }, []);

  // Chargement initial et actualisation toutes les 30 secondes.
  useEffect(() => {
    loadNotifications();

    const intervalId = window.setInterval(() => {
      loadNotifications(true);
    }, 30000);

    return () => window.clearInterval(intervalId);
  }, [loadNotifications]);

  // Fermer le menu en cliquant à l'extérieur ou avec Échap.
  useEffect(() => {
    if (!open) return undefined;

    function handleOutsideClick(event) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target)
      ) {
        setOpen(false);
      }
    }

    function handleEscape(event) {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener(
        "mousedown",
        handleOutsideClick
      );

      document.removeEventListener(
        "keydown",
        handleEscape
      );
    };
  }, [open]);

  function toggleDropdown() {
    const nextOpen = !open;

    setOpen(nextOpen);

    if (nextOpen) {
      loadNotifications();
    }
  }

  async function markAsRead(notification) {
    setError("");

    if (!notification.is_read) {
      try {
        await notificationService.markAsRead(
          notification.id
        );

        setNotifications((current) =>
          current.map((item) =>
            item.id === notification.id
              ? { ...item, is_read: true }
              : item
          )
        );

        setUnreadCount((current) =>
          Math.max(0, current - 1)
        );
      } catch (err) {
        console.error(
          "Erreur lors de la lecture de la notification :",
          err
        );

        setError(
          "Impossible de marquer cette notification comme lue."
        );

        return;
      }
    }

    setOpen(false);

    const url = notification.related_url;

    if (
      typeof url === "string" &&
      url.startsWith("/") &&
      !url.startsWith("//") &&
      !url.includes("\\")
    ) {
      navigate(url);
    }
  }

  async function markAllAsRead() {
    if (unreadCount === 0 || markingAll) return;

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

      setUnreadCount(0);
    } catch (err) {
      console.error(
        "Erreur lors de la lecture globale :",
        err
      );

      setError(
        "Impossible de mettre à jour les notifications."
      );
    } finally {
      setMarkingAll(false);
    }
  }

  const recentNotifications = notifications.slice(0, 5);

  return (
    <div className="notification-bell">
      <button
        ref={buttonRef}
        type="button"
        className={`notification-bell__button ${
          open ? "is-active" : ""
        }`}
        onClick={toggleDropdown}
        aria-label={`Notifications : ${unreadCount} non lue(s)`}
        aria-expanded={open}
        aria-haspopup="true"
        aria-controls="notification-dropdown"
        title="Consulter les notifications"
      >
        <svg
          className="notification-bell__icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
          <path d="M10 21h4" />
        </svg>

        {unreadCount > 0 && (
          <span className="notification-bell__badge">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}

        <span className="notification-bell__sr-only">
          Notifications
        </span>
      </button>

      {open && (
        <section
          ref={dropdownRef}
          id="notification-dropdown"
          className="notification-dropdown"
          role="dialog"
          aria-label="Centre de notifications"
        >
          <header className="notification-dropdown__header">
            <div>
              <h3>Notifications</h3>

              <p>
                {unreadCount === 0
                  ? "Vous êtes à jour."
                  : `${unreadCount} notification(s) non lue(s)`}
              </p>
            </div>

            <button
              type="button"
              className="notification-dropdown__read-all"
              onClick={markAllAsRead}
              disabled={unreadCount === 0 || markingAll}
            >
              {markingAll ? "Traitement..." : "Tout lire"}
            </button>
          </header>

          {error && (
            <div
              className="notification-dropdown__error"
              role="alert"
            >
              {error}

              <button
                type="button"
                onClick={() => loadNotifications()}
              >
                Réessayer
              </button>
            </div>
          )}

          {loading && notifications.length === 0 && (
            <div
              className="notification-dropdown__loading"
              role="status"
            >
              <span className="notification-spinner" />
              <p>Chargement des notifications...</p>
            </div>
          )}

          {!loading &&
            !error &&
            notifications.length === 0 && (
              <div className="notification-dropdown__empty">
                <span aria-hidden="true">🔔</span>

                <strong>Aucune notification</strong>

                <p>
                  Vos nouvelles notifications apparaîtront ici.
                </p>
              </div>
            )}

          {notifications.length > 0 && (
            <div className="notification-dropdown__list">
              {recentNotifications.map((notification) => (
                <button
                  type="button"
                  key={notification.id}
                  className={`notification-item ${
                    notification.is_read
                      ? "is-read"
                      : "is-unread"
                  }`}
                  onClick={() => markAsRead(notification)}
                >
                  <span className="notification-item__icon">
                    {getNotificationIcon(
                      notification.notification_type
                    )}
                  </span>

                  <span className="notification-item__content">
                    <span className="notification-item__title">
                      {notification.title ||
                        "Nouvelle notification"}
                    </span>

                    <span className="notification-item__message">
                      {notification.message}
                    </span>

                    <span className="notification-item__date">
                      {formatNotificationDate(
                        notification.created_at
                      )}
                    </span>
                  </span>

                  {!notification.is_read && (
                    <span
                      className="notification-item__dot"
                      aria-label="Non lue"
                    />
                  )}
                </button>
              ))}
            </div>
          )}

          <Link
            className="notification-dropdown__footer"
            to="/notifications"
            onClick={() => setOpen(false)}
          >
            Voir toutes les notifications
            <span aria-hidden="true">→</span>
          </Link>
        </section>
      )}
    </div>
  );
}
