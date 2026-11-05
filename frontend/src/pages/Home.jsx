
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
  GraduationCap,
  ShieldCheck,
  ChevronRight,
  Target,
  UserCheck,
  FolderCheck,
  TrendingUp,
  Clock3,
  BadgeCheck,
} from "lucide-react";
import api from "../api/axios";
import "./Home.css";

const features = [
  {
    icon: Target,
    title: "Des opportunités adaptées",
    description:
      "Découvrez des offres correspondant à vos compétences, votre expérience et vos objectifs professionnels.",
    link: "/jobs",
    linkText: "Découvrir les offres",
  },
  {
    icon: ClipboardList,
    title: "Suivi des candidatures",
    description:
      "Centralisez vos démarches et consultez facilement l'évolution de vos candidatures depuis votre espace.",
    link: "/login",
    linkText: "Suivre mes candidatures",
  },
  {
    icon: UserCheck,
    title: "Profil professionnel",
    description:
      "Valorisez votre parcours, vos diplômes et vos compétences auprès des entreprises qui recrutent.",
    link: "/register",
    linkText: "Créer mon profil",
  },
];

const steps = [
  {
    number: "01",
    icon: UserRound,
    title: "Créez votre compte",
    description:
      "Inscrivez-vous gratuitement et renseignez vos informations professionnelles.",
  },
  {
    number: "02",
    icon: Search,
    title: "Trouvez une opportunité",
    description:
      "Explorez les offres disponibles et choisissez celles qui correspondent à votre profil.",
  },
  {
    number: "03",
    icon: FolderCheck,
    title: "Postulez et suivez",
    description:
      "Envoyez votre candidature et suivez son évolution depuis votre espace personnel.",
  },
];

