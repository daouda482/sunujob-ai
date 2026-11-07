
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api.js";
import "./CandidateProfile.css";

/* =========================================================
   CONFIGURATION
========================================================= */

const initialForm = {
  photo: null,
  resume: null,
  date_of_birth: "",
  address: "",
  city: "",
  country: "Sénégal",
  education_level: "",
  field_of_study: "",
  years_of_experience: "0",
  biography: "",
  availability: "AVAILABLE",
};

const educationOptions = [
  { value: "BFEM", label: "BFEM" },
  { value: "BAC", label: "Baccalauréat" },
  { value: "BAC_PLUS_2", label: "Bac +2" },
  { value: "BAC_PLUS_3", label: "Bac +3 / Licence" },
  { value: "BAC_PLUS_4", label: "Bac +4" },
  { value: "MASTER", label: "Master" },
  { value: "DOCTORATE", label: "Doctorat" },
  { value: "OTHER", label: "Autre" },
];

/* =========================================================
   FONCTIONS UTILITAIRES
========================================================= */

const isBrowserFile = (value) =>
  typeof File !== "undefined" && value instanceof File;

function getErrorMessage(error) {
  const data = error?.response?.data;

  if (data && typeof data === "object") {
    return Object.entries(data)
      .map(([field, messages]) => {
        const text = Array.isArray(messages)
          ? messages
              .map((message) =>
                typeof message === "string"
                  ? message
                  : JSON.stringify(message)
              )
              .join(" ")
          : typeof messages === "string"
            ? messages
            : JSON.stringify(messages);

        return `${field} : ${text}`;
      })
      .join(" | ");
  }

  if (error?.request) {
    return "Le serveur n'a pas répondu. Vérifie que Django fonctionne sur le port 8000.";
  }

  return error?.message || "Une erreur inattendue est survenue.";
}

/* =========================================================
   COMPOSANT PRINCIPAL
========================================================= */

