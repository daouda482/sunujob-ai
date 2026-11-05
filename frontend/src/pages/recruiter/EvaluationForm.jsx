
import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../api/axios";
import "./Evaluations.css";

const criteria = [
  { name: "technical_score", label: "Compétences techniques" },
  { name: "communication_score", label: "Communication" },
  { name: "experience_score", label: "Expérience professionnelle" },
  { name: "motivation_score", label: "Motivation" },
  { name: "adaptability_score", label: "Capacité d'adaptation" },
];

const initialForm = {
  application: "",
  interview: "",
  technical_score: 0,
  communication_score: 0,
  experience_score: 0,
  motivation_score: 0,
  adaptability_score: 0,
  strengths: "",
  weaknesses: "",
  comments: "",
  recommendation: "TO_DISCUSS",
  status: "DRAFT",
};

/**
 * Récupère une liste depuis les différents formats
 * de réponses couramment utilisés par Django REST Framework.
 */
function extractList(data, resourceName = "") {
  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data?.results)) {
    return data.results;
  }

  if (Array.isArray(data?.data)) {
    return data.data;
  }

  if (resourceName && Array.isArray(data?.[resourceName])) {
    return data[resourceName];
  }

  return [];
}

/**
 * Récupère l'identifiant d'une candidature associée
 * à un entretien.
 */
function getApplicationId(interview) {
  const application = interview?.application;

  if (application && typeof application === "object") {
    return application.id ?? application.pk ?? "";
  }

  return (
    application ??
    interview?.application_id ??
    interview?.application?.id ??
    ""
  );
}

/**
 * Construit un libellé lisible pour un entretien.
 */
function getInterviewLabel(interview) {
  const dateValue =
    interview.scheduled_at ||
    interview.scheduled_date ||
    interview.date ||
    interview.start_at;

  const candidate =
    interview.candidate_name ||
    interview.application?.candidate_name ||
    interview.application?.candidate?.full_name ||
    "";

  const job =
    interview.job_title ||
    interview.application?.job_title ||
    interview.application?.job?.title ||
    "";

  const status = interview.status || "Statut non défini";

  const dateLabel = dateValue
    ? new Date(dateValue).toLocaleString("fr-FR")
    : "Date non renseignée";

  return [
    candidate,
    job,
    dateLabel,
    status,
  ]
    .filter(Boolean)
    .join(" — ");
}

function getErrorMessage(error) {
  const status = error?.response?.status;
  const data = error?.response?.data;

  if (status === 401) {
    return "Ta session a expiré. Reconnecte-toi à ton compte recruteur.";
  }

  if (status === 403) {
    return "Tu n'as pas l'autorisation d'accéder à cette ressource.";
  }

  if (status === 404) {
    return "La route demandée est introuvable. Vérifie les URL dans les fichiers urls.py de Django.";
  }

  if (typeof data === "string" && data.trim()) {
    return data;
  }

  if (data && typeof data === "object") {
    return Object.entries(data)
      .map(([field, value]) => {
        const message = Array.isArray(value)
          ? value.join(" ")
          : typeof value === "object"
            ? JSON.stringify(value)
            : String(value);

        return `${field} : ${message}`;
      })
      .join(" | ");
  }

  return error?.message || "Une erreur de communication avec le serveur est survenue.";
}

