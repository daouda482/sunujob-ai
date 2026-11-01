
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Search,
  MapPin,
  BriefcaseBusiness,
  Clock3,
  Building2,
  SlidersHorizontal,
  RefreshCw,
  ArrowRight,
  X,
  Sparkles,
  GraduationCap,
  CalendarDays,
  Banknote,
  SearchX,
} from "lucide-react";

import api from "../api/axios";
import "./Jobs.css";

function extractJobs(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.jobs)) return data.jobs;
  return [];
}

function formatDate(value) {
  if (!value) return "Date non précisée";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Date non disponible";

  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatSalary(min, max) {
  const formatter = new Intl.NumberFormat("fr-FR");

  if (min && max) {
    return `${formatter.format(min)} – ${formatter.format(max)} FCFA`;
  }

  if (min) return `À partir de ${formatter.format(min)} FCFA`;
  if (max) return `Jusqu'à ${formatter.format(max)} FCFA`;

  return "Salaire non précisé";
}

function getCompany(job) {
  if (typeof job.company_name === "string" && job.company_name.trim()) {
    return job.company_name;
  }

  if (typeof job.company === "string" && job.company.trim()) {
    return job.company;
  }

  if (job.company && typeof job.company === "object") {
    return (
      job.company.name ||
      job.company.company_name ||
      "Entreprise"
    );
  }

  return "Entreprise";
}

function getInitials(name) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase() || "E";
}

function getContractLabel(value) {
  const labels = {
    CDI: "CDI",
    CDD: "CDD",
    STAGE: "Stage",
    INTERNSHIP: "Stage",
    FREELANCE: "Freelance",
    TEMPORARY: "Temporaire",
    ALTERNANCE: "Alternance",
    CONTRACT: "Contractuel",
  };

  return labels[String(value || "").toUpperCase()] || value || "Non précisé";
}

