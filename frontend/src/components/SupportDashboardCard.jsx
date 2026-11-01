
import { Link } from "react-router-dom";
import {
  LifeBuoy,
  MessageCircle,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import "./SupportDashboardCard.css";

export default function SupportDashboardCard() {
  return (
    <section className="support-dashboard-card">
      <div className="support-dashboard-card__icon">
        <LifeBuoy size={29} />
      </div>

      <div className="support-dashboard-card__content">
        <span className="support-dashboard-card__eyebrow">
          BESOIN D'ASSISTANCE ?
        </span>

        <h2>Centre de support</h2>

        <p>
          Une difficulté sur SunuJob AI ? Envoyez une demande à notre
          équipe, suivez son traitement et consultez les réponses
          de l'administrateur depuis votre espace personnel.
        </p>

        <div className="support-dashboard-card__features">
          <span>
            <MessageCircle size={16} />
            Mes demandes
          </span>

          <span>
            <ShieldCheck size={16} />
            Assistance personnalisée
          </span>
        </div>

        <Link
          to="/support"
          className="support-dashboard-card__button"
        >
          Accéder au support
          <ArrowRight size={18} />
        </Link>
      </div>
    </section>
  );
}
