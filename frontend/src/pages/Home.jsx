
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";
import "./Home.css";

const features = [
  {
    icon: "✦",
    title: "Matching intelligent par IA",
    description:
      "Découvrez des offres adaptées à vos compétences, votre expérience et vos objectifs professionnels.",
    color: "blue",
  },
  {
    icon: "◈",
    title: "Candidatures centralisées",
    description:
      "Retrouvez vos candidatures au même endroit et suivez leur évolution plus facilement.",
    color: "purple",
  },
  {
    icon: "↗",
    title: "Un profil qui vous valorise",
    description:
      "Présentez vos compétences, votre parcours et vos ambitions pour mieux vous faire connaître.",
    color: "green",
  },
];

const steps = [
  {
    number: "01",
    title: "Créez votre profil",
    description:
      "Renseignez vos compétences, votre formation et vos expériences professionnelles.",
  },
  {
    number: "02",
    title: "Découvrez les opportunités",
    description:
      "Explorez les offres et identifiez celles qui correspondent à votre profil.",
  },
  {
    number: "03",
    title: "Suivez vos candidatures",
    description:
      "Postulez et retrouvez les informations disponibles sur l'avancement de vos démarches.",
  },
];

function formatSalary(job) {
  if (job.salary_display) return job.salary_display;

  if (job.salary_min != null || job.salary_max != null) {
    const min = job.salary_min;
    const max = job.salary_max;

    if (min != null && max != null) {
      return `${Number(min).toLocaleString("fr-FR")} – ${Number(
        max
      ).toLocaleString("fr-FR")} FCFA`;
    }

    const value = min ?? max;
    return `${Number(value).toLocaleString("fr-FR")} FCFA`;
  }

  return "Rémunération à préciser";
}

