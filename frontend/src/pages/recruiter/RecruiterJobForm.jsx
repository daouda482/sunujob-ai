
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../api";
import "./RecruiterJobForm.css";

// =====================================================
// FORMULAIRE INITIAL
// =====================================================

const INITIAL_FORM = {
  company: "",
  title: "",
  description: "",
  sector: "",
  location: "",
  contract_type: "CDI",
  experience_required: "0",
  education_level: "",
  salary_min: "",
  salary_max: "",
  skills_required: "",
  deadline: "",
  status: "DRAFT",
};

// =====================================================
// TYPES DE CONTRAT
// =====================================================

const CONTRACT_TYPES = [
  { value: "CDI", label: "CDI" },
  { value: "CDD", label: "CDD" },
  { value: "INTERNSHIP", label: "Stage" },
  { value: "APPRENTICESHIP", label: "Alternance" },
  { value: "FREELANCE", label: "Freelance" },
  { value: "TEMPORARY", label: "Intérim" },
  { value: "VACATION", label: "Vacation" },
];

// =====================================================
// STATUTS DES OFFRES
// =====================================================

const JOB_STATUS_LABELS = {
  DRAFT: "Brouillon",
  PUBLISHED: "Publiée",
  SUSPENDED: "Suspendue",
  CLOSED: "Fermée",
  EXPIRED: "Expirée",
  ARCHIVED: "Archivée",
};

// Statuts pouvant être sélectionnés manuellement.
// EXPIRED et ARCHIVED sont conservés lorsqu'une ancienne
// offre possède déjà l'un de ces statuts.
const EDITABLE_JOB_STATUSES = [
  "DRAFT",
  "PUBLISHED",
  "SUSPENDED",
  "CLOSED",
];

// =====================================================
// NIVEAUX D'ÉTUDES
// =====================================================

const EDUCATION_LEVEL_GROUPS = [
  {
    label: "Enseignement général",
    options: [
      "Sans diplôme",
      "CFEE",
      "BFEM",
      "Baccalauréat (Bac)",
    ],
  },
  {
    label: "Formation professionnelle et technique",
    options: [
      "CAP",
      "BEP",
      "BT (Brevet de technicien)",
      "BTS",
      "DTS",
      "DUT / BUT",
      "Certificat professionnel",
      "Diplôme professionnel",
      "Brevet de technicien supérieur",
    ],
  },
  {
    label: "Études supérieures — Bac +1 à Bac +3",
    options: [
      "Bac +1",
      "Bac +2",
      "DEUG",
      "Licence 1",
      "Licence 2",
      "Licence 3",
      "Licence générale",
      "Licence professionnelle",
      "Bachelor",
    ],
  },
  {
    label: "Études supérieures — Bac +4 à Bac +5",
    options: [
      "Bac +4",
      "Maîtrise",
      "Master 1",
      "Bac +5",
      "Master 2",
      "Master professionnel",
      "Diplôme d'ingénieur",
      "Diplôme d'école de commerce",
      "Diplôme d'études supérieures spécialisées (DESS)",
      "MBA",
    ],
  },
  {
    label: "Études doctorales et spécialisations",
    options: [
      "Doctorat",
      "PhD",
      "Doctorat professionnel",
      "Postdoctorat",
      "Diplôme de spécialisation",
      "Autre diplôme supérieur",
    ],
  },
];

const EDUCATION_LEVEL_VALUES = EDUCATION_LEVEL_GROUPS.flatMap(
  (group) => group.options
);

// =====================================================
// FONCTIONS UTILITAIRES
// =====================================================

function normalizeList(data) {
  if (Array.isArray(data)) return data;

  if (Array.isArray(data?.results)) {
    return data.results;
  }

  if (Array.isArray(data?.companies)) {
    return data.companies;
  }

  return [];
}

function toInputValue(value) {
  return value === null || value === undefined
    ? ""
    : String(value);
}

// Django peut renvoyer un identifiant ou un objet imbriqué.
function normalizeCompanyId(company) {
  if (company === null || company === undefined) {
    return "";
  }

  if (typeof company === "object") {
    return toInputValue(company.id);
  }

  return toInputValue(company);
}

// Retourne la date locale au format YYYY-MM-DD.
function getLocalDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

