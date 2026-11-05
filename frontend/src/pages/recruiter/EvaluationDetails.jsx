
import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import api from "../../api/axios";
import "./Evaluations.css";

const scoreLabels = [
  ["technical_score", "Compétences techniques"],
  ["communication_score", "Communication"],
  ["experience_score", "Expérience"],
  ["motivation_score", "Motivation"],
  ["adaptability_score", "Adaptabilité"],
];

const recommendationOptions = [
  { value: "STRONGLY_RECOMMENDED", label: "Fortement recommandé" },
  { value: "RECOMMENDED", label: "Recommandé" },
  { value: "TO_DISCUSS", label: "À discuter" },
  { value: "NOT_RECOMMENDED", label: "Non recommandé" },
];

const statusOptions = [
  { value: "DRAFT", label: "Brouillon" },
  { value: "COMPLETED", label: "Terminée" },
];

function getErrorMessage(error) {
  const data = error.response?.data;

  if (data?.detail) return data.detail;
  if (data && typeof data === "object") {
    return Object.entries(data)
      .map(([field, messages]) => {
        const message = Array.isArray(messages)
          ? messages.join(", ")
          : String(messages);
        return `${field} : ${message}`;
      })
      .join(" | ");
  }

  return "Une erreur est survenue. Veuillez réessayer.";
}