function getSkills(value) {
  if (Array.isArray(value)) return value;

  if (typeof value === "string") {
    return value
      .split(/[,;\n]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

export default function Jobs() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [location, setLocation] = useState("");
  const [contract, setContract] = useState("");
  const [sector, setSector] = useState("");
  const [sort, setSort] = useState("recent");

  useEffect(() => {
    let active = true;

    async function loadJobs() {
      setLoading(true);
      setError("");

      try {
        const response = await api.get("jobs/published/");

        if (active) {
          setJobs(extractJobs(response.data));
        }
      } catch (err) {
        console.error("Erreur chargement des offres :", err);

        if (active) {
          if (!err.response) {
            setError(
              "Impossible de contacter le serveur. Vérifiez que Django est démarré."
            );
          } else if (err.response.status === 404) {
            setError("Le service des offres est introuvable.");
          } else {
            setError(
              err.response.data?.detail ||
              "Une erreur est survenue lors du chargement des offres."
            );
          }
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadJobs();

    return () => {
      active = false;
    };
  }, []);

  const sectors = useMemo(() => {
    return [
      ...new Set(
        jobs
          .map((job) => job.sector)
          .filter((value) => typeof value === "string" && value.trim())
      ),
    ].sort((a, b) => a.localeCompare(b, "fr"));
  }, [jobs]);

  const filteredJobs = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    const normalizedLocation = location.trim().toLowerCase();

    let result = jobs.filter((job) => {
      const company = getCompany(job);

      const searchableText = [
        job.title,
        company,
        job.description,
        job.sector,
        job.location,
        ...getSkills(job.skills_required),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        !normalizedSearch || searchableText.includes(normalizedSearch);

      const matchesLocation =
        !normalizedLocation ||
        String(job.location || "")
          .toLowerCase()
          .includes(normalizedLocation);

      const matchesContract =
        !contract ||
        String(job.contract_type || "").toUpperCase() ===
          contract.toUpperCase();

      const matchesSector =
        !sector || job.sector === sector;

      return (
        matchesSearch &&
        matchesLocation &&
        matchesContract &&
        matchesSector
      );
    });

    result = [...result].sort((a, b) => {
      if (sort === "oldest") {
        return new Date(a.created_at || 0) - new Date(b.created_at || 0);
      }

      if (sort === "title") {
        return String(a.title || "").localeCompare(
          String(b.title || ""),
          "fr"
        );
      }

      return new Date(b.created_at || 0) - new Date(a.created_at || 0);
    });

    return result;
  }, [jobs, search, location, contract, sector, sort]);

  function resetFilters() {
    setSearch("");
    setLocation("");
    setContract("");
    setSector("");
    setSort("recent");
  }

  const hasFilters = search || location || contract || sector;

  return (
    <main className="sj-jobs-page">
      <section className="sj-jobs-hero">
        <div className="sj-jobs-hero-decoration sj-decoration-one" />
        <div className="sj-jobs-hero-decoration sj-decoration-two" />

        <div className="sj-jobs-container sj-jobs-hero-content">
          <div className="sj-jobs-hero-copy">
            <span className="sj-jobs-eyebrow">
              <Sparkles size={15} />
              SUNUJOB AI · OPPORTUNITÉS PROFESSIONNELLES
            </span>

            <h1>
              Trouvez l'emploi
              <br />
              qui donne du sens à <span>votre avenir.</span>
            </h1>

            <p>
              Explorez les opportunités professionnelles au Sénégal,
              découvrez les entreprises qui recrutent et faites avancer
              votre carrière.
            </p>

            <div className="sj-jobs-hero-points">
              <span>
                <i /> Offres actualisées
              </span>
              <span>
                <i /> Candidature simplifiée
              </span>
              <span>
                <i /> Opportunités au Sénégal
              </span>
            </div>
          </div>

          <div className="sj-jobs-hero-visual" aria-hidden="true">
            <div className="sj-visual-main">
              <div className="sj-visual-icon">
                <BriefcaseBusiness size={48} />
              </div>
              <span>Votre prochaine opportunité</span>
              <strong>Commence ici.</strong>
              <div className="sj-visual-line" />
              <div className="sj-visual-mini-row">
                <span />
                <span />
                <span />
              </div>
            </div>

            <div className="sj-visual-floating">
              <Sparkles size={17} />
              <span>Votre carrière évolue</span>
            </div>
          </div>
        </div>
      </section>

      <section className="sj-jobs-container sj-jobs-search-section">
        <div className="sj-jobs-search-card">
          <div className="sj-search-field sj-search-keyword">
            <Search size={20} />
            <div>
              <label htmlFor="sj-search">Que recherchez-vous ?</label>
              <input
                id="sj-search"
                type="search"
                placeholder="Intitulé du poste, entreprise, compétence..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
          </div>

          <div className="sj-search-divider" />

          <div className="sj-search-field">
            <MapPin size={20} />
            <div>
              <label htmlFor="sj-location">Localisation</label>
              <input
                id="sj-location"
                type="text"
                placeholder="Ex. Dakar, Thiès..."
                value={location}
                onChange={(event) => setLocation(event.target.value)}
              />
            </div>
          </div>

          <button
            className="sj-search-button"
            type="button"
            onClick={() => document.getElementById("sj-job-results")?.scrollIntoView({
              behavior: "smooth",
            })}
          >
            <Search size={18} />
            Rechercher
          </button>
        </div>
      </section>

      <section className="sj-jobs-container sj-jobs-results-section" id="sj-job-results">
        <div className="sj-jobs-section-heading">
          <div>
            <span className="sj-section-kicker">LES OPPORTUNITÉS</span>
            <h2>Offres d'emploi disponibles</h2>
            <p>
              Découvrez les postes publiés par les entreprises et trouvez
              celui qui correspond à vos compétences.
            </p>
          </div>

          <div className="sj-jobs-count">
            <BriefcaseBusiness size={18} />
            <strong>{filteredJobs.length}</strong>
            <span>
              {filteredJobs.length > 1 ? "offres trouvées" : "offre trouvée"}
            </span>
          </div>
        </div>

        <div className="sj-jobs-toolbar">
          <div className="sj-filter-title">
            <SlidersHorizontal size={18} />
            <strong>Affiner la recherche</strong>
          </div>

          <div className="sj-filter-controls">
            <select
              aria-label="Filtrer par type de contrat"
              value={contract}
              onChange={(event) => setContract(event.target.value)}
            >
              <option value="">Tous les contrats</option>
              <option value="CDI">CDI</option>
              <option value="CDD">CDD</option>
              <option value="STAGE">Stage</option>
              <option value="FREELANCE">Freelance</option>
              <option value="ALTERNANCE">Alternance</option>
            </select>

            <select
              aria-label="Filtrer par secteur"
              value={sector}
              onChange={(event) => setSector(event.target.value)}
            >
              <option value="">Tous les secteurs</option>
              {sectors.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>

            <select
              aria-label="Trier les offres"
              value={sort}
              onChange={(event) => setSort(event.target.value)}
            >
              <option value="recent">Plus récentes</option>
              <option value="oldest">Plus anciennes</option>
              <option value="title">Ordre alphabétique</option>
            </select>
          </div>
        </div>

        {hasFilters && (
          <div className="sj-active-filters">
            <span>Filtres actifs :</span>

            {search && (
              <button type="button" onClick={() => setSearch("")}>
                Recherche : {search} <X size={13} />
              </button>
            )}

            {location && (
              <button type="button" onClick={() => setLocation("")}>
                {location} <X size={13} />
              </button>
            )}

            {contract && (
              <button type="button" onClick={() => setContract("")}>
                {getContractLabel(contract)} <X size={13} />
              </button>
            )}

            {sector && (
              <button type="button" onClick={() => setSector("")}>
                {sector} <X size={13} />
              </button>
            )}

            <button
              type="button"
              className="sj-reset-filters"
              onClick={resetFilters}
            >
              Tout effacer
            </button>
          </div>
        )}

        {loading ? (
          <div className="sj-jobs-loading">
            <RefreshCw className="sj-spin" size={30} />
            <strong>Chargement des opportunités...</strong>
            <p>Nous récupérons les offres disponibles.</p>
          </div>
        ) : error ? (
          <div className="sj-jobs-message sj-jobs-error">
            <div className="sj-message-icon">
              <RefreshCw size={25} />
            </div>
            <h3>Impossible de charger les offres</h3>
            <p>{error}</p>
            <button type="button" onClick={() => window.location.reload()}>
              Réessayer
            </button>
          </div>
        ) : filteredJobs.length === 0 ? (
          <div className="sj-jobs-message">
            <div className="sj-message-icon">
              <SearchX size={30} />
            </div>
            <h3>Aucune offre ne correspond à votre recherche</h3>
            <p>
              Essayez de modifier les mots-clés ou de supprimer certains
              filtres pour découvrir d'autres opportunités.
            </p>
            <button type="button" onClick={resetFilters}>
              Réinitialiser les filtres
            </button>
          </div>
        ) : (
          <div className="sj-jobs-grid">
            {filteredJobs.map((job) => {
              const company = getCompany(job);
              const skills = getSkills(job.skills_required);

              return (
                <article className="sj-job-card" key={job.id}>
                  <div className="sj-job-card-top">
                    <div className="sj-company-avatar">
                      {getInitials(company)}
                    </div>

                    <span className="sj-job-contract">
                      {getContractLabel(job.contract_type)}
                    </span>
                  </div>

                  <div className="sj-job-company">
                    <Building2 size={14} />
                    {company}
                  </div>

                  <h3>
                    <Link to={`/jobs/${job.id}`}>
                      {job.title || "Offre sans intitulé"}
                    </Link>
                  </h3>

                  <div className="sj-job-location">
                    <MapPin size={15} />
                    <span>{job.location || "Localisation non précisée"}</span>
                  </div>

                  <p className="sj-job-description">
                    {job.description
                      ? `${job.description.slice(0, 145)}${
                          job.description.length > 145 ? "..." : ""
                        }`
                      : "Consultez les détails de cette opportunité professionnelle."}
                  </p>

                  {skills.length > 0 && (
                    <div className="sj-job-skills">
                      {skills.slice(0, 3).map((skill, index) => (
                        <span key={`${skill}-${index}`}>{skill}</span>
                      ))}

                      {skills.length > 3 && (
                        <span className="sj-more-skills">
                          +{skills.length - 3}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="sj-job-card-info">
                    <div>
                      <Banknote size={16} />
                      <span>
                        {formatSalary(job.salary_min, job.salary_max)}
                      </span>
                    </div>

                    <div>
                      <GraduationCap size={16} />
                      <span>
                        {job.education_level || "Formation non précisée"}
                      </span>
                    </div>
                  </div>

                  <div className="sj-job-card-footer">
                    <span className="sj-job-date">
                      <CalendarDays size={14} />
                      {formatDate(job.created_at)}
                    </span>

                    <Link
                      to={`/jobs/${job.id}`}
                      className="sj-job-details-link"
                      aria-label={`Voir les détails de ${job.title}`}
                    >
                      Voir l'offre
                      <ArrowRight size={16} />
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {!loading && !error && filteredJobs.length > 0 && (
          <div className="sj-jobs-bottom-note">
            <Sparkles size={17} />
            <span>
              Une opportunité vous intéresse ? Consultez les détails de
              l'offre pour découvrir les conditions et les modalités de
              candidature.
            </span>
          </div>
        )}
      </section>
    </main>
  );
}
