import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";
import "./CandidateProfile.css";
import "./CandidateProfileChoices.css";

const initialForm = {
  date_of_birth: "",
  address: "",
  city: "",
  country: "Sénégal",
  education_level: "",
  field_of_study: "",
  years_of_experience: "0",
  biography: "",
  availability: "",
};

/*
 * Pays regroupés par grandes régions.
 * Le nom du pays est enregistré dans le champ "country".
 */
const COUNTRY_GROUPS = [
  {
    label: "Afrique",
    countries: [
      "Afrique du Sud", "Algérie", "Angola", "Bénin", "Botswana",
      "Burkina Faso", "Burundi", "Cabo Verde", "Cameroun", "Comores",
      "Côte d’Ivoire", "Djibouti", "Égypte", "Érythrée", "Eswatini",
      "Éthiopie", "Gabon", "Gambie", "Ghana", "Guinée", "Guinée-Bissau",
      "Guinée équatoriale", "Kenya", "Lesotho", "Liberia", "Libye",
      "Madagascar", "Malawi", "Mali", "Maroc", "Maurice", "Mauritanie",
      "Mozambique", "Namibie", "Niger", "Nigeria", "Ouganda",
      "République centrafricaine", "République démocratique du Congo",
      "République du Congo", "Rwanda", "Sao Tomé-et-Principe", "Sénégal",
      "Seychelles", "Sierra Leone", "Somalie", "Soudan", "Soudan du Sud",
      "Tanzanie", "Tchad", "Togo", "Tunisie", "Zambie", "Zimbabwe",
    ],
  },
  {
    label: "Europe",
    countries: [
      "Albanie", "Allemagne", "Andorre", "Autriche", "Belgique",
      "Biélorussie", "Bosnie-Herzégovine", "Bulgarie", "Chypre",
      "Croatie", "Danemark", "Espagne", "Estonie", "Finlande", "France",
      "Grèce", "Hongrie", "Irlande", "Islande", "Italie", "Kosovo",
      "Lettonie", "Liechtenstein", "Lituanie", "Luxembourg",
      "Macédoine du Nord", "Malte", "Moldavie", "Monaco", "Monténégro",
      "Norvège", "Pays-Bas", "Pologne", "Portugal", "Roumanie",
      "Royaume-Uni", "Russie", "Saint-Marin", "Serbie", "Slovaquie",
      "Slovénie", "Suède", "Suisse", "Tchéquie", "Turquie", "Ukraine",
      "Vatican",
    ],
  },
  {
    label: "Asie et Moyen-Orient",
    countries: [
      "Afghanistan", "Arabie saoudite", "Arménie", "Azerbaïdjan",
      "Bahreïn", "Bangladesh", "Bhoutan", "Birmanie (Myanmar)",
      "Brunei", "Cambodge", "Chine", "Corée du Nord", "Corée du Sud",
      "Émirats arabes unis", "Géorgie", "Inde", "Indonésie", "Irak",
      "Iran", "Israël", "Japon", "Jordanie", "Kazakhstan",
      "Kirghizistan", "Koweït", "Laos", "Liban", "Malaisie", "Maldives",
      "Mongolie", "Népal", "Oman", "Ouzbékistan", "Pakistan",
      "Palestine", "Philippines", "Qatar", "Singapour", "Sri Lanka",
      "Syrie", "Tadjikistan", "Taïwan", "Thaïlande", "Timor oriental",
      "Turkménistan", "Viêt Nam", "Yémen",
    ],
  },
  {
    label: "Amériques",
    countries: [
      "Antigua-et-Barbuda", "Argentine", "Bahamas", "Barbade", "Belize",
      "Bolivie", "Brésil", "Canada", "Chili", "Colombie", "Costa Rica",
      "Cuba", "Dominique", "Équateur", "États-Unis", "Grenade",
      "Guatemala", "Guyana", "Haïti", "Honduras", "Jamaïque", "Mexique",
      "Nicaragua", "Panama", "Paraguay", "Pérou", "République dominicaine",
      "Saint-Christophe-et-Niévès", "Sainte-Lucie",
      "Saint-Vincent-et-les-Grenadines", "Salvador", "Suriname",
      "Trinité-et-Tobago", "Uruguay", "Venezuela",
    ],
  },
  {
    label: "Océanie",
    countries: [
      "Australie", "Fidji", "Kiribati", "Îles Marshall", "Îles Salomon",
      "Micronésie", "Nauru", "Nouvelle-Zélande", "Palaos",
      "Papouasie-Nouvelle-Guinée", "Samoa", "Tonga", "Tuvalu", "Vanuatu",
    ],
  },
];

