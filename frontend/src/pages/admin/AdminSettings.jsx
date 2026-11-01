import { useCallback, useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Globe, Mail, Phone, Save, Settings2, Clock3, RefreshCw } from "lucide-react";
import api from "../../api/axios";
import "./adminSettings.css";

const INITIAL_SETTINGS = {
  platform_name: "SunuJob AI",
  support_email: "",
  support_phone: "",
  website_url: "",
  support_hours: "",
  welcome_message: "Connectez les talents aux opportunités.",
  footer_text: "Conçu au Sénégal 🇸🇳",
  default_page_size: 20,
};

function formatDate(value) {
  if (!value) return "Jamais";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" });
}

export default function AdminSettings() {
  const [form, setForm] = useState(INITIAL_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [updatedAt, setUpdatedAt] = useState(null);
  const [updatedBy, setUpdatedBy] = useState("—");

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get("admin/platform-settings/");
      setForm({
        platform_name: data.platform_name ?? INITIAL_SETTINGS.platform_name,
        support_email: data.support_email ?? "",
        support_phone: data.support_phone ?? "",
        website_url: data.website_url ?? "",
        support_hours: data.support_hours ?? "",
        welcome_message: data.welcome_message ?? "",
        footer_text: data.footer_text ?? "",
        default_page_size: Number(data.default_page_size ?? 20),
      });
      setUpdatedAt(data.updated_at ?? null);
      setUpdatedBy(data.updated_by_email ?? "—");
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Impossible de charger les paramètres. Vérifiez la route Django et vos droits administrateur."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({
      ...current,
      [name]: name === "default_page_size" ? value : value,
    }));
    setNotice("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");

    const payload = {
      ...form,
      default_page_size: Number(form.default_page_size),
    };

    try {
      const { data } = await api.patch("admin/platform-settings/", payload);
      setForm({
        platform_name: data.platform_name ?? INITIAL_SETTINGS.platform_name,
        support_email: data.support_email ?? "",
        support_phone: data.support_phone ?? "",
        website_url: data.website_url ?? "",
        support_hours: data.support_hours ?? "",
        welcome_message: data.welcome_message ?? "",
        footer_text: data.footer_text ?? "",
        default_page_size: Number(data.default_page_size ?? 20),
      });
      setUpdatedAt(data.updated_at ?? null);
      setUpdatedBy(data.updated_by_email ?? "—");
      setNotice("Les paramètres ont été enregistrés avec succès.");
    } catch (err) {
      const data = err.response?.data;
      const details = data && typeof data === "object"
        ? Object.entries(data).map(([key, value]) => `${key} : ${Array.isArray(value) ? value.join(", ") : value}`).join(" | ")
        : "";
      setError(details || data?.detail || "L'enregistrement des paramètres a échoué.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="admin-settings-page">
        <div className="admin-settings-loading"><RefreshCw size={22} /> Chargement des paramètres…</div>
      </main>
    );
  }

  return (
    <main className="admin-settings-page">
      <div className="admin-settings-wrap">
        <header className="admin-settings-header">
          <div className="admin-settings-heading-icon"><Settings2 size={26} /></div>
          <div>
            <p className="admin-settings-eyebrow">ESPACE ADMINISTRATION</p>
            <h1>Paramètres de la plateforme</h1>
            <p>Centralisez les informations générales et les coordonnées de SunuJob AI.</p>
          </div>
          <button type="button" className="admin-settings-refresh" onClick={loadSettings} disabled={saving}>
            <RefreshCw size={16} /> Actualiser
          </button>
        </header>

        {error && <div className="admin-settings-alert is-error" role="alert"><AlertCircle size={18} />{error}</div>}
        {notice && <div className="admin-settings-alert is-success" role="status"><CheckCircle2 size={18} />{notice}</div>}

        <section className="admin-settings-overview">
          <div className="admin-settings-overview-icon"><Globe size={23} /></div>
          <div>
            <strong>{form.platform_name || "SunuJob AI"}</strong>
            <p>Les modifications sont enregistrées dans la base de données et consultables par les administrateurs autorisés.</p>
            <small>Dernière modification : {formatDate(updatedAt)} · Par : {updatedBy}</small>
          </div>
        </section>

        <form className="admin-settings-form" onSubmit={handleSubmit}>
          <section className="admin-settings-card">
            <div className="admin-settings-card-heading">
              <div className="admin-settings-card-icon"><Globe size={20} /></div>
              <div><h2>Identité de la plateforme</h2><p>Nom et informations présentées aux utilisateurs.</p></div>
            </div>
            <div className="admin-settings-grid">
              <label className="admin-settings-field">
                <span>Nom de la plateforme *</span>
                <input name="platform_name" value={form.platform_name} onChange={updateField} required maxLength={120} />
              </label>
              <label className="admin-settings-field">
                <span>Site web</span>
                <input name="website_url" type="url" value={form.website_url} onChange={updateField} placeholder="https://exemple.sn" />
              </label>
              <label className="admin-settings-field admin-settings-field-wide">
                <span>Message d'accueil</span>
                <textarea name="welcome_message" value={form.welcome_message} onChange={updateField} maxLength={500} rows={3} placeholder="Message de présentation de la plateforme" />
              </label>
              <label className="admin-settings-field admin-settings-field-wide">
                <span>Texte du pied de page</span>
                <input name="footer_text" value={form.footer_text} onChange={updateField} maxLength={255} placeholder="Conçu au Sénégal 🇸🇳" />
              </label>
            </div>
          </section>

          <section className="admin-settings-card">
            <div className="admin-settings-card-heading">
              <div className="admin-settings-card-icon"><LifeBuoyFallback /></div>
              <div><h2>Coordonnées du support</h2><p>Informations de contact que l'équipe pourra communiquer aux utilisateurs.</p></div>
            </div>
            <div className="admin-settings-grid">
              <label className="admin-settings-field">
                <span><Mail size={15} /> Adresse e-mail</span>
                <input name="support_email" type="email" value={form.support_email} onChange={updateField} maxLength={254} placeholder="support@sunujob.sn" />
              </label>
              <label className="admin-settings-field">
                <span><Phone size={15} /> Téléphone</span>
                <input name="support_phone" type="tel" value={form.support_phone} onChange={updateField} maxLength={40} placeholder="+221 …" />
              </label>
              <label className="admin-settings-field admin-settings-field-wide">
                <span><Clock3 size={15} /> Horaires de disponibilité</span>
                <input name="support_hours" value={form.support_hours} onChange={updateField} maxLength={180} placeholder="Ex. : du lundi au vendredi, 9 h–17 h" />
              </label>
            </div>
          </section>

          <section className="admin-settings-card">
            <div className="admin-settings-card-heading">
              <div className="admin-settings-card-icon"><Settings2 size={20} /></div>
              <div><h2>Préférences générales</h2><p>Valeur de référence pour les futurs écrans paginés.</p></div>
            </div>
            <label className="admin-settings-field admin-settings-page-size">
              <span>Taille de page par défaut</span>
              <input name="default_page_size" type="number" min="10" max="100" value={form.default_page_size} onChange={updateField} required />
              <small>Choisissez une valeur comprise entre 10 et 100. Ce paramètre est enregistré, mais doit être relié explicitement aux autres listes pour modifier leur pagination.</small>
            </label>
          </section>

          <div className="admin-settings-form-actions">
            <button type="submit" className="admin-settings-save" disabled={saving}>
              <Save size={17} /> {saving ? "Enregistrement…" : "Enregistrer les paramètres"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}

function LifeBuoyFallback() {
  return <Settings2 size={20} />;
}