export default function CandidateProfile() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [checkingProfile, setCheckingProfile] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [existingProfile, setExistingProfile] = useState(false);

  /* =========================================================
     CHARGEMENT DU PROFIL EXISTANT
  ========================================================= */

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      try {
        const response = await api.get("candidates/profile/me/");

        if (!active || !response.data) return;

        const profile = response.data;

        setExistingProfile(true);

        setFormData((previous) => ({
          ...previous,

          // Les fichiers déjà enregistrés ne sont pas
          // des objets File. Ils ne doivent pas être renvoyés.
          photo: null,
          resume: null,

          date_of_birth: profile.date_of_birth || "",
          address: profile.address || "",
          city: profile.city || "",
          country: profile.country || "Sénégal",
          education_level: profile.education_level || "",
          field_of_study: profile.field_of_study || "",
          years_of_experience: String(
            profile.years_of_experience ?? 0
          ),
          biography: profile.biography || "",
          availability: profile.availability || "AVAILABLE",
        }));
      } catch (err) {
        if (!active) return;

        if (err.response?.status === 401) {
          navigate("/login", { replace: true });
          return;
        }

        // Un profil inexistant correspond à une première création.
        if (err.response?.status === 404) {
          setExistingProfile(false);
        } else {
          console.error(
            "Impossible de charger le profil :",
            err.response?.data || err.message
          );

          setError(
            "Impossible de charger ton profil. Tu peux vérifier ta connexion et réessayer."
          );
        }
      } finally {
        if (active) {
          setCheckingProfile(false);
        }
      }
    }

    loadProfile();

    return () => {
      active = false;
    };
  }, [navigate]);

  /* =========================================================
     MODIFICATION DES CHAMPS
  ========================================================= */

  function handleChange(event) {
    const { name, value, type, files } = event.target;

    if (type === "file") {
      const file = files?.length ? files[0] : null;

      setFormData((previous) => ({
        ...previous,
        [name]: file,
      }));

      setError("");
      setSuccess("");
      return;
    }

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));

    setError("");
    setSuccess("");
  }

  /* =========================================================
     VALIDATION DES FICHIERS
  ========================================================= */

  function validateFiles() {
    const { photo, resume } = formData;

    if (photo !== null && !isBrowserFile(photo)) {
      return "La photo sélectionnée n'est pas un fichier valide. Sélectionne-la à nouveau depuis ton ordinateur.";
    }

    if (resume !== null && !isBrowserFile(resume)) {
      return "Le CV sélectionné n'est pas un fichier valide. Sélectionne-le à nouveau depuis ton ordinateur.";
    }

    if (photo) {
      if (!photo.type.startsWith("image/")) {
        return "La photo doit être un fichier image.";
      }

      if (photo.size > 2 * 1024 * 1024) {
        return "La photo ne doit pas dépasser 2 Mo.";
      }
    }

    if (resume) {
      if (!/\.(pdf|doc|docx)$/i.test(resume.name)) {
        return "Le CV doit être au format PDF, DOC ou DOCX.";
      }

      if (resume.size > 5 * 1024 * 1024) {
        return "Le CV ne doit pas dépasser 5 Mo.";
      }
    }

    return "";
  }

  /* =========================================================
     ENREGISTREMENT DU PROFIL
  ========================================================= */

  async function handleSubmit(event) {
    event.preventDefault();

    if (loading) return;

    // On conserve la référence du formulaire avant le await.
    // Cela permet de le réinitialiser correctement après la requête.
    const formElement = event.currentTarget;

    setError("");
    setSuccess("");

    const fileError = validateFiles();

    if (fileError) {
      setError(fileError);
      return;
    }

    setLoading(true);

    try {
      const payload = new FormData();

      // Ajouter les champs textuels et numériques.
      Object.entries(formData).forEach(([key, value]) => {
        if (key === "photo" || key === "resume") {
          return;
        }

        if (value !== null && value !== undefined && value !== "") {
          payload.append(key, String(value));
        }
      });

      // Ajouter uniquement les véritables fichiers.
      if (isBrowserFile(formData.photo)) {
        payload.append(
          "photo",
          formData.photo,
          formData.photo.name
        );
      }

      if (isBrowserFile(formData.resume)) {
        payload.append(
          "resume",
          formData.resume,
          formData.resume.name
        );
      }

      const endpoint = existingProfile
        ? "candidates/profile/me/"
        : "candidates/profile/";

      // Ne pas définir manuellement Content-Type.
      // Le navigateur et Axios gèrent le multipart/form-data.
      if (existingProfile) {
        await api.patch(endpoint, payload);
      } else {
        await api.post(endpoint, payload);
      }

      setExistingProfile(true);

      setSuccess(
        "Ton profil candidat a été enregistré avec succès."
      );

      // Réinitialiser uniquement les champs fichiers.
      setFormData((previous) => ({
        ...previous,
        photo: null,
        resume: null,
      }));

      // Réinitialiser les champs fichier visibles.
      formElement.reset();
    } catch (err) {
      console.error(
        "Erreur lors de l'enregistrement du profil :",
        err.response?.data || err.message
      );

      if (err.response?.status === 401) {
        setError(
          "Ta session a expiré. Veuillez te reconnecter."
        );
      } else {
        setError(getErrorMessage(err));
      }
    } finally {
      setLoading(false);
    }
  }

  /* =========================================================
     ÉCRAN DE CHARGEMENT
  ========================================================= */

  if (checkingProfile) {
    return (
      <main className="candidate-profile-page">
        <div className="cp-loading">
          <span className="cp-spinner" />
          Chargement de ton profil...
        </div>
      </main>
    );
  }

  /* =========================================================
     AFFICHAGE DU FORMULAIRE
  ========================================================= */

  return (
    <main className="candidate-profile-page">
      <div className="cp-container">

        {/* EN-TÊTE */}

        <header className="cp-header">
          <div className="cp-brand">
            <span className="cp-brand-icon">SJ</span>

            <span>
              <strong>SunuJob AI</strong>
              <small>
                Ton avenir professionnel commence ici
              </small>
            </span>
          </div>

          <button
            type="button"
            className="cp-back-button"
            onClick={() => navigate("/candidate/dashboard")}
          >
            ← Tableau de bord
          </button>
        </header>

        {/* INTRODUCTION */}

        <section className="cp-intro">
          <span className="cp-eyebrow">
            ESPACE CANDIDAT
          </span>

          <h1>
            {existingProfile
              ? "Mets à jour ton profil"
              : "Construis ton profil professionnel"}
          </h1>

          <p>
            Complète tes informations pour permettre aux recruteurs
            de mieux connaître ton parcours et faciliter tes
            opportunités professionnelles.
          </p>
        </section>

        <div className="cp-layout">

          {/* BARRE LATÉRALE */}

          <aside className="cp-sidebar">
            <div className="cp-sidebar-icon">✦</div>

            <h2>
              Un profil complet, plus d'opportunités
            </h2>

            <p>
              Présente tes compétences, ton parcours et ton CV pour
              améliorer la visibilité de ta candidature.
            </p>

            <div className="cp-benefit">
              <span>✓</span>

              <div>
                <strong>Profil professionnel</strong>
                <small>Valorise ton parcours</small>
              </div>
            </div>

            <div className="cp-benefit">
              <span>✓</span>

              <div>
                <strong>CV accessible</strong>
                <small>Prépare tes candidatures</small>
              </div>
            </div>

            <div className="cp-benefit">
              <span>✓</span>

              <div>
                <strong>Recommandations IA</strong>
                <small>Découvre des offres pertinentes</small>
              </div>
            </div>

            <div className="cp-country-note">
              🇸🇳 Une plateforme conçue au Sénégal
            </div>
          </aside>

          {/* FORMULAIRE */}

          <section className="cp-form-card">

            <div className="cp-form-heading">
              <div>
                <h2>Informations du candidat</h2>
                <p>
                  Les champs marqués d'un * sont obligatoires.
                </p>
              </div>

              <span className="cp-step">ÉTAPE 1</span>
            </div>

            {/* MESSAGES */}

            {error && (
              <div
                className="cp-alert cp-alert-error"
                role="alert"
              >
                <strong>Attention :</strong> {error}
              </div>
            )}

            {success && (
              <div
                className="cp-alert cp-alert-success"
                role="status"
              >
                {success}
              </div>
            )}

            <form
              onSubmit={handleSubmit}
              encType="multipart/form-data"
            >

              {/* SECTION 01 */}

              <div className="cp-section-title">
                <span>01</span>

                <div>
                  <h3>Informations personnelles</h3>
                  <p>
                    Les informations essentielles de ton profil
                  </p>
                </div>
              </div>

              <div className="cp-grid">

                <div className="cp-field cp-full">
                  <label htmlFor="photo">
                    Photo de profil
                  </label>

                  <input
                    id="photo"
                    name="photo"
                    type="file"
                    accept="image/*"
                    onChange={handleChange}
                  />

                  <small>
                    Image JPG, PNG ou autre format image · 2 Mo maximum
                  </small>

                  {isBrowserFile(formData.photo) && (
                    <small>
                      Fichier sélectionné : {formData.photo.name}
                    </small>
                  )}
                </div>

                <div className="cp-field">
                  <label htmlFor="date_of_birth">
                    Date de naissance
                  </label>

                  <input
                    id="date_of_birth"
                    name="date_of_birth"
                    type="date"
                    value={formData.date_of_birth}
                    onChange={handleChange}
                  />
                </div>

                <div className="cp-field">
                  <label htmlFor="country">
                    Pays *
                  </label>

                  <input
                    id="country"
                    name="country"
                    value={formData.country}
                    onChange={handleChange}
                    required
                    maxLength={100}
                  />
                </div>

                <div className="cp-field">
                  <label htmlFor="city">
                    Ville *
                  </label>

                  <input
                    id="city"
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    placeholder="Ex. : Dakar"
                    required
                    maxLength={100}
                  />
                </div>

                <div className="cp-field">
                  <label htmlFor="address">
                    Adresse
                  </label>

                  <input
                    id="address"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    placeholder="Quartier, rue..."
                    maxLength={255}
                  />
                </div>
              </div>

              {/* SECTION 02 */}

              <div className="cp-section-title">
                <span>02</span>

                <div>
                  <h3>Formation et expérience</h3>
                  <p>
                    Présente ton niveau et ta spécialité
                  </p>
                </div>
              </div>

              <div className="cp-grid">

                <div className="cp-field">
                  <label htmlFor="education_level">
                    Niveau d'études *
                  </label>

                  <select
                    id="education_level"
                    name="education_level"
                    value={formData.education_level}
                    onChange={handleChange}
                    required
                  >
                    <option value="">
                      Sélectionner un niveau
                    </option>

                    {educationOptions.map((option) => (
                      <option
                        key={option.value}
                        value={option.value}
                      >
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="cp-field">
                  <label htmlFor="years_of_experience">
                    Années d'expérience *
                  </label>

                  <input
                    id="years_of_experience"
                    name="years_of_experience"
                    type="number"
                    min="0"
                    max="60"
                    value={formData.years_of_experience}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="cp-field cp-full">
                  <label htmlFor="field_of_study">
                    Domaine de formation *
                  </label>

                  <input
                    id="field_of_study"
                    name="field_of_study"
                    value={formData.field_of_study}
                    onChange={handleChange}
                    placeholder="Ex. : Informatique, Marketing, Gestion..."
                    required
                    maxLength={150}
                  />
                </div>

                <div className="cp-field cp-full">
                  <label htmlFor="biography">
                    Présentation professionnelle
                  </label>

                  <textarea
                    id="biography"
                    name="biography"
                    value={formData.biography}
                    onChange={handleChange}
                    placeholder="Présente brièvement ton parcours, tes compétences et tes objectifs..."
                    rows={5}
                    maxLength={2000}
                  />

                  <small>
                    {formData.biography.length}/2000 caractères
                  </small>
                </div>

                <div className="cp-field">
                  <label htmlFor="availability">
                    Disponibilité *
                  </label>

                  <select
                    id="availability"
                    name="availability"
                    value={formData.availability}
                    onChange={handleChange}
                    required
                  >
                    <option value="AVAILABLE">
                      Disponible immédiatement
                    </option>

                    <option value="NOT_AVAILABLE">
                      Pas disponible
                    </option>

                    <option value="LOOKING">
                      En recherche active
                    </option>
                  </select>
                </div>

                <div className="cp-field cp-full">
                  <label htmlFor="resume">
                    CV professionnel
                  </label>

                  <input
                    id="resume"
                    name="resume"
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={handleChange}
                  />

                  <small>
                    Formats PDF, DOC ou DOCX · 5 Mo maximum
                  </small>

                  {isBrowserFile(formData.resume) && (
                    <small>
                      Fichier sélectionné : {formData.resume.name}
                    </small>
                  )}
                </div>
              </div>

              {/* BOUTON D'ENREGISTREMENT */}

              <div className="cp-form-footer">
                <p>
                  🔒 Tes informations sont destinées à la gestion de
                  ton profil sur SunuJob AI.
                </p>

                <button
                  type="submit"
                  className="cp-submit-button"
                  disabled={loading}
                >
                  {loading
                    ? "Enregistrement en cours..."
                    : existingProfile
                      ? "Enregistrer les modifications →"
                      : "Créer mon profil →"}
                </button>
              </div>

            </form>
          </section>
        </div>

        {/* PIED DE PAGE */}

        <footer className="cp-footer">
          © {new Date().getFullYear()} SunuJob AI · Conçu au Sénégal 🇸🇳
        </footer>

      </div>
    </main>
  );
}