// Pour un champ HTML input type="date".
function toDateInputValue(value) {
  if (!value) return "";

  const text = String(value);

  // Django renvoie généralement YYYY-MM-DD pour un DateField.
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) {
    return text.slice(0, 10);
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return getLocalDateString(date);
}

function getErrorMessage(error) {
  if (!error?.response) {
    return "Impossible de joindre Django. Vérifiez que le serveur est démarré.";
  }

  const status = error.response.status;

  if (status === 401) {
    return "Votre session n'est plus valide. Déconnectez-vous puis reconnectez-vous avant de créer une offre.";
  }

  if (status === 403) {
    return "Accès refusé. Vérifiez que votre compte possède bien le rôle RECRUITER et les autorisations nécessaires.";
  }

  if (status === 404) {
    return "Offre ou endpoint introuvable. Vérifiez les routes Django des offres et des entreprises.";
  }

  const data = error.response.data;

  if (typeof data === "string") {
    return data;
  }

  if (data && typeof data === "object") {
    return Object.entries(data)
      .map(([field, messages]) => {
        let message;

        if (Array.isArray(messages)) {
          message = messages
            .map((item) =>
              typeof item === "object" && item !== null
                ? JSON.stringify(item)
                : String(item)
            )
            .join(", ");
        } else if (
          typeof messages === "object" &&
          messages !== null
        ) {
          message = JSON.stringify(messages);
        } else {
          message = String(messages);
        }

        return `${field} : ${message}`;
      })
      .join(" | ");
  }

  return (
    error.message ||
    "Une erreur est survenue. Vérifiez les informations puis réessayez."
  );
}

// =====================================================
// COMPOSANT PRINCIPAL
// =====================================================

