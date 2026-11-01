
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import ReportButton from "../components/ReportButton";

import {
  ArrowLeft,
  ArrowUpRight,
  BadgeCheck,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileText,
  Heart,
  Laptop,
  LoaderCircle,
  MapPin,
  Share2,
  ShieldCheck,
  Sparkles,
  Wallet,
  GraduationCap,
  Target,
  ListChecks,
  AlertCircle,
  Send,
} from "lucide-react";

import api from "../api/axios";
import "./JobDetails.css";

/* =========================================================
   OUTILS
========================================================= */

function unwrapData(payload) {
  if (payload?.job) return payload.job;

  if (payload?.data && !Array.isArray(payload.data)) {
    return payload.data;
  }

  return payload;
}

function formatDate(value) {
  if (!value) return "Date non précisée";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Date non précisée";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

function splitItems(value) {
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === "string") return item;

        return (
          item?.name ||
          item?.title ||
          item?.label ||
          ""
        );
      })
      .filter(Boolean);
  }

  if (typeof value === "string" && value.trim()) {
    return value
      .split(/\r?\n|;|•/)
      .map((item) => item.replace(/^[\s\-–*]+/, "").trim())
      .filter(Boolean);
  }

  return [];
}

function formatSalary(min, max) {
  const format = (value) =>
    new Intl.NumberFormat("fr-FR", {
      maximumFractionDigits: 0,
    }).format(Number(value));

  if (min != null && max != null) {
    return `${format(min)} - ${format(max)} FCFA`;
  }

  if (min != null) {
    return `À partir de ${format(min)} FCFA`;
  }

  if (max != null) {
    return `Jusqu'à ${format(max)} FCFA`;
  }

  return "Non précisée";
}

/* =========================================================
   NORMALISATION DES DONNÉES DJANGO
========================================================= */

function normalizeJob(job) {
  const company =
    job.company && typeof job.company === "object"
      ? job.company
      : job.company_details || {};

  const companyId =
    job.company_id ??
    (typeof job.company === "object"
      ? job.company?.id
      : job.company) ??
    company.id ??
    null;

  const contractLabels = {
    CDI: "CDI",
    CDD: "CDD",
    INTERNSHIP: "Stage",
    APPRENTICESHIP: "Alternance",
    FREELANCE: "Freelance",
    TEMPORARY: "Intérim",
    VACATION: "Vacation",
  };

  return {
    ...job,

    id: job.id,
    companyId,

    title:
      job.title ||
      job.title_job ||
      job.name ||
      "Offre d'emploi",

    companyName:
      job.company_name ||
      company.name ||
      company.company_name ||
      "Entreprise partenaire",

    companyDescription:
      company.description ||
      job.company_description ||
      "",

    companyLogo:
      job.company_logo ||
      job.logo ||
      company.logo ||
      company.logo_url ||
      "",

    location:
      job.location ||
      job.city ||
      job.address ||
      "",

    contract:
      contractLabels[job.contract_type] ||
      job.contract_type ||
      job.contract ||
      "",

    category:
      job.sector ||
      job.category_name ||
      job.domain ||
      "",

    description:
      job.description ||
      "",

    missions: splitItems(
      job.missions ||
      job.responsibilities
    ),

    requirements: splitItems(
      job.requirements ||
      job.profile_required ||
      job.profil_recherche
    ),

    skills: splitItems(
      job.skills_required ||
      job.skills ||
      job.required_skills ||
      job.competences
    ),

    benefits: splitItems(
      job.benefits ||
      job.avantages
    ),

    education:
      job.education_level ||
      job.education ||
      "Non précisé",

    experience:
      job.experience_required != null
        ? `${job.experience_required} an(s)`
        : job.experience || "Non précisée",

    salary:
      job.salary ||
      job.salary_range ||
      formatSalary(job.salary_min, job.salary_max),

    publishedAt:
      job.created_at ||
      job.published_at ||
      job.date_published ||
      "",

    deadline:
      job.deadline ||
      job.application_deadline ||
      job.closing_date ||
      "",

    remote: Boolean(
      job.remote ||
      job.is_remote ||
      job.telework
    ),

    verified: Boolean(
      job.is_verified ||
      company.is_verified
    ),
  };
}

/* =========================================================
   LISTE À PUCES
========================================================= */

