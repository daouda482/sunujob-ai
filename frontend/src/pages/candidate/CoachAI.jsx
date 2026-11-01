
import { useState } from "react";
import { Link } from "react-router-dom";
import "./CoachAI.css";

const INTERVIEW_TYPES = [
  { value: "GENERAL", label: "Entretien général" },
  { value: "HR", label: "Entretien RH" },
  { value: "TECHNICAL", label: "Entretien technique" },
  { value: "SITUATIONAL", label: "Mise en situation" },
];

export default function CoachAI() {
  const [jobTitle, setJobTitle] = useState("");
  const [interviewType, setInterviewType] = useState("GENERAL");
  const [experienceLevel, setExperienceLevel] = useState("Débutant");
  const [error, setError] = useState("");

  function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (!jobTitle.trim()) {
      setError("Veuillez renseigner le métier que vous souhaitez préparer.");
      return;
    }

    // La connexion aux API sera ajoutée dans l'étape suivante.
    setError(
      "Le formulaire fonctionne. La connexion à l'API du Coach IA reste à configurer."
    );
  }

  return (
    <main className="coach-page">
      <section className="coach-hero">
        <div className="coach-hero-content">
          <span className="coach-eyebrow">SUNUJOB AI · COACH INTELLIGENT</span>

          <h1>Préparez votre prochain entretien avec confiance.</h1>

          <p>
            Entraînez-vous aux questions de recrutement, structurez vos
            réponses et identifiez les compétences à mettre en valeur.
          </p>

          <div className="coach-hero-points">
            <span>✓ Questions adaptées au métier</span>
            <span>✓ Entraînement personnalisé</span>
            <span>✓ Conseils pour progresser</span>
          </div>
        </div>

        <div className="coach-hero-visual" aria-hidden="true">
          <div className="coach-orbit coach-orbit-one" />
          <div className="coach-orbit coach-orbit-two" />
          <div className="coach-robot">
            <span className="coach-robot-eyes">● ●</span>
            <span className="coach-robot-mouth" />
          </div>
          <div className="coach-floating-card">
            <span>Votre prochaine étape</span>
            <strong>Réussir votre entretien</strong>
            <div className="coach-progress">
              <span />
            </div>
          </div>
        </div>
      </section>

      <section className="coach-content">
        <div className="coach-section-heading">
          <div>
            <span className="coach-section-label">VOTRE PARCOURS</span>
            <h2>Préparez votre simulation</h2>
            <p>
              Quelques informations suffisent pour commencer votre
              entraînement.
            </p>
          </div>
          <Link to="/candidate/dashboard" className="coach-back-link">
            ← Tableau de bord
          </Link>
        </div>

        <div className="coach-layout">
          <form className="coach-form" onSubmit={handleSubmit}>
            <h3>Configurez votre entretien</h3>
            <p className="coach-form-description">
              Choisissez le poste et le type de questions que vous souhaitez
              travailler.
            </p>

            <label htmlFor="coach-job-title">Métier ou poste visé</label>
            <input
              id="coach-job-title"
              type="text"
              value={jobTitle}
              onChange={(event) => setJobTitle(event.target.value)}
              placeholder="Ex. : Développeur Python"
              maxLength={200}
            />

            <label htmlFor="coach-interview-type">Type d'entretien</label>
            <select
              id="coach-interview-type"
              value={interviewType}
              onChange={(event) => setInterviewType(event.target.value)}
            >
              {INTERVIEW_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>

            <label htmlFor="coach-experience">Niveau d'expérience</label>
            <select
              id="coach-experience"
              value={experienceLevel}
              onChange={(event) => setExperienceLevel(event.target.value)}
            >
              <option value="Débutant">Débutant</option>
              <option value="Junior">Junior</option>
              <option value="Intermédiaire">Intermédiaire</option>
              <option value="Expérimenté">Expérimenté</option>
            </select>

            {error && (
              <div className="coach-message" role="status">
                {error}
              </div>
            )}

            <button type="submit" className="coach-submit">
              Préparer ma simulation <span>→</span>
            </button>

            <p className="coach-privacy">
              Votre entraînement est destiné à votre progression
              professionnelle.
            </p>
          </form>

          <aside className="coach-side-panel">
            <div className="coach-side-icon">✦</div>
            <h3>Un entraînement qui vous ressemble</h3>
            <p>
              Préparez des réponses claires, valorisez vos expériences et
              apprenez à présenter vos compétences.
            </p>

            <div className="coach-step">
              <span>01</span>
              <div>
                <strong>Choisissez votre objectif</strong>
                <p>Indiquez le poste qui vous intéresse.</p>
              </div>
            </div>

            <div className="coach-step">
              <span>02</span>
              <div>
                <strong>Entraînez-vous</strong>
                <p>Répondez aux questions de simulation.</p>
              </div>
            </div>

            <div className="coach-step">
              <span>03</span>
              <div>
                <strong>Progressez</strong>
                <p>Analysez les retours et améliorez vos réponses.</p>
              </div>
            </div>

            <div className="coach-demo-note">
              <strong>À savoir</strong>
              <p>
                La génération et l'évaluation par IA seront activées lorsque
                le service d'IA sera connecté.
              </p>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