export default function Home() {
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
          "Impossible de charger les offres sur la page d'accueil :",
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
    window.location.href = query ? `/jobs?${query}` : "/jobs";
  }

  return (
    <main className="home-page">
      {/* HERO */}
      <section className="home-hero">
        <div className="home-hero-content">
          <span className="home-eyebrow">
            <span className="home-eyebrow-dot" />
            LA NOUVELLE GÉNÉRATION DU RECRUTEMENT
          </span>

          <h1>
            Le talent est en vous.
            <br />
            <span>Votre avenir commence ici.</span>
          </h1>

          <p className="home-hero-description">
            Trouvez les opportunités qui vous correspondent, valorisez
            vos compétences et faites avancer votre carrière avec
            SunuJob AI, votre plateforme intelligente de recrutement.
          </p>

          <div className="home-hero-actions">
            <Link to="/jobs" className="home-button home-button-primary">
              Explorer les offres <span aria-hidden="true">→</span>
            </Link>

            <Link to="/register" className="home-button home-button-secondary">
              Créer mon compte
            </Link>
          </div>

          <div className="home-trust-line">
            <span className="home-trust-icon">✓</span>
            Un espace unique pour vos opportunités professionnelles
          </div>
        </div>

        <div className="home-hero-visual" aria-hidden="true">
          <div className="home-orbit home-orbit-one" />
          <div className="home-orbit home-orbit-two" />

          <div className="home-hero-symbol">
            <span className="home-symbol-star">✦</span>
            <div className="home-symbol-core">
              <span>S</span>
              <span>AI</span>
            </div>
            <span className="home-symbol-spark">✧</span>
          </div>

          <div className="home-floating-card home-floating-match">
            <span className="home-floating-icon">✦</span>
            <div>
              <strong>Matching intelligent</strong>
              <small>Des opportunités adaptées à votre profil</small>
            </div>
          </div>

          <div className="home-floating-card home-floating-career">
            <span className="home-career-icon">↗</span>
            <div>
              <strong>Votre carrière</strong>
              <small>De nouvelles perspectives vous attendent</small>
            </div>
          </div>

          <div className="home-hero-decoration home-decoration-one" />
          <div className="home-hero-decoration home-decoration-two" />
        </div>

        <div className="home-hero-bottom">
          <span>Recrutement</span>
          <span className="home-bottom-separator">•</span>
          <span>Intelligence artificielle</span>
          <span className="home-bottom-separator">•</span>
          <span>Opportunités professionnelles</span>
        </div>
      </section>

      {/* RECHERCHE */}
      <section className="home-search-section">
        <div className="home-search-heading">
          <div>
            <span className="home-section-kicker">VOTRE PROCHAINE ÉTAPE</span>
            <h2>Quel emploi recherchez-vous ?</h2>
            <p>Commencez par une compétence, un métier ou une ville.</p>
          </div>
        </div>

        <form className="home-search-form" onSubmit={handleSearch}>
          <label className="home-search-field">
            <span className="home-search-field-icon">⌕</span>
            <span className="home-search-input-wrap">
              <span>Poste ou mot-clé</span>
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Ex. développeur, comptable..."
              />
            </span>
          </label>

          <label className="home-search-field">
            <span className="home-search-field-icon">⌖</span>
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
            Rechercher <span aria-hidden="true">→</span>
          </button>
        </form>
      </section>

      {/* FONCTIONNALITÉS */}
      <section className="home-section home-features-section">
        <div className="home-section-heading">
          <span className="home-section-kicker">UNE EXPÉRIENCE PLUS INTELLIGENTE</span>
          <h2>Le recrutement, autrement.</h2>
          <p>
            Des outils conçus pour simplifier votre recherche d'emploi
            et améliorer votre expérience de recrutement.
          </p>
        </div>

        <div className="home-features-grid">
          {features.map((feature) => (
            <article
              className={`home-feature-card home-feature-${feature.color}`}
              key={feature.title}
            >
              <div className="home-feature-icon">{feature.icon}</div>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
              <Link to="/register" className="home-feature-link">
                Découvrir <span aria-hidden="true">→</span>
              </Link>
            </article>
          ))}
        </div>
      </section>

      {/* OFFRES D'EMPLOI */}
      <section className="home-jobs-section">
        <div className="home-section-heading home-jobs-heading">
          <div>
            <span className="home-section-kicker">LES OPPORTUNITÉS</span>
            <h2>Des offres à découvrir</h2>
            <p>
              Explorez les opportunités publiées sur SunuJob AI.
            </p>
          </div>

          <Link to="/jobs" className="home-text-link">
            Toutes les offres <span aria-hidden="true">→</span>
          </Link>
        </div>

        {loadingJobs ? (
          <div className="home-jobs-message" role="status">
            Chargement des offres disponibles...
          </div>
        ) : jobs.length > 0 ? (
          <div className="home-jobs-grid">
            {jobs.map((job, index) => (
              <article className="home-job-card" key={job.id ?? index}>
                <div className="home-job-card-top">
                  <div className={`home-job-logo home-job-logo-${index % 3}`}>
                    {(job.company_name ||
                      job.company?.name ||
                      "E")[0].toUpperCase()}
                  </div>

                  <span className="home-job-badge">
                    {job.job_type || job.contract_type || "Opportunité"}
                  </span>
                </div>

                <h3>{job.title || "Offre d'emploi"}</h3>

                <p className="home-job-company">
                  {job.company_name ||
                    job.company?.name ||
                    "Entreprise recruteuse"}
                </p>

                <div className="home-job-meta">
                  <span>⌖ {job.location || job.city || "Lieu à préciser"}</span>
                  <span>◷ {formatSalary(job)}</span>
                </div>

                <Link
                  to={`/jobs/${job.id}`}
                  className="home-job-link"
                >
                  Voir l'offre <span aria-hidden="true">→</span>
                </Link>
              </article>
            ))}
          </div>
        ) : (
          <div className="home-jobs-empty">
            <div className="home-empty-icon">⌕</div>
            <h3>Vos prochaines opportunités vous attendent</h3>
            <p>
              Consultez les offres disponibles ou créez votre profil
              pour commencer votre recherche.
            </p>
            <Link to="/jobs" className="home-button home-button-primary">
              Parcourir les offres
            </Link>
          </div>
        )}
      </section>

      {/* COMMENT ÇA MARCHE */}
      <section className="home-section home-steps-section">
        <div className="home-section-heading">
          <span className="home-section-kicker">SIMPLE ET ACCESSIBLE</span>
          <h2>Votre parcours en trois étapes</h2>
          <p>
            Passez de la recherche d'emploi à une candidature organisée,
            à votre rythme.
          </p>
        </div>

        <div className="home-steps-grid">
          {steps.map((step) => (
            <article className="home-step-card" key={step.number}>
              <span className="home-step-number">{step.number}</span>
              <div className="home-step-line" />
              <h3>{step.title}</h3>
              <p>{step.description}</p>
            </article>
          ))}
        </div>
      </section>

      {/* ESPACE RECRUTEUR */}
      <section className="home-recruiter-section">
        <div className="home-recruiter-content">
          <span className="home-section-kicker">
            VOUS RECRUTEZ ?
          </span>
          <h2>Rencontrez les talents qui feront la différence.</h2>
          <p>
            Présentez vos opportunités, centralisez les candidatures
            et facilitez le suivi de vos recrutements depuis un espace
            conçu pour les recruteurs.
          </p>

          <Link
            to="/register"
            className="home-button home-button-white"
          >
            Rejoindre SunuJob AI <span aria-hidden="true">→</span>
          </Link>
        </div>

        <div className="home-recruiter-visual" aria-hidden="true">
          <div className="home-recruiter-circle">
            <span>✦</span>
          </div>
          <div className="home-recruiter-mini-card">
            <span className="home-recruiter-mini-icon">✓</span>
            <div>
              <strong>Un recrutement organisé</strong>
              <small>Offres, profils et candidatures</small>
            </div>
          </div>
        </div>
      </section>

      {/* APPEL À L'ACTION */}
      <section className="home-final-cta">
        <div>
          <span className="home-section-kicker">LE PROCHAIN CHAPITRE COMMENCE ICI</span>
          <h2>Prêt à donner un nouvel élan à votre carrière ?</h2>
          <p>
            Créez votre compte et commencez à explorer les possibilités
            qui correspondent à vos ambitions.
          </p>
        </div>

        <div className="home-final-actions">
          <Link to="/register" className="home-button home-button-primary">
            Créer mon compte <span aria-hidden="true">→</span>
          </Link>
          <Link to="/jobs" className="home-final-link">
            Voir les offres
          </Link>
        </div>
      </section>
    </main>
  );
}
