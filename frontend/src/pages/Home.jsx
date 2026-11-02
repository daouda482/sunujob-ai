
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Search,
  MapPin,
  BriefcaseBusiness,
  Building2,
  FileText,
  Users,
  ArrowRight,
  CheckCircle2,
  UserRound,
  ClipboardList,
  BrainCircuit,
  GraduationCap,
  ShieldCheck,
  ChevronRight,
} from "lucide-react";
import api from "../api/axios";
import "./Home.css";

const features = [
  {
    icon: BrainCircuit,
    title: "Matching intelligent",
    description:
      "Identifiez les opportunités correspondant à vos compétences, votre expérience et vos objectifs.",
  },
  {
    icon: ClipboardList,
    title: "Suivi des candidatures",
    description:
      "Centralisez vos démarches et consultez l'évolution de vos candidatures depuis votre espace.",
  },
  {
    icon: UserRound,
    title: "Profil professionnel",
    description:
      "Mettez en valeur votre parcours, vos qualifications et vos compétences auprès des recruteurs.",
  },
];

const steps = [
  {
    number: "01",
    title: "Créez votre compte",
    description:
      "Inscrivez-vous et complétez votre profil avec vos informations professionnelles.",
  },
  {
    number: "02",
    title: "Trouvez une opportunité",
    description:
      "Consultez les offres publiées et identifiez celles qui correspondent à votre parcours.",
  },
  {
    number: "03",
    title: "Postulez et suivez",
    description:
      "Envoyez votre candidature et suivez son évolution depuis votre espace personnel.",
  },
];

function formatSalary(job) {
  if (job.salary_display) return job.salary_display;

  if (job.salary_min != null || job.salary_max != null) {
    const min = job.salary_min;
    const max = job.salary_max;
    const format = (value) => Number(value).toLocaleString("fr-FR");

    if (min != null && max != null) {
      return `${format(min)} – ${format(max)} FCFA`;
    }

    return `${format(min ?? max)} FCFA`;
  }

  return "Rémunération à préciser";
}

function getCompanyName(job) {
  return (
    job.company_name ||
    job.company?.name ||
    job.recruiter_company?.name ||
    "Entreprise recruteuse"
  );
}

