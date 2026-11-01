
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Sparkles, FileText, CheckCircle2, AlertCircle, RefreshCw,
  ShieldCheck, Lightbulb, Target, Clock3, Award
} from "lucide-react";
import api from "../../api/axios";
import "./CVAnalysis.css";

const ANALYSIS_ENDPOINT = "candidates/cv-analysis/";
const HISTORY_ENDPOINT = "candidates/cv-analysis/history/";

function errorText(error) {
  const status = error?.response?.status;
  const detail = error?.response?.data?.detail;

  if (!error.response) return "Impossible de joindre le serveur Django.";
  if (status === 401) return "Votre session a expiré. Reconnectez-vous.";
  if (status === 403) return "Cette fonctionnalité est réservée aux candidats.";
  if (typeof detail === "string") return detail;
  return "L'analyse n'a pas pu être effectuée. Vérifiez que votre CV est enregistré.";
}

function ScoreCircle({ score = 0 }) {
  const value = Math.max(0, Math.min(100, Number(score) || 0));
  return (
    <div className="cva-score-circle" style={{ "--score": `${value * 3.6}deg` }}>
      <div className="cva-score-inner">
        <strong>{value}<small>/100</small></strong>
        <span>Score du CV</span>
      </div>
    </div>
  );
}

function TagList({ items, emptyText }) {
  if (!Array.isArray(items) || items.length === 0) {
    return <p className="cva-empty-text">{emptyText}</p>;
  }
  return (
    <ul className="cva-tag-list">
      {items.map((item, index) => (
        <li key={`${item}-${index}`}>{item}</li>
      ))}
    </ul>
  );
}

function formatDate(value) {
  if (!value) return "Date inconnue";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Date inconnue"
    : date.toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" });
}

