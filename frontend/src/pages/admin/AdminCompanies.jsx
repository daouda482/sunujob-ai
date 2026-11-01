
import { useCallback, useEffect, useState } from "react";
import api from "../../api/axios";
import "./adminCompanies.css";

const numberFormat = new Intl.NumberFormat("fr-FR");

function formatNumber(value) {
  return numberFormat.format(Number(value) || 0);
}

function formatDate(value) {
  if (!value) return "Non renseignée";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Non renseignée";

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function getLocation(company) {
  return (
    company.location ||
    [company.city, company.country].filter(Boolean).join(", ") ||
    company.address ||
    "Non renseignée"
  );
}

function getInitials(name) {
  return (
    String(name || "E")
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0))
      .join("")
      .toUpperCase() || "E"
  );
}

function safeWebsite(value) {
  if (!value || typeof value !== "string") return "";

  try {
    const candidate = /^https?:\/\//i.test(value)
      ? value
      : `https://${value}`;

    const url = new URL(candidate);

    return ["http:", "https:"].includes(url.protocol)
      ? url.href
      : "";
  } catch {
    return "";
  }
}

function getErrorMessage(error) {
  if (!error.response) {
    return "Impossible de joindre Django. Vérifie que le serveur fonctionne.";
  }

  if (error.response.status === 401) {
    return "Ta session a expiré. Reconnecte-toi.";
  }

  if (error.response.status === 403) {
    return "Accès réservé aux administrateurs.";
  }

  if (error.response.status === 404) {
    return "Route API introuvable. Vérifie config/urls.py.";
  }

  return (
    error.response.data?.detail ||
    "Impossible de charger les entreprises. Réessaie."
  );
}

function VerificationBadge({ company }) {
  if (!company.verification_configured) {
    return <span className="ac-badge ac-badge--unknown">État non configuré</span>;
  }

  if (company.is_verified === true) {
    return <span className="ac-badge ac-badge--verified">✓ Vérifiée</span>;
  }

  if (company.is_verified === false) {
    return <span className="ac-badge ac-badge--pending">À vérifier</span>;
  }

  return (
    <span className="ac-badge ac-badge--unknown">
      {company.verification_label || company.verification_status || "À examiner"}
    </span>
  );
}

