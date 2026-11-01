
import { Link, useLocation } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  Lightbulb,
  MapPin,
  Search,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import "./ApplicationSuccess.css";

function formatDate(dateValue) {
  if (!dateValue) return null;

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat("fr-SN", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(date);
}

export default function ApplicationSuccess() {
  const location = useLocation();

  const application = location.state?.application || null;
  const job = location.state?.job || null;

  const jobTitle =
    application?.job_title ||
    job?.title ||
    job?.title_job ||
    job?.name ||
    "Offre d'emploi";

  const companyName =
    application?.company_name ||
    job?.company?.name ||
    job?.company_name ||
    job?.company ||
    "Entreprise recruteuse";

  const jobLocation =
    job?.location ||
    job?.city ||
    job?.address ||
    "";

  const applicationDate = formatDate(
    application?.applied_at || new Date().toISOString()
  );

  return (
    <main className="application-success-page">
      <header className="success-header">
        <Link to="/candidate-dashboard" className="success-brand">
          <span className="success-brand-icon">
            <BriefcaseBusiness size={25} />
          </span>

          <span className="success-brand-text">
            <span className="success-brand-name">
              SunuJob <strong>AI</strong>
            </span>
            <span className="success-brand-tagline">
              Votre avenir commence ici
            </span>
          </span>
        </Link>
<Link
  to="/my-applications"
  className="success-button success-button-primary"
>
  <ClipboardCheck size={19} />
  Suivre mes candidatures
  <ArrowRight size={18} />
</Link>

<Link to="/my-applications">
  Mes candidatures
</Link>
      </header>

      <section className="success-main">
        <div className="success-orb success-orb-one" />
        <div className="success-orb success-orb-two" />

        <div className="success-content">
          <div className="success-check">
            <Check size={43} strokeWidth={3} />
          </div>

          <div className="success-eyebrow">
            <Sparkles size={16} />
            Candidature transmise
          </div>

          <h1>
            Bravo, votre candidature
            <span> a bien été envoyée !</span>
          </h1>

          <p className="success-intro">
            Votre prochaine opportunité commence peut-être ici.
            Votre candidature a été enregistrée sur SunuJob AI.
          </p>

          <div className="success-status-pill">
            <CheckCircle2 size={17} />
            Candidature enregistrée
          </div>

          <section className="success-application-card">
            <div className="success-card-heading">
              <div className="success-document-icon">
                <FileText size={27} />
              </div>

              <div className="success-card-title">
                <span className="success-card-overline">
                  RÉCAPITULATIF DE VOTRE CANDIDATURE
                </span>
                <h2>{jobTitle}</h2>
                <p>{companyName}</p>
              </div>

              <div className="success-verified">
                <BadgeCheck size={19} />
              </div>
            </div>

            <div className="success-card-divider" />

            <div className="success-details">
              <div className="success-detail">
                <span className="success-detail-icon">
                  <BriefcaseBusiness size={19} />
                </span>
                <div>
                  <span className="success-detail-label">Entreprise</span>
                  <strong>{companyName}</strong>
                </div>
              </div>

              <div className="success-detail">
                <span className="success-detail-icon">
                  <MapPin size={19} />
                </span>
                <div>
                  <span className="success-detail-label">Localisation</span>
                  <strong>{jobLocation || "Non précisée"}</strong>
                </div>
              </div>

              <div className="success-detail">
                <span className="success-detail-icon">
                  <CalendarDays size={19} />
                </span>
                <div>
                  <span className="success-detail-label">Date d'envoi</span>
                  <strong>{applicationDate || "À confirmer"}</strong>
                </div>
              </div>

              {application?.id && (
                <div className="success-detail">
                  <span className="success-detail-icon">
                    <ClipboardCheck size={19} />
                  </span>
                  <div>
                    <span className="success-detail-label">
                      Référence de candidature
                    </span>
                    <strong>#{application.id}</strong>
                  </div>
                </div>
              )}
            </div>

            <div className="success-next-steps">
              <div className="success-next-icon">
                <ShieldCheck size={24} />
              </div>

              <div>
                <h3>Et maintenant, que se passe-t-il ?</h3>
                <p>
                  Le recruteur pourra examiner votre dossier. Consultez
                  régulièrement votre espace candidat pour suivre
                  l'évolution de votre candidature et les éventuelles
                  notifications.
                </p>
              </div>
            </div>
          </section>

          <div className="success-actions">
            <Link
              to="/candidate-dashboard"
              className="success-button success-button-primary"
            >
              <ClipboardCheck size={19} />
              Suivre mes candidatures
              <ArrowRight size={18} />
            </Link>

            <Link
              to="/jobs"
              className="success-button success-button-secondary"
            >
              <Search size={19} />
              Explorer les offres
            </Link>
          </div>

          <div className="success-reassurance">
            <CheckCircle2 size={17} />
            <span>
              Votre candidature est enregistrée. Bonne chance pour la suite !
            </span>
          </div>
        </div>
      </section>

      <section className="success-advice">
        <div className="success-advice-icon">
          <Lightbulb size={26} />
        </div>

        <div className="success-advice-copy">
          <h3>Un conseil pour la suite</h3>
          <p>
            Continuez à explorer les opportunités et à valoriser vos
            compétences. Chaque candidature est une nouvelle possibilité
            de faire avancer votre carrière.
          </p>
        </div>

        <Link to="/jobs" className="success-advice-link">
          Voir les offres
          <ArrowRight size={17} />
        </Link>
      </section>

      <footer className="success-footer">
        <div className="success-footer-main">
          <Link to="/candidate-dashboard" className="success-footer-brand">
            SunuJob <strong>AI</strong>
          </Link>

          <p>La technologie au service de votre avenir professionnel.</p>
        </div>

        <div className="success-footer-bottom">
          <span>
            © {new Date().getFullYear()} SunuJob AI. Tous droits réservés.
          </span>
          <span>Votre avenir commence ici.</span>
        </div>
      </footer>
    </main>
  );
}
