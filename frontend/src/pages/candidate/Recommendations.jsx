
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api/axios";
import "./Recommendations.css";

function getScore(job) {
  const score = Number(job.score ?? 0);
  return Math.min(100, Math.max(0, score));
}

function getLocation(job) {
  return (job.location || "").trim();
}

function getJobId(job) {
  return job.job_id ?? job.id;
}

function formatContractType(value) {
  if (!value) return "Type de contrat non précisé";

  const labels = {
    CDI: "CDI",
    CDD: "CDD",
    STAGE: "Stage",
    INTERNSHIP: "Stage",
    FREELANCE: "Freelance",
    ALTERNANCE: "Alternance",
    TEMPORARY: "Intérim",
    TEMPORAIRE: "Intérim",
  };

  return labels[value.toUpperCase()] || value;
}

function getScoreLabel(score) {
  if (score >= 80) return "Excellente compatibilité";
  if (score >= 60) return "Bonne compatibilité";
  if (score >= 40) return "Compatibilité moyenne";
  return "Compatibilité à améliorer";
}

function getCoverage(job) {
  const coverage = Number(job.coverage);

  if (
    job.coverage === undefined ||
    job.coverage === null ||
    !Number.isFinite(coverage)
  ) {
    return null;
  }

  return Math.min(100, Math.max(0, coverage));
}

