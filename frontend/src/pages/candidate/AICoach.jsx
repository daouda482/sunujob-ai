
import { useCallback, useEffect, useMemo, useState } from "react";
import aiCoachService from "../../api/aiCoach";
import "./AICoach.css";

const INTERVIEW_TYPES = [
  { value: "GENERAL", label: "Entretien général" },
  { value: "HR", label: "Entretien RH" },
  { value: "TECHNICAL", label: "Entretien technique" },
  { value: "SITUATIONAL", label: "Mise en situation" },
];

const EXPERIENCE_LEVELS = [
  "Débutant",
  "Junior (1 à 2 ans)",
  "Intermédiaire (3 à 5 ans)",
  "Senior (plus de 5 ans)",
];

function normalizeSession(data) {
  return data?.session || data?.data?.session || data?.data || data;
}

function getErrorMessage(error) {
  const data = error?.response?.data;

  if (typeof data?.detail === "string") return data.detail;
  if (typeof data?.message === "string") return data.message;

  if (data && typeof data === "object") {
    return Object.entries(data)
      .map(([key, value]) => {
        const message = Array.isArray(value)
          ? value.join(" ")
          : String(value);

        return `${key}: ${message}`;
      })
      .join(" | ");
  }

  if (error?.code === "ECONNABORTED") {
    return "Le serveur IA met trop de temps à répondre. Réessaie dans quelques instants.";
  }

  return error?.message || "Une erreur inattendue est survenue.";
}