export default function EvaluationForm() {
  const navigate = useNavigate();

  const [applications, setApplications] = useState([]);
  const [interviews, setInterviews] = useState([]);

  const [form, setForm] = useState(initialForm);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [applicationError, setApplicationError] = useState("");
  const [interviewError, setInterviewError] = useState("");
  const [error, setError] = useState("");

  /**
   * Chargement indépendant des candidatures et des entretiens.
   * Une erreur sur une ressource ne bloque plus l'autre.
   */
  useEffect(() => {
    let mounted = true;

    async function loadApplications() {
      try {
        const response = await api.get("applications/received/");

        if (!mounted) return;

        const list = extractList(response.data, "applications");

        setApplications(list);
        setApplicationError("");

        console.log("Candidatures chargées :", list);
      } catch (err) {
        console.error(
          "Erreur chargement candidatures :",
          err.response?.data || err
        );

        if (mounted) {
          setApplications([]);
          setApplicationError(getErrorMessage(err));
        }
      }
    }

    async function loadInterviews() {
      try {
        const response = await api.get("interviews/recruiter/");

        if (!mounted) return;

        const list = extractList(response.data, "interviews");

        setInterviews(list);
        setInterviewError("");

        console.log("Entretiens chargés :", list);
      } catch (err) {
        console.error(
          "Erreur chargement entretiens :",
          err.response?.data || err
        );

        if (mounted) {
          setInterviews([]);
          setInterviewError(getErrorMessage(err));
        }
      }
    }

    async function loadData() {
      setLoading(true);

      await Promise.allSettled([
        loadApplications(),
        loadInterviews(),
      ]);

      if (mounted) {
        setLoading(false);
      }
    }

    loadData();

    return () => {
      mounted = false;
    };
  }, []);

  /**
   * Les entretiens sont filtrés en fonction
   * de la candidature sélectionnée.
   */
  const selectedInterviews = useMemo(() => {
    if (!form.application) {
      return [];
    }

    return interviews.filter((interview) => {
      const applicationId = getApplicationId(interview);

      return String(applicationId) === String(form.application);
    });
  }, [interviews, form.application]);

  /**
   * Calcul de la moyenne provisoire.
   */
  const average = useMemo(() => {
    const total = criteria.reduce(
      (sum, criterion) => sum + Number(form[criterion.name] || 0),
      0
    );

    return total / criteria.length;
  }, [form]);

  function updateField(name, value) {
    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  /**
   * Enregistrement de l'évaluation.
   */
  async function handleSubmit(event) {
    event.preventDefault();

    setError("");

    if (!form.application) {
      setError("Veuillez sélectionner une candidature.");
      return;
    }

    if (form.status === "COMPLETED") {
      if (!form.strengths.trim()) {
        setError(
          "Veuillez renseigner les points forts avant de terminer l'évaluation."
        );
        return;
      }

      if (!form.comments.trim()) {
        setError(
          "Veuillez renseigner le commentaire général avant de terminer l'évaluation."
        );
        return;
      }
    }

    const payload = {
      application: Number(form.application),

      interview: form.interview
        ? Number(form.interview)
        : null,

      technical_score: Number(form.technical_score),
      communication_score: Number(form.communication_score),
      experience_score: Number(form.experience_score),
      motivation_score: Number(form.motivation_score),
      adaptability_score: Number(form.adaptability_score),

      strengths: form.strengths.trim(),
      weaknesses: form.weaknesses.trim(),
      comments: form.comments.trim(),

      recommendation: form.recommendation,
      status: form.status,
    };

    setSaving(true);

    try {
      const response = await api.post("evaluations/", payload);

      if (!response.data?.id) {
        throw new Error(
          "L'évaluation a été envoyée, mais le serveur n'a pas retourné son identifiant."
        );
      }

      navigate(`/recruiter/evaluations/${response.data.id}`);
    } catch (err) {
      console.error(
        "Erreur création évaluation :",
        err.response?.data || err
      );

      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="evaluation-page">
        <div className="evaluation-empty">
          Chargement des candidatures et des entretiens...
        </div>
      </div>
    );
  }

  return (
    <div className="evaluation-page">

      {/* EN-TÊTE */}
      <header className="evaluation-header">
        <div>
          <p className="evaluation-breadcrumb">
            Espace recruteur / Évaluations / Nouvelle
          </p>

          <h1>Évaluer un candidat</h1>

          <p className="evaluation-subtitle">
            Complétez les critères pour établir votre appréciation.
          </p>
        </div>

        <Link
          to="/recruiter/evaluations"
          className="evaluation-secondary-button"
        >
          ← Retour aux évaluations
        </Link>
      </header>

      {/* ERREUR GÉNÉRALE */}
      {error && (
        <div className="evaluation-error" role="alert">
          {error}
        </div>
      )}

      <form className="evaluation-form" onSubmit={handleSubmit}>

        {/* INFORMATIONS SUR LA CANDIDATURE */}
        <section className="evaluation-panel">
          <div className="evaluation-panel-heading">
            <div>
              <h2>Informations sur la candidature</h2>

              <p>
                Sélectionnez le candidat que vous souhaitez évaluer.
              </p>
            </div>
          </div>

          <div className="evaluation-form-grid">

            {/* CANDIDATURE */}
            <label>
              Candidature <span>*</span>

              <select
                required
                value={form.application}
                onChange={(event) => {
                  const applicationId = event.target.value;

                  setForm((previous) => ({
                    ...previous,
                    application: applicationId,
                    interview: "",
                  }));
                }}
              >
                <option value="">
                  Choisir une candidature
                </option>

                {applications.map((application) => {
                  const candidate =
                    application.candidate_name ||
                    application.candidate?.full_name ||
                    application.candidate?.user?.full_name ||
                    application.candidate?.email ||
                    application.candidate?.user?.email ||
                    application.applicant_name ||
                    `Candidature #${application.id}`;

                  const jobTitle =
                    application.job_title ||
                    application.job?.title ||
                    application.job?.name ||
                    "Offre d'emploi";

                  return (
                    <option
                      key={application.id}
                      value={application.id}
                    >
                      {candidate} — {jobTitle}
                    </option>
                  );
                })}
              </select>
            </label>

            {/* ENTRETIEN ASSOCIÉ */}
            <label>
              Entretien associé

              <select
                value={form.interview}
                onChange={(event) =>
                  updateField("interview", event.target.value)
                }
                disabled={!form.application || Boolean(interviewError)}
              >
                <option value="">
                  Aucun entretien associé
                </option>

                {selectedInterviews.map((interview) => (
                  <option
                    key={interview.id}
                    value={interview.id}
                  >
                    {getInterviewLabel(interview)}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {/* INFORMATIONS DE CHARGEMENT */}
          {applicationError && (
            <div className="evaluation-error">
              Impossible de charger les candidatures : {applicationError}
            </div>
          )}

          {!applicationError && applications.length === 0 && (
            <p className="evaluation-info">
              Aucune candidature reçue n'est disponible pour le moment.
              Vérifie qu'au moins un candidat a postulé à une de tes offres.
            </p>
          )}

          {interviewError && (
            <div className="evaluation-info">
              Les entretiens n'ont pas pu être chargés : {interviewError}
              Tu peux néanmoins créer une évaluation sans entretien associé.
            </div>
          )}

          {!interviewError &&
            form.application &&
            selectedInterviews.length === 0 && (
              <p className="evaluation-info">
                Aucun entretien n'est associé à cette candidature.
                Tu peux continuer sans sélectionner d'entretien.
              </p>
            )}

          {!interviewError &&
            !form.application && (
              <p className="evaluation-info">
                Sélectionne d'abord une candidature pour afficher ses entretiens.
              </p>
            )}
        </section>

        {/* GRILLE D'ÉVALUATION */}
        <section className="evaluation-panel">
          <div className="evaluation-panel-heading">
            <div>
              <h2>Grille d'évaluation</h2>

              <p>
                Attribuez une note de 0 à 5 pour chaque critère.
              </p>
            </div>

            <div className="evaluation-live-score">
              <strong>{average.toFixed(1)}/5</strong>
              <span>Moyenne provisoire</span>
            </div>
          </div>

          <div className="evaluation-criteria">
            {criteria.map((criterion) => (
              <label
                className="evaluation-score-row"
                key={criterion.name}
              >
                <span>{criterion.label}</span>

                <select
                  value={form[criterion.name]}
                  onChange={(event) =>
                    updateField(
                      criterion.name,
                      Number(event.target.value)
                    )
                  }
                >
                  {[0, 1, 2, 3, 4, 5].map((score) => (
                    <option key={score} value={score}>
                      {score} / 5
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
        </section>

        {/* APPRÉCIATION DU RECRUTEUR */}
        <section className="evaluation-panel">
          <div className="evaluation-panel-heading">
            <div>
              <h2>Appréciation du recruteur</h2>

              <p>
                Rédigez une appréciation claire et constructive.
              </p>
            </div>
          </div>

          <div className="evaluation-form-grid">

            <label>
              Points forts

              <textarea
                rows="4"
                value={form.strengths}
                onChange={(event) =>
                  updateField("strengths", event.target.value)
                }
                placeholder="Les compétences et qualités remarquées..."
              />
            </label>

            <label>
              Points à améliorer

              <textarea
                rows="4"
                value={form.weaknesses}
                onChange={(event) =>
                  updateField("weaknesses", event.target.value)
                }
                placeholder="Les compétences à développer..."
              />
            </label>

            <label className="evaluation-full-width">
              Commentaire général

              <textarea
                rows="4"
                value={form.comments}
                onChange={(event) =>
                  updateField("comments", event.target.value)
                }
                placeholder="Votre appréciation globale..."
              />
            </label>

            <label>
              Recommandation

              <select
                value={form.recommendation}
                onChange={(event) =>
                  updateField("recommendation", event.target.value)
                }
              >
                <option value="STRONGLY_RECOMMENDED">
                  Fortement recommandé
                </option>

                <option value="RECOMMENDED">
                  Recommandé
                </option>

                <option value="TO_DISCUSS">
                  À discuter
                </option>

                <option value="NOT_RECOMMENDED">
                  Non recommandé
                </option>
              </select>
            </label>

            <label>
              État de l'évaluation

              <select
                value={form.status}
                onChange={(event) =>
                  updateField("status", event.target.value)
                }
              >
                <option value="DRAFT">
                  Enregistrer en brouillon
                </option>

                <option value="COMPLETED">
                  Terminer l'évaluation
                </option>
              </select>
            </label>
          </div>
        </section>

        {/* BOUTONS */}
        <div className="evaluation-form-actions">
          <Link
            to="/recruiter/evaluations"
            className="evaluation-secondary-button"
          >
            Annuler
          </Link>

          <button
            type="submit"
            className="evaluation-primary-button"
            disabled={saving || applications.length === 0}
          >
            {saving
              ? "Enregistrement..."
              : "Enregistrer l'évaluation"}
          </button>
        </div>
      </form>
    </div>
  );
}