export default function Recommendations() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("relevance");
  const [contractFilter, setContractFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("all");
  const [minScore, setMinScore] = useState("0");

  const loadRecommendations = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("matching/recommended-jobs/");
      const data = response.data;

      const results = Array.isArray(data)
        ? data
        : Array.isArray(data?.results)
          ? data.results
          : [];

      setJobs(results);
    } catch (err) {
      console.error(
        "Erreur lors du chargement des recommandations :",
        err
      );

      const status = err.response?.status;

      if (status === 401) {
        setError(
          "Votre session a expiré. Veuillez vous reconnecter."
        );
      } else if (status === 403) {
        setError(
          "Cette page est réservée aux comptes candidats."
        );
      } else if (status === 404) {
        setError(
          err.response?.data?.detail ||
            "Complétez votre profil candidat pour recevoir des recommandations."
        );
      } else {
        setError(
          err.response?.data?.detail ||
            "Impossible de charger les recommandations. Vérifiez votre connexion et réessayez."
        );
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRecommendations();
  }, [loadRecommendations]);

  const locationOptions = useMemo(() => {
    return [
      ...new Set(
        jobs
          .map((job) => getLocation(job))
          .filter(Boolean)
      ),
    ].sort((a, b) => a.localeCompare(b, "fr"));
  }, [jobs]);

  const contractOptions = useMemo(() => {
    return [
      ...new Set(
        jobs
          .map((job) => job.contract_type)
          .filter(Boolean)
      ),
    ].sort((a, b) => a.localeCompare(b, "fr"));
  }, [jobs]);

  const filteredJobs = useMemo(() => {
    const searchText = search.trim().toLocaleLowerCase("fr");
    const minimum = Number(minScore);

    return jobs
      .filter((job) => {
        const searchableText = [
          job.title,
          job.company,
          job.sector,
          job.location,
          job.contract_type,
          job.education_level,
          ...(Array.isArray(job.matched_skills)
            ? job.matched_skills
            : []),
          ...(Array.isArray(job.missing_skills)
            ? job.missing_skills
            : []),
          ...(Array.isArray(job.reasons) ? job.reasons : []),
        ]
          .filter(Boolean)
          .join(" ")
          .toLocaleLowerCase("fr");

        const matchesSearch =
          !searchText || searchableText.includes(searchText);

        const matchesContract =
          contractFilter === "all" ||
          job.contract_type === contractFilter;

        const matchesLocation =
          locationFilter === "all" ||
          getLocation(job) === locationFilter;

        const matchesScore = getScore(job) >= minimum;

        return (
          matchesSearch &&
          matchesContract &&
          matchesLocation &&
          matchesScore
        );
      })
      .sort((a, b) => {
        if (sort === "score") {
          return getScore(b) - getScore(a);
        }

        if (sort === "recent") {
          const dateA = new Date(
            a.published_at || a.created_at || 0
          ).getTime();

          const dateB = new Date(
            b.published_at || b.created_at || 0
          ).getTime();

          return dateB - dateA;
        }

        // Le backend renvoie les offres par score décroissant.
        // Ce tri conserve cet ordre initial.
        return jobs.indexOf(a) - jobs.indexOf(b);
      });
  }, [
    jobs,
    search,
    sort,
    contractFilter,
    locationFilter,
    minScore,
  ]);

  const hasActiveFilters =
    search.trim() !== "" ||
    contractFilter !== "all" ||
    locationFilter !== "all" ||
    minScore !== "0" ||
    sort !== "relevance";

  const resetFilters = () => {
    setSearch("");
    setContractFilter("all");
    setLocationFilter("all");
    setMinScore("0");
    setSort("relevance");
  };

  const averageScore = useMemo(() => {
    if (jobs.length === 0) return 0;

    const total = jobs.reduce(
      (sum, job) => sum + getScore(job),
      0
    );

    return Math.round(total / jobs.length);
  }, [jobs]);

  const highMatchCount = useMemo(
    () => jobs.filter((job) => getScore(job) >= 80).length,
    [jobs]
  );

  if (loading) {
    return (
      <main className="recommendations-page">
        <div className="rec-container">
          <section className="rec-loading">
            <div className="rec-spinner" />
            <h2>Analyse de votre profil en cours...</h2>
            <p>
              SunuJob AI recherche les offres qui correspondent
              à vos compétences et à votre parcours.
            </p>
          </section>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="recommendations-page">
        <div className="rec-container">
          <section className="rec-error">
            <div className="rec-error-icon">!</div>
            <h2>Chargement des recommandations impossible</h2>
            <p>{error}</p>

            <button
              type="button"
              className="rec-primary-button"
              onClick={loadRecommendations}
            >
              Réessayer
            </button>

            <Link
              to="/candidate/profile"
              className="rec-secondary-link"
            >
              Consulter mon profil
            </Link>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="recommendations-page">
      <div className="rec-container">
        <section className="rec-hero">
          <div className="rec-hero-content">
            <span className="rec-eyebrow">
              <span className="rec-eyebrow-dot" />
              RECOMMANDATIONS INTELLIGENTES
            </span>

            <h1>
              Les opportunités qui
              <span> vous correspondent.</span>
            </h1>

            <p>
              Découvrez les offres d'emploi adaptées à votre
              profil, identifiez vos compétences clés et repérez
              les points à améliorer pour renforcer votre
              candidature.
            </p>

            <div className="rec-hero-actions">
              <Link
                to="/jobs"
                className="rec-primary-button"
              >
                Explorer toutes les offres
                <span aria-hidden="true"> →</span>
              </Link>

              <Link
                to="/candidate/profile"
                className="rec-outline-button"
              >
                Améliorer mon profil
              </Link>
            </div>
          </div>

          <div className="rec-hero-visual" aria-hidden="true">
            <div className="rec-visual-orbit rec-orbit-one" />
            <div className="rec-visual-orbit rec-orbit-two" />

            <div className="rec-visual-center">
              <span className="rec-visual-sparkle">✦</span>
              <span className="rec-visual-title">SunuJob</span>
              <span className="rec-visual-subtitle">
                MATCHING IA
              </span>
            </div>

            <div className="rec-floating-card rec-floating-top">
              <span className="rec-floating-icon">✓</span>
              <div>
                <strong>Profil analysé</strong>
                <small>Compétences détectées</small>
              </div>
            </div>

            <div className="rec-floating-card rec-floating-bottom">
              <span className="rec-floating-score">87%</span>
              <div>
                <strong>Bonne correspondance</strong>
                <small>Exemple de score</small>
              </div>
            </div>
          </div>
        </section>

        <section className="rec-stats-grid">
          <article className="rec-stat-card">
            <div className="rec-stat-icon rec-stat-blue">
              <span aria-hidden="true">▤</span>
            </div>
            <div>
              <p>Offres analysées</p>
              <strong>{jobs.length}</strong>
              <span>Offres disponibles pour votre profil</span>
            </div>
          </article>

          <article className="rec-stat-card">
            <div className="rec-stat-icon rec-stat-green">
              <span aria-hidden="true">✓</span>
            </div>
            <div>
              <p>Forte compatibilité</p>
              <strong>{highMatchCount}</strong>
              <span>Score de 80 % ou plus</span>
            </div>
          </article>

          <article className="rec-stat-card">
            <div className="rec-stat-icon rec-stat-purple">
              <span aria-hidden="true">◎</span>
            </div>
            <div>
              <p>Score moyen</p>
              <strong>{averageScore}%</strong>
              <span>Compatibilité moyenne des offres</span>
            </div>
          </article>
        </section>

        <section className="rec-results-section">
          <div className="rec-section-heading">
            <div>
              <span className="rec-section-kicker">
                VOTRE SÉLECTION
              </span>
              <h2>Offres recommandées</h2>
              <p>
                Des opportunités classées selon leur
                correspondance avec votre profil.
              </p>
            </div>

            <span className="rec-results-count">
              {filteredJobs.length} offre
              {filteredJobs.length !== 1 ? "s" : ""}
            </span>
          </div>

          <div className="rec-filter-panel">
            <div className="rec-search-box">
              <span aria-hidden="true">⌕</span>
              <input
                type="search"
                aria-label="Rechercher une offre"
                placeholder="Métier, entreprise, compétence..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              {search && (
                <button
                  type="button"
                  className="rec-clear-search"
                  aria-label="Effacer la recherche"
                  onClick={() => setSearch("")}
                >
                  ×
                </button>
              )}
            </div>

            <div className="rec-filter-group">
              <label htmlFor="rec-contract-filter">
                Contrat
              </label>
              <select
                id="rec-contract-filter"
                value={contractFilter}
                onChange={(event) =>
                  setContractFilter(event.target.value)
                }
              >
                <option value="all">Tous les contrats</option>
                {contractOptions.map((contract) => (
                  <option key={contract} value={contract}>
                    {formatContractType(contract)}
                  </option>
                ))}
              </select>
            </div>

            <div className="rec-filter-group">
              <label htmlFor="rec-location-filter">
                Localisation
              </label>
              <select
                id="rec-location-filter"
                value={locationFilter}
                onChange={(event) =>
                  setLocationFilter(event.target.value)
                }
              >
                <option value="all">
                  Toutes les localisations
                </option>
                {locationOptions.map((location) => (
                  <option key={location} value={location}>
                    {location}
                  </option>
                ))}
              </select>
            </div>

            <div className="rec-filter-group">
              <label htmlFor="rec-min-score">
                Score minimum
              </label>
              <select
                id="rec-min-score"
                value={minScore}
                onChange={(event) =>
                  setMinScore(event.target.value)
                }
              >
                <option value="0">Tous les scores</option>
                <option value="40">40 % et plus</option>
                <option value="60">60 % et plus</option>
                <option value="70">70 % et plus</option>
                <option value="80">80 % et plus</option>
                <option value="90">90 % et plus</option>
              </select>
            </div>

            <div className="rec-filter-group">
              <label htmlFor="rec-sort">
                Trier par
              </label>
              <select
                id="rec-sort"
                value={sort}
                onChange={(event) => setSort(event.target.value)}
              >
                <option value="relevance">Compatibilité</option>
                <option value="score">Meilleur score</option>
                <option value="recent">Plus récent</option>
              </select>
            </div>

            {hasActiveFilters && (
              <button
                type="button"
                className="rec-reset-button"
                onClick={resetFilters}
              >
                Réinitialiser
              </button>
            )}
          </div>

          {jobs.length === 0 ? (
            <section className="rec-empty-state">
              <div className="rec-empty-icon">⌕</div>
              <h3>Aucune recommandation pour le moment</h3>
              <p>
                Aucune offre publiée ne correspond actuellement
                aux critères disponibles. Revenez plus tard ou
                complétez votre profil pour améliorer les
                recommandations.
              </p>
              <Link
                to="/candidate/profile"
                className="rec-primary-button"
              >
                Compléter mon profil
              </Link>
            </section>
          ) : filteredJobs.length === 0 ? (
            <section className="rec-empty-state">
              <div className="rec-empty-icon">⌕</div>
              <h3>Aucune offre ne correspond aux filtres</h3>
              <p>
                Modifiez votre recherche ou réinitialisez les
                filtres pour afficher davantage d'opportunités.
              </p>
              <button
                type="button"
                className="rec-primary-button"
                onClick={resetFilters}
              >
                Réinitialiser les filtres
              </button>
            </section>
          ) : (
            <div className="rec-jobs-list">
              {filteredJobs.map((job, index) => {
                const score = getScore(job);
                const coverage = getCoverage(job);
                const jobId = getJobId(job);
                const matchedSkills = Array.isArray(
                  job.matched_skills
                )
                  ? job.matched_skills
                  : [];
                const missingSkills = Array.isArray(
                  job.missing_skills
                )
                  ? job.missing_skills
                  : [];
                const reasons = Array.isArray(job.reasons)
                  ? job.reasons
                  : [];

                return (
                  <article
                    className="rec-job-card"
                    key={jobId ?? `${job.title}-${index}`}
                  >
                    <div className="rec-job-main">
                      <div className="rec-company-avatar">
                        {(job.company || "E")
                          .trim()
                          .charAt(0)
                          .toUpperCase()}
                      </div>

                      <div className="rec-job-content">
                        <div className="rec-job-heading">
                          <div>
                            <span className="rec-job-sector">
                              {job.sector || "Opportunité professionnelle"}
                            </span>
                            <h3>{job.title}</h3>
                            <p className="rec-company-name">
                              {job.company || "Entreprise"}
                            </p>
                          </div>

                          <div
                            className={`rec-score-badge ${
                              score >= 80
                                ? "rec-score-high"
                                : score >= 60
                                  ? "rec-score-medium"
                                  : "rec-score-low"
                            }`}
                          >
                            <strong>{Math.round(score)}%</strong>
                            <span>Compatibilité</span>
                          </div>
                        </div>

                        <div className="rec-job-meta">
                          {getLocation(job) && (
                            <span>
                              <span aria-hidden="true">⌖</span>
                              {getLocation(job)}
                            </span>
                          )}

                          {job.contract_type && (
                            <span>
                              <span aria-hidden="true">▣</span>
                              {formatContractType(job.contract_type)}
                            </span>
                          )}

                          {job.experience_required !== undefined &&
                            job.experience_required !== null && (
                              <span>
                                <span aria-hidden="true">◷</span>
                                {job.experience_required} an
                                {Number(job.experience_required) > 1
                                  ? "s"
                                  : ""}{" "}
                                d'expérience
                              </span>
                            )}

                          {job.education_level && (
                            <span>
                              <span aria-hidden="true">◇</span>
                              {job.education_level}
                            </span>
                          )}
                        </div>

                        <div className="rec-score-details">
                          <div className="rec-score-line">
                            <div className="rec-score-labels">
                              <span>
                                {getScoreLabel(score)}
                              </span>
                              <strong>{Math.round(score)}%</strong>
                            </div>

                            <div
                              className="rec-progress-track"
                              role="progressbar"
                              aria-label="Score de compatibilité"
                              aria-valuenow={Math.round(score)}
                              aria-valuemin={0}
                              aria-valuemax={100}
                            >
                              <div
                                className="rec-progress-fill"
                                style={{ width: `${score}%` }}
                              />
                            </div>
                          </div>

                          {coverage !== null && (
                            <div className="rec-coverage">
                              <span>
                                Couverture des critères évalués
                              </span>
                              <strong>
                                {Math.round(coverage)}%
                              </strong>
                            </div>
                          )}
                        </div>

                        {(matchedSkills.length > 0 ||
                          missingSkills.length > 0) && (
                          <div className="rec-skills-grid">
                            {matchedSkills.length > 0 && (
                              <div className="rec-skills-block">
                                <h4>
                                  <span aria-hidden="true">✓</span>
                                  Compétences correspondantes
                                </h4>
                                <div className="rec-skill-tags">
                                  {matchedSkills.map((skill) => (
                                    <span
                                      className="rec-skill-tag rec-skill-matched"
                                      key={skill}
                                    >
                                      {skill}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {missingSkills.length > 0 && (
                              <div className="rec-skills-block">
                                <h4>
                                  <span aria-hidden="true">＋</span>
                                  Compétences à développer
                                </h4>
                                <div className="rec-skill-tags">
                                  {missingSkills.map((skill) => (
                                    <span
                                      className="rec-skill-tag rec-skill-missing"
                                      key={skill}
                                    >
                                      {skill}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {reasons.length > 0 && (
                          <div className="rec-reasons">
                            <h4>
                              Pourquoi cette recommandation ?
                            </h4>
                            <ul>
                              {reasons.map((reason, reasonIndex) => (
                                <li key={`${reason}-${reasonIndex}`}>
                                  {reason}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        <div className="rec-job-actions">
                          {jobId !== undefined &&
                          jobId !== null ? (
                            <Link
                              to={`/jobs/${jobId}`}
                              className="rec-primary-button"
                            >
                              Voir l'offre
                              <span aria-hidden="true"> →</span>
                            </Link>
                          ) : (
                            <Link
                              to="/jobs"
                              className="rec-primary-button"
                            >
                              Consulter les offres
                            </Link>
                          )}

                          <Link
                            to="/candidate/profile"
                            className="rec-job-secondary-link"
                          >
                            Améliorer mon profil
                          </Link>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section className="rec-bottom-cta">
          <div>
            <span className="rec-section-kicker">
              BOOSTEZ VOTRE CANDIDATURE
            </span>
            <h2>Votre prochaine opportunité commence ici.</h2>
            <p>
              Actualisez votre profil pour obtenir des
              recommandations plus pertinentes.
            </p>
          </div>

          <Link
            to="/candidate/profile"
            className="rec-primary-button"
          >
            Mettre à jour mon profil
            <span aria-hidden="true"> →</span>
          </Link>
        </section>

        <footer className="rec-footer">
          <p>
            <strong>SunuJob AI</strong> — Des opportunités
            professionnelles conçues au Sénégal 🇸🇳
          </p>
        </footer>
      </div>
    </main>
  );
}
