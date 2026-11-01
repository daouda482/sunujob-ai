import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import api from "../api/axios";
import "./reportButton.css";

const REASONS = [
  {
    value: "FAKE_JOB",
    label: "Offre frauduleuse ou inexistante",
  },
  {
    value: "SCAM",
    label: "Tentative d’escroquerie",
  },
  {
    value: "FALSE_INFORMATION",
    label: "Informations trompeuses",
  },
  {
    value: "IMPERSONATION",
    label: "Usurpation d’identité",
  },
  {
    value: "DISCRIMINATION",
    label: "Contenu discriminatoire",
  },
  {
    value: "INAPPROPRIATE",
    label: "Contenu inapproprié",
  },
  {
    value: "OTHER",
    label: "Autre motif",
  },
];

function getErrorMessage(error) {
  const data = error?.response?.data;

  if (typeof data?.detail === "string") {
    return data.detail;
  }

  if (typeof data?.message === "string") {
    return data.message;
  }

  if (data && typeof data === "object") {
    for (const value of Object.values(data)) {
      if (Array.isArray(value) && value.length > 0) {
        return String(value[0]);
      }

      if (typeof value === "string") {
        return value;
      }
    }
  }

  if (error?.response?.status === 401) {
    return "Votre session a expiré. Veuillez vous reconnecter.";
  }

  if (error?.response?.status === 403) {
    return "Vous n’êtes pas autorisé à envoyer ce signalement.";
  }

  return "Impossible d’envoyer le signalement. Réessayez.";
}