function AICoach() {
  const [sessions, setSessions] = useState([]);
  const [activeSession, setActiveSession] = useState(null);

  const [jobTitle, setJobTitle] = useState("");
  const [interviewType, setInterviewType] = useState("GENERAL");
  const [experienceLevel, setExperienceLevel] = useState("Débutant");

  const [answer, setAnswer] = useState("");

  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [completing, setCompleting] = useState(false);

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const questions = useMemo(
    () => activeSession?.questions || [],
    [activeSession]
  );

  const answeredCount = useMemo(
    () =>
      questions.filter(
        (question) =>
          question.candidate_answer?.trim() &&
          question.score !== null &&
          question.score !== undefined
      ).length,
    [questions]
  );

  const currentQuestion = useMemo(
    () =>
      questions.find(
        (question) =>
          !question.candidate_answer?.trim() ||
          question.score === null ||
          question.score === undefined
      ),
    [questions]
  );

  const isCompleted = activeSession?.status === "COMPLETED";

  const progress =
    questions.length > 0
      ? Math.round((answeredCount / questions.length) * 100)
      : 0;

  const loadSessions = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const data = await aiCoachService.getSessions();

      const results = Array.isArray(data)
        ? data
        : data?.results || data?.sessions || [];

      setSessions(results);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  const loadSessionDetail = async (sessionId) => {
    try {
      setError("");
      setNotice("");

      const data = await aiCoachService.getSession(sessionId);
      const session = normalizeSession(data);

      setActiveSession(session);
      setAnswer("");
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const handleCreateSession = async (event) => {
    event.preventDefault();

    if (!jobTitle.trim()) {
      setError("Veuillez renseigner le poste que vous souhaitez préparer.");
      return;
    }

    try {
      setCreating(true);
      setError("");
      setNotice("");

      const data = await aiCoachService.createSession({
        job_title: jobTitle.trim(),
        interview_type: interviewType,
        experience_level: experienceLevel,
      });

      const session = normalizeSession(data);

      if (!session?.id) {
        throw new Error("La session a été créée, mais son identifiant est absent.");
      }

      setActiveSession(session);
      setJobTitle("");
      setNotice("Votre session de préparation a été créée.");

      await loadSessions();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setCreating(false);
    }
  };

  const handleGenerateQuestions = async () => {
    if (!activeSession?.id) return;

    try {
      setGenerating(true);
      setError("");
      setNotice("");

      await aiCoachService.generateQuestions(activeSession.id);

      await loadSessionDetail(activeSession.id);
      await loadSessions();

      setNotice("Les questions de votre entretien ont été générées avec succès.");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setGenerating(false);
    }
  };

  const handleSubmitAnswer = async (event) => {
    event.preventDefault();

    if (!activeSession?.id || !currentQuestion?.id) return;

    if (!answer.trim()) {
      setError("Veuillez rédiger votre réponse avant de continuer.");
      return;
    }

    try {
      setSubmitting(true);
      setError("");
      setNotice("");

      await aiCoachService.submitAnswer(
        activeSession.id,
        currentQuestion.id,
        answer.trim()
      );

      setAnswer("");

      await loadSessionDetail(activeSession.id);

      setNotice("Votre réponse a été évaluée par le Coach IA.");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleCompleteSession = async () => {
    if (!activeSession?.id) return;

    try {
      setCompleting(true);
      setError("");
      setNotice("");

      await aiCoachService.completeSession(activeSession.id);

      await loadSessionDetail(activeSession.id);
      await loadSessions();

      setNotice("Votre session est terminée. Consultez votre résultat !");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setCompleting(false);
    }
  };

  const handleNewSession = () => {
    setActiveSession(null);
    setAnswer("");
    setError("");
    setNotice("");
  };

  const getScoreClass = (score) => {
    if (score >= 80) return "excellent";
    if (score >= 60) return "good";
    if (score >= 40) return "average";
    return "low";
  };

  return (
    <div className="ai-coach-page">
      <div className="ai-coach-container">

        <header className="ai-coach-hero">
          <div className="ai-coach-hero-content">
            <span className="ai-coach-eyebrow">
              <i className="fas fa-robot"></i>
              INTELLIGENCE ARTIFICIELLE
            </span>

            <h1>
              Votre Coach carrière <span>IA</span>
            </h1>

            <p>
              Préparez vos entretiens professionnels avec un coach intelligent.
              Entraînez-vous, obtenez des conseils personnalisés et améliorez
              vos performances.
            </p>

            <div className="ai-coach-hero-features">
              <span><i className="fas fa-check-circle"></i> Questions personnalisées</span>
              <span><i className="fas fa-check-circle"></i> Évaluation IA</span>
              <span><i className="fas fa-check-circle"></i> Conseils pratiques</span>
            </div>
          </div>

          <div className="ai-coach-hero-icon">
            <i className="fas fa-brain"></i>
            <span className="ai-coach-orbit orbit-one"></span>
            <span className="ai-coach-orbit orbit-two"></span>
          </div>
        </header>

        {error && (
          <div className="ai-coach-alert error">
            <i className="fas fa-exclamation-circle"></i>
            <span>{error}</span>
            <button onClick={() => setError("")} aria-label="Fermer">
              <i className="fas fa-times"></i>
            </button>
          </div>
        )}

        {notice && (
          <div className="ai-coach-alert success">
            <i className="fas fa-check-circle"></i>
            <span>{notice}</span>
            <button onClick={() => setNotice("")} aria-label="Fermer">
              <i className="fas fa-times"></i>
            </button>
          </div>
        )}

        <div className="ai-coach-layout">

          <main className="ai-coach-main">

            {!activeSession ? (
              <section className="ai-coach-card">
                <div className="ai-coach-section-heading">
                  <div>
                    <span className="ai-coach-section-label">COMMENCER</span>
                    <h2>Préparer mon entretien</h2>
                    <p>Personnalisez votre entraînement en quelques étapes.</p>
                  </div>

                  <div className="ai-coach-heading-icon">
                    <i className="fas fa-clipboard-list"></i>
                  </div>
                </div>

                <form onSubmit={handleCreateSession}>
                  <div className="ai-coach-form-group">
                    <label htmlFor="jobTitle">
                      Poste ou métier visé <span>*</span>
                    </label>

                    <div className="ai-coach-input-wrapper">
                      <i className="fas fa-briefcase"></i>
                      <input
                        id="jobTitle"
                        type="text"
                        placeholder="Ex : Développeur Full Stack"
                        value={jobTitle}
                        onChange={(e) => setJobTitle(e.target.value)}
                        maxLength={200}
                        required
                      />
                    </div>
                  </div>

                  <div className="ai-coach-form-row">
                    <div className="ai-coach-form-group">
                      <label htmlFor="interviewType">
                        Type d'entretien
                      </label>

                      <div className="ai-coach-input-wrapper">
                        <i className="fas fa-comments"></i>
                        <select
                          id="interviewType"
                          value={interviewType}
                          onChange={(e) => setInterviewType(e.target.value)}
                        >
                          {INTERVIEW_TYPES.map((type) => (
                            <option key={type.value} value={type.value}>
                              {type.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="ai-coach-form-group">
                      <label htmlFor="experienceLevel">
                        Niveau d'expérience
                      </label>

                      <div className="ai-coach-input-wrapper">
                        <i className="fas fa-user-graduate"></i>
                        <select
                          id="experienceLevel"
                          value={experienceLevel}
                          onChange={(e) => setExperienceLevel(e.target.value)}
                        >
                          {EXPERIENCE_LEVELS.map((level) => (
                            <option key={level} value={level}>
                              {level}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="ai-coach-primary-button"
                    disabled={creating}
                  >
                    {creating ? (
                      <>
                        <i className="fas fa-spinner fa-spin"></i>
                        Création en cours...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-rocket"></i>
                        Créer ma session
                      </>
                    )}
                  </button>
                </form>
              </section>
            ) : (
              <section className="ai-coach-card ai-coach-session-card">
                <div className="ai-coach-session-header">
                  <div>
                    <span className="ai-coach-section-label">VOTRE SESSION</span>
                    <h2>{activeSession.job_title}</h2>
                    <p>
                      {INTERVIEW_TYPES.find(
                        (type) => type.value === activeSession.interview_type
                      )?.label || activeSession.interview_type}
                      {" · "}
                      {activeSession.experience_level}
                    </p>
                  </div>

                  <button
                    className="ai-coach-back-button"
                    onClick={handleNewSession}
                    type="button"
                  >
                    <i className="fas fa-plus"></i>
                    Nouvelle session
                  </button>
                </div>

                {questions.length === 0 && !isCompleted && (
                  <div className="ai-coach-empty-questions">
                    <div className="ai-coach-empty-icon">
                      <i className="fas fa-lightbulb"></i>
                    </div>

                    <h3>Prêt à commencer votre entraînement ?</h3>

                    <p>
                      Le Coach IA va analyser votre poste et votre niveau
                      d'expérience pour préparer une série de questions
                      personnalisées.
                    </p>

                    <button
                      type="button"
                      className="ai-coach-primary-button"
                      onClick={handleGenerateQuestions}
                      disabled={generating}
                    >
                      {generating ? (
                        <>
                          <i className="fas fa-spinner fa-spin"></i>
                          Génération avec Ollama...
                        </>
                      ) : (
                        <>
                          <i className="fas fa-magic"></i>
                          Générer mes questions
                        </>
                      )}
                    </button>
                  </div>
                )}

                {questions.length > 0 && (
                  <>
                    <div className="ai-coach-progress">
                      <div className="ai-coach-progress-info">
                        <strong>Votre progression</strong>
                        <span>
                          {answeredCount} / {questions.length} réponses évaluées
                        </span>
                      </div>

                      <div className="ai-coach-progress-track">
                        <div
                          className="ai-coach-progress-fill"
                          style={{ width: `${progress}%` }}
                        ></div>
                      </div>

                      <span className="ai-coach-progress-percent">
                        {progress}% terminé
                      </span>
                    </div>

                    {!isCompleted && currentQuestion && (
                      <form
                        className="ai-coach-question-form"
                        onSubmit={handleSubmitAnswer}
                      >
                        <div className="ai-coach-question-number">
                          QUESTION {currentQuestion.position}
                        </div>

                        <h3>{currentQuestion.question_text}</h3>

                        <label htmlFor="candidateAnswer">
                          Votre réponse
                        </label>

                        <textarea
                          id="candidateAnswer"
                          rows={7}
                          value={answer}
                          onChange={(e) => setAnswer(e.target.value)}
                          placeholder="Présentez votre réponse de manière claire et structurée..."
                          maxLength={10000}
                          required
                        />

                        <div className="ai-coach-answer-footer">
                          <span>{answer.length} / 10000 caractères</span>

                          <button
                            type="submit"
                            className="ai-coach-primary-button"
                            disabled={submitting || !answer.trim()}
                          >
                            {submitting ? (
                              <>
                                <i className="fas fa-spinner fa-spin"></i>
                                Évaluation IA...
                              </>
                            ) : (
                              <>
                                <i className="fas fa-paper-plane"></i>
                                Envoyer ma réponse
                              </>
                            )}
                          </button>
                        </div>
                      </form>
                    )}

                    {!isCompleted && !currentQuestion && (
                      <div className="ai-coach-ready-complete">
                        <i className="fas fa-check-circle"></i>
                        <h3>Toutes les réponses ont été évaluées !</h3>
                        <p>Vous pouvez maintenant consulter votre résultat final.</p>

                        <button
                          type="button"
                          className="ai-coach-primary-button"
                          onClick={handleCompleteSession}
                          disabled={completing}
                        >
                          {completing ? "Calcul du résultat..." : "Terminer ma session"}
                        </button>
                      </div>
                    )}

                    {isCompleted && (
                      <div className="ai-coach-final-result">
                        <div className={`ai-coach-final-score ${getScoreClass(activeSession.score || 0)}`}>
                          <strong>{activeSession.score ?? 0}</strong>
                          <span>/ 100</span>
                        </div>

                        <h3>Votre entretien est terminé !</h3>
                        <p>
                          Voici votre score indicatif calculé à partir des
                          évaluations de vos réponses.
                        </p>
                      </div>
                    )}
                  </>
                )}
              </section>
            )}

            {activeSession && questions.length > 0 && (
              <section className="ai-coach-card ai-coach-feedback-section">
                <div className="ai-coach-section-heading">
                  <div>
                    <span className="ai-coach-section-label">ANALYSE PERSONNALISÉE</span>
                    <h2>Vos évaluations</h2>
                    <p>Consultez les retours du Coach IA pour chaque réponse.</p>
                  </div>
                </div>

                <div className="ai-coach-feedback-list">
                  {questions
                    .filter(
                      (question) =>
                        question.candidate_answer?.trim() &&
                        question.score !== null &&
                        question.score !== undefined
                    )
                    .map((question) => (
                      <article className="ai-coach-feedback-item" key={question.id}>
                        <div className="ai-coach-feedback-title">
                          <h3>Question {question.position}</h3>

                          <span className={`ai-coach-score-badge ${getScoreClass(question.score)}`}>
                            {question.score}/100
                          </span>
                        </div>

                        <p className="ai-coach-feedback-question">
                          {question.question_text}
                        </p>

                        <div className="ai-coach-feedback-answer">
                          <strong>Votre réponse</strong>
                          <p>{question.candidate_answer}</p>
                        </div>

                        {question.ai_feedback && (
                          <div className="ai-coach-feedback-text">
                            <strong>
                              <i className="fas fa-comment-dots"></i>
                              Analyse du Coach IA
                            </strong>
                            <p>{question.ai_feedback}</p>
                          </div>
                        )}

                        {question.strengths?.length > 0 && (
                          <div className="ai-coach-feedback-points strengths">
                            <strong>
                              <i className="fas fa-check-circle"></i>
                              Points forts
                            </strong>

                            <ul>
                              {question.strengths.map((item, index) => (
                                <li key={index}>{item}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {question.improvements?.length > 0 && (
                          <div className="ai-coach-feedback-points improvements">
                            <strong>
                              <i className="fas fa-lightbulb"></i>
                              Axes d'amélioration
                            </strong>

                            <ul>
                              {question.improvements.map((item, index) => (
                                <li key={index}>{item}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {question.suggested_answer && (
                          <div className="ai-coach-suggested-answer">
                            <strong>
                              <i className="fas fa-star"></i>
                              Exemple de réponse améliorée
                            </strong>
                            <p>{question.suggested_answer}</p>
                          </div>
                        )}
                      </article>
                    ))}

                  {answeredCount === 0 && (
                    <p className="ai-coach-no-feedback">
                      Les évaluations apparaîtront ici après l'envoi de vos réponses.
                    </p>
                  )}
                </div>
              </section>
            )}
          </main>

          <aside className="ai-coach-sidebar">
            <section className="ai-coach-card ai-coach-tips-card">
              <div className="ai-coach-sidebar-heading">
                <i className="fas fa-graduation-cap"></i>
                <h3>Conseils du Coach</h3>
              </div>

              <div className="ai-coach-tip">
                <span>01</span>
                <div>
                  <strong>Soyez structuré</strong>
                  <p>Présentez vos idées dans un ordre logique et compréhensible.</p>
                </div>
              </div>

              <div className="ai-coach-tip">
                <span>02</span>
                <div>
                  <strong>Illustrez vos réponses</strong>
                  <p>Appuyez-vous sur des exemples concrets de vos expériences.</p>
                </div>
              </div>

              <div className="ai-coach-tip">
                <span>03</span>
                <div>
                  <strong>Restez professionnel</strong>
                  <p>Privilégiez des réponses précises, claires et pertinentes.</p>
                </div>
              </div>
            </section>

            <section className="ai-coach-card ai-coach-history-card">
              <div className="ai-coach-sidebar-heading">
                <i className="fas fa-history"></i>
                <h3>Mes sessions</h3>
              </div>

              {loading ? (
                <p className="ai-coach-loading-text">
                  <i className="fas fa-spinner fa-spin"></i>
                  Chargement...
                </p>
              ) : sessions.length === 0 ? (
                <p className="ai-coach-empty-history">
                  Aucune session pour le moment.
                </p>
              ) : (
                <div className="ai-coach-history-list">
                  {sessions.map((session) => (
                    <button
                      type="button"
                      className={`ai-coach-history-item ${
                        activeSession?.id === session.id ? "active" : ""
                      }`}
                      key={session.id}
                      onClick={() => loadSessionDetail(session.id)}
                    >
                      <div className="ai-coach-history-icon">
                        <i className="fas fa-briefcase"></i>
                      </div>

                      <div className="ai-coach-history-info">
                        <strong>{session.job_title}</strong>
                        <span>
                          {session.status === "COMPLETED"
                            ? "Session terminée"
                            : "Session en cours"}
                        </span>
                      </div>

                      <i className="fas fa-chevron-right"></i>
                    </button>
                  ))}
                </div>
              )}
            </section>

            <div className="ai-coach-disclaimer">
              <i className="fas fa-info-circle"></i>
              <p>
                Les scores et recommandations sont indicatifs. Ils servent
                à vous aider à progresser et ne constituent pas une décision
                de recrutement.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

export default AICoach;
