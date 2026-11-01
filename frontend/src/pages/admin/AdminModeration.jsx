import { useCallback, useEffect, useState } from "react";
import api from "../../api/axios";
import "./adminModeration.css";

const PAGE_SIZE = 20;

const STATUS_OPTIONS = [
  { value: "OPEN", label: "Nouveau" },
  { value: "IN_REVIEW", label: "En cours d’examen" },
  { value: "RESOLVED", label: "Résolu" },
  { value: "DISMISSED", label: "Rejeté" },
];

const TARGET_OPTIONS = [
  { value: "JOB", label: "Offre d’emploi" },
  { value: "COMPANY", label: "Entreprise" },
  { value: "USER", label: "Compte utilisateur" },
];

const REASON_OPTIONS = [
  { value: "FAKE_JOB", label: "Offre frauduleuse" },
  { value: "SCAM", label: "Tentative d’escroquerie" },
  { value: "FALSE_INFORMATION", label: "Informations trompeuses" },
  { value: "IMPERSONATION", label: "Usurpation d’identité" },
  { value: "DISCRIMINATION", label: "Discrimination" },
  { value: "INAPPROPRIATE", label: "Contenu inapproprié" },
  { value: "OTHER", label: "Autre motif" },
];

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function statusLabel(status) {
  return (
    STATUS_OPTIONS.find((item) => item.value === status)?.label || status
  );
}

function getErrorMessage(error) {
  const data = error?.response?.data;

  if (data?.detail) return data.detail;

  if (typeof data === "object" && data !== null) {
    const firstValue = Object.values(data)[0];

    if (Array.isArray(firstValue) && firstValue[0]) {
      return String(firstValue[0]);
    }

    if (typeof firstValue === "string") {
      return firstValue;
    }
  }

  if (error?.response?.status === 401) {
    return "Votre session a expiré. Reconnectez-vous.";
  }

  if (error?.response?.status === 403) {
    return "L’accès à la modération est réservé aux administrateurs.";
  }

  return "Une erreur est survenue. Vérifiez la connexion à l’API.";
}

function StatusBadge({ value }) {
  return (
    <span className={`moderation-status moderation-status-${value?.toLowerCase()}`}>
      <span className="moderation-status-dot" />
      {statusLabel(value)}
    </span>
  );
}

function SummaryCard({ icon, title, value, detail, color }) {
  return (
    <article className="moderation-summary-card">
      <div className={`moderation-summary-icon ${color}`}>{icon}</div>
      <div className="moderation-summary-content">
        <span>{title}</span>
        <strong>{value ?? "—"}</strong>
        <small>{detail}</small>
      </div>
    </article>
  );
}

