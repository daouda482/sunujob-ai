
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";

export default function Applications() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadApplications = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("applications/my/");
      const data = response.data;

      const list = Array.isArray(data)
        ? data
        : data.results ?? data.applications ?? [];

      setApplications(list);
    } catch (err) {
      const data = err.response?.data;

      setError(
        data?.detail ||
          "Impossible de charger tes candidatures. Vérifie que tu es connecté et que l'API Django fonctionne."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadApplications();
  }, [loadApplications]);

  function getJob(application) {
    return typeof application.job === "object"
      ? application.job
      : null;
  }

  function getJobId(application) {
    const job = getJob(application);
    return job?.id ?? application.job_id ??
      (typeof application.job === "number" ? application.job : null);
  }

  function getStatus(status) {
    const value = String(status || "PENDING").toUpperCase();

    if (["ACCEPTED", "ACCEPTEE", "ACCEPTÉE"].includes(value)) {
      return { label: "Acceptée", className: "text-bg-success" };
    }

    if (["REJECTED", "REFUSED", "REJETEE", "REJETÉE"].includes(value)) {
      return { label: "Rejetée", className: "text-bg-danger" };
    }

    if (["REVIEWING", "IN_REVIEW", "UNDER_REVIEW"].includes(value)) {
      return { label: "En cours d'examen", className: "text-bg-info" };
    }

    if (["INTERVIEW", "INTERVIEW_SCHEDULED"].includes(value)) {
      return { label: "Entretien prévu", className: "text-bg-primary" };
    }

    return { label: "En attente", className: "text-bg-warning" };
  }

  function formatDate(value) {
    if (!value) return "Date non disponible";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "Date non disponible";
    }

    return new Intl.DateTimeFormat("fr-FR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }).format(date);
  }

  return (
    <main className="applications-page py-5">
      <div className="container">
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
          <div>
            <span className="badge text-bg-primary mb-2">
              Espace candidat
            </span>
            <h1 className="h2 fw-bold mb-2">Mes candidatures</h1>
            <p className="text-secondary mb-0">
              Consulte et suis l'évolution de tes demandes d'emploi.
            </p>
          </div>

          <Link to="/jobs" className="btn btn-primary">
            <i className="bi bi-search me-2" />
            Explorer les offres
          </Link>
        </div>

        <div className="applications-summary bg-white border rounded-4 p-4 mb-4">
          <div className="d-flex align-items-center gap-3">
            <div className="applications-icon">
              <i className="bi bi-send-check" />
            </div>
            <div>
              <div className="text-secondary small">
                Nombre de candidatures
              </div>
              <div className="h3 fw-bold mb-0">
                {applications.length}
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="alert alert-danger" role="alert">
            {error}
            <button
              type="button"
              className="btn btn-outline-danger btn-sm ms-3"
              onClick={loadApplications}
            >
              Réessayer
            </button>
          </div>
        )}

        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Chargement...</span>
            </div>
            <p className="text-secondary mt-3">
              Chargement de tes candidatures...
            </p>
          </div>
        ) : !error && applications.length === 0 ? (
          <div className="applications-empty bg-white border rounded-4 text-center p-5">
            <i className="bi bi-inbox display-4 text-secondary" />
            <h2 className="h4 fw-bold mt-3">
              Aucune candidature pour le moment
            </h2>
            <p className="text-secondary">
              Lorsque tu postuleras à une offre, elle apparaîtra ici.
            </p>
            <Link to="/jobs" className="btn btn-primary">
              Découvrir les offres
            </Link>
          </div>
        ) : (
          !error && (
            <div className="d-flex flex-column gap-3">
              {applications.map((application) => {
                const job = getJob(application);
                const jobId = getJobId(application);
                const status = getStatus(application.status);

                return (
                  <article
                    className="application-card bg-white border rounded-4 p-4"
                    key={application.id}
                  >
                    <div className="d-flex flex-wrap justify-content-between align-items-start gap-3">
                      <div className="d-flex gap-3">
                        <div className="applications-icon">
                          <i className="bi bi-building" />
                        </div>

                        <div>
                          <h2 className="h5 fw-bold mb-1">
                            {job?.title ||
                              application.job_title ||
                              `Candidature n°${application.id}`}
                          </h2>

                          <p className="text-secondary mb-2">
                            {job?.company_name ||
                              (typeof job?.company === "object"
                                ? job.company?.name
                                : job?.company) ||
                              application.company_name ||
                              "Entreprise"}
                          </p>

                          <span className="text-secondary small">
                            <i className="bi bi-calendar3 me-2" />
                            Candidature envoyée le{" "}
                            {formatDate(
                              application.created_at ||
                              application.submitted_at ||
                              application.applied_at
                            )}
                          </span>
                        </div>
                      </div>

                      <span className={`badge ${status.className}`}>
                        {status.label}
                      </span>
                    </div>

                    {application.cover_letter && (
                      <div className="application-letter mt-3">
                        <h3 className="small fw-bold">
                          Lettre de motivation
                        </h3>
                        <p className="text-secondary mb-0">
                          {application.cover_letter.length > 180
                            ? `${application.cover_letter.slice(0, 180)}...`
                            : application.cover_letter}
                        </p>
                      </div>
                    )}

                    <div className="border-top mt-3 pt-3 d-flex flex-wrap gap-2">
                      {jobId && (
                        <Link
                          to={`/jobs/${jobId}`}
                          className="btn btn-outline-primary btn-sm"
                        >
                          <i className="bi bi-eye me-2" />
                          Voir l'offre
                        </Link>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )
        )}

        {!loading && (
          <div className="text-end mt-4">
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={loadApplications}
            >
              <i className="bi bi-arrow-clockwise me-2" />
              Actualiser
            </button>
          </div>
        )}
      </div>
    </main>
  );
}