/*
 * Domaines de formation proposés au candidat.
 * Le candidat peut sélectionner "Autre domaine" et saisir sa spécialité.
 */
const FIELD_DOMAINS = [
  "Administration et gestion",
  "Agriculture et agroalimentaire",
  "Agroécologie",
  "Aéronautique et aviation",
  "Architecture",
  "Arts et design",
  "Audiovisuel et cinéma",
  "Banque et finance",
  "Bâtiment et travaux publics (BTP)",
  "Biochimie",
  "Biologie",
  "Biotechnologie",
  "Commerce international",
  "Communication",
  "Comptabilité",
  "Construction métallique",
  "Contrôle de gestion",
  "Cybersécurité",
  "Data science et analyse de données",
  "Développement durable et environnement",
  "Développement web et mobile",
  "Droit",
  "Droit des affaires",
  "Droit public",
  "Économie",
  "Économie numérique",
  "Économie sociale et solidaire",
  "Éducation et formation",
  "Électricité",
  "Électronique",
  "Énergies renouvelables",
  "Épidémiologie et santé publique",
  "Entrepreneuriat",
  "Finance islamique",
  "Fiscalité",
  "Génie civil",
  "Génie électrique",
  "Génie industriel",
  "Génie informatique",
  "Génie mécanique",
  "Génie logiciel",
  "Géographie et aménagement",
  "Gestion de la chaîne d'approvisionnement",
  "Gestion de la qualité",
  "Gestion des entreprises",
  "Gestion des projets",
  "Gestion des ressources humaines",
  "Gestion logistique et transport",
  "Gestion touristique et hôtelière",
  "Graphisme et multimédia",
  "Hydraulique et assainissement",
  "Infirmier et soins infirmiers",
  "Industrie agroalimentaire",
  "Informatique",
  "Intelligence artificielle",
  "Journalisme",
  "Laboratoire et analyses médicales",
  "Langues étrangères",
  "Lettres modernes",
  "Maintenance informatique",
  "Maintenance industrielle",
  "Management public",
  "Marketing",
  "Marketing digital",
  "Marketing et stratégie commerciale",
  "Mathématiques",
  "Mécanique automobile",
  "Médecine",
  "Microfinance",
  "Mines et géologie",
  "Mode et textile",
  "Nutrition et diététique",
  "Odontologie",
  "Pêche et aquaculture",
  "Pédagogie",
  "Pharmacie",
  "Philosophie",
  "Physique",
  "Production audiovisuelle",
  "Psychologie",
  "Qualité, hygiène, sécurité et environnement (QHSE)",
  "Relations internationales",
  "Réseaux et télécommunications",
  "Restauration et métiers de bouche",
  "Santé animale et médecine vétérinaire",
  "Sciences biomédicales",
  "Sciences de l'éducation",
  "Sciences politiques",
  "Sciences sociales",
  "Secrétariat et assistance administrative",
  "Sécurité informatique",
  "Sociologie",
  "Statistiques",
  "Systèmes d'information",
  "Télécommunications",
  "Tourisme et hôtellerie",
  "Traduction et interprétation",
  "Urbanisme",
  "Vente et distribution",
  "Développement communautaire",
].filter((value, index, list) => list.indexOf(value) === index)
  .sort((a, b) => a.localeCompare(b, "fr"));