export default function CVAnalysis() {
  const [analysis, setAnalysis] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadHistory = async () => {
    setHistoryLoading(true);
    try {
      const response = await api.get(HISTORY_ENDPOINT);
      setHistory(Array.isArray(response.data?.results) ? response.data.results : []);
    } catch (err) {
      // L'historique ne doit pas empêcher une nouvelle analyse.
      console.error("Chargement de l'historique impossible :", err);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const runAnalysis = async () => {
    setLoading(true);
    setError("");
    setNotice("");
    setAnalysis(null);

    try {
      const response = await api.post(ANALYSIS_ENDPOINT);
      const payload = response.data;
      const result = payload?.result;

      if (!result || typeof result !== "object") {
        throw new Error("Le serveur a renvoyé un résultat d'analyse incomplet.");
      }

      setAnalysis({
        ...result,
        resume_name: payload.resume_name || "Mon CV",
        created_at: payload.created_at,
        engine: payload.engine || result.engine,
      });

      if (result.notice) setNotice(result.notice);
      await loadHistory();
    } catch (err) {
      setError(err.message || errorText(err));
      if (err.response) setError(errorText(err));
    } finally {
      setLoading(false);
    }
  };

  const score = Number(analysis?.score || 0);
  const skills = Array.isArray(analysis?.skills) ? analysis.skills : [];
  const strengths = Array.isArray(analysis?.strengths) ? analysis.strengths : [];
  const recommendations = Array.isArray(analysis?.recommendations)
    ? analysis.recommendations
    : [];
  const foundSections = Array.isArray(analysis?.sections_found)
    ? analysis.sections_found
    : [];
  const missingSections = Array.isArray(analysis?.sections_missing)
    ? analysis.sections_missing
    : [];

  return (
    <main className="cva-page">
      <div className="cva-container">
        <nav className="cva-breadcrumb">
          <Link to="/candidate/dashboard">Mon espace</Link>
          <span>/</span>
          <span>Analyse de CV par IA</span>
        </nav>

        <section className="cva-hero">
          <div className="cva-hero-copy">
            <span className="cva-eyebrow"><Sparkles size={14} /> SUNUJOB AI · INTELLIGENCE ARTIFICIELLE</span>
            <h1>Donnez une nouvelle dimension à <span>votre CV.</span></h1>
            <p>
              Analysez la structure de votre document, identifiez les compétences
              présentes et découvrez des pistes concrètes pour améliorer votre CV.
            </p>
            <div className="cva-hero-points">
              <span><CheckCircle2 size={16} /> Analyse du contenu</span>
              <span><CheckCircle2 size={16} /> Conseils d'amélioration</span>
              <span><CheckCircle2 size={16} /> Historique personnel</span>
            </div>
          </div>
          <div className="cva-hero-art"><FileText size={76} strokeWidth={1.2} /><Sparkles size={27} /></div>
        </section>

        <section className="cva-launch">
          <div className="cva-launch-icon"><Sparkles size={25} /></div>
          <div className="cva-launch-text">
            <h2>Prêt à analyser votre CV ?</h2>
            <p>Votre CV doit d'abord être enregistré dans la rubrique Mon CV.</p>
            <Link to="/candidate/cv">Vérifier mon document <span>→</span></Link>
          </div>
          <button type="button" onClick={runAnalysis} disabled={loading}>
            {loading ? <><RefreshCw className="cva-spin" size={18} /> Analyse en cours...</> : <><Sparkles size={18} /> Lancer l'analyse</>}
          </button>
        </section>

        {error && (
          <div className="cva-alert cva-alert-error" role="alert">
            <AlertCircle size={19} /><span>{error}</span>
            <button type="button" onClick={() => setError("")}>×</button>
          </div>
        )}

        {analysis && (
          <section className="cva-results">
            <div className="cva-section-title">
              <div><span>RÉSULTATS DE L'ANALYSE</span><h2>Votre CV en détail</h2></div>
              <span className="cva-result-date"><Clock3 size={14} /> {formatDate(analysis.created_at)}</span>
            </div>

            <div className="cva-overview">
              <article className="cva-score-card">
                <ScoreCircle score={score} />
                <div>
                  <span className="cva-card-kicker">ÉVALUATION STRUCTURELLE</span>
                  <h3>{analysis.score_label || "Complétude du CV"}</h3>
                  <p>{analysis.summary || "Analyse terminée. Consultez les détails ci-dessous."}</p>
                </div>
              </article>

              <div className="cva-mini-stats">
                <article><FileText size={20} /><strong>{analysis.word_count || 0}</strong><span>Mots détectés</span></article>
                <article><Award size={20} /><strong>{analysis.page_count || 0}</strong><span>Pages du document</span></article>
                <article><Target size={20} /><strong>{skills.length}</strong><span>Compétences</span></article>
              </div>
            </div>

            <div className="cva-content-grid">
              <article className="cva-panel">
                <div className="cva-panel-heading"><CheckCircle2 /><div><h3>Points forts</h3><p>Éléments déjà présents dans votre CV</p></div></div>
                {strengths.length ? (
                  <ul className="cva-detail-list cva-positive-list">
                    {strengths.map((item, i) => <li key={i}>{item}</li>)}
                  </ul>
                ) : <p className="cva-empty-text">Aucun point fort particulier n'a été retourné.</p>}
              </article>

              <article className="cva-panel">
                <div className="cva-panel-heading"><Lightbulb /><div><h3>Recommandations</h3><p>Pistes pour améliorer votre document</p></div></div>
                {recommendations.length ? (
                  <ul className="cva-detail-list cva-advice-list">
                    {recommendations.map((item, i) => <li key={i}>{item}</li>)}
                  </ul>
                ) : <p className="cva-empty-text">Aucune recommandation supplémentaire.</p>}
              </article>

              <article className="cva-panel">
                <div className="cva-panel-heading"><Target /><div><h3>Compétences identifiées</h3><p>Termes reconnus dans le contenu du CV</p></div></div>
                <TagList items={skills} emptyText="Aucune compétence du vocabulaire actuel n'a été identifiée." />
              </article>

              <article className="cva-panel">
                <div className="cva-panel-heading"><FileText /><div><h3>Structure du document</h3><p>Rubriques détectées et rubriques à vérifier</p></div></div>
                <div className="cva-section-lists">
                  <div><strong>Rubriques trouvées</strong><TagList items={foundSections} emptyText="Aucune rubrique reconnue." /></div>
                  <div><strong>Rubriques à compléter</strong><TagList items={missingSections} emptyText="Aucune rubrique manquante signalée." /></div>
                </div>
              </article>
            </div>

            {notice && <div className="cva-notice"><ShieldCheck size={19} /><p>{notice}</p></div>}
            <div className="cva-disclaimer">
              Le score évalue la structure et la complétude du document. Il ne mesure pas la valeur d'une personne et ne prédit pas ses chances d'être recrutée. Vérifiez les suggestions avant de modifier votre CV.
            </div>
          </section>
        )}

        <section className="cva-history">
          <div className="cva-section-title">
            <div><span>VOTRE SUIVI</span><h2>Historique des analyses</h2></div>
            <button type="button" onClick={loadHistory} disabled={historyLoading}><RefreshCw size={15} /> Actualiser</button>
          </div>

          {historyLoading ? (
            <p className="cva-history-empty">Chargement de votre historique...</p>
          ) : history.length ? (
            <div className="cva-history-list">
              {history.map((item) => (
                <article className="cva-history-item" key={item.id}>
                  <div className="cva-history-file"><FileText size={21} /></div>
                  <div className="cva-history-info">
                    <strong>{item.resume_name || "CV analysé"}</strong>
                    <span>{formatDate(item.created_at)}</span>
                  </div>
                  <div className="cva-history-score"><strong>{item.score}/100</strong><span>Score</span></div>
                </article>
              ))}
            </div>
          ) : (
            <div className="cva-history-empty"><Clock3 size={30} /><strong>Aucune analyse enregistrée</strong><p>Vos prochaines analyses apparaîtront ici.</p></div>
          )}
        </section>

        <footer className="cva-footer">
          <span>🇸🇳 Conçu au Sénégal pour valoriser les talents.</span>
          <span>Propulsé par SunuJob AI</span>
        </footer>
      </div>
    </main>
  );
}
