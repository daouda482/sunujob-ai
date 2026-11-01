import { useCallback, useEffect, useState } from "react";
import {
  BadgeCheck,
  Building2,
  CheckCircle2,
  Clock3,
  Download,
  FileCheck2,
  FileText,
  RefreshCw,
  Search,
  ShieldCheck,
  XCircle,
} from "lucide-react";

import api from "../../api/axios";
import "./adminVerifications.css";

const PAGE_SIZE = 20;

const STATUS_LABELS = {
  PENDING: "En attente",
  APPROVED: "Approuvée",
  REJECTED: "Rejetée",
};

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function getError(error) {
  const data = error?.response?.data;

  if (data?.detail) return data.detail;
  if (data?.message) return data.message;

  if (data && typeof data === "object") {
    const first = Object.values(data)[0];

    if (Array.isArray(first) && first.length) return String(first[0]);
    if (typeof first === "string") return first;
  }

  if (error?.response?.status === 401) {
    return "Votre session a expiré. Reconnectez-vous.";
  }

  if (error?.response?.status === 403) {
    return "Cette page est réservée aux administrateurs.";
  }

  return "Impossible d'effectuer cette opération. Vérifiez le serveur.";
}

function StatusBadge({ status }) {
  return (
    <span className={`av-status av-status-${String(status).toLowerCase()}`}>
      <span />
      {STATUS_LABELS[status] || status}
    </span>
  );
}

function StatCard({ icon: Icon, label, value, tone }) {
  return (
    <article className="av-stat-card">
      <span className={`av-stat-icon av-tone-${tone}`}>
        <Icon size={22} />
      </span>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </article>
  );
}

