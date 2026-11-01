import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  BadgeCheck,
  Building2,
  CheckCircle2,
  Clock3,
  FileText,
  ShieldCheck,
  UploadCloud,
  XCircle,
} from "lucide-react";

import api from "../../api/axios";
import "./companyVerification.css";

const STATUS_LABELS = {
  PENDING: "En attente",
  APPROVED: "Approuvée",
  REJECTED: "Rejetée",
};

function normalizeList(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.companies)) return data.companies;
  return [];
}

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

    if (Array.isArray(first) && first.length) {
      return String(first[0]);
    }

    if (typeof first === "string") return first;
  }

  if (error?.response?.status === 401) {
    return "Votre session a expiré. Reconnectez-vous.";
  }

  if (error?.response?.status === 403) {
    return "Cette page est réservée aux recruteurs autorisés.";
  }

  return "Une erreur est survenue. Vérifiez le serveur et réessayez.";
}

export default function CompanyVerification() {
  const [companies, setCompanies] = useState([]);
  const [requests, setRequests] = useState([]);

  const [companyId, setCompanyId] = useState("");
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [document, setDocument] = useState(null);

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [companiesResponse, requestsResponse] = await Promise.all([
        api.get("companies/"),
        api.get("recruiter/company-verification/"),
      ]);

      const companyList = normalizeList(companiesResponse.data);

      setCompanies(companyList);
      setRequests(normalizeList(requestsResponse.data));

      setCompanyId((current) => {
        if (current && companyList.some(
          (company) => String(company.id) === current
        )) {
          return current;
        }

        return companyList.length ? String(companyList[0].id) : "";
      });
    } catch (err) {
      setError(getError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const companyName = (company) =>
    company?.name ||
    company?.company_name ||
    company?.nom ||
    `Entreprise ${company?.id}`;

  const hasPendingRequest = requests.some(
    (item) =>
      String(item.company) === String(companyId) &&
      item.status === "PENDING"
  );

  const selectedCompanyVerified = companies.some(
    (company) =>
      String(company.id) === String(companyId) &&
      Boolean(company.is_verified)
  );

  async function handleSubmit(event) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!companyId) {
      setError("Sélectionnez une entreprise.");
      return;
    }

    if (!registrationNumber.trim()) {
      setError("Renseignez le numéro d'immatriculation.");
      return;
    }

    if (!document) {
      setError("Joignez un justificatif avant de soumettre la demande.");
      return;
    }

    const extension = document.name
      .split(".")
      .pop()
      .toLowerCase();

    if (!["pdf", "jpg", "jpeg", "png"].includes(extension)) {
      setError("Formats acceptés : PDF, JPG, JPEG et PNG.");
      return;
    }

    if (document.size > 5 * 1024 * 1024) {
      setError("Le justificatif ne doit pas dépasser 5 Mo.");
      return;
    }

    const formData = new FormData();
    formData.append("company", companyId);
    formData.append("registration_number", registrationNumber.trim());
    formData.append("document", document);

    setSending(true);

    try {
      await api.post("recruiter/company-verification/", formData);

      setSuccess(
        "Votre demande a été transmise à l'équipe de vérification."
      );

      setRegistrationNumber("");
      setDocument(null);

      const fileInput = document.getElementById("verification-document");

      if (fileInput) fileInput.value = "";

      await loadData();
    } catch (err) {
      setError(getError(err));
    } finally {
      setSending(false);
    }
  }

  return (
    <main className="company-verification-page">
      <header className="cv-hero">
        <div className="cv-hero-copy">
          <span className="cv-eyebrow">
            <ShieldCheck size={15} />
            ESPACE RECRUTEUR · CONFIANCE ET AUTHENTICITÉ
          </span>

          <h1>Faire vérifier mon entreprise</h1>

          <p>
            Transmettez un justificatif d'immatriculation pour permettre
            à l'équipe SunuJob AI d'examiner les informations de votre
            entreprise.
          </p>

          <div className="cv-trust-line">
            <span><CheckCircle2 size={16} /> Examen par l'administration</span>
            <span><ShieldCheck size={16} /> Justificatif réservé à la vérification</span>
          </div>
        </div>

        <div className="cv-hero-art" aria-hidden="true">
          <div className="cv-hero-circle">
            <Building2 size={40} />
            <BadgeCheck size={23} />
          </div>
        </div>
      </header>

      {error && (
        <div className="cv-alert cv-alert-error" role="alert">
          <XCircle size={19} />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="cv-alert cv-alert-success" role="status">
          <CheckCircle2 size={19} />
          <span>{success}</span>
        </div>
      )}

      <div className="cv-content-grid">
        <section className="cv-form-card">
          <div className="cv-card-heading">
            <span className="cv-card-heading-icon">
              <FileText size={22} />
            </span>
            <div>
              <h2>Constituer un dossier</h2>
              <p>Les informations saisies seront examinées par un administrateur.</p>
            </div>
          </div>

          {loading ? (
            <div className="cv-loading">Chargement des entreprises et des demandes…</div>
          ) : (
            <form className="cv-form" onSubmit={handleSubmit}>
              <label>
                Entreprise concernée
                <select
                  value={companyId}
                  onChange={(event) => setCompanyId(event.target.value)}
                  required
                  disabled={companies.length === 0 || sending}
                >
                  <option value="">Sélectionnez une entreprise</option>
                  {companies.map((company) => (
                    <option key={company.id} value={String(company.id)}>
                      {companyName(company)}
                    </option>
                  ))}
                </select>
              </label>

              {companies.length === 0 && (
                <p className="cv-field-hint">
                  Aucune entreprise n'est disponible dans votre espace.
                  Créez d'abord votre profil d'entreprise.
                </p>
              )}

              {selectedCompanyVerified && (
                <div className="cv-alert cv-alert-success">
                  <BadgeCheck size={18} />
                  Cette entreprise apparaît déjà comme vérifiée.
                </div>
              )}

              {hasPendingRequest && (
                <div className="cv-alert cv-alert-warning">
                  <Clock3 size={18} />
                  Une demande est déjà en attente pour cette entreprise.
                </div>
              )}

              <label>
                Numéro d'immatriculation
                <input
                  value={registrationNumber}
                  onChange={(event) => setRegistrationNumber(event.target.value)}
                  maxLength={100}
                  placeholder="Ex. : numéro RCCM ou autre identifiant officiel"
                  required
                  disabled={sending}
                />
                <small>
                  Saisissez le numéro tel qu'il figure sur le justificatif.
                </small>
              </label>

              <label className="cv-upload-field">
                Justificatif officiel
                <span className="cv-upload-box">
                  <UploadCloud size={27} />
                  <strong>
                    {document ? document.name : "Sélectionner un document"}
                  </strong>
                  <small>PDF, JPG ou PNG — 5 Mo maximum</small>
                  <input
                    id="verification-document"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                    onChange={(event) =>
                      setDocument(event.target.files?.[0] || null)
                    }
                    required
                    disabled={sending}
                  />
                </span>
              </label>

              <div className="cv-security-note">
                <ShieldCheck size={18} />
                <span>
                  Le justificatif est envoyé à l'administration pour
                  vérification. Ne joignez que les documents nécessaires
                  à cette démarche.
                </span>
              </div>

              <button
                className="cv-primary-btn"
                type="submit"
                disabled={
                  sending ||
                  loading ||
                  !companyId ||
                  hasPendingRequest ||
                  selectedCompanyVerified
                }
              >
                {sending ? "Transmission en cours…" : "Soumettre le dossier"}
              </button>
            </form>
          )}
        </section>

        <aside className="cv-side-column">
          <section className="cv-info-card">
            <span className="cv-info-icon"><ShieldCheck size={22} /></span>
            <h3>Pourquoi faire vérifier votre entreprise ?</h3>
            <p>
              Cette démarche aide l'équipe à examiner les informations
              professionnelles transmises sur votre entreprise.
            </p>
            <div className="cv-info-list">
              <span><CheckCircle2 size={16} /> Informations cohérentes</span>
              <span><CheckCircle2 size={16} /> Justificatif lisible</span>
              <span><CheckCircle2 size={16} /> Décision documentée</span>
            </div>
          </section>

          <section className="cv-history-card">
            <div className="cv-history-heading">
              <div>
                <span className="cv-section-kicker">SUIVI</span>
                <h3>Mes demandes</h3>
              </div>
              <span className="cv-history-count">{requests.length}</span>
            </div>

            {loading ? (
              <p className="cv-history-empty">Chargement…</p>
            ) : requests.length === 0 ? (
              <p className="cv-history-empty">
                Vous n'avez pas encore soumis de demande de vérification.
              </p>
            ) : (
              <div className="cv-request-list">
                {requests.map((request) => (
                  <article className="cv-request-item" key={request.id}>
                    <div className="cv-request-top">
                      <strong>{request.company_name}</strong>
                      <span className={`cv-status cv-status-${request.status.toLowerCase()}`}>
                        {STATUS_LABELS[request.status] || request.status}
                      </span>
                    </div>

                    <small>
                      Demande du {formatDate(request.created_at)}
                    </small>

                    {request.admin_notes && (
                      <p className="cv-admin-note">
                        <strong>Note de l'administration :</strong>{" "}
                        {request.admin_notes}
                      </p>
                    )}
                  </article>
                ))}
              </div>
            )}
          </section>

          <Link to="/recruiter/company" className="cv-back-link">
            ← Retour au profil de mon entreprise
          </Link>
        </aside>
      </div>
    </main>
  );
}