const OTHER_FIELD_VALUE = "__AUTRE_DOMAINE__";

const API_ORIGIN = (
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api/"
)
  .replace(/\/$/, "")
  .replace(/\/api$/i, "");

function mediaUrl(value) {
  if (!value) return "";

  if (
    /^https?:\/\//i.test(value) ||
    value.startsWith("blob:")
  ) {
    return value;
  }

  return `${API_ORIGIN}${value.startsWith("/") ? value : `/${value}`}`;
}

function formatApiError(error) {
  const status = error.response?.status;
  const data = error.response?.data;

  if (!error.response) {
    return "Impossible de joindre Django. Vérifiez que le serveur fonctionne sur http://127.0.0.1:8000.";
  }

  if (status === 401) {
    return "Votre session a expiré. Reconnectez-vous puis réessayez.";
  }

  if (status === 403) {
    return "Accès refusé. Cette page est réservée aux candidats connectés.";
  }

  if (data && typeof data === "object") {
    const parts = Object.entries(data).map(([field, messages]) => {
      const messageText = Array.isArray(messages)
        ? messages
            .map((item) =>
              typeof item === "string" ? item : JSON.stringify(item)
            )
            .join(" ")
        : typeof messages === "string"
          ? messages
          : JSON.stringify(messages);

      return `${field} : ${messageText}`;
    });

    const combined = parts.join(" | ");

    if (
      /n'est pas un fichier|not a file|type d'encodage|encoding type/i.test(
        combined
      )
    ) {
      return "Django ne reçoit pas la photo ou le CV comme un fichier. Vérifiez les parseurs MultiPartParser et FormParser dans les vues Django et assurez-vous qu'aucun réglage Axios ne force application/json.";
    }

    return combined || "Les informations du profil n'ont pas pu être enregistrées.";
  }

  return `L'enregistrement a échoué (HTTP ${
    status || "inconnu"
  }). Vérifiez les données puis réessayez.`;
}

function readForm(data) {
  return {
    date_of_birth: data?.date_of_birth || "",
    address: data?.address || "",
    city: data?.city || "",
    country: data?.country || "Sénégal",
    education_level: data?.education_level || "",
    field_of_study: data?.field_of_study || "",
    years_of_experience: String(data?.years_of_experience ?? 0),
    biography: data?.biography || "",
    availability: data?.availability || "",
  };
}

