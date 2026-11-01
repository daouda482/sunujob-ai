
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api";
import "./RecruiterCompanies.css";

const EMPTY_FORM = {
  name: "",
  sector: "",
  description: "",
  website: "",
  email: "",
  phone: "",
  address: "",
  city: "",
  country: "Sénégal",
};

const FIELDS = [
  { name: "name", label: "Nom de l'entreprise", placeholder: "Ex. SunuTech", required: true },
  { name: "sector", label: "Secteur d'activité", placeholder: "Ex. Informatique, Banque, Commerce", required: true },
  { name: "email", label: "E-mail professionnel", placeholder: "contact@entreprise.sn", type: "email" },
  { name: "phone", label: "Téléphone", placeholder: "+221 77 000 00 00", type: "tel" },
  { name: "website", label: "Site web", placeholder: "https://www.entreprise.sn", type: "url" },
  { name: "address", label: "Adresse", placeholder: "Adresse du siège social" },
  { name: "city", label: "Ville", placeholder: "Ex. Dakar" },
  { name: "country", label: "Pays", placeholder: "Ex. Sénégal" },
];


function getErrorMessage(error) {
  const data = error?.response?.data;

  if (data?.code === "token_not_valid") {
    return "Votre session n'est plus valide. Reconnectez-vous pour continuer.";
  }

  if (data && typeof data === "object") {
    const messages = [];

    for (const [field, value] of Object.entries(data)) {
      const label = field === "detail" ? "" : `${field} : `;

      if (Array.isArray(value)) {
        messages.push(
          ...value.map((item) =>
            typeof item === "object"
              ? `${label}${item.message || JSON.stringify(item)}`
              : `${label}${item}`
          )
        );
      } else if (value && typeof value === "object") {
        messages.push(`${label}${JSON.stringify(value)}`);
      } else {
        messages.push(`${label}${value}`);
      }
    }

    if (messages.length) return messages.join("\n");
  }

  if (error?.response?.status === 401) {
    return "Authentification refusée. Reconnectez-vous et réessayez.";
  }

  if (error?.response?.status === 403) {
    return "Cette action est réservée aux recruteurs. Vérifiez le rôle de votre compte.";
  }

  if (!error?.response) {
    return "Le serveur Django est injoignable. Vérifiez qu'il est démarré.";
  }

  return "La requête a échoué. Vérifiez les informations et réessayez.";
}

function getInitials(name = "") {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("") || "E";
}