export default function Home() {
  const navigate = useNavigate();

  const [jobs, setJobs] = useState([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [search, setSearch] = useState("");
  const [location, setLocation] = useState("");

  useEffect(() => {
    let active = true;

    async function loadJobs() {
      try {
        const response = await api.get("jobs/published/");
        const data = response.data;

        const list = Array.isArray(data)
          ? data
          : Array.isArray(data?.results)
            ? data.results
            : Array.isArray(data?.jobs)
              ? data.jobs
              : [];

        if (active) setJobs(list.slice(0, 3));
      } catch (error) {
        console.warn(
          "Impossible de charger les offres :",
          error.response?.status || error.message
        );
        if (active) setJobs([]);
      } finally {
        if (active) setLoadingJobs(false);
      }
    }

    loadJobs();

    return () => {
      active = false;
    };
  }, []);

  function handleSearch(event) {
    event.preventDefault();

    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    if (location.trim()) params.set("location", location.trim());

    const query = params.toString();
    navigate(query ? `/jobs?${query}` : "/jobs");
  }

  return (
    <main className="home-page">
      <section className="home-hero">
        <div className="home-hero-inner">
          <div className="home-hero-content">
            <div className="home-eyebrow">
              <span className="home-eyebrow-line" />
              LA PLATEFORME DE RECRUTEMENT AU SÉNÉGAL
            </div>

            <h1>
              Les bonnes opportunités.
              <span> Les bons talents.</span>
            </h1>

            <p className="home-hero-description">
              SunuJob AI facilite la rencontre entre les candidats et les
              recruteurs. Trouvez un emploi, valorisez vos compétences et
              gérez vos recrutements depuis une seule plateforme.
            </p>

            <div className="home-hero-actions">
              <Link to="/jobs" className="home-button home-button-primary">
                Consulter les offres <ArrowRight size={17} />
              </Link>
              <Link to="/register" className="home-button home-button-outline">
                Créer un compte
              </Link>
            </div>

            <div className="home-trust-line">
              <ShieldCheck size={17} />
              Une plateforme dédiée aux parcours professionnels
            </div>
          </div>

          <div className="home-hero-panel">
            <div className="home-panel-header">
              <div>
                <span className="home-panel-overline">SUNUJOB AI</span>
                <h2>Votre espace carrière</h2>
              </div>
              <BriefcaseBusiness size={23} />
            </div>

            <div className="home-panel-divider" />

            <div className="home-panel-item">
              <span className="home-panel-icon">
                <Search size={19} />
              </span>
              <div>
                <strong>Recherche d'emploi</strong>
                <small>Explorez les offres publiées</small>
              </div>
              <ChevronRight size={17} />
            </div>

            <div className="home-panel-item">
              <span className="home-panel-icon">
                <FileText size={19} />
              </span>
              <div>
                <strong>Profil et CV</strong>
                <small>Présentez votre expérience</small>
              </div>
              <ChevronRight size={17} />
            </div>

            <div className="home-panel-item">
              <span className="home-panel-icon">
                <ClipboardList size={19} />
              </span>
              <div>
                <strong>Candidatures</strong>
                <small>Suivez vos démarches</small>
              </div>
              <ChevronRight size={17} />
            </div>

            <div className="home-panel-footer">
              <CheckCircle2 size={16} />
              Un parcours professionnel mieux organisé
            </div>
          </div>
        </div>

        <div className="home-hero-bottom">
          <span>EMPLOI</span>
          <span>RECRUTEMENT</span>
          <span>GESTION DES CANDIDATURES</span>
          <span>INTELLIGENCE ARTIFICIELLE</span>
        </div>
      </section>

      <section className="home-search-section">
        <div className="home-search-heading">
          <div>
            <span className="home-section-kicker">RECHERCHE D'OPPORTUNITÉS</span>
            <h2>Trouvez votre prochain emploi</h2>
            <p>Recherchez par métier, compétence ou localisation.</p>
          </div>
        </div>

        <form className="home-search-form" onSubmit={handleSearch}>
          <label className="home-search-field">
            <Search size={20} />
            <span className="home-search-input-wrap">
              <span>Poste, métier ou mot-clé</span>
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Ex. développeur, comptable..."
              />
            </span>
          </label>

          <label className="home-search-field">
            <MapPin size={20} />
            <span className="home-search-input-wrap">
              <span>Localisation</span>
              <input
                type="text"
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                placeholder="Ex. Dakar, Thiès..."
              />
            </span>
          </label>

          <button className="home-button home-button-primary" type="submit">
            Rechercher <Search size={17} />
          </button>
        </form>
      </section>

      <section className="home-section home-features-section">
        <div className="home-section-heading">
          <span className="home-section-kicker">UNE PLATEFORME, PLUSIEURS SERVICES</span>
          <h2>Des outils pour chaque étape du recrutement</h2>
          <p>
            Des fonctionnalités pensées pour simplifier les démarches des
            candidats et accompagner le travail des recruteurs.
          </p>
        </div>

        <div className="home-features-grid">
          {features.map((feature) => {
            const Icon = feature.icon;

            return (
              <article className="home-feature-card" key={feature.title}>
                <div className="home-feature-icon">
                  <Icon size={23} strokeWidth={1.8} />
                </div>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
                <Link to="/register" className="home-feature-link">
                  En savoir plus <ArrowRight size={16} />
                </Link>
              </article>
            );
          })}
        </div>
      </section>

      <section className="home-jobs-section">
        <div className="home-section-heading home-jobs-heading">
          <div>
            <span className="home-section-kicker">OPPORTUNITÉS PROFESSIONNELLES</span>
            <h2>Offres d'emploi récentes</h2>
            <p>Découvrez les dernières opportunités publiées sur la plateforme.</p>
          </div>
          <Link to="/jobs" className="home-text-link">
            Toutes les offres <ArrowRight size={16} />
          </Link>
        </div>

        {loadingJobs ? (
          <div className="home-jobs-message" role="status">
            Chargement des offres disponibles...
          </div>
        ) : jobs.length > 0 ? (
          <div className="home-jobs-grid">
            {jobs.map((job) => (
              <article className="home-job-card" key={job.id}>
                <div className="home-job-card-top">
                  <div className="home-job-company-icon">
                    <Building2 size={22} />
                  </div>
                  <span className="home-job-badge">
                    {job.job_type || job.contract_type || "Opportunité"}
                  </span>
                </div>

                <h3>{job.title || "Offre d'emploi"}</h3>
                <p className="home-job-company">{getCompanyName(job)}</p>

                <div className="home-job-meta">
                  <span><MapPin size={15} /> {job.location || job.city || "Lieu à préciser"}</span>
                  <span><BriefcaseBusiness size={15} /> {formatSalary(job)}</span>
                </div>

                <Link to={`/jobs/${job.id}`} className="home-job-link">
                  Consulter l'offre <ArrowRight size={16} />
                </Link>
              </article>
            ))}
          </div>
        ) : (
          <div className="home-jobs-empty">
            <BriefcaseBusiness size={30} />
            <h3>Aucune offre à afficher pour le moment</h3>
            <p>
              De nouvelles opportunités seront publiées prochainement.
              Vous pouvez consulter la liste complète des offres.
            </p>
            <Link to="/jobs" className="home-button home-button-primary">
              Parcourir les offres <ArrowRight size={16} />
            </Link>
          </div>
        )}
      </section>

      <section className="home-section home-steps-section">
        <div className="home-section-heading">
          <span className="home-section-kicker">COMMENT ÇA FONCTIONNE</span>
          <h2>Un parcours simple et structuré</h2>
          <p>
            Quelques étapes suffisent pour commencer votre recherche
            d'opportunités professionnelles.
          </p>
        </div>

        <div className="home-steps-grid">
          {steps.map((step) => (
            <article className="home-step-card" key={step.number}>
              <span className="home-step-number">{step.number}</span>
              <h3>{step.title}</h3>
              <p>{step.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="home-recruiter-section">
        <div className="home-recruiter-content">
          <span className="home-section-kicker">ESPACE ENTREPRISE</span>
          <h2>Vous recrutez ? Gérez vos candidatures efficacement.</h2>
          <p>
            Publiez vos offres, consultez les profils reçus et organisez
            le suivi de vos recrutements depuis un espace dédié aux entreprises.
          </p>
          <Link to="/register" className="home-button home-button-white">
            Accéder à la plateforme <ArrowRight size={17} />
          </Link>
        </div>

        <div className="home-recruiter-details">
          <div>
            <Building2 size={21} />
            <span>Gestion des offres d'emploi</span>
          </div>
          <div>
            <Users size={21} />
            <span>Consultation des candidatures</span>
          </div>
          <div>
            <GraduationCap size={21} />
            <span>Suivi des profils et compétences</span>
          </div>
        </div>
      </section>

      <section className="home-final-cta">
        <div>
          <span className="home-section-kicker">REJOIGNEZ SUNUJOB AI</span>
          <h2>Donnez une nouvelle dimension à votre parcours professionnel.</h2>
          <p>
            Créez votre compte pour accéder aux opportunités et aux outils
            de recrutement de la plateforme.
          </p>
        </div>

        <div className="home-final-actions">
          <Link to="/register" className="home-button home-button-primary">
            Créer mon compte <ArrowRight size={17} />
          </Link>
          <Link to="/jobs" className="home-final-link">
            Consulter les offres
          </Link>
        </div>
      </section>
    </main>
  );
}