export default function ReportButton({
  targetType,
  targetId,
  targetLabel = "",
  buttonLabel = "Signaler",
  compact = false,
}) {
  const navigate = useNavigate();
  const location = useLocation();

  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [requiresLogin, setRequiresLogin] = useState(false);

  const isValidTarget =
    ["JOB", "COMPANY"].includes(targetType) &&
    Number.isInteger(Number(targetId)) &&
    Number(targetId) > 0;

  function openModal() {
    setError("");
    setSubmitted(false);
    setRequiresLogin(!localStorage.getItem("access"));
    setIsOpen(true);
  }

  function closeModal() {
    if (submitting) return;

    setIsOpen(false);
    setError("");
  }

  function handleLogin() {
    navigate("/login", {
      state: {
        from: location,
      },
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (!isValidTarget) {
      setError("L’élément à signaler est introuvable.");
      return;
    }

    if (!localStorage.getItem("access")) {
      setRequiresLogin(true);
      setError("Connectez-vous pour envoyer un signalement.");
      return;
    }

    if (!reason) {
      setError("Veuillez sélectionner un motif.");
      return;
    }

    const cleanedDescription = description.trim();

    if (cleanedDescription.length < 10) {
      setError("Veuillez expliquer le problème en au moins 10 caractères.");
      return;
    }

    if (cleanedDescription.length > 5000) {
      setError("La description ne peut pas dépasser 5 000 caractères.");
      return;
    }

    setSubmitting(true);

    try {
      await api.post("moderation/reports/", {
        target_type: targetType,
        target_id: Number(targetId),
        reason,
        description: cleanedDescription,
      });

      setSubmitted(true);
      setReason("");
      setDescription("");
      setError("");
    } catch (err) {
      setError(getErrorMessage(err));

      if (err?.response?.status === 401) {
        setRequiresLogin(true);
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (!isValidTarget) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        className={`report-trigger ${compact ? "report-trigger-compact" : ""}`}
        onClick={openModal}
        aria-label={`${buttonLabel} ${targetLabel}`.trim()}
      >
        <span className="report-trigger-icon" aria-hidden="true">
          ⚑
        </span>
        <span>{buttonLabel}</span>
      </button>

      {isOpen && (
        <div
          className="report-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeModal();
            }
          }}
        >
          <section
            className="report-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="report-modal-title"
          >
            <header className="report-modal-header">
              <div className="report-modal-heading-icon" aria-hidden="true">
                ⚑
              </div>

              <div className="report-modal-heading-text">
                <span className="report-modal-eyebrow">
                  SUNUJOB AI · SIGNALEMENT
                </span>

                <h2 id="report-modal-title">
                  {submitted
                    ? "Signalement transmis"
                    : requiresLogin
                      ? "Connexion requise"
                      : "Signaler un problème"}
                </h2>

                <p>
                  {targetType === "JOB"
                    ? "Offre d’emploi"
                    : "Entreprise"}
                  {targetLabel ? ` · ${targetLabel}` : ""}
                  {/* <ReportButton
                    targetType="JOB"
                    targetId={job.id}
                    targetLabel={job.title}
                /> */}
                </p>
              </div>

              <button
                type="button"
                className="report-modal-close"
                onClick={closeModal}
                disabled={submitting}
                aria-label="Fermer la fenêtre"
              >
                ×
              </button>
            </header>

            {submitted ? (
              <div className="report-success-content">
                <div className="report-success-icon">✓</div>

                <h3>Merci pour votre vigilance !</h3>

                <p>
                  Votre signalement a bien été transmis à l’équipe de
                  modération de SunuJob AI. Il sera examiné par un
                  administrateur.
                </p>

                <div className="report-privacy-note">
                  <span aria-hidden="true">🔒</span>
                  <span>
                    Votre signalement est transmis à l’équipe administrative
                    et n’est pas publié sur la page concernée.
                  </span>
                </div>

                <button
                  type="button"
                  className="report-submit-btn"
                  onClick={closeModal}
                >
                  Terminer
                </button>
              </div>
            ) : requiresLogin ? (
              <div className="report-login-content">
                <div className="report-login-icon">♙</div>

                <h3>Connectez-vous pour continuer</h3>

                <p>
                  Pour éviter les abus et permettre le suivi des dossiers,
                  seuls les utilisateurs connectés peuvent transmettre un
                  signalement.
                </p>

                {error && (
                  <div className="report-error" role="alert">
                    {error}
                  </div>
                )}

                <button
                  type="button"
                  className="report-submit-btn"
                  onClick={handleLogin}
                >
                  Se connecter
                </button>

                <button
                  type="button"
                  className="report-cancel-btn"
                  onClick={closeModal}
                >
                  Annuler
                </button>
              </div>
            ) : (
              <form
                className="report-form"
                onSubmit={handleSubmit}
              >
                <div className="report-form-intro">
                  Aidez-nous à maintenir un environnement de recrutement
                  fiable. Décrivez précisément le problème observé.
                </div>

                <label className="report-field">
                  <span>
                    Motif du signalement <strong>*</strong>
                  </span>

                  <select
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                    required
                    disabled={submitting}
                  >
                    <option value="">Sélectionnez un motif</option>

                    {REASONS.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="report-field">
                  <span>
                    Description du problème <strong>*</strong>
                  </span>

                  <textarea
                    value={description}
                    onChange={(event) =>
                      setDescription(event.target.value)
                    }
                    minLength={10}
                    maxLength={5000}
                    rows={5}
                    required
                    disabled={submitting}
                    placeholder="Expliquez ce qui vous semble suspect, trompeur ou inapproprié…"
                  />

                  <small>
                    {description.length}/5 000 caractères. Minimum :
                    10 caractères.
                  </small>
                </label>

                <div className="report-privacy-note">
                  <span aria-hidden="true">🔒</span>
                  <span>
                    Les informations envoyées sont destinées à l’équipe
                    de modération. Évitez d’inclure des données personnelles
                    inutiles dans votre description.
                  </span>
                </div>

                {error && (
                  <div className="report-error" role="alert">
                    <span>!</span>
                    {error}
                  </div>
                )}

                <div className="report-modal-actions">
                  <button
                    type="button"
                    className="report-cancel-btn"
                    onClick={closeModal}
                    disabled={submitting}
                  >
                    Annuler
                  </button>

                  <button
                    type="submit"
                    className="report-submit-btn"
                    disabled={submitting}
                  >
                    {submitting ? (
                      <>
                        <span className="report-button-spinner" />
                        Envoi en cours…
                      </>
                    ) : (
                      "Envoyer le signalement"
                    )}
                  </button>
                </div>
              </form>
            )}
          </section>
        </div>
      )}
    </>
  );
}