export default function RecruiterCompanies() {
  const [companies, setCompanies] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadCompanies = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("companies/");
      const results = Array.isArray(response.data)
        ? response.data
        : response.data?.results;

      setCompanies(Array.isArray(results) ? results : []);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCompanies();
  }, [loadCompanies]);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
    setError("");
    setSuccess("");
  }

  function resetForm() {
    setForm(EMPTY_FORM);
    setEditingId(null);
  }

  function startEditing(company) {
    setForm({
      name: company.name || "",
      sector: company.sector || "",
      description: company.description || "",
      website: company.website || "",
      email: company.email || "",
      phone: company.phone || "",
      address: company.address || "",
      city: company.city || "",
      country: company.country || "Sénégal",
    });
    setEditingId(company.id);
    setError("");
    setSuccess("");

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    const payload = Object.fromEntries(
      Object.entries(form).map(([key, value]) => [key, value.trim()])
    );

    try {
      if (editingId !== null) {
        await api.patch(`companies/${editingId}/`, payload);
        setSuccess("Les informations de votre entreprise ont été mises à jour.");
      } else {
        await api.post("companies/", payload);
        setSuccess("Votre entreprise a été enregistrée avec succès.");
      }

      resetForm();
      await loadCompanies();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(company) {
    const confirmed = window.confirm(
      `Voulez-vous vraiment supprimer l'entreprise « ${company.name} » ?`
    );

    if (!confirmed) return;

    setDeletingId(company.id);
    setError("");
    setSuccess("");

    try {
      await api.delete(`companies/${company.id}/`);
      setCompanies((previous) =>
        previous.filter((item) => item.id !== company.id)
      );

      if (editingId === company.id) resetForm();

      setSuccess("L'entreprise a été supprimée.");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <main className="companies-page">
      <div className="companies-container">
        <header className="companies-topbar">
          <Link to="/recruiter/dashboard" className="companies-back">
            <span aria-hidden="true">←</span> Tableau de bord
          </Link>

          <span className="companies-topbar-label">
            <span className="companies-status-dot" />
            Espace recruteur
          </span>
        </header>

        <section className="companies-hero">
          <div className="companies-hero-copy">
            <span className="companies-eyebrow">VOTRE ESPACE ENTREPRISE</span>
            <h1>Valorisez votre entreprise.</h1>
            <p>
              Présentez votre organisation, inspirez confiance aux candidats
              et préparez vos prochaines campagnes de recrutement sur SunuJob AI.
            </p>

            <div className="companies-hero-points">
              <span><span>✓</span> Profil professionnel</span>
              <span><span>✓</span> Informations centralisées</span>
              <span><span>✓</span> Gestion simplifiée</span>
            </div>
          </div>

          <div className="companies-hero-visual" aria-hidden="true">
            <div className="companies-orbit companies-orbit-one" />
            <div className="companies-orbit companies-orbit-two" />
            <div className="companies-hero-icon">▦</div>
            <div className="companies-floating-card companies-floating-card-top">
              <span className="companies-floating-symbol">✓</span>
              <span><strong>Profil entreprise</strong><small>Votre identité professionnelle</small></span>
            </div>
            <div className="companies-floating-card companies-floating-card-bottom">
              <span className="companies-mini-avatars">S&nbsp;J</span>
              <span><strong>Recrutez mieux</strong><small>Avec SunuJob AI</small></span>
            </div>
          </div>
        </section>

        <section className="companies-stats" aria-label="Statistiques">
          <article className="companies-stat-card">
            <span className="companies-stat-icon companies-stat-blue">▦</span>
            <div>
              <p>Mes entreprises</p>
              <strong>{companies.length}</strong>
            </div>
          </article>
          <article className="companies-stat-card">
            <span className="companies-stat-icon companies-stat-green">✓</span>
            <div>
              <p>Profils enregistrés</p>
              <strong>{companies.length}</strong>
            </div>
          </article>
          <article className="companies-stat-card">
            <span className="companies-stat-icon companies-stat-purple">↗</span>
            <div>
              <p>Gestion du profil</p>
              <strong>En ligne</strong>
            </div>
          </article>
        </section>

        {error && (
          <div className="companies-alert companies-alert-error" role="alert">
            <span className="companies-alert-symbol">!</span>
            <div>
              <strong>Une difficulté est survenue</strong>
              <p>{error}</p>
            </div>
            <button type="button" onClick={() => setError("")} aria-label="Fermer">
              ×
            </button>
          </div>
        )}

        {success && (
          <div className="companies-alert companies-alert-success" role="status">
            <span className="companies-alert-symbol">✓</span>
            <p>{success}</p>
            <button type="button" onClick={() => setSuccess("")} aria-label="Fermer">
              ×
            </button>
          </div>
        )}

        <div className="companies-content-grid">
          <section className="companies-panel companies-form-panel">
            <div className="companies-panel-heading">
              <div>
                <span className="companies-section-kicker">
                  {editingId !== null ? "MODIFICATION" : "NOUVEAU PROFIL"}
                </span>
                <h2>{editingId !== null ? "Modifier l'entreprise" : "Créer mon entreprise"}</h2>
                <p>Complétez les informations ci-dessous.</p>
              </div>
              <span className="companies-heading-icon">✎</span>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="companies-form-grid">
                {FIELDS.map((field) => (
                  <div
                    className={`companies-field ${field.name === "name" || field.name === "sector" ? "companies-field-required" : ""}`}
                    key={field.name}
                  >
                    <label htmlFor={`company-${field.name}`}>
                      {field.label}
                      {field.required && <span className="companies-required"> *</span>}
                    </label>
                    <input
                      id={`company-${field.name}`}
                      name={field.name}
                      type={field.type || "text"}
                      value={form[field.name]}
                      onChange={handleChange}
                      placeholder={field.placeholder}
                      required={Boolean(field.required)}
                      maxLength={field.name === "name" ? 200 : undefined}
                    />
                  </div>
                ))}

                <div className="companies-field companies-field-full">
                  <label htmlFor="company-description">Présentation de l'entreprise</label>
                  <textarea
                    id="company-description"
                    name="description"
                    value={form.description}
                    onChange={handleChange}
                    placeholder="Présentez votre activité, votre mission, vos valeurs et votre environnement de travail..."
                    rows={5}
                  />
                  <small>Une présentation claire aide les candidats à mieux vous connaître.</small>
                </div>
              </div>

              <div className="companies-form-footer">
                <p><span>*</span> Champs obligatoires</p>
                <div className="companies-form-actions">
                  {editingId !== null && (
                    <button
                      type="button"
                      className="companies-btn companies-btn-secondary"
                      onClick={resetForm}
                      disabled={saving}
                    >
                      Annuler
                    </button>
                  )}
                  <button
                    type="submit"
                    className="companies-btn companies-btn-primary"
                    disabled={saving}
                  >
                    {saving ? (
                      <><span className="companies-spinner" /> Enregistrement...</>
                    ) : (
                      <>{editingId !== null ? "Enregistrer les modifications" : "Créer l'entreprise"} <span>→</span></>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </section>

          <aside className="companies-side-column">
            <section className="companies-panel companies-list-panel">
              <div className="companies-panel-heading companies-list-heading">
                <div>
                  <span className="companies-section-kicker">VOTRE ORGANISATION</span>
                  <h2>Mes entreprises</h2>
                  <p>Les profils associés à votre compte.</p>
                </div>
                <span className="companies-count">{companies.length}</span>
              </div>

              {loading ? (
                <div className="companies-loading">
                  <span className="companies-spinner companies-spinner-dark" />
                  <p>Chargement des entreprises...</p>
                </div>
              ) : companies.length === 0 ? (
                <div className="companies-empty">
                  <div className="companies-empty-icon">▦</div>
                  <h3>Aucune entreprise pour le moment</h3>
                  <p>Créez votre premier profil avec le formulaire pour centraliser vos informations.</p>
                  <span className="companies-empty-tip">Commencez par renseigner le nom et le secteur.</span>
                </div>
              ) : (
                <div className="companies-list">
                  {companies.map((company) => (
                    <article className="companies-item" key={company.id}>
                      <div className="companies-company-avatar">
                        {getInitials(company.name)}
                      </div>
                      <div className="companies-item-main">
                        <h3>{company.name}</h3>
                        <p>{company.sector}</p>
                        <span className="companies-item-location">
                          <span>⌖</span> {[company.city, company.country].filter(Boolean).join(", ") || "Localisation non renseignée"}
                        </span>
                        <div className="companies-item-actions">
                          <button type="button" onClick={() => startEditing(company)}>
                            Modifier
                          </button>
                          <button
                            type="button"
                            className="companies-delete-button"
                            onClick={() => handleDelete(company)}
                            disabled={deletingId === company.id}
                          >
                            {deletingId === company.id ? "Suppression..." : "Supprimer"}
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}

              <button
                type="button"
                className="companies-refresh-button"
                onClick={loadCompanies}
                disabled={loading}
              >
                ↻ Actualiser la liste
              </button>
            </section>

            <section className="companies-help-card">
              <div className="companies-help-icon">✦</div>
              <h3>Un profil complet inspire confiance</h3>
              <p>
                Ajoutez une description, une adresse et des coordonnées
                professionnelles pour présenter votre entreprise clairement.
              </p>
              <div className="companies-help-line" />
              <span>SUNUJOB AI <span>•</span> RECRUTEMENT INTELLIGENT</span>
            </section>
          </aside>
        </div>

        <footer className="companies-page-footer">
          <span>© {new Date().getFullYear()} SunuJob AI</span>
          <span>Conçu au Sénégal 🇸🇳 pour connecter les talents aux opportunités.</span>
        </footer>
      </div>
    </main>
  );
}