function formatSalary(job) {
  if (job.salary_display) return job.salary_display;

  if (job.salary_min != null || job.salary_max != null) {
    const format = (value) => Number(value).toLocaleString("fr-FR");
    const min = job.salary_min;
    const max = job.salary_max;

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

function getJobType(job) {
  return job.job_type || job.contract_type || "Opportunité";
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

        if (active) {
          setJobs(list.slice(0, 3));
        }
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

      {/* HERO */}
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
                Consulter les offres
                <ArrowRight size={18} />
              </Link>

              <Link to="/register" className="home-button home-button-outline">
                Créer un compte
              </Link>
            </div>

            <div className="home-trust-line">
              <ShieldCheck size={18} />
              Une plateforme dédiée aux parcours professionnels
            </div>
          </div>

          <div className="home-hero-visual">
            <div className="home-hero-photo">
              <div className="home-photo-overlay">
                <span className="home-photo-label">
                  VOTRE AVENIR PROFESSIONNEL
                </span>
                <h2>Chaque talent mérite une opportunité.</h2>
                <p>
                  Trouvez votre place dans le monde professionnel.
                </p>
              </div>
            </div>

            <div className="home-floating-card home-floating-card-top">
              <span className="home-floating-icon">
                <BriefcaseBusiness size={20} />
              </span>
              <span>
                <strong>Opportunités</strong>
                <small>Explorez les offres</small>
              </span>
              <CheckCircle2 size={18} className="home-floating-check" />
            </div>

            <div className="home-floating-card home-floating-card-bottom">
              <span className="home-floating-icon home-floating-icon-green">
                <UserCheck size={20} />
              </span>
              <span>
                <strong>Profil professionnel</strong>
                <small>Valorisez vos compétences</small>
              </span>
            </div>
          </div>
        </div>

        <div className="home-hero-bottom">
          <span><BriefcaseBusiness size={15} /> EMPLOI</span>
          <span><Building2 size={15} /> RECRUTEMENT</span>
          <span><FileText size={15} /> CANDIDATURES</span>
          <span><Users size={15} /> TALENTS ET ENTREPRISES</span>
        </div>
      </section>

      {/* RECHERCHE */}
      <section className="home-search-section">
        <div className="home-search-heading">
          <span className="home-section-kicker">
            RECHERCHE D'OPPORTUNITÉS
          </span>
          <h2>Trouvez votre prochain emploi</h2>
          <p>
            Recherchez par métier, compétence ou localisation.
          </p>
        </div>

        <form className="home-search-form" onSubmit={handleSearch}>
          <label className="home-search-field">
            <Search size={21} />

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
            <MapPin size={21} />

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

          <button
            className="home-button home-button-primary home-search-button"
            type="submit"
          >
            Rechercher
            <Search size={18} />
          </button>
        </form>
      </section>

      {/* FONCTIONNALITÉS */}
      <section className="home-section home-features-section" id="fonctionnalites">
        <div className="home-section-heading">
          <span className="home-section-kicker">
            UNE PLATEFORME, PLUSIEURS SERVICES
          </span>

          <h2>Des outils pour chaque étape du recrutement</h2>

          <p>
            Des fonctionnalités pensées pour simplifier les démarches
            des candidats et accompagner le travail des recruteurs.
          </p>
        </div>

        <div className="home-features-grid">
          {features.map((feature) => {
            const Icon = feature.icon;

            return (
              <article className="home-feature-card" key={feature.title}>
                <div className="home-feature-icon">
                  <Icon size={25} strokeWidth={1.8} />
                </div>

                <h3>{feature.title}</h3>
                <p>{feature.description}</p>

                <Link to={feature.link} className="home-feature-link">
                  {feature.linkText}
                  <ArrowRight size={16} />
                </Link>
              </article>
            );
          })}
        </div>
      </section>

      {/* OFFRES RÉCENTES */}
      <section className="home-jobs-section">
        <div className="home-section-heading home-jobs-heading">
          <div>
            <span className="home-section-kicker">
              OPPORTUNITÉS PROFESSIONNELLES
            </span>

            <h2>Offres d'emploi récentes</h2>

            <p>
              Découvrez les dernières opportunités publiées sur la plateforme.
            </p>
          </div>

          <Link to="/jobs" className="home-text-link">
            Toutes les offres
            <ArrowRight size={17} />
          </Link>
        </div>

        {loadingJobs ? (
          <div className="home-jobs-message" role="status">
            <span className="home-loader" />
            Chargement des offres disponibles...
          </div>
        ) : jobs.length > 0 ? (
          <div className="home-jobs-grid">
            {jobs.map((job) => (
              <article className="home-job-card" key={job.id}>
                <div className="home-job-card-top">
                  <div className="home-job-company-icon">
                    <Building2 size={23} />
                  </div>

                  <span className="home-job-badge">
                    {getJobType(job)}
                  </span>
                </div>

                <h3>{job.title || "Offre d'emploi"}</h3>

                <p className="home-job-company">
                  <Building2 size={15} />
                  {getCompanyName(job)}
                </p>

                <div className="home-job-meta">
                  <span>
                    <MapPin size={15} />
                    {job.location || job.city || "Lieu à préciser"}
                  </span>

                  <span>
                    <BriefcaseBusiness size={15} />
                    {formatSalary(job)}
                  </span>
                </div>

                <Link to={`/jobs/${job.id}`} className="home-job-link">
                  Consulter l'offre
                  <ArrowRight size={16} />
                </Link>
              </article>
            ))}
          </div>
        ) : (
          <div className="home-jobs-empty">
            <div className="home-empty-icon">
              <BriefcaseBusiness size={30} />
            </div>

            <h3>Aucune offre à afficher pour le moment</h3>

            <p>
              De nouvelles opportunités seront publiées prochainement.
              Consultez la liste complète des offres disponibles.
            </p>

            <Link to="/jobs" className="home-button home-button-primary">
              Parcourir les offres
              <ArrowRight size={17} />
            </Link>
          </div>
        )}
      </section>

      {/* ÉTAPES */}
      <section className="home-section home-steps-section">
        <div className="home-section-heading">
          <span className="home-section-kicker">
            COMMENT ÇA FONCTIONNE
          </span>

          <h2>Un parcours simple et structuré</h2>

          <p>
            Quelques étapes suffisent pour commencer votre recherche
            d'opportunités professionnelles.
          </p>
        </div>

        <div className="home-steps-grid">
          {steps.map((step) => {
            const Icon = step.icon;

            return (
              <article className="home-step-card" key={step.number}>
                <div className="home-step-top">
                  <span className="home-step-number">{step.number}</span>
                  <span className="home-step-icon">
                    <Icon size={22} />
                  </span>
                </div>

                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </article>
            );
          })}
        </div>
      </section>

      {/* ESPACE RECRUTEUR */}
      <section className="home-recruiter-section" id="apropos">
        <div className="home-recruiter-content">
          <span className="home-section-kicker">
            <Building2 size={15} />
            ESPACE ENTREPRISE
          </span>

          <h2>Vous recrutez ? Trouvez les talents qu'il vous faut.</h2>

          <p>
            Publiez vos offres, consultez les profils reçus et organisez
            le suivi de vos recrutements depuis un espace dédié aux entreprises.
          </p>

          <Link to="/register" className="home-button home-button-white">
            Accéder à la plateforme
            <ArrowRight size={17} />
          </Link>
        </div>

        <div className="home-recruiter-details">
          <div>
            <span><BriefcaseBusiness size={21} /></span>
            <strong>Gestion des offres d'emploi</strong>
          </div>

          <div>
            <span><Users size={21} /></span>
            <strong>Consultation des candidatures</strong>
          </div>

          <div>
            <span><GraduationCap size={21} /></span>
            <strong>Suivi des profils et compétences</strong>
          </div>

          <div>
            <span><TrendingUp size={21} /></span>
            <strong>Organisation du recrutement</strong>
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="home-final-cta">
        <div className="home-final-icon">
          <BadgeCheck size={28} />
        </div>

        <div className="home-final-content">
          <span className="home-section-kicker">
            REJOIGNEZ SUNUJOB AI
          </span>

          <h2>
            Donnez une nouvelle dimension à votre parcours professionnel.
          </h2>

          <p>
            Créez votre compte pour accéder aux opportunités et aux outils
            de recrutement de la plateforme.
          </p>
        </div>

        <div className="home-final-actions">
          <Link to="/register" className="home-button home-button-primary">
            Créer mon compte
            <ArrowRight size={17} />
          </Link>

          <Link to="/jobs" className="home-final-link">
            Consulter les offres
            <ChevronRight size={17} />
          </Link>
        </div>
      </section>

    </main>
  );
}