export default function RecruiterJobForm() {
  const navigate = useNavigate();
  const { id } = useParams();

  const isEditing = Boolean(id);

  const [form, setForm] = useState({ ...INITIAL_FORM });

  const [companies, setCompanies] = useState([]);
  const [companiesLoading, setCompaniesLoading] = useState(true);
  const [companiesError, setCompaniesError] = useState("");

  const [jobLoading, setJobLoading] = useState(isEditing);
  const [jobLoadFailed, setJobLoadFailed] = useState(false);

  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Conserver les informations initiales nécessaires
  // pour les validations lors d'une modification.
  const [originalDeadline, setOriginalDeadline] = useState("");

  // =====================================================
  // ENTREPRISE SÉLECTIONNÉE
  // =====================================================

  const selectedCompany = companies.find(
    (company) => String(company.id) === String(form.company)
  );

  const selectedCompanyLogo =
    typeof selectedCompany?.logo_url === "string"
      ? selectedCompany.logo_url
      : typeof selectedCompany?.logo === "string"
        ? selectedCompany.logo
        : "";

  const selectedCompanyLocation =
    selectedCompany?.city ||
    selectedCompany?.location ||
    selectedCompany?.address ||
    "Entreprise associée à votre compte recruteur";

  // =====================================================
  // CHARGEMENT DES ENTREPRISES
  // =====================================================

  useEffect(() => {
    let cancelled = false;

    async function loadCompanies() {
      setCompaniesLoading(true);
      setCompaniesError("");

      try {
        const response = await api.get("companies/");

        const list = normalizeList(response.data);

        if (cancelled) return;

        setCompanies(list);

        if (list.length === 0) {
          setCompaniesError(
            "Aucune entreprise disponible. Créez d'abord votre entreprise dans votre espace recruteur, puis revenez publier l'offre."
          );
        }
      } catch (err) {
        if (!cancelled) {
          setCompaniesError(getErrorMessage(err));
        }
      } finally {
        if (!cancelled) {
          setCompaniesLoading(false);
        }
      }
    }

    loadCompanies();

    return () => {
      cancelled = true;
    };
  }, []);

  // =====================================================
  // CHARGEMENT DE L'OFFRE EN MODE MODIFICATION
  // =====================================================

  useEffect(() => {
    if (!isEditing) {
      setJobLoading(false);
      setJobLoadFailed(false);
      setOriginalDeadline("");
      setForm({ ...INITIAL_FORM });

      return;
    }

    let cancelled = false;

    async function loadJob() {
      setJobLoading(true);
      setJobLoadFailed(false);
      setError("");

      try {
        const response = await api.get(`jobs/${id}/`);

        const job = response.data;

        if (cancelled) return;

        const deadline = toDateInputValue(job.deadline);

        setForm({
          company: normalizeCompanyId(job.company),
          title: toInputValue(job.title),
          description: toInputValue(job.description),
          sector: toInputValue(job.sector),
          location: toInputValue(job.location),
          contract_type: toInputValue(job.contract_type) || "CDI",
          experience_required: toInputValue(
            job.experience_required ?? 0
          ),
          education_level: toInputValue(job.education_level),
          salary_min: toInputValue(job.salary_min),
          salary_max: toInputValue(job.salary_max),
          skills_required: toInputValue(job.skills_required),
          deadline,
          status: toInputValue(job.status) || "DRAFT",
        });

        setOriginalDeadline(deadline);
      } catch (err) {
        if (!cancelled) {
          setError(getErrorMessage(err));
          setJobLoadFailed(true);
        }
      } finally {
        if (!cancelled) {
          setJobLoading(false);
        }
      }
    }

    loadJob();

    return () => {
      cancelled = true;
    };
  }, [id, isEditing]);

  // =====================================================
  // MODIFICATION DES CHAMPS
  // =====================================================

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));

    setError("");
    setSuccess("");
  }

  // =====================================================
  // VALIDATION DU FORMULAIRE
  // =====================================================

  function validateForm() {
    if (!form.company) {
      return "Veuillez sélectionner votre entreprise.";
    }

    const companyId = Number(form.company);

    if (!Number.isInteger(companyId) || companyId <= 0) {
      return "L'entreprise sélectionnée est invalide.";
    }

    if (
      !form.title.trim() ||
      !form.description.trim() ||
      !form.sector.trim() ||
      !form.location.trim()
    ) {
      return (
        "Veuillez renseigner le titre, la description, " +
        "le secteur et le lieu de travail."
      );
    }

    if (!CONTRACT_TYPES.some(
      (contract) => contract.value === form.contract_type
    )) {
      return "Veuillez sélectionner un type de contrat valide.";
    }

    // Validation de l'expérience
    const experience = Number(form.experience_required);

    if (
      form.experience_required === "" ||
      !Number.isFinite(experience) ||
      !Number.isInteger(experience) ||
      experience < 0
    ) {
      return "L'expérience requise doit être un nombre entier positif ou égal à zéro.";
    }

    // Validation du salaire minimum
    let salaryMin = null;

    if (form.salary_min !== "") {
      salaryMin = Number(form.salary_min);

      if (!Number.isFinite(salaryMin) || salaryMin < 0) {
        return "Le salaire minimum doit être un nombre positif ou égal à zéro.";
      }
    }

    // Validation du salaire maximum
    let salaryMax = null;

    if (form.salary_max !== "") {
      salaryMax = Number(form.salary_max);

      if (!Number.isFinite(salaryMax) || salaryMax < 0) {
        return "Le salaire maximum doit être un nombre positif ou égal à zéro.";
      }
    }

    if (
      salaryMin !== null &&
      salaryMax !== null &&
      salaryMin > salaryMax
    ) {
      return (
        "Le salaire maximum doit être supérieur ou égal " +
        "au salaire minimum."
      );
    }

    // Validation de la date limite
    if (form.deadline) {
      const deadline = form.deadline.trim();
      const today = getLocalDateString();

      if (!/^\d{4}-\d{2}-\d{2}$/.test(deadline)) {
        return "Veuillez saisir une date limite valide.";
      }

      const parsedDate = new Date(`${deadline}T12:00:00`);

      if (
        Number.isNaN(parsedDate.getTime()) ||
        getLocalDateString(parsedDate) !== deadline
      ) {
        return "La date limite saisie n'est pas valide.";
      }

      // Une ancienne date limite peut être conservée
      // lors de la modification d'une offre existante.
      const isUnchangedDeadline =
        isEditing && deadline === originalDeadline;

      if (deadline < today && !isUnchangedDeadline) {
        return "La date limite de candidature ne peut pas être dans le passé.";
      }
    }

    // Validation du statut
    const currentStatusIsAllowed =
      EDITABLE_JOB_STATUSES.includes(form.status) ||
      (
        isEditing &&
        ["EXPIRED", "ARCHIVED"].includes(form.status)
      );

    if (!currentStatusIsAllowed) {
      return "Le statut sélectionné n'est pas valide.";
    }

    return "";
  }

  // =====================================================
  // CRÉATION OU MODIFICATION D'UNE OFFRE
  // =====================================================

  async function handleSubmit(event) {
    event.preventDefault();

    if (submitting) return;

    setError("");
    setSuccess("");

    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    const payload = {
      company: Number(form.company),
      title: form.title.trim(),
      description: form.description.trim(),
      sector: form.sector.trim(),
      location: form.location.trim(),
      contract_type: form.contract_type,
      experience_required: Number(form.experience_required),
      education_level: form.education_level.trim(),
      salary_min:
        form.salary_min === ""
          ? null
          : Number(form.salary_min),
      salary_max:
        form.salary_max === ""
          ? null
          : Number(form.salary_max),
      skills_required: form.skills_required.trim(),
      deadline: form.deadline || null,
      status: form.status,
    };

    setSubmitting(true);

    try {
      if (isEditing) {
        await api.patch(`jobs/${id}/`, payload);

        navigate("/recruiter/jobs", {
          replace: true,
          state: {
            success: "Offre modifiée avec succès.",
          },
        });
      } else {
        await api.post("jobs/", payload);

        navigate("/recruiter/jobs", {
          replace: true,
          state: {
            success: "Offre créée avec succès.",
          },
        });
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  // =====================================================
  // CHARGEMENT DE L'OFFRE
  // =====================================================

  if (jobLoading) {
    return (
      <main className="job-form-page">
        <div className="job-form-loading">
          <span className="job-form-spinner" />

          <p>Chargement des informations de l'offre...</p>
        </div>
      </main>
    );
  }

  // Ne pas afficher un formulaire vide si l'offre
  // demandée en modification n'a pas pu être chargée.
  if (isEditing && jobLoadFailed) {
    return (
      <main className="job-form-page">
        <div className="job-form-container">
          <div
            className="job-form-alert job-form-alert-error"
            role="alert"
          >
            <span className="job-form-alert-symbol">!</span>

            <div>
              <strong>Impossible de charger cette offre</strong>
              <p>{error}</p>
            </div>
          </div>

          <button
            type="button"
            className="job-form-back"
            onClick={() => navigate("/recruiter/jobs")}
          >
            <span aria-hidden="true">←</span>
            Retour aux offres
          </button>
        </div>
      </main>
    );
  }

  // =====================================================
  // AFFICHAGE PRINCIPAL
  // =====================================================

  return (
    <main className="job-form-page">
      <div className="job-form-container">
        <header className="job-form-header">
          <button
            type="button"
            className="job-form-back"
            onClick={() => navigate("/recruiter/jobs")}
            disabled={submitting}
          >
            <span aria-hidden="true">←</span>
            Retour aux offres
          </button>

          <div className="job-form-heading">
            <div
              className="job-form-heading-icon"
              aria-hidden="true"
            >
              ✦
            </div>

            <div>
              <span className="job-form-eyebrow">
                ESPACE RECRUTEUR · SUNUJOB AI
              </span>

              <h1>
                {isEditing
                  ? "Modifier une offre"
                  : "Créer une nouvelle offre"}
              </h1>

              <p>
                Présentez votre opportunité et trouvez les talents
                qui correspondent à vos besoins.
              </p>
            </div>
          </div>
        </header>

        {/* MESSAGES */}

        {error && (
          <div
            className="job-form-alert job-form-alert-error"
            role="alert"
          >
            <span
              className="job-form-alert-symbol"
              aria-hidden="true"
            >
              !
            </span>

            <div>
              <strong>Attention</strong>
              <p>{error}</p>
            </div>

            <button
              type="button"
              onClick={() => setError("")}
              aria-label="Fermer le message"
            >
              ×
            </button>
          </div>
        )}

        {success && (
          <div
            className="job-form-alert job-form-alert-success"
            role="status"
          >
            <span
              className="job-form-alert-symbol"
              aria-hidden="true"
            >
              ✓
            </span>

            <p>{success}</p>
          </div>
        )}

        {/* FORMULAIRE */}

        <form
          className="job-form-card"
          onSubmit={handleSubmit}
        >
          {/* ÉTAPE 1 : INFORMATIONS */}

          <div className="job-form-card-heading">
            <div>
              <span className="job-form-step">
                ÉTAPE 1 · INFORMATIONS
              </span>

              <h2>Informations de l'offre</h2>

              <p>
                Les champs marqués d'un astérisque sont obligatoires.
              </p>
            </div>

            <span className="job-form-required-note">
              * Obligatoire
            </span>
          </div>

          {/* ENTREPRISE */}

          <div className="job-form-section job-form-company-section">
            <label
              className="job-form-label"
              htmlFor="company"
            >
              Entreprise qui publie cette offre <span>*</span>
            </label>

            <div className="job-form-company-picker">
              <div
                className="job-form-company-picker-icon"
                aria-hidden="true"
              >
                🏢
              </div>

              <div className="job-form-company-picker-content">
                <span className="job-form-company-picker-caption">
                  ENTREPRISE RECRUTEUSE
                </span>

                <div className="job-form-select-wrap">
                  <select
                    id="company"
                    name="company"
                    className="job-form-control job-form-select job-form-company-select"
                    value={form.company}
                    onChange={handleChange}
                    disabled={
                      companiesLoading ||
                      companies.length === 0 ||
                      submitting
                    }
                    required
                    aria-describedby="company-help"
                  >
                    <option value="">
                      {companiesLoading
                        ? "Chargement de vos entreprises..."
                        : "Choisissez l'entreprise concernée"}
                    </option>

                    {companies.map((company) => (
                      <option
                        key={company.id}
                        value={company.id}
                      >
                        {company.name ||
                          company.company_name ||
                          `Entreprise ${company.id}`}
                      </option>
                    ))}
                  </select>

                  <span
                    className="job-form-select-arrow"
                    aria-hidden="true"
                  >
                    ▾
                  </span>
                </div>
              </div>
            </div>

            <span
              className="job-form-help"
              id="company-help"
            >
              Cette entreprise sera affichée sur l'offre publiée.
              Sélectionnez une entreprise rattachée à votre compte.
            </span>

            {/* APERÇU DE L'ENTREPRISE */}

            {selectedCompany && (
              <div
                className="job-form-company-selected"
                aria-live="polite"
              >
                <div className="job-form-company-selected-logo">
                  {selectedCompanyLogo ? (
                    <img
                      src={selectedCompanyLogo}
                      alt={`Logo de ${
                        selectedCompany.name || "l'entreprise"
                      }`}
                    />
                  ) : (
                    <span aria-hidden="true">
                      {(
                        selectedCompany.name ||
                        selectedCompany.company_name ||
                        "E"
                      )
                        .trim()
                        .charAt(0)
                        .toUpperCase()}
                    </span>
                  )}
                </div>

                <div className="job-form-company-selected-info">
                  <span className="job-form-company-selected-label">
                    ENTREPRISE SÉLECTIONNÉE
                  </span>

                  <strong>
                    {selectedCompany.name ||
                      selectedCompany.company_name}
                  </strong>

                  <small>{selectedCompanyLocation}</small>
                </div>

                <span
                  className="job-form-company-selected-check"
                  aria-label="Entreprise sélectionnée"
                >
                  ✓
                </span>
              </div>
            )}

            {/* ERREUR OU ABSENCE D'ENTREPRISE */}

            {companiesError && (
              <div className="job-form-company-error">
                <small>{companiesError}</small>

                <button
                  type="button"
                  className="job-form-company-retry"
                  onClick={() => window.location.reload()}
                  disabled={submitting}
                >
                  ↻ Actualiser la page
                </button>
              </div>
            )}
          </div>

          {/* INFORMATIONS PRINCIPALES */}

          <div className="job-form-grid">
            <div className="job-form-section">
              <label
                className="job-form-label"
                htmlFor="title"
              >
                Intitulé du poste <span>*</span>
              </label>

              <input
                id="title"
                name="title"
                className="job-form-control"
                type="text"
                placeholder="Ex. : Développeur Full Stack"
                value={form.title}
                onChange={handleChange}
                maxLength={200}
                required
                disabled={submitting}
              />
            </div>

            <div className="job-form-section">
              <label
                className="job-form-label"
                htmlFor="sector"
              >
                Secteur d'activité <span>*</span>
              </label>

              <input
                id="sector"
                name="sector"
                className="job-form-control"
                type="text"
                placeholder="Ex. : Informatique, Finance..."
                value={form.sector}
                onChange={handleChange}
                maxLength={150}
                required
                disabled={submitting}
              />
            </div>

            <div className="job-form-section">
              <label
                className="job-form-label"
                htmlFor="location"
              >
                Lieu de travail <span>*</span>
              </label>

              <input
                id="location"
                name="location"
                className="job-form-control"
                type="text"
                placeholder="Ex. : Dakar, Sénégal"
                value={form.location}
                onChange={handleChange}
                maxLength={150}
                required
                disabled={submitting}
              />
            </div>

            <div className="job-form-section">
              <label
                className="job-form-label"
                htmlFor="contract_type"
              >
                Type de contrat <span>*</span>
              </label>

              <div className="job-form-select-wrap">
                <select
                  id="contract_type"
                  name="contract_type"
                  className="job-form-control job-form-select"
                  value={form.contract_type}
                  onChange={handleChange}
                  required
                  disabled={submitting}
                >
                  {CONTRACT_TYPES.map((contract) => (
                    <option
                      key={contract.value}
                      value={contract.value}
                    >
                      {contract.label}
                    </option>
                  ))}
                </select>

                <span
                  className="job-form-select-arrow"
                  aria-hidden="true"
                >
                  ▾
                </span>
              </div>
            </div>
          </div>

          {/* DESCRIPTION */}

          <div className="job-form-section">
            <label
              className="job-form-label"
              htmlFor="description"
            >
              Description du poste <span>*</span>
            </label>

            <textarea
              id="description"
              name="description"
              className="job-form-control job-form-textarea"
              placeholder="Présentez les missions, les responsabilités et les objectifs du poste..."
              value={form.description}
              onChange={handleChange}
              rows={6}
              required
              disabled={submitting}
            />

            <span className="job-form-help">
              Une description claire aide les candidats à comprendre
              l'opportunité.
            </span>
          </div>

          <div className="job-form-divider" />

          {/* ÉTAPE 2 : PROFIL RECHERCHÉ */}

          <div className="job-form-card-heading">
            <div>
              <span className="job-form-step">
                ÉTAPE 2 · PROFIL
              </span>

              <h2>Profil recherché</h2>

              <p>
                Précisez les qualifications et les compétences attendues.
              </p>
            </div>
          </div>

          <div className="job-form-grid">
            {/* EXPÉRIENCE */}

            <div className="job-form-section">
              <label
                className="job-form-label"
                htmlFor="experience_required"
              >
                Expérience requise
              </label>

              <input
                id="experience_required"
                name="experience_required"
                className="job-form-control"
                type="number"
                min="0"
                step="1"
                value={form.experience_required}
                onChange={handleChange}
                disabled={submitting}
              />

              <span className="job-form-help">
                Nombre d'années d'expérience souhaitées.
              </span>
            </div>

            {/* NIVEAU D'ÉTUDES */}

            <div className="job-form-section">
              <label
                className="job-form-label"
                htmlFor="education_level"
              >
                Niveau d'études requis
              </label>

              <div className="job-form-select-wrap">
                <select
                  id="education_level"
                  name="education_level"
                  className="job-form-control job-form-select job-form-education-select"
                  value={form.education_level}
                  onChange={handleChange}
                  aria-describedby="education-level-help"
                  disabled={submitting}
                >
                  <option value="">
                    Non précisé / Ouvert à tous les niveaux
                  </option>

                  {form.education_level &&
                    !EDUCATION_LEVEL_VALUES.includes(
                      form.education_level
                    ) && (
                      <option value={form.education_level}>
                        {form.education_level} (valeur actuelle)
                      </option>
                    )}

                  {EDUCATION_LEVEL_GROUPS.map((group) => (
                    <optgroup
                      key={group.label}
                      label={group.label}
                    >
                      {group.options.map((level) => (
                        <option key={level} value={level}>
                          {level}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>

                <span
                  className="job-form-select-arrow"
                  aria-hidden="true"
                >
                  ▾
                </span>
              </div>

              <span
                className="job-form-help"
                id="education-level-help"
              >
                Choisissez le diplôme minimum attendu. Laissez
                « Non précisé » pour ne pas imposer de niveau
                d'études particulier.
              </span>
            </div>
          </div>

          {/* COMPÉTENCES */}

          <div className="job-form-section">
            <label
              className="job-form-label"
              htmlFor="skills_required"
            >
              Compétences requises
            </label>

            <textarea
              id="skills_required"
              name="skills_required"
              className="job-form-control job-form-textarea"
              placeholder="Ex. : Python, Django, React, communication, gestion de projet..."
              value={form.skills_required}
              onChange={handleChange}
              rows={3}
              disabled={submitting}
            />
          </div>

          <div className="job-form-divider" />

          {/* ÉTAPE 3 : CONDITIONS */}

          <div className="job-form-card-heading">
            <div>
              <span className="job-form-step">
                ÉTAPE 3 · CONDITIONS
              </span>

              <h2>Rémunération et publication</h2>

              <p>
                Complétez les conditions proposées pour ce poste.
              </p>
            </div>
          </div>

          <div className="job-form-grid">
            {/* SALAIRE MINIMUM */}

            <div className="job-form-section">
              <label
                className="job-form-label"
                htmlFor="salary_min"
              >
                Salaire minimum (FCFA)
              </label>

              <input
                id="salary_min"
                name="salary_min"
                className="job-form-control"
                type="number"
                min="0"
                step="1"
                placeholder="Ex. : 150000"
                value={form.salary_min}
                onChange={handleChange}
                disabled={submitting}
              />
            </div>

            {/* SALAIRE MAXIMUM */}

            <div className="job-form-section">
              <label
                className="job-form-label"
                htmlFor="salary_max"
              >
                Salaire maximum (FCFA)
              </label>

              <input
                id="salary_max"
                name="salary_max"
                className="job-form-control"
                type="number"
                min="0"
                step="1"
                placeholder="Ex. : 300000"
                value={form.salary_max}
                onChange={handleChange}
                disabled={submitting}
              />
            </div>

            {/* DATE LIMITE */}

            <div className="job-form-section">
              <label
                className="job-form-label"
                htmlFor="deadline"
              >
                Date limite de candidature
              </label>

              <input
                id="deadline"
                name="deadline"
                className="job-form-control"
                type="date"
                min={
                  isEditing &&
                  originalDeadline &&
                  originalDeadline < getLocalDateString()
                    ? undefined
                    : getLocalDateString()
                }
                value={form.deadline}
                onChange={handleChange}
                disabled={submitting}
              />

              <span className="job-form-help">
                Laissez vide si aucune date limite n'est définie.
              </span>
            </div>

            {/* STATUT */}

            <div className="job-form-section">
              <label
                className="job-form-label"
                htmlFor="status"
              >
                Statut de l'offre
              </label>

              <div className="job-form-select-wrap">
                <select
                  id="status"
                  name="status"
                  className="job-form-control job-form-select"
                  value={form.status}
                  onChange={handleChange}
                  disabled={submitting}
                >
                  {EDITABLE_JOB_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {JOB_STATUS_LABELS[status]}
                    </option>
                  ))}

                  {isEditing &&
                    ["EXPIRED", "ARCHIVED"].includes(form.status) && (
                      <option value={form.status} disabled>
                        {JOB_STATUS_LABELS[form.status]}
                      </option>
                    )}
                </select>

                <span
                  className="job-form-select-arrow"
                  aria-hidden="true"
                >
                  ▾
                </span>
              </div>

              <span className="job-form-help">
                Un brouillon n'est pas visible dans la liste publique.
                Une offre expirée ou archivée conserve son statut actuel.
              </span>
            </div>
          </div>

          {/* ACTIONS */}

          <div className="job-form-submit-panel">
            <div className="job-form-submit-info">
              <span
                className="job-form-submit-icon"
                aria-hidden="true"
              >
                ✓
              </span>

              <div>
                <strong>
                  Prêt à enregistrer votre offre ?
                </strong>

                <p>
                  Vérifiez les informations avant de confirmer.
                </p>
              </div>
            </div>

            <div className="job-form-submit-actions">
              <button
                type="button"
                className="job-form-cancel-button"
                onClick={() => navigate("/recruiter/jobs")}
                disabled={submitting}
              >
                Annuler
              </button>

              <button
                type="submit"
                className="job-form-submit-button"
                disabled={
                  submitting ||
                  companiesLoading ||
                  companies.length === 0
                }
              >
                {submitting ? (
                  <>
                    <span className="job-form-button-spinner" />
                    Enregistrement...
                  </>
                ) : (
                  <>
                    <span aria-hidden="true">✓</span>

                    {isEditing
                      ? "Enregistrer les modifications"
                      : "Créer l'offre"}
                  </>
                )}
              </button>
            </div>
          </div>
        </form>

        <footer className="job-form-footer">
          <span>SunuJob AI</span>

          <span>
            Une meilleure rencontre entre talents et opportunités.
          </span>
        </footer>
      </div>
    </main>
  );
}
