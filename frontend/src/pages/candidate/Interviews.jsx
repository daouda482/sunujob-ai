
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api/axios";
import "./Interviews.css";

const STATUS_LABELS = {
  SCHEDULED: "Programmé",
  RESCHEDULED: "Reporté",
  COMPLETED: "Terminé",
  CANCELLED: "Annulé",
};

const TYPE_LABELS = {
  IN_PERSON: "Présentiel",
  ONLINE: "Visioconférence",
  PHONE: "Téléphonique",
};

const FILTERS = [
  { value: "ALL", label: "Tous" },
  { value: "UPCOMING", label: "À venir" },
  { value: "COMPLETED", label: "Terminés" },
  { value: "CANCELLED", label: "Annulés" },
];

function getValidDate(value) {
  if (!value) return null;

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(value) {
  const date = getValidDate(value);

  if (!date) return "Date non disponible";

  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

function formatTime(value) {
  const date = getValidDate(value);

  if (!date) return "--:--";

  return new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function isUpcoming(interview) {
  const date = getValidDate(interview.scheduled_at);

  return (
    ["SCHEDULED", "RESCHEDULED"].includes(interview.status) &&
    date !== null &&
    date.getTime() >= Date.now()
  );
}

function getErrorMessage(error) {
  if (error.response?.status === 401) {
    return "Votre session a expiré. Veuillez vous reconnecter.";
  }

  if (error.response?.status === 403) {
    return "Cette page est réservée aux candidats.";
  }

  const data = error.response?.data;

  if (typeof data?.detail === "string") {
    return data.detail;
  }

  if (typeof data === "string" && data.trim()) {
    return data;
  }

  if (!error.response) {
    return "Impossible de joindre le serveur. Vérifiez que votre API Django est démarrée.";
  }

  return "Une erreur est survenue pendant le chargement de vos entretiens.";
}

export default function Interviews() {
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [lastUpdated, setLastUpdated] = useState(null);

  const loadInterviews = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const token = localStorage.getItem("access");

      if (!token) {
        setError("Votre session a expiré. Veuillez vous reconnecter.");
        return;
      }

      const response = await api.get("/interviews/candidate/", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = response.data;
      const items = Array.isArray(data)
        ? data
        : Array.isArray(data?.results)
          ? data.results
          : [];

      setInterviews(items);
      setLastUpdated(new Date());
    } catch (err) {
      console.error("Erreur de chargement des entretiens :", err);
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInterviews();
  }, [loadInterviews]);

  const upcomingInterviews = useMemo(
    () => interviews.filter(isUpcoming),
    [interviews]
  );

  const completedCount = useMemo(
    () => interviews.filter((item) => item.status === "COMPLETED").length,
    [interviews]
  );

  const filteredInterviews = useMemo(() => {
    switch (filter) {
      case "UPCOMING":
        return upcomingInterviews;

      case "COMPLETED":
        return interviews.filter((item) => item.status === "COMPLETED");

      case "CANCELLED":
        return interviews.filter((item) => item.status === "CANCELLED");

      default:
        return interviews;
    }
  }, [filter, interviews, upcomingInterviews]);

  return (
    <main className="candidate-interviews">
      <section className="interviews-hero">
        <div className="interviews-hero-content">
          <span className="interviews-eyebrow">
            <span className="eyebrow-dot" />
            ESPACE CANDIDAT
          </span>

          <h1>Mes entretiens</h1>

          <p>
            Retrouvez vos convocations, préparez vos rendez-vous et suivez
            chaque étape de votre parcours de recrutement avec SunuJob AI.
          </p>

          <Link
            to="/candidate/dashboard"
            className="interviews-back-link"
          >
            <span aria-hidden="true">←</span>
            Retour au tableau de bord
          </Link>
        </div>

        <div className="interviews-hero-icon" aria-hidden="true">
          <span>📅</span>
          <div className="hero-icon-caption">
            Votre prochain rendez-vous
          </div>
        </div>
      </section>

      <section className="interviews-stats" aria-label="Statistiques des entretiens">
        <article className="interview-stat-card">
          <div className="stat-icon stat-blue" aria-hidden="true">
            📆
          </div>
          <div>
            <p>À venir</p>
            <strong>{upcomingInterviews.length}</strong>
            <span>Rendez-vous prévus</span>
          </div>
        </article>

        <article className="interview-stat-card">
          <div className="stat-icon stat-green" aria-hidden="true">
            ✓
          </div>
          <div>
            <p>Terminés</p>
            <strong>{completedCount}</strong>
            <span>Entretiens effectués</span>
          </div>
        </article>

        <article className="interview-stat-card">
          <div className="stat-icon stat-purple" aria-hidden="true">
            📋
          </div>
          <div>
            <p>Total des entretiens</p>
            <strong>{interviews.length}</strong>
            <span>Toutes les convocations</span>
          </div>
        </article>
      </section>

      <section className="interviews-content">
        <div className="interviews-section-heading">
          <div>
            <h2>Votre calendrier</h2>
            <p>
              Consultez vos convocations, les horaires et les informations
              transmises par les recruteurs.
            </p>

            {lastUpdated && !loading && (
              <span className="interviews-last-updated">
                Dernière actualisation à {formatTime(lastUpdated)}
              </span>
            )}
          </div>

          <button
            type="button"
            className="interviews-refresh"
            onClick={loadInterviews}
            disabled={loading}
          >
            <span aria-hidden="true">↻</span>
            {loading ? "Chargement..." : "Actualiser"}
          </button>
        </div>

        <div className="interviews-filters" aria-label="Filtrer les entretiens">
          {FILTERS.map((item) => (
            <button
              type="button"
              key={item.value}
              className={`interview-filter ${
                filter === item.value ? "active" : ""
              }`}
              onClick={() => setFilter(item.value)}
              aria-pressed={filter === item.value}
            >
              {item.label}
              {item.value === "UPCOMING" && (
                <span className="interview-filter-count">
                  {upcomingInterviews.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="interviews-state" role="status">
            <div className="interviews-spinner" />
            <h3>Chargement de vos entretiens</h3>
            <p>Nous récupérons vos convocations...</p>
          </div>
        ) : error ? (
          <div className="interviews-error" role="alert">
            <span aria-hidden="true">⚠️</span>
            <h3>Chargement impossible</h3>
            <p>{error}</p>

            {error.includes("reconnecter") ? (
              <Link to="/login" className="interviews-retry-link">
                Se reconnecter
              </Link>
            ) : (
              <button type="button" onClick={loadInterviews}>
                Réessayer
              </button>
            )}
          </div>
        ) : filteredInterviews.length === 0 ? (
          <div className="interviews-empty">
            <div className="empty-calendar" aria-hidden="true">
              📅
            </div>

            <h3>
              {filter === "ALL"
                ? "Aucun entretien pour le moment"
                : filter === "UPCOMING"
                  ? "Aucun entretien à venir"
                  : filter === "COMPLETED"
                    ? "Aucun entretien terminé"
                    : "Aucun entretien annulé"}
            </h3>

            <p>
              {filter === "ALL"
                ? "Lorsqu'un recruteur programmera un entretien avec vous, votre convocation apparaîtra ici."
                : "Aucun rendez-vous ne correspond à ce filtre. Vous pouvez consulter les autres catégories."}
            </p>

            {filter !== "ALL" ? (
              <button
                type="button"
                className="interviews-jobs-link"
                onClick={() => setFilter("ALL")}
              >
                Voir tous mes entretiens
              </button>
            ) : (
              <Link to="/jobs" className="interviews-jobs-link">
                Découvrir les offres d'emploi
              </Link>
            )}
          </div>
        ) : (
          <div className="interviews-list">
            {filteredInterviews.map((interview) => {
              const date = getValidDate(interview.scheduled_at);
              const status = interview.status || "SCHEDULED";

              return (
                <article className="interview-card" key={interview.id}>
                  <div className="interview-date-block">
                    {date ? (
                      <>
                        <span className="interview-date-day">
                          {date.getDate()}
                        </span>
                        <span className="interview-date-month">
                          {new Intl.DateTimeFormat("fr-FR", {
                            month: "short",
                          }).format(date)}
                        </span>
                      </>
                    ) : (
                      <span className="interview-date-unknown">--</span>
                    )}
                  </div>

                  <div className="interview-main">
                    <div className="interview-card-top">
                      <span
                        className={`interview-status ${status.toLowerCase()}`}
                      >
                        {STATUS_LABELS[status] || status}
                      </span>

                      <span className="interview-type">
                        {TYPE_LABELS[interview.interview_type] ||
                          interview.interview_type ||
                          "Type non précisé"}
                      </span>
                    </div>

                    <h3>
                      {interview.job_title || "Entretien de recrutement"}
                    </h3>

                    <p className="interview-company">
                      {interview.company_name || "Entreprise non renseignée"}
                    </p>

                    <div className="interview-details">
                      <div>
                        <span aria-hidden="true">🗓️</span>
                        <span>{formatDate(interview.scheduled_at)}</span>
                      </div>

                      <div>
                        <span aria-hidden="true">🕒</span>
                        <span>{formatTime(interview.scheduled_at)}</span>
                      </div>

                      {interview.interview_type === "ONLINE" &&
                      interview.meeting_link ? (
                        <div>
                          <span aria-hidden="true">💻</span>
                          <a
                            href={interview.meeting_link}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Rejoindre la visioconférence
                          </a>
                        </div>
                      ) : interview.location ? (
                        <div>
                          <span aria-hidden="true">📍</span>
                          <span>{interview.location}</span>
                        </div>
                      ) : interview.interview_type === "PHONE" ? (
                        <div>
                          <span aria-hidden="true">📞</span>
                          <span>Entretien téléphonique</span>
                        </div>
                      ) : null}
                    </div>

                    {interview.message && (
                      <div className="interview-message">
                        <strong>Message du recruteur</strong>
                        <p>{interview.message}</p>
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
