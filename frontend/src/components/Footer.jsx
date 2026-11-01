
import { Link } from "react-router-dom";
import "./Footer.css";

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="sj-footer">
      <div className="sj-footer-main">
        <div className="sj-footer-grid">
          {/* Identité de la plateforme */}
          <div className="sj-footer-brand-column">
            <Link to="/" className="sj-footer-brand">
              <span className="sj-footer-logo">S<span>✦</span></span>
              <span className="sj-footer-brand-name">
                SunuJob <strong>AI</strong>
              </span>
            </Link>

            <p className="sj-footer-description">
              Une plateforme intelligente pour rapprocher les talents,
              les entreprises et les opportunités professionnelles au Sénégal.
            </p>

            <div className="sj-footer-country">
              <span className="sj-footer-country-dot" />
              Pensé pour les talents du Sénégal
              <span aria-hidden="true">🇸🇳</span>
            </div>
          </div>

          {/* Navigation */}
          <div className="sj-footer-column">
            <h3>Navigation</h3>
            <ul className="sj-footer-links">
              <li>
                <Link to="/">
                  <span aria-hidden="true">→</span> Accueil
                </Link>
              </li>
              <li>
                <Link to="/jobs">
                  <span aria-hidden="true">→</span> Offres d'emploi
                </Link>
              </li>
              <li>
                <Link to="/login">
                  <span aria-hidden="true">→</span> Connexion
                </Link>
              </li>
              <li>
                <Link to="/register">
                  <span aria-hidden="true">→</span> Créer un compte
                </Link>
              </li>
            </ul>
          </div>

          {/* Mission */}
          <div className="sj-footer-mission">
            <div className="sj-footer-mission-icon" aria-hidden="true">
              ✨
            </div>
            <h3>Notre mission</h3>
            <p>
              Simplifier la recherche d'emploi grâce au numérique,
              valoriser les compétences et faciliter la rencontre entre
              candidats et recruteurs.
            </p>
            <Link to="/jobs" className="sj-footer-cta">
              Trouver une opportunité <span aria-hidden="true">↗</span>
            </Link>
          </div>
        </div>

        {/* Bandeau inférieur */}
        <div className="sj-footer-bottom">
          <p>
            © {year} <strong>SunuJob AI</strong>. Tous droits réservés.
          </p>

          <div className="sj-footer-bottom-center">
            <span className="sj-footer-status-dot" />
            Ensemble, construisons votre avenir professionnel.
          </div>

          <p className="sj-footer-made">
            Conçu avec <span aria-label="amour">♥</span> au Sénégal 🇸🇳
          </p>
        </div>
      </div>
    </footer>
  );
}