export default function EvaluationDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [evaluation, setEvaluation] = useState(null);
  const [formData, setFormData] = useState(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editing, setEditing] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let active = true;

    async function loadEvaluation() {
      try {
        setLoading(true);
        const response = await api.get(`evaluations/${id}/`);

        if (active) {
          setEvaluation(response.data);
          setFormData({
            technical_score: response.data.technical_score ?? 0,
            communication_score: response.data.communication_score ?? 0,
            experience_score: response.data.experience_score ?? 0,
            motivation_score: response.data.motivation_score ?? 0,
            adaptability_score: response.data.adaptability_score ?? 0,
            strengths: response.data.strengths || "",
            weaknesses: response.data.weaknesses || "",
            comments: response.data.comments || "",
            recommendation: response.data.recommendation || "TO_DISCUSS",
            status: response.data.status || "DRAFT",
          });
        }
      } catch (err) {
        console.error(err.response?.data || err);

        if (active) {
          setError(getErrorMessage(err));
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadEvaluation();

    return () => {
      active = false;
    };
  }, [id]);

  function handleChange(event) {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: [
        "technical_score",
        "communication_score",
        "experience_score",
        "motivation_score",
        "adaptability_score",
      ].includes(name)
        ? Number(value)
        : value,
    }));
  }

  function cancelEditing() {
    setFormData({
      technical_score: evaluation.technical_score ?? 0,
      communication_score: evaluation.communication_score ?? 0,
      experience_score: evaluation.experience_score ?? 0,
      motivation_score: evaluation.motivation_score ?? 0,
      adaptability_score: evaluation.adaptability_score ?? 0,
      strengths: evaluation.strengths || "",
      weaknesses: evaluation.weaknesses || "",
      comments: evaluation.comments || "",
      recommendation: evaluation.recommendation || "TO_DISCUSS",
      status: evaluation.status || "DRAFT",
    });

    setEditing(false);
    setError("");
    setSuccess("");
  }

  async function handleSave(event) {
    event.preventDefault();

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const response = await api.patch(`evaluations/${id}/`, formData);

      setEvaluation(response.data);
      setFormData({
        technical_score: response.data.technical_score ?? 0,
        communication_score: response.data.communication_score ?? 0,
        experience_score: response.data.experience_score ?? 0,
        motivation_score: response.data.motivation_score ?? 0,
        adaptability_score: response.data.adaptability_score ?? 0,
        strengths: response.data.strengths || "",
        weaknesses: response.data.weaknesses || "",
        comments: response.data.comments || "",
        recommendation: response.data.recommendation || "TO_DISCUSS",
        status: response.data.status || "DRAFT",
      });

      setEditing(false);
      setSuccess("L'évaluation a été mise à jour avec succès.");
    } catch (err) {
      console.error(err.response?.data || err);
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    const confirmed = window.confirm(
      "Voulez-vous vraiment supprimer cette évaluation ? Cette action est définitive."
    );

    if (!confirmed) return;

    setDeleting(true);
    setError("");

    try {
      await api.delete(`evaluations/${id}/`);
      navigate("/recruiter/evaluations", {
        replace: true,
        state: {
          message: "L'évaluation a été supprimée avec succès.",
        },
      });
    } catch (err) {
      console.error(err.response?.data || err);
      setError(getErrorMessage(err));
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="evaluation-page">
        <div className="evaluation-empty">
          Chargement du rapport...
        </div>
      </div>
    );
  }

  if (error && !evaluation) {
    return (
      <div className="evaluation-page">
        <div className="evaluation-error">{error}</div>
        <Link
          to="/recruiter/evaluations"
          className="evaluation-secondary-button"
        >
          Retour
        </Link>
      </div>
    );
  }

  if (!evaluation || !formData) return null;

  const average = editing
    ? (
        Number(formData.technical_score) +
        Number(formData.communication_score) +
        Number(formData.experience_score) +
        Number(formData.motivation_score) +
        Number(formData.adaptability_score)
      ) / 5
    : Number(evaluation.average_score || 0);

  const percentage = Math.round((average / 5) * 100);

  return (
    <div className="evaluation-page">
      <header className="evaluation-header">
        <div>
          <p className="evaluation-breadcrumb">
            Espace recruteur / Évaluations / Rapport
          </p>

          <h1>Rapport d'évaluation</h1>

          <p className="evaluation-subtitle">
            Candidature de {evaluation.candidate_name || "Candidat"}
          </p>
        </div>

        <Link
          to="/recruiter/evaluations"
          className="evaluation-secondary-button"
        >
          ← Retour à la liste
        </Link>
      </header>

      {error && (
        <div className="evaluation-error" role="alert">
          {error}
        </div>
      )}

      {success && (
        <div className="evaluation-success" role="status">
          {success}
        </div>
      )}

      <section className="evaluation-report-hero">
        <div>
          <span>NOTE GLOBALE</span>

          <strong>
            {average.toFixed(1)}
            <small>/5</small>
          </strong>

          <p>{percentage}% de score évaluatif</p>
        </div>

        <div className="evaluation-report-candidate">
          <h2>{evaluation.candidate_name || "Candidat"}</h2>

          <p>{evaluation.job_title || "Poste non renseigné"}</p>

          <span className="evaluation-status completed">
            {editing
              ? statusOptions.find(
                  (option) => option.value === formData.status
                )?.label
              : evaluation.status_label || evaluation.status}
          </span>
        </div>
      </section>

      {editing ? (
        <form onSubmit={handleSave}>
          <section className="evaluation-panel">
            <div className="evaluation-panel-heading">
              <div>
                <h2>Modifier les notes</h2>
                <p>Attribuez une note comprise entre 0 et 5.</p>
              </div>
            </div>

            <div className="evaluation-score-details">
              {scoreLabels.map(([field, label]) => (
                <div className="evaluation-score-detail" key={field}>
                  <div>
                    <label htmlFor={field}>{label}</label>
                    <strong>{formData[field]}/5</strong>
                  </div>

                  <input
                    id={field}
                    type="range"
                    name={field}
                    min="0"
                    max="5"
                    step="1"
                    value={formData[field]}
                    onChange={handleChange}
                    className="evaluation-score-input"
                  />
                </div>
              ))}
            </div>
          </section>

          <section className="evaluation-report-grid">
            <article className="evaluation-panel">
              <label htmlFor="strengths">
                <h2>Points forts</h2>
              </label>

              <textarea
                id="strengths"
                name="strengths"
                value={formData.strengths}
                onChange={handleChange}
                rows="5"
                className="evaluation-edit-textarea"
                placeholder="Décrivez les points forts du candidat..."
              />
            </article>

            <article className="evaluation-panel">
              <label htmlFor="weaknesses">
                <h2>Points à améliorer</h2>
              </label>

              <textarea
                id="weaknesses"
                name="weaknesses"
                value={formData.weaknesses}
                onChange={handleChange}
                rows="5"
                className="evaluation-edit-textarea"
                placeholder="Décrivez les compétences à améliorer..."
              />
            </article>
          </section>

          <section className="evaluation-panel">
            <label htmlFor="comments">
              <h2>Commentaire général</h2>
            </label>

            <textarea
              id="comments"
              name="comments"
              value={formData.comments}
              onChange={handleChange}
              rows="5"
              className="evaluation-edit-textarea"
              placeholder="Saisissez votre commentaire général..."
            />
          </section>

          <section className="evaluation-panel">
            <h2>Décision du recruteur</h2>

            <div className="evaluation-edit-fields">
              <div>
                <label htmlFor="recommendation">
                  Recommandation
                </label>

                <select
                  id="recommendation"
                  name="recommendation"
                  value={formData.recommendation}
                  onChange={handleChange}
                  className="evaluation-edit-select"
                >
                  {recommendationOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="status">Statut de l'évaluation</label>

                <select
                  id="status"
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="evaluation-edit-select"
                >
                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          <div className="evaluation-actions">
            <button
              type="button"
              className="evaluation-secondary-button"
              onClick={cancelEditing}
              disabled={saving}
            >
              Annuler
            </button>

            <button
              type="submit"
              className="evaluation-primary-button"
              disabled={saving}
            >
              {saving ? "Enregistrement..." : "Enregistrer les modifications"}
            </button>
          </div>
        </form>
      ) : (
        <>
          <section className="evaluation-panel">
            <div className="evaluation-panel-heading">
              <div>
                <h2>Résultats par critère</h2>
                <p>Notes attribuées lors de l'évaluation.</p>
              </div>
            </div>

            <div className="evaluation-score-details">
              {scoreLabels.map(([field, label]) => {
                const score = Number(evaluation[field] || 0);

                return (
                  <div className="evaluation-score-detail" key={field}>
                    <div>
                      <span>{label}</span>
                      <strong>{score}/5</strong>
                    </div>

                    <div className="evaluation-progress">
                      <span style={{ width: `${score * 20}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="evaluation-report-grid">
            <article className="evaluation-panel">
              <h2>Points forts</h2>

              <p className="evaluation-report-text">
                {evaluation.strengths || "Aucun point fort renseigné."}
              </p>
            </article>

            <article className="evaluation-panel">
              <h2>Points à améliorer</h2>

              <p className="evaluation-report-text">
                {evaluation.weaknesses || "Aucun point à améliorer renseigné."}
              </p>
            </article>
          </section>

          <section className="evaluation-panel">
            <h2>Commentaire général</h2>

            <p className="evaluation-report-text">
              {evaluation.comments || "Aucun commentaire renseigné."}
            </p>
          </section>

          <section className="evaluation-recommendation">
            <span>RECOMMANDATION DU RECRUTEUR</span>

            <h2>
              {evaluation.recommendation_label ||
                recommendationOptions.find(
                  (option) => option.value === evaluation.recommendation
                )?.label ||
                evaluation.recommendation}
            </h2>
          </section>

          <div className="evaluation-actions">
            <button
              type="button"
              className="evaluation-primary-button"
              onClick={() => {
                setEditing(true);
                setError("");
                setSuccess("");
              }}
            >
              Modifier l'évaluation
            </button>

            <button
              type="button"
              className="evaluation-danger-button"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "Suppression..." : "Supprimer l'évaluation"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