export default function AdminModeration() {
  const [filters, setFilters] = useState({
    search: "",
    status: "",
    target_type: "",
    reason: "",
    start_date: "",
    end_date: "",
  });

  const [appliedFilters, setAppliedFilters] = useState({});
  const [reports, setReports] = useState([]);
  const [summary, setSummary] = useState({
    total: 0,
    open: 0,
    in_review: 0,
    resolved: 0,
    dismissed: 0,
  });

  const [selectedReport, setSelectedReport] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState("IN_REVIEW");
  const [adminNotes, setAdminNotes] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const loadReports = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const params = {
        page,
        page_size: PAGE_SIZE,
        ...appliedFilters,
      };

      Object.keys(params).forEach((key) => {
        if (params[key] === "" || params[key] == null) {
          delete params[key];
        }
      });

      const response = await api.get("admin/moderation/reports/", {
        params,
      });

      const data = response.data || {};

      setReports(Array.isArray(data.results) ? data.results : []);
      setTotal(Number(data.count) || 0);

      setSummary({
        total: Number(data.summary?.total) || 0,
        open: Number(data.summary?.open) || 0,
        in_review: Number(data.summary?.in_review) || 0,
        resolved: Number(data.summary?.resolved) || 0,
        dismissed: Number(data.summary?.dismissed) || 0,
      });
    } catch (err) {
      setReports([]);
      setTotal(0);
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [page, appliedFilters, refreshKey]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  function handleFilterChange(event) {
    const { name, value } = event.target;

    setFilters((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function applyFilters(event) {
    event.preventDefault();

    if (
      filters.start_date &&
      filters.end_date &&
      filters.start_date > filters.end_date
    ) {
      setError("La date de début doit précéder la date de fin.");
      return;
    }

    setError("");
    setSuccess("");
    setPage(1);
    setAppliedFilters({ ...filters });
  }

  function resetFilters() {
    const empty = {
      search: "",
      status: "",
      target_type: "",
      reason: "",
      start_date: "",
      end_date: "",
    };

    setFilters(empty);
    setAppliedFilters({});
    setPage(1);
    setError("");
    setSuccess("");
  }

  function openReport(report) {
    setSelectedReport(report);
    setSelectedStatus(
      report.status === "OPEN" ? "IN_REVIEW" : report.status
    );
    setAdminNotes(report.admin_notes || "");
    setError("");
    setSuccess("");
  }

  function closeReport() {
    if (saving) return;
    setSelectedReport(null);
  }

  async function saveDecision(event) {
    event.preventDefault();

    if (!selectedReport || saving) return;

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      await api.patch(
        `admin/moderation/reports/${selectedReport.id}/status/`,
        {
          status: selectedStatus,
          admin_notes: adminNotes,
        }
      );

      setSuccess(`Le signalement #${selectedReport.id} a été mis à jour.`);
      setSelectedReport(null);
      setRefreshKey((current) => current + 1);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <main className="moderation-page">
      <section className="moderation-hero">
        <div className="moderation-hero-copy">
          <div className="moderation-eyebrow">
            <span />
            ADMINISTRATION · QUALITÉ ET CONFIANCE
          </div>

          <h1>Centre de modération</h1>

          <p>
            Examinez les signalements, documentez vos décisions et
            contribuez à maintenir un environnement de recrutement fiable
            sur SunuJob AI.
          </p>

          <div className="moderation-hero-tags">
            <span>Offres d’emploi</span>
            <span>Entreprises</span>
            <span>Comptes utilisateurs</span>
          </div>
        </div>

        <div className="moderation-hero-illustration" aria-hidden="true">
          <div className="moderation-shield">
            <span>✓</span>
          </div>
          <div className="moderation-orbit moderation-orbit-one" />
          <div className="moderation-orbit moderation-orbit-two" />
        </div>
      </section>

      {error && (
        <div className="moderation-alert moderation-alert-error" role="alert">
          <span>!</span>
          <p>{error}</p>
          <button type="button" onClick={() => setError("")}>
            Fermer
          </button>
        </div>
      )}

      {success && (
        <div className="moderation-alert moderation-alert-success" role="status">
          <span>✓</span>
          <p>{success}</p>
          <button type="button" onClick={() => setSuccess("")}>
            Fermer
          </button>
        </div>
      )}

      <section className="moderation-summary-grid">
        <SummaryCard
          icon="▤"
          color="moderation-card-purple"
          title="Total des dossiers"
          value={loading ? "…" : summary.total}
          detail="Signalements enregistrés"
        />

        <SummaryCard
          icon="◷"
          color="moderation-card-orange"
          title="Nouveaux"
          value={loading ? "…" : summary.open}
          detail="À examiner"
        />

        <SummaryCard
          icon="⌕"
          color="moderation-card-blue"
          title="En cours d’examen"
          value={loading ? "…" : summary.in_review}
          detail="Traitement engagé"
        />

        <SummaryCard
          icon="✓"
          color="moderation-card-green"
          title="Résolus"
          value={loading ? "…" : summary.resolved}
          detail="Décision enregistrée"
        />
      </section>

      <section className="moderation-panel">
        <div className="moderation-panel-heading">
          <div>
            <span className="moderation-section-kicker">
              SUIVI DES DOSSIERS
            </span>
            <h2>Signalements reçus</h2>
            <p>Recherchez un dossier et consultez les éléments signalés.</p>
          </div>

          <button
            className="moderation-refresh-btn"
            type="button"
            onClick={() => setRefreshKey((current) => current + 1)}
            disabled={loading}
          >
            ↻ Actualiser
          </button>
        </div>

        <form className="moderation-filters" onSubmit={applyFilters}>
          <label className="moderation-search-field">
            <span>Recherche</span>
            <div className="moderation-search-wrap">
              <span aria-hidden="true">⌕</span>
              <input
                type="search"
                name="search"
                value={filters.search}
                onChange={handleFilterChange}
                placeholder="Cible, email, description ou note…"
              />
            </div>
          </label>

          <label>
            <span>Statut</span>
            <select
              name="status"
              value={filters.status}
              onChange={handleFilterChange}
            >
              <option value="">Tous les statuts</option>
              {STATUS_OPTIONS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>Type de cible</span>
            <select
              name="target_type"
              value={filters.target_type}
              onChange={handleFilterChange}
            >
              <option value="">Tous les types</option>
              {TARGET_OPTIONS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>Motif</span>
            <select
              name="reason"
              value={filters.reason}
              onChange={handleFilterChange}
            >
              <option value="">Tous les motifs</option>
              {REASON_OPTIONS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>Date de début</span>
            <input
              type="date"
              name="start_date"
              value={filters.start_date}
              onChange={handleFilterChange}
            />
          </label>

          <label>
            <span>Date de fin</span>
            <input
              type="date"
              name="end_date"
              value={filters.end_date}
              onChange={handleFilterChange}
            />
          </label>

          <div className="moderation-filter-actions">
            <button className="moderation-primary-btn" type="submit">
              Appliquer les filtres
            </button>

            <button
              className="moderation-secondary-btn"
              type="button"
              onClick={resetFilters}
            >
              Réinitialiser
            </button>
          </div>
        </form>

        <div className="moderation-table-toolbar">
          <span>
            {loading
              ? "Chargement des dossiers…"
              : `${total.toLocaleString("fr-FR")} résultat(s)`}
          </span>
          <span>
            Page {page} sur {totalPages}
          </span>
        </div>

        <div className="moderation-table-scroll">
          <table className="moderation-table">
            <thead>
              <tr>
                <th>Dossier</th>
                <th>Élément signalé</th>
                <th>Motif</th>
                <th>Statut</th>
                <th>Date de réception</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" className="moderation-state-cell">
                    <div className="moderation-spinner" />
                    Chargement des signalements…
                  </td>
                </tr>
              ) : reports.length === 0 ? (
                <tr>
                  <td colSpan="6" className="moderation-state-cell">
                    <div className="moderation-empty-icon">✓</div>
                    <strong>Aucun signalement trouvé</strong>
                    <p>
                      Les dossiers apparaîtront ici lorsqu’ils auront été
                      transmis par l’API de signalement.
                    </p>
                  </td>
                </tr>
              ) : (
                reports.map((report) => (
                  <tr key={report.id}>
                    <td>
                      <div className="moderation-report-id">
                        <span>#{report.id}</span>
                        <small>{report.reporter_label}</small>
                      </div>
                    </td>

                    <td>
                      <div className="moderation-target">
                        <strong>{report.target_label || "Cible non renseignée"}</strong>
                        <small>
                          {report.target_type_label} · ID {report.target_id}
                        </small>
                      </div>
                    </td>

                    <td>
                      <span className="moderation-reason">
                        {report.reason_label}
                      </span>
                    </td>

                    <td>
                      <StatusBadge value={report.status} />
                    </td>

                    <td className="moderation-date">
                      {formatDate(report.created_at)}
                    </td>

                    <td>
                      <button
                        type="button"
                        className="moderation-review-btn"
                        onClick={() => openReport(report)}
                      >
                        Examiner <span>→</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="moderation-pagination">
          <span>
            {total === 0
              ? "Aucun résultat"
              : `Affichage de ${(page - 1) * PAGE_SIZE + 1} à ${Math.min(
                  page * PAGE_SIZE,
                  total
                )} sur ${total}`}
          </span>

          <div>
            <button
              type="button"
              disabled={loading || page <= 1}
              onClick={() => setPage((current) => current - 1)}
            >
              ← Précédent
            </button>

            <span className="moderation-current-page">{page}</span>

            <button
              type="button"
              disabled={loading || page >= totalPages}
              onClick={() => setPage((current) => current + 1)}
            >
              Suivant →
            </button>
          </div>
        </div>
      </section>

      {selectedReport && (
        <div
          className="moderation-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeReport();
          }}
        >
          <section
            className="moderation-detail-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="moderation-modal-title"
          >
            <div className="moderation-modal-header">
              <div>
                <span className="moderation-section-kicker">
                  DOSSIER #{selectedReport.id}
                </span>
                <h2 id="moderation-modal-title">Examen du signalement</h2>
              </div>

              <button
                type="button"
                className="moderation-modal-close"
                onClick={closeReport}
                disabled={saving}
                aria-label="Fermer"
              >
                ×
              </button>
            </div>

            <div className="moderation-modal-body">
              <div className="moderation-detail-highlight">
                <span>Élément concerné</span>
                <strong>
                  {selectedReport.target_label || "Cible non renseignée"}
                </strong>
                <small>
                  {selectedReport.target_type_label} · Identifiant{" "}
                  {selectedReport.target_id}
                </small>
              </div>

              <div className="moderation-detail-grid">
                <div>
                  <span>Signalé par</span>
                  <strong>{selectedReport.reporter_label}</strong>
                  <small>{selectedReport.reporter_email || "Email indisponible"}</small>
                </div>

                <div>
                  <span>Motif déclaré</span>
                  <strong>{selectedReport.reason_label}</strong>
                  <small>{formatDate(selectedReport.created_at)}</small>
                </div>
              </div>

              <div className="moderation-description-block">
                <span>Description du signalement</span>
                <p>{selectedReport.description}</p>
              </div>

              {selectedReport.reviewed_at && (
                <p className="moderation-last-review">
                  Dernier traitement : {formatDate(selectedReport.reviewed_at)}
                  {selectedReport.reviewer_label
                    ? ` · ${selectedReport.reviewer_label}`
                    : ""}
                </p>
              )}

              <form className="moderation-decision-form" onSubmit={saveDecision}>
                <label>
                  Statut du dossier
                  <select
                    value={selectedStatus}
                    onChange={(event) => setSelectedStatus(event.target.value)}
                    disabled={saving}
                  >
                    {STATUS_OPTIONS.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Note interne de modération
                  <textarea
                    value={adminNotes}
                    onChange={(event) => setAdminNotes(event.target.value)}
                    maxLength={10000}
                    rows={5}
                    placeholder="Consignez les vérifications réalisées, la justification de votre décision et les suites à donner…"
                    disabled={saving}
                  />
                  <small>{adminNotes.length}/10 000 caractères</small>
                </label>

                <div className="moderation-decision-note">
                  Cette note est destinée à l’équipe administrative et n’est
                  pas affichée publiquement.
                </div>

                <div className="moderation-modal-actions">
                  <button
                    type="button"
                    className="moderation-secondary-btn"
                    onClick={closeReport}
                    disabled={saving}
                  >
                    Annuler
                  </button>

                  <button
                    type="submit"
                    className="moderation-primary-btn"
                    disabled={saving}
                  >
                    {saving ? "Enregistrement…" : "Enregistrer la décision"}
                  </button>
                </div>
              </form>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}