export default function CandidateProfile() {
  const [form, setForm] = useState(initialForm);
  const [otherFieldOfStudy, setOtherFieldOfStudy] = useState("");
  const [photo, setPhoto] = useState(null);
  const [resume, setResume] = useState(null);
  const [currentPhoto, setCurrentPhoto] = useState("");
  const [currentResume, setCurrentResume] = useState("");
  const [profileExists, setProfileExists] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [educationChoices, setEducationChoices] = useState([]);
  const [availabilityChoices, setAvailabilityChoices] = useState([]);
  const [loadingChoices, setLoadingChoices] = useState(true);
  const [choicesError, setChoicesError] = useState("");
  const [photoPreview, setPhotoPreview] = useState("");

  const photoInputRef = useRef(null);
  const resumeInputRef = useRef(null);

  useEffect(() => {
    if (!photo) {
      setPhotoPreview("");
      return undefined;
    }

    const objectUrl = URL.createObjectURL(photo);
    setPhotoPreview(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [photo]);

  useEffect(() => {
    let active = true;

    async function loadChoices() {
      setLoadingChoices(true);
      setChoicesError("");

      try {
        const responses = await Promise.allSettled([
          api.options("candidates/profile/"),
          api.options("candidates/profile/me/"),
        ]);

        const metadata = responses
          .filter((item) => item.status === "fulfilled")
          .map((item) => item.value.data);

        function getChoices(fieldName) {
          for (const data of metadata) {
            const actions = data?.actions || {};

            for (const action of Object.values(actions)) {
              const field = action?.[fieldName];

              if (
                Array.isArray(field?.choices) &&
                field.choices.length > 0
              ) {
                return field.choices.map((choice) => ({
                  value: String(choice.value),
                  label: String(
                    choice.display_name ??
                      choice.label ??
                      choice.value
                  ),
                }));
              }
            }
          }

          return [];
        }

        const education = getChoices("education_level");
        const availability = getChoices("availability");

        if (!active) return;

        setEducationChoices(education);
        setAvailabilityChoices(availability);

        if (education.length === 0 || availability.length === 0) {
          setChoicesError(
            "Django n'a pas fourni tous les choix du formulaire. Vérifiez les réponses OPTIONS et les choix définis dans le sérialiseur du profil candidat."
          );
        }
      } catch {
        if (!active) return;

        setChoicesError(
          "Impossible de récupérer les listes déroulantes depuis Django."
        );
      } finally {
        if (active) setLoadingChoices(false);
      }
    }

    loadChoices();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      try {
        const response = await api.get("candidates/profile/me/");

        if (!active) return;

        const data = response.data || {};
        const storedField = data.field_of_study || "";
        const isKnownField = FIELD_DOMAINS.includes(storedField);

        setOtherFieldOfStudy(
          storedField && !isKnownField ? storedField : ""
        );

        setForm({
          ...readForm(data),
          field_of_study:
            storedField && !isKnownField
              ? OTHER_FIELD_VALUE
              : storedField,
        });

        setCurrentPhoto(mediaUrl(data.photo));
        setCurrentResume(mediaUrl(data.resume));
        setProfileExists(true);
      } catch (err) {
        if (!active) return;

        if (err.response?.status === 404) {
          setProfileExists(false);
        } else {
          setError(formatApiError(err));
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadProfile();

    return () => {
      active = false;
    };
  }, []);

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    setError("");
    setSuccess("");
  }

  function handleFieldStudyChange(event) {
    const { value } = event.target;

    setForm((previous) => ({
      ...previous,
      field_of_study: value,
    }));

    if (value !== OTHER_FIELD_VALUE) {
      setOtherFieldOfStudy("");
    }

    setError("");
    setSuccess("");
  }

  function handlePhotoChange(event) {
    const file = event.target.files?.[0] || null;

    if (file && !file.type.startsWith("image/")) {
      setError("Choisissez une image valide pour la photo de profil.");
      event.target.value = "";
      return;
    }

    setPhoto(file);
    setError("");
    setSuccess("");
  }

  function handleResumeChange(event) {
    const file = event.target.files?.[0] || null;

    if (file) {
      const isPdf =
        file.type === "application/pdf" ||
        file.name.toLowerCase().endsWith(".pdf");
      const isWord = /\.(doc|docx)$/i.test(file.name);

      if (!isPdf && !isWord) {
        setError("Le CV doit être un fichier PDF ou Word (.doc, .docx).");
        event.target.value = "";
        return;
      }
    }

    setResume(file);
    setError("");
    setSuccess("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSuccess("");

    const years = Number(form.years_of_experience);

    if (!Number.isInteger(years) || years < 0) {
      setError(
        "Le nombre d'années d'expérience doit être un entier positif ou égal à zéro."
      );
      return;
    }

    if (
      form.field_of_study === OTHER_FIELD_VALUE &&
      !otherFieldOfStudy.trim()
    ) {
      setError(
        "Précisez votre domaine de formation dans le champ prévu à cet effet."
      );
      return;
    }

    const payload = new FormData();

    Object.entries(form).forEach(([key, value]) => {
      if (key === "date_of_birth" && !value) {
        return;
      }

      if (
        key === "field_of_study" &&
        value === OTHER_FIELD_VALUE
      ) {
        payload.append(key, otherFieldOfStudy.trim());
      } else {
        payload.append(key, String(value ?? ""));
      }
    });

    if (photo instanceof File) {
      payload.append("photo", photo, photo.name);
    }

    if (resume instanceof File) {
      payload.append("resume", resume, resume.name);
    }

    setSaving(true);

    try {
      // Ne pas fixer manuellement la boundary multipart.
      // Le navigateur la calcule automatiquement pour FormData.
      const config = {
        headers: {
          "Content-Type": undefined,
        },
      };

      const response = profileExists
        ? await api.patch(
            "candidates/profile/me/",
            payload,
            config
          )
        : await api.post(
            "candidates/profile/",
            payload,
            config
          );

      const data = response.data || {};
      const storedField = data.field_of_study || "";
      const isKnownField = FIELD_DOMAINS.includes(storedField);

      setOtherFieldOfStudy(
        storedField && !isKnownField ? storedField : ""
      );

      setForm({
        ...readForm(data),
        field_of_study:
          storedField && !isKnownField
            ? OTHER_FIELD_VALUE
            : storedField,
      });

      setCurrentPhoto(mediaUrl(data.photo) || currentPhoto);
      setCurrentResume(mediaUrl(data.resume) || currentResume);
      setProfileExists(true);
      setPhoto(null);
      setResume(null);

      if (photoInputRef.current) {
        photoInputRef.current.value = "";
      }

      if (resumeInputRef.current) {
        resumeInputRef.current.value = "";
      }

      setSuccess("Votre profil a été enregistré avec succès.");
    } catch (err) {
      console.error(
        "Erreur lors de l'enregistrement du profil candidat :",
        err.response?.data || err
      );

      setError(formatApiError(err));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="candidate-profile-page">
        <div className="profile-loading" role="status">
          <span className="profile-spinner" />
          <p>Chargement de votre profil...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="candidate-profile-page">
      <div className="candidate-profile-container">
        <div className="profile-breadcrumb">
          <Link to="/candidate/dashboard">Tableau de bord</Link>
          <span aria-hidden="true">/</span>
          <span>Mon profil</span>
        </div>

        <header className="profile-page-header">
          <div>
            <span className="profile-eyebrow">
              ESPACE CANDIDAT · SUNUJOB AI
            </span>

            <h1>Mon profil professionnel</h1>

            <p>
              Présentez votre parcours pour aider les recruteurs à
              comprendre vos compétences et votre expérience.
            </p>
          </div>

          <Link
            to="/candidate/dashboard"
            className="profile-back-link"
          >
            ← Retour au tableau de bord
          </Link>
        </header>

        <section className="profile-intro-card">
          <div className="profile-avatar">
            {photoPreview || currentPhoto ? (
              <img
                src={photoPreview || currentPhoto}
                alt="Aperçu de la photo du candidat"
              />
            ) : (
              <span aria-hidden="true">👤</span>
            )}
          </div>

          <div className="profile-intro-text">
            <h2>
              {profileExists
                ? "Votre profil candidat"
                : "Créez votre profil"}
            </h2>

            <p>
              {profileExists
                ? "Mettez à jour vos informations et vos documents à tout moment."
                : "Renseignez les informations et joignez vos documents pour créer votre profil."}
            </p>

            {photo && (
              <small className="profile-file-info">
                Nouvelle photo : <strong>{photo.name}</strong>
              </small>
            )}
          </div>

          <span
            className={`profile-status ${
              profileExists ? "is-complete" : "is-pending"
            }`}
          >
            {profileExists ? "Profil créé" : "À compléter"}
          </span>
        </section>

        {error && (
          <div
            className="profile-alert profile-alert-error"
            role="alert"
          >
            <strong>Attention :</strong> {error}
          </div>
        )}

        {success && (
          <div
            className="profile-alert profile-alert-success"
            role="status"
          >
            <strong>Succès :</strong> {success}
          </div>
        )}

        {choicesError && (
          <div
            className="profile-alert profile-alert-error"
            role="alert"
          >
            {choicesError}
          </div>
        )}

        <form
          className="candidate-profile-form"
          onSubmit={handleSubmit}
          encType="multipart/form-data"
        >
          {/* SECTION 1 : INFORMATIONS PERSONNELLES */}
          <section className="profile-form-card">
            <div className="profile-section-heading">
              <span className="profile-section-icon">01</span>

              <div>
                <h2>Informations personnelles</h2>
                <p>
                  Renseignez vos coordonnées et vos informations de base.
                </p>
              </div>
            </div>

            <div className="profile-form-grid">
              <div className="profile-field profile-field-full">
                <label htmlFor="photo">Photo de profil</label>

                <input
                  ref={photoInputRef}
                  id="photo"
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                />

                <small>
                  {photo
                    ? photo.name
                    : currentPhoto
                      ? "Une photo est déjà enregistrée. Choisissez un fichier pour la remplacer."
                      : "Choisissez une image pour personnaliser votre profil."}
                </small>
              </div>

              <div className="profile-field">
                <label htmlFor="date_of_birth">
                  Date de naissance
                </label>

                <input
                  id="date_of_birth"
                  name="date_of_birth"
                  type="date"
                  value={form.date_of_birth}
                  onChange={handleChange}
                />
              </div>

              <div className="profile-field">
                <label htmlFor="country">Pays de résidence</label>

                <select
                  id="country"
                  name="country"
                  value={form.country}
                  onChange={handleChange}
                  required
                >
                  <option value="">
                    Sélectionnez votre pays de résidence
                  </option>

                  {!COUNTRY_GROUPS.some((group) =>
                    group.countries.includes(form.country)
                  ) &&
                    form.country && (
                      <option value={form.country}>
                        {form.country} (valeur actuelle)
                      </option>
                    )}

                  {COUNTRY_GROUPS.map((group) => (
                    <optgroup key={group.label} label={group.label}>
                      {group.countries
                        .slice()
                        .sort((a, b) => a.localeCompare(b, "fr"))
                        .map((country) => (
                          <option key={country} value={country}>
                            {country}
                          </option>
                        ))}
                    </optgroup>
                  ))}
                </select>

                <small>
                  Choisissez le pays dans lequel vous résidez actuellement.
                </small>
              </div>

              <div className="profile-field">
                <label htmlFor="city">Ville</label>

                <input
                  id="city"
                  name="city"
                  type="text"
                  value={form.city}
                  onChange={handleChange}
                  placeholder="Ex. Dakar"
                />
              </div>

              <div className="profile-field">
                <label htmlFor="address">Adresse</label>

                <input
                  id="address"
                  name="address"
                  type="text"
                  value={form.address}
                  onChange={handleChange}
                  placeholder="Votre adresse"
                />
              </div>
            </div>
          </section>

          {/* SECTION 2 : FORMATION ET EXPÉRIENCE */}
          <section className="profile-form-card">
            <div className="profile-section-heading">
              <span className="profile-section-icon">02</span>

              <div>
                <h2>Formation et expérience</h2>
                <p>
                  Donnez aux recruteurs une vue claire de votre parcours.
                </p>
              </div>
            </div>

            <div className="profile-form-grid">
              <div className="profile-field">
                <label htmlFor="education_level">
                  Niveau d'études
                </label>

                <select
                  id="education_level"
                  name="education_level"
                  value={form.education_level}
                  onChange={handleChange}
                  disabled={
                    loadingChoices || educationChoices.length === 0
                  }
                >
                  <option value="">
                    {loadingChoices
                      ? "Chargement des niveaux d'études..."
                      : "Sélectionnez votre niveau d'études"}
                  </option>

                  {educationChoices.map((choice) => (
                    <option
                      key={choice.value}
                      value={choice.value}
                    >
                      {choice.label}
                    </option>
                  ))}
                </select>

                <small>
                  Choisissez le niveau correspondant à votre diplôme.
                </small>
              </div>

              <div className="profile-field">
                <label htmlFor="field_of_study">
                  Domaine de formation
                </label>

                <select
                  id="field_of_study"
                  name="field_of_study"
                  value={form.field_of_study}
                  onChange={handleFieldStudyChange}
                  required
                >
                  <option value="">
                    Sélectionnez votre domaine de formation
                  </option>

                  {FIELD_DOMAINS.map((domain) => (
                    <option key={domain} value={domain}>
                      {domain}
                    </option>
                  ))}

                  <option value={OTHER_FIELD_VALUE}>
                    Autre domaine (à préciser)
                  </option>
                </select>

                {form.field_of_study === OTHER_FIELD_VALUE && (
                  <input
                    className="other-field-study-input"
                    type="text"
                    value={otherFieldOfStudy}
                    onChange={(event) =>
                      setOtherFieldOfStudy(event.target.value)
                    }
                    placeholder="Saisissez votre spécialité"
                    aria-label="Précisez votre domaine de formation"
                    required
                  />
                )}

                <small>
                  Choisissez votre spécialité principale. Si elle n'est
                  pas répertoriée, sélectionnez « Autre domaine ».
                </small>
              </div>

              <div className="profile-field profile-field-full">
                <label htmlFor="years_of_experience">
                  Années d'expérience
                </label>

                <input
                  id="years_of_experience"
                  name="years_of_experience"
                  type="number"
                  min="0"
                  step="1"
                  value={form.years_of_experience}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="profile-field profile-field-full">
                <label htmlFor="biography">
                  Présentation professionnelle
                </label>

                <textarea
                  id="biography"
                  name="biography"
                  value={form.biography}
                  onChange={handleChange}
                  rows="5"
                  placeholder="Présentez votre parcours, vos compétences, vos objectifs et ce que vous recherchez..."
                />
              </div>

              <div className="profile-field profile-field-full">
                <label htmlFor="availability">Disponibilité</label>

                <select
                  id="availability"
                  name="availability"
                  value={form.availability}
                  onChange={handleChange}
                  disabled={
                    loadingChoices || availabilityChoices.length === 0
                  }
                >
                  <option value="">
                    {loadingChoices
                      ? "Chargement des disponibilités..."
                      : "Sélectionnez votre disponibilité"}
                  </option>

                  {availabilityChoices.map((choice) => (
                    <option
                      key={choice.value}
                      value={choice.value}
                    >
                      {choice.label}
                    </option>
                  ))}
                </select>

                <small>
                  Indiquez quand vous pourrez commencer un nouvel emploi.
                </small>
              </div>
            </div>
          </section>

          {/* SECTION 3 : CURRICULUM VITAE */}
          <section className="profile-form-card">
            <div className="profile-section-heading">
              <span className="profile-section-icon">03</span>

              <div>
                <h2>Curriculum vitæ</h2>
                <p>
                  Ajoutez votre CV pour faciliter l'étude de vos candidatures.
                </p>
              </div>
            </div>

            <div className="profile-field profile-field-full">
              <label htmlFor="resume">Importer votre CV</label>

              <input
                ref={resumeInputRef}
                id="resume"
                type="file"
                accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={handleResumeChange}
              />

              {resume && (
                <p className="profile-file-info">
                  Nouveau fichier sélectionné :{" "}
                  <strong>{resume.name}</strong>
                </p>
              )}

              {!resume && currentResume && (
                <p className="profile-file-info">
                  Un CV est déjà enregistré.{" "}
                  <a
                    href={currentResume}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Consulter le CV
                  </a>
                </p>
              )}

              <small>
                Formats autorisés : PDF ou Word (.doc, .docx). Pour
                l'analyse automatique, utilisez un PDF contenant du texte
                lisible.
              </small>
            </div>
          </section>

          {/* BOUTONS D'ACTION */}
          <div className="profile-form-actions">
            <Link
              to="/candidate/dashboard"
              className="profile-cancel-button"
            >
              Annuler
            </Link>

            <button
              type="submit"
              className="profile-save-button"
              disabled={saving}
            >
              {saving
                ? "Enregistrement..."
                : profileExists
                  ? "Enregistrer les modifications"
                  : "Créer mon profil"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}