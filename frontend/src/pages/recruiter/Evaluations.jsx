
import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api/axios";
import "./Evaluations.css";

function extractList(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  return [];
}

export default function Evaluations() {
  const [evaluations, setEvaluations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");

  const loadEvaluations = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("evaluations/");
      setEvaluations(extractList(response.data));
    } catch (err) {
      console.error("Erreur évaluations :", err.response?.data || err);
      setError(
        err.response?.data?.detail ||
        "Impossible de charger les évaluations. Vérifiez votre connexion."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEvaluations();
  }, [loadEvaluations]);

  const filteredEvaluations = evaluations.filter((item) => {
    const candidate = (item.candidate_name || "").toLowerCase();
    const job = (item.job_title || "").toLowerCase();
    const term = search.toLowerCase();

    return (
      (!term || candidate.includes(term) || job.includes(term)) &&
      (!status || item.status === status)
    );
  });

  const completed = evaluations.filter(
    (item) => item.status === "COMPLETED"
  ).length;

  const drafts = evaluations.filter(
    (item) => item.status === "DRAFT"
  ).length;

  const average =
    evaluations.length > 0
      ? evaluations.reduce(
          (sum, item) => sum + Number(item.average_score || 0),
          0
        ) / evaluations.length
      : 0;

  return (
    <div className="evaluation-page">
      <header className="evaluation-header">
        <div>
          <p className="evaluation-breadcrumb">
            Espace recruteur / Évaluations
          </p>
          <h1>Évaluation des candidats</h1>
          <p className="evaluation-subtitle">
            Analysez les profils et prenez des décisions de recrutement
            éclairées.
          </p>
        </div>

        <Link
          to="/recruiter/evaluations/new"
          className="evaluation-primary-button"
        >
          + Nouvelle évaluation
        </Link>
      </header>

      <section className="evaluation-stat-grid">
        <article className="evaluation-stat-card">
          <span className="evaluation-stat-icon">📋</span>
          <p>Total des évaluations</p>
          <strong>{loading ? "..." : evaluations.length}</strong>
        </article>

        <article className="evaluation-stat-card">
          <span className="evaluation-stat-icon">✓</span>
          <p>Évaluations terminées</p>
          <strong>{loading ? "..." : completed}</strong>
        </article>

        <article className="evaluation-stat-card">
          <span className="evaluation-stat-icon">◷</span>
          <p>Brouillons</p>
          <strong>{loading ? "..." : drafts}</strong>
        </article>

        <article className="evaluation-stat-card">
          <span className="evaluation-stat-icon">★</span>
          <p>Moyenne générale</p>
          <strong>{loading ? "..." : `${average.toFixed(1)}/5`}</strong>
        </article>
      </section>

      <section className="evaluation-panel">
        <div className="evaluation-panel-heading">
          <div>
            <h2>Suivi des évaluations</h2>
            <p>Consultez et gérez vos évaluations de candidatures.</p>
          </div>

          <button
            className="evaluation-refresh-button"
            onClick={loadEvaluations}
            disabled={loading}
          >
            ↻ Actualiser
          </button>
        </div>

        <div className="evaluation-filters">
          <input
            type="search"
            placeholder="Rechercher un candidat ou un poste..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">Tous les statuts</option>
            <option value="DRAFT">Brouillons</option>
            <option value="COMPLETED">Terminées</option>
          </select>
        </div>

        {error && (
          <div className="evaluation-error" role="alert">
            {error}
            <button onClick={loadEvaluations}>Réessayer</button>
          </div>
        )}

        {loading ? (
          <div className="evaluation-empty">Chargement des évaluations...</div>
        ) : filteredEvaluations.length === 0 ? (
          <div className="evaluation-empty">
            <div className="evaluation-empty-icon">📊</div>
            <h3>Aucune évaluation trouvée</h3>
            <p>
              Créez une évaluation pour commencer à analyser vos candidats.
            </p>
            <Link
              to="/recruiter/evaluations/new"
              className="evaluation-primary-button"
            >
              Créer une évaluation
            </Link>
          </div>
        ) : (
          <div className="evaluation-table-wrapper">
            <table className="evaluation-table">
              <thead>
                <tr>
                  <th>Candidat</th>
                  <th>Poste</th>
                  <th>Note moyenne</th>
                  <th>Recommandation</th>
                  <th>Statut</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {filteredEvaluations.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong>{item.candidate_name || "Candidat"}</strong>
                      <small>Évaluation #{item.id}</small>
                    </td>
                    <td>{item.job_title || "Poste non renseigné"}</td>
                    <td>
                      <strong>
                        {Number(item.average_score || 0).toFixed(1)}/5
                      </strong>
                      <small>{item.percentage_score || 0}%</small>
                    </td>
                    <td>
                      {item.recommendation_label ||
                        item.recommendation ||
                        "Non définie"}
                    </td>
                    <td>
                      <span
                        className={`evaluation-status ${
                          item.status === "COMPLETED"
                            ? "completed"
                            : "draft"
                        }`}
                      >
                        {item.status_label ||
                          (item.status === "COMPLETED"
                            ? "Terminée"
                            : "Brouillon")}
                      </span>
                    </td>
                    <td>
                      <Link
                        className="evaluation-detail-link"
                        to={`/recruiter/evaluations/${item.id}`}
                      >
                        Consulter →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