export default function AdminVerifications() {
  const [requests, setRequests] = useState([]);
  const [summary, setSummary] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
  });

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("PENDING");
  const [appliedFilters, setAppliedFilters] = useState({
    search: "",
    status: "PENDING",
  });

  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState(null);
  const [decision, setDecision] = useState("APPROVED");
  const [notes, setNotes] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const loadRequests = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const params = {
        page,
        page_size: PAGE_SIZE,
        ...appliedFilters,
      };

      Object.keys(params).forEach((key) => {
        if (params[key] === "" || params[key] == null) delete params[key];
      });

      const response = await api.get("admin/verifications/", { params });
      const data = response.data || {};

      setRequests(Array.isArray(data.results) ? data.results : []);
      setTotal(Number(data.count) || 0);
      setSummary({
        total: Number(data.summary?.total) || 0,
        pending: Number(data.summary?.pending) || 0,
        approved: Number(data.summary?.approved) || 0,
        rejected: Number(data.summary?.rejected) || 0,
      });
    } catch (err) {
      setRequests([]);
      setTotal(0);
      setError(getError(err));
    } finally {
      setLoading(false);
    }
  }, [page, appliedFilters, refreshKey]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  function applyFilters(event) {
    event.preventDefault();
    setSuccess("");
    setError("");
    setPage(1);
    setAppliedFilters({
      search: search.trim(),
      status: statusFilter,
    });
  }

  function resetFilters() {
    setSearch("");
    setStatusFilter("");
    setPage(1);
    setAppliedFilters({ search: "", status: "" });
  }

  function openRequest(item) {
    setSelected(item);
    setDecision("APPROVED");
    setNotes(item.admin_notes || "");
    setError("");
    setSuccess("");
  }

  async function downloadDocument(item) {
    setDownloading(true);
    setError("");

    try {
      const response = await api.get(
        `admin/verifications/${item.id}/document/`,
        { responseType: "blob" }
      );

      const blobUrl = window.URL.createObjectURL(response.data);
      const anchor = window.document.createElement("a");

      anchor.href = blobUrl;
      anchor.download = item.document_name || `justificatif-${item.id}`;
      window.document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      setError(getError(err));
    } finally {
      setDownloading(false);
    }
  }

  async function saveDecision(event) {
    event.preventDefault();

    if (!selected || saving) return;

    if (!["APPROVED", "REJECTED"].includes(decision)) {
      setError("Choisissez une décision valide.");
      return;
    }

    if (decision === "REJECTED" && !notes.trim()) {
      setError("Indiquez le motif du rejet dans la note administrative.");
      return;
    }

    const confirmation =
      decision === "APPROVED"
        ? `Confirmer la vérification de « ${selected.company_name} » ?`
        : `Confirmer le rejet du dossier de « ${selected.company_name} » ?`;

    if (!window.confirm(confirmation)) return;

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      await api.patch(
        `admin/verifications/${selected.id}/decision/`,
        {
          status: decision,
          admin_notes: notes,
        }
      );

      setSuccess(
        decision === "APPROVED"
          ? `L'entreprise « ${selected.company_name} » a été vérifiée.`
          : `La demande de « ${selected.company_name} » a été rejetée.`
      );

      setSelected(null);
      setRefreshKey((current) => current + 1);
    } catch (err) {
      setError(getError(err));
    } finally {
      setSaving(false);
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <main className="admin-verifications-page">
      <section className="av-hero">
        <div>
          <span className="av-eyebrow">
            <ShieldCheck size={15} />
            ADMINISTRATION · CONFIANCE ET CONFORMITÉ
          </span>

          <h1>Vérification des entreprises</h1>

          <p>
            Examinez les justificatifs, validez l'authenticité des entreprises
            et gardez une trace des décisions prises.
          </p>
        </div>

        <div className="av-hero-art" aria-hidden="true">
          <Building2 size={42} />
          <BadgeCheck size={27} />
        </div>
      </section>

      {error && (
        <div className="av-alert av-alert-error" role="alert">
          <XCircle size={18} />
          <span>{error}</span>
          <button type="button" onClick={() => setError("")}>Fermer</button>
        </div>
      )}

      {success && (
        <div className="av-alert av-alert-success" role="status">
          <CheckCircle2 size={18} />
          <span>{success}</span>
          <button type="button" onClick={() => setSuccess("")}>Fermer</button>
        </div>
      )}

      <section className="av-stat-grid">
        <StatCard icon={FileCheck2} label="Dossiers au total" value={loading ? "…" : summary.total} tone="violet" />
        <StatCard icon={Clock3} label="En attente" value={loading ? "…" : summary.pending} tone="orange" />
        <StatCard icon={BadgeCheck} label="Approuvés" value={loading ? "…" : summary.approved} tone="green" />
        <StatCard icon={XCircle} label="Rejetés" value={loading ? "…" : summary.rejected} tone="red" />
      </section>

      <section className="av-panel">
        <header className="av-panel-heading">
          <div>
            <span className="av-section-kicker">DOSSIERS SOUMIS</span>
            <h2>File de vérification</h2>
            <p>Consultez les dossiers et enregistrez une décision motivée.</p>
          </div>

          <button
            type="button"
            className="av-refresh-btn"
            onClick={() => setRefreshKey((current) => current + 1)}
            disabled={loading}
          >
            <RefreshCw size={15} /> Actualiser
          </button>
        </header>

        <form className="av-filters" onSubmit={applyFilters}>
          <label className="av-search-field">
            <span>Recherche</span>
            <div>
              <Search size={17} />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Entreprise, numéro, email…"
              />
            </div>
          </label>

          <label>
            <span>Statut du dossier</span>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="">Tous les statuts</option>
              <option value="PENDING">En attente</option>
              <option value="APPROVED">Approuvées</option>
              <option value="REJECTED">Rejetées</option>
            </select>
          </label>

          <div className="av-filter-actions">
            <button type="submit" className="av-primary-btn">Filtrer</button>
            <button type="button" className="av-secondary-btn" onClick={resetFilters}>
              Réinitialiser
            </button>
          </div>
        </form>

        <div className="av-table-info">
          <span>
            {loading ? "Chargement…" : `${total.toLocaleString("fr-FR")} dossier(s)`}
          </span>
          <span>Page {page} sur {totalPages}</span>
        </div>

        <div className="av-table-scroll">
          <table className="av-table">
            <thead>
              <tr>
                <th>Entreprise</th>
                <th>Immatriculation</th>
                <th>Demandeur</th>
                <th>Justificatif</th>
                <th>Statut</th>
                <th>Soumise le</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr><td colSpan="7" className="av-empty-cell">Chargement des dossiers…</td></tr>
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan="7" className="av-empty-cell">
                    <FileCheck2 size={36} />
                    <strong>Aucun dossier trouvé</strong>
                    <p>Aucune demande ne correspond aux filtres sélectionnés.</p>
                  </td>
                </tr>
              ) : (
                requests.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div className="av-company-cell">
                        <span><Building2 size={18} /></span>
                        <div>
                          <strong>{item.company_name}</strong>
                          <small>Dossier #{item.id}</small>
                        </div>
                      </div>
                    </td>

                    <td>{item.registration_number}</td>
                    <td>{item.submitted_by_email || "—"}</td>

                    <td>
                      <button
                        type="button"
                        className="av-document-btn"
                        onClick={() => downloadDocument(item)}
                        disabled={downloading}
                        title="Télécharger le justificatif"
                      >
                        <Download size={15} />
                        {downloading ? "…" : item.document_name || "Télécharger"}
                      </button>
                    </td>

                    <td><StatusBadge status={item.status} /></td>
                    <td>{formatDate(item.created_at)}</td>

                    <td>
                      <button
                        type="button"
                        className="av-review-btn"
                        onClick={() => openRequest(item)}
                        disabled={item.status !== "PENDING"}
                      >
                        {item.status === "PENDING" ? "Examiner →" : "Traité"}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <footer className="av-pagination">
          <span>
            {total
              ? `Affichage de ${(page - 1) * PAGE_SIZE + 1} à ${Math.min(page * PAGE_SIZE, total)} sur ${total}`
              : "Aucun résultat"}
          </span>

          <div>
            <button
              type="button"
              disabled={loading || page <= 1}
              onClick={() => setPage((current) => current - 1)}
            >
              ← Précédent
            </button>

            <strong>{page}</strong>

            <button
              type="button"
              disabled={loading || page >= totalPages}
              onClick={() => setPage((current) => current + 1)}
            >
              Suivant →
            </button>
          </div>
        </footer>
      </section>

      {selected && (
        <div className="av-modal-backdrop">
          <section
            className="av-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="av-modal-title"
          >
            <header>
              <div>
                <span className="av-section-kicker">DOSSIER #{selected.id}</span>
                <h2 id="av-modal-title">Examiner l'entreprise</h2>
              </div>

              <button
                type="button"
                className="av-modal-close"
                disabled={saving}
                onClick={() => setSelected(null)}
                aria-label="Fermer"
              >
                ×
              </button>
            </header>

            <div className="av-modal-body">
              <div className="av-company-detail">
                <Building2 size={23} />
                <div>
                  <strong>{selected.company_name}</strong>
                  <span>{selected.submitted_by_email || "Demandeur inconnu"}</span>
                </div>
              </div>

              <div className="av-detail-grid">
                <div>
                  <span>Numéro d'immatriculation</span>
                  <strong>{selected.registration_number}</strong>
                </div>
                <div>
                  <span>Date de soumission</span>
                  <strong>{formatDate(selected.created_at)}</strong>
                </div>
                <div className="av-detail-file">
                  <span>Justificatif joint</span>
                  <button
                    type="button"
                    className="av-document-btn"
                    onClick={() => downloadDocument(selected)}
                    disabled={downloading}
                  >
                    <Download size={15} />
                    {selected.document_name || "Télécharger le document"}
                  </button>
                </div>
              </div>

              <form className="av-decision-form" onSubmit={saveDecision}>
                <label>
                  Décision
                  <select
                    value={decision}
                    onChange={(event) => setDecision(event.target.value)}
                    disabled={saving}
                  >
                    <option value="APPROVED">Approuver l'entreprise</option>
                    <option value="REJECTED">Rejeter la demande</option>
                  </select>
                </label>

                <label>
                  Note administrative
                  <textarea
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    maxLength={10000}
                    rows={4}
                    disabled={saving}
                    placeholder="Consignez les vérifications réalisées et la justification de votre décision…"
                  />
                  {decision === "REJECTED" && (
                    <small>Une justification est requise en cas de rejet.</small>
                  )}
                </label>

                <div className="av-modal-note">
                  La note est interne et réservée à l'administration.
                </div>

                <div className="av-modal-actions">
                  <button
                    type="button"
                    className="av-secondary-btn"
                    onClick={() => setSelected(null)}
                    disabled={saving}
                  >
                    Annuler
                  </button>
                  <button type="submit" className="av-primary-btn" disabled={saving}>
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