function BulletList({ items, fallback }) {
  if (!items.length) {
    return <p className="jd-muted-copy">{fallback}</p>;
  }

  return (
    <ul className="jd-bullet-list">
      {items.map((item, index) => (
        <li key={`${index}-${item}`}>
          <span className="jd-check-icon">
            <CheckCircle2 size={17} />
          </span>

          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

/* =========================================================
   COMPOSANT PRINCIPAL
========================================================= */

export default function JobDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [applicationError, setApplicationError] = useState("");
  const [saved, setSaved] = useState(false);
  const [shareMessage, setShareMessage] = useState("");

  /* -------------------------------------------------------
     CHARGEMENT DE L'OFFRE
  ------------------------------------------------------- */

  useEffect(() => {
    let active = true;

    async function loadJob() {
      setLoading(true);
      setError("");
      setJob(null);

      try {
        const response = await api.get(
          `jobs/published/${id}/`
        );

        const data = unwrapData(response.data);

        if (
          !data ||
          typeof data !== "object" ||
          Array.isArray(data)
        ) {
          throw new Error(
            "Le serveur n'a pas renvoyé une offre valide."
          );
        }

        if (active) {
          setJob(normalizeJob(data));
        }
      } catch (err) {
        if (!active) return;

        const status = err.response?.status;

        if (status === 404) {
          setError(
            "Cette offre n'existe pas ou n'est plus publiée."
          );
        } else if (status === 401) {
          setError(
            "Impossible de consulter cette offre. Vérifiez votre connexion."
          );
        } else if (status === 403) {
          setError(
            "Vous n'avez pas l'autorisation de consulter cette offre."
          );
        } else {
          setError(
            err.response?.data?.detail ||
            err.response?.data?.message ||
            err.message ||
            "Impossible de charger cette offre."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    if (id) {
      loadJob();
    } else {
      setError("Identifiant de l'offre manquant.");
      setLoading(false);
    }

    return () => {
      active = false;
    };
  }, [id]);

  /* -------------------------------------------------------
     GESTION DES FAVORIS
  ------------------------------------------------------- */

  useEffect(() => {
    try {
      const favorites = JSON.parse(
        localStorage.getItem("sunujob_saved_jobs") || "[]"
      );

      setSaved(
        favorites.map(String).includes(String(id))
      );
    } catch {
      setSaved(false);
    }
  }, [id]);

  const toggleSaved = () => {
    try {
      const favorites = JSON.parse(
        localStorage.getItem("sunujob_saved_jobs") || "[]"
      ).map(String);

      const updated = saved
        ? favorites.filter((item) => item !== String(id))
        : [...new Set([...favorites, String(id)])];

      localStorage.setItem(
        "sunujob_saved_jobs",
        JSON.stringify(updated)
      );

      setSaved(!saved);
    } catch {
      setApplicationError(
        "Impossible d'enregistrer ce favori."
      );
    }
  };

  /* -------------------------------------------------------
     PARTAGE DE L'OFFRE
  ------------------------------------------------------- */

  const shareJob = async () => {
    setShareMessage("");

    try {
      if (navigator.share) {
        await navigator.share({
          title: job?.title || "Offre SunuJob AI",
          text: `Découvrez cette offre : ${job?.title || ""}`,
          url: window.location.href,
        });
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(
          window.location.href
        );

        setShareMessage("Lien de l'offre copié !");
      } else {
        setShareMessage(
          "Le partage n'est pas disponible sur ce navigateur."
        );
      }
    } catch (err) {
      if (err.name !== "AbortError") {
        setShareMessage(
          "Impossible de partager cette offre."
        );
      }
    }
  };

  /* -------------------------------------------------------
     CANDIDATURE
     IMPORTANT :
     La candidature est envoyée depuis Apply.jsx.
     Cette page ouvre uniquement le formulaire.
  ------------------------------------------------------- */

  const goToApplicationForm = () => {
    setApplicationError("");

    const accessToken =
      localStorage.getItem("access") ||
      sessionStorage.getItem("access");

    const storedUser =
      localStorage.getItem("user") ||
      sessionStorage.getItem("user");

    if (!accessToken || !storedUser) {
      navigate("/login", {
        state: {
          from: `/jobs/${id}/apply`,
        },
      });

      return;
    }

    try {
      const user = JSON.parse(storedUser);

      if (user.role !== "CANDIDATE") {
        setApplicationError(
          "Seuls les candidats peuvent postuler à cette offre."
        );

        return;
      }
    } catch {
      navigate("/login", {
        state: {
          from: `/jobs/${id}/apply`,
        },
      });

      return;
    }

    navigate(`/jobs/${id}/apply`);
  };

  /* -------------------------------------------------------
     CHARGEMENT
  ------------------------------------------------------- */

  if (loading) {
    return (
      <main className="jd-page">
        <div className="jd-loading">
          <LoaderCircle
            size={38}
            className="jd-spinner"
          />

          <h2>Préparation de votre opportunité</h2>

          <p>
            Nous récupérons les détails de l'offre...
          </p>
        </div>
      </main>
    );
  }

  /* -------------------------------------------------------
     ERREUR
  ------------------------------------------------------- */

  if (error || !job) {
    return (
      <main className="jd-page">
        <div className="jd-error-page">
          <span className="jd-error-icon">
            <AlertCircle size={30} />
          </span>

          <h1>Offre indisponible</h1>

          <p>
            {error || "Cette offre ne peut pas être affichée."}
          </p>

          <button
            onClick={() => navigate("/jobs")}
            className="jd-primary-btn"
          >
            <ArrowLeft size={17} />
            Retour aux offres
          </button>
        </div>
      </main>
    );
  }

  /* -------------------------------------------------------
     AFFICHAGE DE L'OFFRE
  ------------------------------------------------------- */

  return (
    <main className="jd-page">

      {/* EN-TÊTE */}

      <header className="jd-header">
        <Link to="/jobs" className="jd-brand">
          <span className="jd-brand-icon">
            <BriefcaseBusiness size={22} />
          </span>

          <span className="jd-brand-text">
            <strong>
              SunuJob <span>AI</span>
            </strong>

            <small>
              Le talent rencontre l'opportunité
            </small>
          </span>
        </Link>

        <nav className="jd-header-nav">
          <Link
            to="/jobs"
            className="jd-header-active"
          >
            Offres d'emploi
          </Link>

          <Link to="/candidate/dashboard">
            Espace candidat
          </Link>
        </nav>

        <button
          className="jd-header-login"
          onClick={() => navigate("/login")}
        >
          Se connecter
          <ArrowUpRight size={16} />
        </button>
      </header>

      {/* BANNIÈRE */}

      <section className="jd-banner">
        <div className="jd-banner-shape jd-banner-shape-one" />
        <div className="jd-banner-shape jd-banner-shape-two" />

        <div className="jd-banner-inner">

          <div className="jd-breadcrumb">
            <Link to="/jobs">
              Offres d'emploi
            </Link>

            <span>/</span>

            <span>
              {job.category || "Opportunités"}
            </span>
          </div>

          <div className="jd-banner-grid">

            <div className="jd-banner-company-logo">
              {job.companyLogo ? (
                <img
                  src={job.companyLogo}
                  alt={`Logo ${job.companyName}`}
                />
              ) : (
                <Building2 size={37} />
              )}
            </div>

            <div className="jd-banner-info">

              <div className="jd-company-line">
                <span>{job.companyName}</span>

                {job.verified && (
                  <span className="jd-verified-badge">
                    <BadgeCheck size={15} />
                    Entreprise vérifiée
                  </span>
                )}
              </div>

              <h1>{job.title}</h1>

              <div className="jd-banner-meta">

                {job.location && (
                  <span>
                    <MapPin size={16} />
                    {job.location}
                  </span>
                )}

                {job.contract && (
                  <span>
                    <BriefcaseBusiness size={16} />
                    {job.contract}
                  </span>
                )}

                <span>
                  <CalendarDays size={16} />
                  Publiée le {formatDate(job.publishedAt)}
                </span>

              </div>
            </div>

            <div className="jd-banner-actions">

              <button
                className={`jd-save-btn ${
                  saved ? "jd-is-saved" : ""
                }`}
                onClick={toggleSaved}
                aria-label={
                  saved
                    ? "Retirer des favoris"
                    : "Enregistrer l'offre"
                }
              >
                <Heart
                  size={19}
                  fill={saved ? "currentColor" : "none"}
                />
              </button>

              <button
                className="jd-share-btn"
                onClick={shareJob}
              >
                <Share2 size={17} />
                Partager
              </button>

              <ReportButton
                targetType="JOB"
                targetId={job.id ?? id}
                targetLabel={job.title}
                buttonLabel="Signaler l'offre"
                compact
              />

            </div>
          </div>

          {shareMessage && (
            <p className="jd-share-message">
              {shareMessage}
            </p>
          )}

        </div>
      </section>

      {/* CONTENU PRINCIPAL */}

      <section className="jd-layout">

        <div className="jd-main-column">

          {applicationError && (
            <div className="jd-alert jd-alert-error">
              <AlertCircle size={20} />

              <div>
                <strong>Action impossible</strong>
                <p>{applicationError}</p>
              </div>
            </div>
          )}

          {/* INFORMATIONS CLÉS */}

          <div className="jd-highlight-row">

            <div className="jd-highlight">
              <span className="jd-highlight-icon">
                <BriefcaseBusiness size={19} />
              </span>

              <div>
                <small>Type de contrat</small>
                <strong>
                  {job.contract || "À préciser"}
                </strong>
              </div>
            </div>

            <div className="jd-highlight">
              <span className="jd-highlight-icon jd-highlight-green">
                <MapPin size={19} />
              </span>

              <div>
                <small>Localisation</small>
                <strong>
                  {job.location || "À préciser"}
                </strong>
              </div>
            </div>

            <div className="jd-highlight">
              <span className="jd-highlight-icon jd-highlight-orange">
                <Wallet size={19} />
              </span>

              <div>
                <small>Rémunération</small>
                <strong>{job.salary}</strong>
              </div>
            </div>

          </div>

          {/* DESCRIPTION */}

          <article className="jd-section-card">

            <div className="jd-section-title">
              <span className="jd-section-icon">
                <FileText size={20} />
              </span>

              <div>
                <h2>À propos du poste</h2>
                <p>
                  Découvrez le contexte et les objectifs de cette opportunité.
                </p>
              </div>
            </div>

            <div className="jd-description">
              {job.description
                ? job.description.split(/\n+/).map(
                    (paragraph, index) => (
                      <p key={index}>{paragraph}</p>
                    )
                  )
                : (
                  <p>
                    La description détaillée n'a pas encore été renseignée.
                  </p>
                )}
            </div>

          </article>

          {/* MISSIONS */}

          <article className="jd-section-card">

            <div className="jd-section-title">
              <span className="jd-section-icon jd-icon-green">
                <Target size={20} />
              </span>

              <div>
                <h2>Missions et responsabilités</h2>
                <p>
                  Les principales missions liées à ce poste.
                </p>
              </div>
            </div>

            <BulletList
              items={job.missions}
              fallback="Les missions détaillées seront communiquées par le recruteur."
            />

          </article>

          {/* PROFIL */}

          <article className="jd-section-card">

            <div className="jd-section-title">
              <span className="jd-section-icon jd-icon-orange">
                <GraduationCap size={21} />
              </span>

              <div>
                <h2>Profil recherché</h2>
                <p>
                  Les qualifications et qualités attendues.
                </p>
              </div>
            </div>

            <div className="jd-profile-grid">

              <div className="jd-profile-item">
                <span className="jd-profile-icon">
                  <GraduationCap size={19} />
                </span>

                <div>
                  <small>Niveau d'études</small>
                  <strong>{job.education}</strong>
                </div>
              </div>

              <div className="jd-profile-item">
                <span className="jd-profile-icon">
                  <Clock3 size={19} />
                </span>

                <div>
                  <small>Expérience</small>
                  <strong>{job.experience}</strong>
                </div>
              </div>

            </div>

            <BulletList
              items={job.requirements}
              fallback="Les critères détaillés seront communiqués par le recruteur."
            />

          </article>

          {/* COMPÉTENCES */}

          {job.skills.length > 0 && (
            <article className="jd-section-card">

              <div className="jd-section-title">
                <span className="jd-section-icon">
                  <ListChecks size={20} />
                </span>

                <div>
                  <h2>Compétences recherchées</h2>
                  <p>
                    Les compétences utiles pour réussir dans ce poste.
                  </p>
                </div>
              </div>

              <div className="jd-skills">
                {job.skills.map((skill, index) => (
                  <span key={`${skill}-${index}`}>
                    {skill}
                  </span>
                ))}
              </div>

            </article>
          )}

          {/* AVANTAGES */}

          {job.benefits.length > 0 && (
            <article className="jd-section-card">

              <div className="jd-section-title">
                <span className="jd-section-icon jd-icon-green">
                  <Sparkles size={20} />
                </span>

                <div>
                  <h2>Avantages proposés</h2>
                  <p>
                    Les avantages mentionnés par l'entreprise.
                  </p>
                </div>
              </div>

              <BulletList
                items={job.benefits}
                fallback="Aucun avantage renseigné."
              />

            </article>
          )}

          {/* POSTULER */}

          <div className="jd-bottom-apply">

            <div>
              <h2>Cette opportunité vous intéresse ?</h2>
              <p>
                Préparez votre profil et envoyez votre candidature.
              </p>
            </div>

            <button
              type="button"
              className="jd-primary-btn"
              onClick={goToApplicationForm}
            >
              Postuler à cette offre
              <Send size={17} />
            </button>

          </div>

        </div>

        {/* COLONNE LATÉRALE */}

        <aside className="jd-sidebar">

          <div className="jd-apply-card">

            <div className="jd-apply-card-top">
              <span className="jd-apply-sparkle">
                <Sparkles size={20} />
              </span>

              <span className="jd-apply-label">
                OPPORTUNITÉ PROFESSIONNELLE
              </span>
            </div>

            <h2>
              Prêt à franchir une nouvelle étape ?
            </h2>

            <p>
              Présentez vos compétences et faites découvrir
              votre potentiel au recruteur.
            </p>

            <button
              type="button"
              className="jd-primary-btn jd-apply-main-btn"
              onClick={goToApplicationForm}
            >
              Postuler maintenant
              <ArrowUpRight size={18} />
            </button>

            <div className="jd-apply-assurance">
              <ShieldCheck size={17} />
              <span>
                Votre parcours mérite d'être valorisé.
              </span>
            </div>

          </div>

          {/* ENTREPRISE */}

          <div className="jd-sidebar-card">

            <h3>
              <Building2 size={18} />
              L'entreprise
            </h3>

            <div className="jd-sidebar-company">

              <span className="jd-sidebar-logo">
                {job.companyLogo ? (
                  <img src={job.companyLogo} alt="" />
                ) : (
                  <Building2 size={23} />
                )}
              </span>

              <div>
                <strong>{job.companyName}</strong>

                {job.verified && (
                  <span className="jd-company-verified">
                    <BadgeCheck size={13} />
                    Vérifiée
                  </span>
                )}
              </div>

            </div>

            <p className="jd-company-description">
              {job.companyDescription ||
                "Découvrez cette opportunité et contactez l'entreprise par le biais de votre candidature."}
            </p>

            <div className="jd-company-divider" />

            <div className="jd-company-fact">
              <MapPin size={16} />
              <span>
                {job.location || "Localisation non précisée"}
              </span>
            </div>

            {job.remote && (
              <div className="jd-company-fact">
                <Laptop size={16} />
                <span>Possibilité de télétravail</span>
              </div>
            )}

            {job.companyId && (
              <div className="jd-company-report">
                <ReportButton
                  targetType="COMPANY"
                  targetId={job.companyId}
                  targetLabel={job.companyName}
                  buttonLabel="Signaler cette entreprise"
                  compact
                />
              </div>
            )}

          </div>

          {/* CONSEIL */}

          <div className="jd-sidebar-card jd-advice-card">

            <span className="jd-advice-icon">
              <Sparkles size={19} />
            </span>

            <h3>Conseil SunuJob AI</h3>

            <p>
              Personnalisez votre CV en fonction des missions
              et des compétences mentionnées dans l'offre.
            </p>

            <button
              onClick={() => navigate("/candidate/dashboard")}
            >
              Accéder à mon espace
              <ArrowUpRight size={15} />
            </button>

          </div>

          {/* DATE LIMITE */}

          {job.deadline && (
            <div className="jd-deadline-card">

              <CalendarDays size={18} />

              <div>
                <small>Date limite de candidature</small>
                <strong>{formatDate(job.deadline)}</strong>
              </div>

            </div>
          )}

        </aside>

      </section>

      {/* PIED DE PAGE */}

      <footer className="jd-footer">

        <Link to="/jobs" className="jd-footer-brand">
          <BriefcaseBusiness size={19} />
          <strong>SunuJob AI</strong>
        </Link>

        <span>
          Des talents, des ambitions, des opportunités.
        </span>

        <Link to="/jobs">
          Explorer les offres
          <ArrowUpRight size={14} />
        </Link>

      </footer>

    </main>
  );
}
