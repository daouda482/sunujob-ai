import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api/axios";
import "./JobAlerts.css";

const EMPTY_FORM = {
  title: "",
  keywords: "",
  location: "",
  sector: "",
  contract_type: "",
  is_active: true,
};

const CONTRACTS = [
  { value: "", label: "Tous les contrats" },
  { value: "CDI", label: "CDI" },
  { value: "CDD", label: "CDD" },
  { value: "INTERNSHIP", label: "Stage" },
  { value: "APPRENTICESHIP", label: "Alternance" },
  { value: "FREELANCE", label: "Freelance" },
  { value: "TEMPORARY", label: "Intérim" },
  { value: "VACATION", label: "Vacation" },
];

function getList(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.alerts)) return data.alerts;
  return [];
}

export default function JobAlerts() {
  const [alerts, setAlerts] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadAlerts = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("job-alerts/");
      setAlerts(getList(response.data));
    } catch (err) {
      console.error("Erreur de chargement des alertes :", err);
      setError(
        err.response?.data?.detail ||
          "Impossible de charger vos alertes. Vérifiez que l'API des alertes emploi est disponible."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAlerts();
  }, [loadAlerts]);

  function updateField(event) {
    const { name, value, checked, type } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  function resetForm() {
    setForm(EMPTY_FORM);
    setEditingId(null);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!form.title.trim()) {
      setError("Veuillez donner un nom à votre alerte.");
      return;
    }

    if (
      !form.keywords.trim() &&
      !form.location.trim() &&
      !form.sector.trim() &&
      !form.contract_type
    ) {
      setError("Renseignez au moins un critère de recherche.");
      return;
    }

    const payload = {
      ...form,
      title: form.title.trim(),
      keywords: form.keywords.trim(),
      location: form.location.trim(),
      sector: form.sector.trim(),
    };

    setSaving(true);

    try {
      if (editingId) {
        await api.patch(`job-alerts/${editingId}/`, payload);
        setSuccess("Votre alerte a été mise à jour.");
      } else {
        await api.post("job-alerts/", payload);
        setSuccess("Votre alerte emploi a été créée.");
      }

      resetForm();
      await loadAlerts();
    } catch (err) {
      console.error("Erreur d'enregistrement de l'alerte :", err);

      const data = err.response?.data;
      const firstFieldError =
        data && typeof data === "object"
          ? Object.values(data).flat().find((value) => typeof value === "string")
          : null;

      setError(
        firstFieldError ||
          data?.detail ||
          "Impossible d'enregistrer cette alerte. Vérifiez les données saisies."
      );
    } finally {
      setSaving(false);
    }
  }

  function editAlert(alert) {
    setEditingId(alert.id);
    setForm({
      title: alert.title || "",
      keywords: alert.keywords || "",
      location: alert.location || "",
      sector: alert.sector || "",
      contract_type: alert.contract_type || "",
      is_active: Boolean(alert.is_active),
    });

    setSuccess("");
    setError("");

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function toggleAlert(alert) {
    setError("");
    setSuccess("");

    try {
      await api.patch(`job-alerts/${alert.id}/`, {
        is_active: !alert.is_active,
      });

      setAlerts((previous) =>
        previous.map((item) =>
          item.id === alert.id
            ? { ...item, is_active: !item.is_active }
            : item
        )
      );

      setSuccess(
        alert.is_active
          ? "Alerte désactivée."
          : "Alerte réactivée."
      );
    } catch (err) {
      console.error("Erreur de modification de l'alerte :", err);
      setError("Impossible de modifier le statut de cette alerte.");
    }
  }

  async function deleteAlert(alertId) {
    const confirmed = window.confirm(
      "Voulez-vous vraiment supprimer cette alerte emploi ?"
    );

    if (!confirmed) return;

    setError("");
    setSuccess("");

    try {
      await api.delete(`job-alerts/${alertId}/`);

      setAlerts((previous) =>
        previous.filter((item) => item.id !== alertId)
      );

      if (editingId === alertId) resetForm();

      setSuccess("Alerte supprimée.");
    } catch (err) {
      console.error("Erreur de suppression :", err);
      setError("Impossible de supprimer cette alerte.");
    }
  }

  if (loading) {
    return (
      <main className="alerts-page">
        <div className="alerts-loading">
          <span className="alerts-spinner" />
          <strong>Chargement de vos alertes...</strong>
        </div>
      </main>
    );
  }

  return (
    <main className="alerts-page">
      <section className="alerts-hero">
        <div>
          <span className="alerts-eyebrow">RESTEZ À L'AFFÛT</span>
          <h1>Mes alertes emploi</h1>
          <p>
            Définissez vos critères de recherche pour suivre les nouvelles
            opportunités qui correspondent à votre projet professionnel.
          </p>
        </div>

        <div className="alerts-hero-art" aria-hidden="true">
          <span>♢</span>
          <i />
          <i />
          <i />
        </div>
      </section>

      {error && (
        <div className="alerts-message alerts-message--error" role="alert">
          {error}
        </div>
      )}

      {success && (
        <div className="alerts-message alerts-message--success" role="status">
          {success}
        </div>
      )}

      <section className="alerts-layout">
        <article className="alerts-form-card">
          <div className="alerts-section-heading">
            <span className="alerts-heading-icon">✦</span>
            <div>
              <h2>{editingId ? "Modifier mon alerte" : "Créer une alerte"}</h2>
              <p>Choisissez les critères qui vous intéressent.</p>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <label htmlFor="alert-title">Nom de l'alerte *</label>
            <input
              id="alert-title"
              name="title"
              value={form.title}
              onChange={updateField}
              placeholder="Ex. Développeur web à Dakar"
              maxLength={150}
              required
            />

            <label htmlFor="alert-keywords">Mots-clés</label>
            <input
              id="alert-keywords"
              name="keywords"
              value={form.keywords}
              onChange={updateField}
              placeholder="Ex. React, Python, comptabilité..."
            />

            <label htmlFor="alert-location">Ville ou localisation</label>
            <input
              id="alert-location"
              name="location"
              value={form.location}
              onChange={updateField}
              placeholder="Ex. Dakar, Thiès, Saint-Louis..."
            />

            <label htmlFor="alert-sector">Secteur d'activité</label>
            <input
              id="alert-sector"
              name="sector"
              value={form.sector}
              onChange={updateField}
              placeholder="Ex. Informatique, Banque, Commerce..."
            />

            <label htmlFor="alert-contract">Type de contrat</label>
            <select
              id="alert-contract"
              name="contract_type"
              value={form.contract_type}
              onChange={updateField}
            >
              {CONTRACTS.map((contract) => (
                <option key={contract.value} value={contract.value}>
                  {contract.label}
                </option>
              ))}
            </select>

            <label className="alerts-checkbox">
              <input
                type="checkbox"
                name="is_active"
                checked={form.is_active}
                onChange={updateField}
              />
              <span>Activer cette alerte dès sa création</span>
            </label>

            <div className="alerts-form-actions">
              <button
                type="submit"
                className="alerts-submit"
                disabled={saving}
              >
                {saving
                  ? "Enregistrement..."
                  : editingId
                    ? "Enregistrer les modifications"
                    : "Créer mon alerte"}
              </button>

              {editingId && (
                <button
                  type="button"
                  className="alerts-cancel"
                  onClick={resetForm}
                >
                  Annuler
                </button>
              )}
            </div>
          </form>
        </article>

        <section className="alerts-list-section">
          <div className="alerts-list-heading">
            <div>
              <span className="alerts-list-kicker">VOTRE SURVEILLANCE</span>
              <h2>Mes alertes enregistrées</h2>
            </div>
            <span className="alerts-count">{alerts.length}</span>
          </div>

          {alerts.length === 0 ? (
            <div className="alerts-empty">
              <span>♢</span>
              <h3>Vous n'avez pas encore d'alerte</h3>
              <p>
                Créez votre première alerte pour enregistrer vos critères
                de recherche.
              </p>
              <Link to="/jobs">Parcourir les offres →</Link>
            </div>
          ) : (
            <div className="alerts-list">
              {alerts.map((alert) => (
                <article className="alerts-item" key={alert.id}>
                  <div className="alerts-item-top">
                    <div className="alerts-item-icon">♢</div>
                    <span
                      className={`alerts-status ${
                        alert.is_active
                          ? "alerts-status--active"
                          : "alerts-status--inactive"
                      }`}
                    >
                      {alert.is_active ? "Active" : "Désactivée"}
                    </span>
                  </div>

                  <h3>{alert.title}</h3>

                  <div className="alerts-tags">
                    {alert.keywords && <span>⌕ {alert.keywords}</span>}
                    {alert.location && <span>📍 {alert.location}</span>}
                    {alert.sector && <span>◈ {alert.sector}</span>}
                    {alert.contract_type && (
                      <span>
                        ▣{" "}
                        {CONTRACTS.find(
                          (item) => item.value === alert.contract_type
                        )?.label || alert.contract_type}
                      </span>
                    )}
                  </div>

                  <div className="alerts-item-actions">
                    <button
                      type="button"
                      onClick={() => editAlert(alert)}
                    >
                      Modifier
                    </button>

                    <button
                      type="button"
                      onClick={() => toggleAlert(alert)}
                    >
                      {alert.is_active ? "Désactiver" : "Activer"}
                    </button>

                    <button
                      type="button"
                      className="alerts-delete"
                      onClick={() => deleteAlert(alert.id)}
                    >
                      Supprimer
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}