export default function AdminCompanies() {
  const [companies, setCompanies] = useState([]);
  const [summary, setSummary] = useState({
    total_companies: 0,
    companies_with_jobs: 0,
    companies_without_jobs: 0,
  });

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [hasJobs, setHasJobs] = useState("all");
  const [sortBy, setSortBy] = useState("recent");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const [selectedCompany, setSelectedCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 350);

    return () => window.clearTimeout(timer);
  }, [search]);

  const loadCompanies = useCallback(async (manualRefresh = false) => {
    setError("");

    if (manualRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const response = await api.get("admin/companies/", {
        params: {
          search: debouncedSearch,
          has_jobs: hasJobs,
          sort: sortBy,
          page,
          page_size: pageSize,
        },
      });

      const data = response.data;

      setCompanies(Array.isArray(data.results) ? data.results : []);
      setSummary(
        data.summary || {
          total_companies: 0,
          companies_with_jobs: 0,
          companies_without_jobs: 0,
        }
      );
      setTotalCount(Number(data.count) || 0);
      setTotalPages(Math.max(1, Number(data.total_pages) || 1));
    } catch (err) {
      setError(getErrorMessage(err));
      setCompanies([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [debouncedSearch, hasJobs, sortBy, page, pageSize]);

  useEffect(() => {
    loadCompanies();
  }, [loadCompanies]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, hasJobs, sortBy, pageSize]);

  function resetFilters() {
    setSearch("");
    setDebouncedSearch("");
    setHasJobs("all");
    setSortBy("recent");
    setPage(1);
    setPageSize(10);
  }

  const rangeStart = totalCount ? (page - 1) * pageSize + 1 : 0;
  const rangeEnd = Math.min(page * pageSize, totalCount);

  return (
    <main className="admin-companies">
      <header className="ac-hero">
        <div>
          <div className="ac-eyebrow">
            <span />
            ADMINISTRATION · ENTREPRISES
          </div>

          <h1>Gestion des entreprises</h1>

          <p>
            Consulte les organisations présentes sur SunuJob AI,
            leurs responsables et leur activité de recrutement.
          </p>

          <div className="ac-hero-meta">
            <span>Répertoire des organisations</span>
            <span>Vue réservée aux administrateurs</span>
          </div>
        </div>

        <button
          type="button"
          className="ac-refresh"
          onClick={() => loadCompanies(true)}
          disabled={refreshing}
        >
          <span className={refreshing ? "ac-spin" : ""}>↻</span>
          {refreshing ? "Actualisation..." : "Actualiser"}
        </button>
      </header>

      {error && (
        <div className="ac-alert" role="alert">
          <strong>Chargement impossible</strong>
          <p>{error}</p>
          <button type="button" onClick={() => loadCompanies(true)}>
            Réessayer
          </button>
        </div>
      )}

      <section className="ac-summary">
        <article className="ac-summary-card">
          <span className="ac-summary-icon ac-icon--blue">🏢</span>
          <div>
            <span>Entreprises enregistrées</span>
            <strong>{formatNumber(summary.total_companies)}</strong>
            <small>Ensemble des organisations</small>
          </div>
        </article>

        <article className="ac-summary-card">
          <span className="ac-summary-icon ac-icon--green">▣</span>
          <div>
            <span>Avec des offres</span>
            <strong>{formatNumber(summary.companies_with_jobs)}</strong>
            <small>Au moins une offre associée</small>
          </div>
        </article>

        <article className="ac-summary-card">
          <span className="ac-summary-icon ac-icon--orange">○</span>
          <div>
            <span>Sans offre associée</span>
            <strong>{formatNumber(summary.companies_without_jobs)}</strong>
            <small>À accompagner si nécessaire</small>
          </div>
        </article>
      </section>

      <section className="ac-directory">
        <div className="ac-directory-heading">
          <div>
            <span className="ac-kicker">ANNUAIRE PROFESSIONNEL</span>
            <h2>Répertoire des entreprises</h2>
            <p>
              Recherche, consultation et suivi des organisations.
            </p>
          </div>

          <div className="ac-result-count">
            <strong>{formatNumber(totalCount)}</strong>
            <span>résultat(s)</span>
          </div>
        </div>

        <div className="ac-toolbar">
          <label className="ac-search">
            <span aria-hidden="true">⌕</span>
            <input
              type="search"
              placeholder="Entreprise ou recruteur..."
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              aria-label="Rechercher une entreprise ou un recruteur"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                aria-label="Effacer la recherche"
              >
                ×
              </button>
            )}
          </label>

          <label className="ac-filter">
            <span>Activité</span>
            <select
              value={hasJobs}
              onChange={(event) => {
                setHasJobs(event.target.value);
                setPage(1);
              }}
            >
              <option value="all">Toutes</option>
              <option value="yes">Avec des offres</option>
              <option value="no">Sans offre</option>
            </select>
          </label>

          <label className="ac-filter">
            <span>Ordre</span>
            <select
              value={sortBy}
              onChange={(event) => {
                setSortBy(event.target.value);
                setPage(1);
              }}
            >
              <option value="recent">Plus récentes</option>
              <option value="name">Nom A–Z</option>
              <option value="jobs">Plus d'offres</option>
            </select>
          </label>

          <label className="ac-filter ac-filter--size">
            <span>Par page</span>
            <select
              value={pageSize}
              onChange={(event) => {
                setPageSize(Number(event.target.value));
                setPage(1);
              }}
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </label>

          <button type="button" className="ac-reset" onClick={resetFilters}>
            Réinitialiser
          </button>
        </div>

        <div className="ac-table-meta">
          Affichage de <strong>{formatNumber(rangeStart)}</strong> à{" "}
          <strong>{formatNumber(rangeEnd)}</strong> sur{" "}
          <strong>{formatNumber(totalCount)}</strong> entreprise(s)
        </div>

        {loading ? (
          <div className="ac-state">
            <span className="ac-loader" />
            <h3>Chargement des entreprises</h3>
            <p>Récupération des organisations enregistrées.</p>
          </div>
        ) : companies.length === 0 ? (
          <div className="ac-state">
            <span className="ac-empty-icon">🏢</span>
            <h3>Aucune entreprise trouvée</h3>
            <p>
              Modifie ta recherche ou réinitialise les filtres.
            </p>
            <button type="button" className="ac-primary" onClick={resetFilters}>
              Afficher toutes les entreprises
            </button>
          </div>
        ) : (
          <div className="ac-table-wrap">
            <table className="ac-table">
              <thead>
                <tr>
                  <th>Entreprise</th>
                  <th>Responsable</th>
                  <th>Localisation</th>
                  <th>Offres</th>
                  <th>Vérification</th>
                  <th><span className="ac-sr-only">Actions</span></th>
                </tr>
              </thead>

              <tbody>
                {companies.map((company) => (
                  <tr key={company.id}>
                    <td>
                      <div className="ac-company-cell">
                        <span className="ac-avatar">
                          {getInitials(company.name)}
                        </span>

                        <div>
                          <strong>{company.name || `Entreprise #${company.id}`}</strong>
                          <span>{company.sector || company.industry || "Secteur non renseigné"}</span>
                          <small>Référence #{company.id}</small>
                        </div>
                      </div>
                    </td>

                    <td>
                      <div className="ac-recruiter">
                        <strong>{company.recruiter_name || "Non renseigné"}</strong>
                        <span>{company.recruiter_email || "E-mail non disponible"}</span>
                      </div>
                    </td>

                    <td className="ac-location">{getLocation(company)}</td>

                    <td>
                      <div className="ac-jobs-count">
                        <strong>{formatNumber(company.jobs_count)}</strong>
                        <span>
                          {Number(company.published_jobs_count) || 0} publiée(s)
                        </span>
                      </div>
                    </td>

                    <td><VerificationBadge company={company} /></td>

                    <td>
                      <button
                        type="button"
                        className="ac-view"
                        onClick={() => setSelectedCompany(company)}
                      >
                        Détails <span>→</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <footer className="ac-pagination">
          <span>
            Page <strong>{page}</strong> sur <strong>{totalPages}</strong>
          </span>

          <div>
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => setPage((value) => Math.max(1, value - 1))}
            >
              ← Précédent
            </button>
            <button
              type="button"
              disabled={page >= totalPages || loading}
              onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
            >
              Suivant →
            </button>
          </div>
        </footer>
      </section>

      {selectedCompany && (
        <div
          className="ac-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setSelectedCompany(null);
            }
          }}
        >
          <section
            className="ac-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ac-modal-title"
          >
            <header className="ac-modal-header">
              <div>
                <span className="ac-kicker">FICHE ENTREPRISE</span>
                <h2 id="ac-modal-title">Détails de l'organisation</h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCompany(null)}
                aria-label="Fermer"
              >
                ×
              </button>
            </header>

            <div className="ac-profile">
              <span className="ac-profile-avatar">
                {getInitials(selectedCompany.name)}
              </span>
              <div>
                <h3>{selectedCompany.name}</h3>
                <p>{selectedCompany.sector || selectedCompany.industry || "Secteur non renseigné"}</p>
                <VerificationBadge company={selectedCompany} />
              </div>
            </div>

            <div className="ac-detail-grid">
              <div>
                <span>Identifiant</span>
                <strong>#{selectedCompany.id}</strong>
              </div>
              <div>
                <span>Localisation</span>
                <strong>{getLocation(selectedCompany)}</strong>
              </div>
              <div>
                <span>Recruteur responsable</span>
                <strong>{selectedCompany.recruiter_name || "Non renseigné"}</strong>
              </div>
              <div>
                <span>E-mail du recruteur</span>
                <strong>{selectedCompany.recruiter_email || "Non disponible"}</strong>
              </div>
              <div>
                <span>Offres enregistrées</span>
                <strong>{formatNumber(selectedCompany.jobs_count)}</strong>
              </div>
              <div>
                <span>Offres publiées</span>
                <strong>{formatNumber(selectedCompany.published_jobs_count)}</strong>
              </div>
              <div>
                <span>Création du compte entreprise</span>
                <strong>{formatDate(selectedCompany.created_at)}</strong>
              </div>
              <div>
                <span>Adresse e-mail entreprise</span>
                <strong>{selectedCompany.email || "Non renseignée"}</strong>
              </div>
            </div>

            {selectedCompany.description && (
              <div className="ac-description">
                <h4>Présentation</h4>
                <p>{selectedCompany.description}</p>
              </div>
            )}

            {selectedCompany.website && (
              <div className="ac-website">
                <span>Site web</span>
                {safeWebsite(selectedCompany.website) ? (
                  <a
                    href={safeWebsite(selectedCompany.website)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Consulter le site de l'entreprise ↗
                  </a>
                ) : (
                  <strong>{selectedCompany.website}</strong>
                )}
              </div>
            )}

            <footer className="ac-modal-footer">
              <button
                type="button"
                className="ac-primary"
                onClick={() => setSelectedCompany(null)}
              >
                Fermer la fiche
              </button>
            </footer>
          </section>
        </div>
      )}
    </main>
  );
}
