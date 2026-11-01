import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  CheckCircle2,
  CircleAlert,
  Download,
  FileCheck2,
  FileText,
  LoaderCircle,
  MapPin,
  Send,
  ShieldCheck,
} from "lucide-react";

import api from "../api/axios";
import "./ApplyJob.css";


export default function ApplyJob() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [job, setJob] = useState(null);

  const [loading, setLoading] = useState(true);
  const [loadingCv, setLoadingCv] = useState(true);
  const [sending, setSending] = useState(false);

  const [loadError, setLoadError] = useState("");
  const [serverError, setServerError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [cv, setCv] = useState(null);
  const [coverLetter, setCoverLetter] = useState("");
  const [consent, setConsent] = useState(false);

  const [errors, setErrors] = useState({});


  // =====================================================
  // RÉCUPÉRER L'OFFRE
  // =====================================================

  const loadJob = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError("");

      const response = await api.get(`jobs/published/${id}/`);

      setJob(response.data);
    } catch (error) {
      console.error(
        "Erreur de récupération de l'offre :",
        error.response?.data || error.message
      );

      setLoadError(
        error.response?.data?.detail ||
        "Impossible de récupérer cette offre. Veuillez réessayer."
      );
    } finally {
      setLoading(false);
    }
  }, [id]);


  // =====================================================
  // RÉCUPÉRER LE CV DU PROFIL
  // =====================================================

  const loadCandidateCV = useCallback(async () => {
    try {
      setLoadingCv(true);

      const response = await api.get(
        "candidates/profile/me/cv/"
      );

      const data = response.data;

      if (!data || data.has_cv !== true) {
        setCv(null);
        return;
      }

      setCv({
        has_cv: true,
        name: data.name || data.resume_name || "CV enregistré",
        size: Number(data.size || data.resume_size || 0),
        updated_at: data.updated_at || null,
        download_url: data.download_url || null,
      });

    } catch (error) {
      console.error(
        "Erreur de récupération du CV :",
        error.response?.data || error.message
      );

      setCv(null);
    } finally {
      setLoadingCv(false);
    }
  }, []);


  // =====================================================
  // CHARGEMENT INITIAL
  // =====================================================

  useEffect(() => {
    loadJob();
    loadCandidateCV();
  }, [loadJob, loadCandidateCV]);


  // =====================================================
  // FORMATAGE DE LA TAILLE DU CV
  // =====================================================

  const formatFileSize = (bytes) => {
    if (!bytes || bytes <= 0) {
      return "Taille non disponible";
    }

    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(0)} Ko`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(2)} Mo`;
  };


  // =====================================================
  // AFFICHER LES ERREURS DU BACKEND
  // =====================================================

  const getApiErrorMessage = (error) => {
    const data = error.response?.data;

    if (!data) {
      return "Impossible de contacter le serveur. Vérifiez votre connexion.";
    }

    if (typeof data === "string") {
      return data;
    }

    if (data.detail) {
      return data.detail;
    }

    if (data.job) {
      return Array.isArray(data.job)
        ? data.job[0]
        : data.job;
    }

    if (data.resume) {
      return Array.isArray(data.resume)
        ? data.resume[0]
        : data.resume;
    }

    if (data.cover_letter) {
      return Array.isArray(data.cover_letter)
        ? data.cover_letter[0]
        : data.cover_letter;
    }

    const firstField = Object.keys(data)[0];

    if (firstField) {
      const message = data[firstField];

      return Array.isArray(message)
        ? message[0]
        : String(message);
    }

    return "Une erreur est survenue pendant l'envoi de votre candidature.";
  };


  // =====================================================
  // CONSULTER / TÉLÉCHARGER LE CV
  // =====================================================

  const downloadCandidateCV = async () => {
    try {
      const response = await api.get(
        "candidates/profile/me/cv/download/",
        {
          responseType: "blob",
        }
      );

      const blob = new Blob(
        [response.data],
        {
          type: response.data.type || "application/octet-stream",
        }
      );

      const fileUrl = window.URL.createObjectURL(blob);

      const link = document.createElement("a");

      link.href = fileUrl;
      link.download = cv?.name || "mon-cv";

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      window.URL.revokeObjectURL(fileUrl);

    } catch (error) {
      console.error(
        "Erreur de téléchargement du CV :",
        error.response?.data || error.message
      );

      setServerError(
        "Impossible de télécharger votre CV. Vérifiez qu'il est toujours disponible."
      );
    }
  };


  // =====================================================
  // VALIDATION DU FORMULAIRE
  // =====================================================

  const validateForm = () => {
    const newErrors = {};

    if (!id || !Number.isInteger(Number(id))) {
      newErrors.job = "L'identifiant de l'offre est invalide.";
    }

    if (!cv?.has_cv) {
      newErrors.cv = "Vous devez enregistrer un CV dans votre profil.";
    }

    if (!consent) {
      newErrors.consent = "Veuillez confirmer votre candidature.";
    }

    if (coverLetter.length > 10000) {
      newErrors.coverLetter = (
        "Votre lettre de motivation ne doit pas dépasser 10 000 caractères."
      );
    }

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };


  // =====================================================
  // ENVOYER LA CANDIDATURE
  // =====================================================

  const handleSubmit = async (event) => {
    event.preventDefault();

    setServerError("");
    setSuccessMessage("");

    if (sending) {
      return;
    }

    if (!validateForm()) {
      return;
    }

    try {
      setSending(true);

      /*
       * IMPORTANT :
       * Le backend récupère automatiquement le CV depuis
       * request.user.candidate_profile.resume.
       *
       * Il ne faut donc pas envoyer le fichier une deuxième fois.
       */

      const payload = {
        job: Number(id),
        cover_letter: coverLetter.trim(),
      };

      const response = await api.post(
        "applications/",
        payload
      );

      console.log(
        "Candidature enregistrée :",
        response.data
      );

      setSuccessMessage(
        "Votre candidature a été envoyée avec succès !"
      );

      setCoverLetter("");
      setConsent(false);

      // Redirection vers le tableau de bord après confirmation.
      setTimeout(() => {
        navigate("/candidate/dashboard", {
          state: {
            applicationSuccess: true,
            applicationId: response.data.id,
          },
        });
      }, 1500);

    } catch (error) {
      console.error(
        "Erreur pendant l'envoi de la candidature :",
        error.response?.data || error.message
      );

      setServerError(getApiErrorMessage(error));

    } finally {
      setSending(false);
    }
  };


  // =====================================================
  // ÉTAT DE CHARGEMENT
  // =====================================================

  if (loading) {
    return (
      <div className="apply-page">
        <div className="apply-loading">
          <LoaderCircle className="apply-spinner" size={38} />
          <h3>Préparation de votre candidature...</h3>
          <p>Nous récupérons les informations de l'offre.</p>
        </div>
      </div>
    );
  }


  // =====================================================
  // ERREUR DE CHARGEMENT DE L'OFFRE
  // =====================================================

  if (loadError || !job) {
    return (
      <div className="apply-page">
        <div className="apply-error-card">
          <CircleAlert size={42} />

          <h2>Offre indisponible</h2>

          <p>{loadError || "Cette offre n'est pas disponible."}</p>

          <Link to="/jobs" className="apply-back-button">
            <ArrowLeft size={17} />
            Retour aux offres
          </Link>
        </div>
      </div>
    );
  }


  // =====================================================
  // AFFICHAGE PRINCIPAL
  // =====================================================

  return (
    <div className="apply-page">

      {/* EN-TÊTE */}

      <section className="apply-hero">
        <div className="apply-hero-content">

          <Link
            to={`/jobs/${id}`}
            className="apply-back-link"
          >
            <ArrowLeft size={17} />
            Retour à l'offre
          </Link>

          <span className="apply-hero-label">
            <BriefcaseBusiness size={16} />
            Candidature en ligne
          </span>

          <h1>
            Postulez à cette <span>opportunité</span>
          </h1>

          <p>
            Complétez votre candidature et transmettez votre
            profil au recruteur en quelques étapes.
          </p>

        </div>
      </section>


      <main className="apply-container">

        {/* RÉSUMÉ DE L'OFFRE */}

        <section className="apply-job-summary">

          <div className="apply-job-icon">
            <Building2 size={28} />
          </div>

          <div className="apply-job-information">

            <span className="apply-company-name">
              {job.company_name || job.company?.name || "Entreprise"}
            </span>

            <h2>{job.title}</h2>

            <div className="apply-job-meta">

              {job.location && (
                <span>
                  <MapPin size={15} />
                  {job.location}
                </span>
              )}

              {job.contract_type && (
                <span>
                  <BriefcaseBusiness size={15} />
                  {job.contract_type}
                </span>
              )}

              {job.deadline && (
                <span>
                  <CalendarDays size={15} />
                  Date limite : {job.deadline}
                </span>
              )}

            </div>
          </div>

        </section>


        <div className="apply-layout">

          {/* FORMULAIRE */}

          <section className="apply-form-card">

            <div className="apply-form-heading">

              <div>
                <span className="apply-section-label">
                  VOTRE DOSSIER
                </span>

                <h2>Finaliser ma candidature</h2>

                <p>
                  Vérifiez votre CV et ajoutez un message
                  au recruteur si vous le souhaitez.
                </p>
              </div>

              <div className="apply-heading-icon">
                <FileText size={25} />
              </div>

            </div>


            {/* MESSAGES */}

            {serverError && (
              <div className="apply-alert apply-alert-error">
                <CircleAlert size={20} />
                <span>{serverError}</span>
              </div>
            )}

            {successMessage && (
              <div className="apply-alert apply-alert-success">
                <CheckCircle2 size={20} />
                <span>{successMessage}</span>
              </div>
            )}


            <form onSubmit={handleSubmit}>

              {/* CV DU CANDIDAT */}

              <div className="apply-section">

                <div className="apply-section-title">
                  <span className="apply-number">01</span>

                  <div>
                    <h3>Mon CV professionnel</h3>
                    <p>
                      Le CV enregistré dans votre profil sera
                      automatiquement joint à votre candidature.
                    </p>
                  </div>
                </div>


                {loadingCv ? (
                  <div className="apply-cv-loading">
                    <LoaderCircle className="apply-spinner" size={23} />
                    <span>Vérification de votre CV...</span>
                  </div>
                ) : cv?.has_cv ? (

                  <div className="apply-cv-card">

                    <div className="apply-cv-icon">
                      <FileCheck2 size={27} />
                    </div>

                    <div className="apply-cv-details">

                      <strong>{cv.name}</strong>

                      <span>
                        {formatFileSize(cv.size)}
                      </span>

                      <span className="apply-cv-status">
                        <CheckCircle2 size={14} />
                        CV enregistré dans votre profil
                      </span>

                    </div>

                    <button
                      type="button"
                      className="apply-cv-download"
                      onClick={downloadCandidateCV}
                      title="Télécharger mon CV"
                    >
                      <Download size={18} />
                    </button>

                  </div>

                ) : (

                  <div className="apply-cv-missing">

                    <CircleAlert size={24} />

                    <div>
                      <strong>Aucun CV détecté</strong>

                      <p>
                        Enregistrez votre CV dans la rubrique
                        Mon CV avant de pouvoir envoyer votre candidature.
                      </p>

                      <Link to="/candidate/cv">
                        Ajouter mon CV
                      </Link>
                    </div>

                  </div>

                )}

                {errors.cv && (
                  <p className="apply-field-error">
                    {errors.cv}
                  </p>
                )}

              </div>


              {/* LETTRE DE MOTIVATION */}

              <div className="apply-section">

                <div className="apply-section-title">
                  <span className="apply-number">02</span>

                  <div>
                    <h3>Message au recruteur</h3>
                    <p>
                      Présentez brièvement votre motivation pour ce poste.
                    </p>
                  </div>
                </div>


                <div className="apply-field">

                  <label htmlFor="coverLetter">
                    Lettre de motivation
                    <span className="apply-optional"> (facultatif)</span>
                  </label>

                  <textarea
                    id="coverLetter"
                    name="coverLetter"
                    rows={7}
                    maxLength={10000}
                    placeholder="Madame, Monsieur,

Je souhaite vous soumettre ma candidature pour le poste proposé. Mon parcours et mes compétences correspondent aux exigences de cette opportunité..."
                    value={coverLetter}
                    onChange={(event) => {
                      setCoverLetter(event.target.value);

                      if (errors.coverLetter) {
                        setErrors((previous) => ({
                          ...previous,
                          coverLetter: "",
                        }));
                      }
                    }}
                  />

                  <div className="apply-textarea-footer">
                    <span>
                      Vous pouvez laisser ce champ vide.
                    </span>

                    <span>
                      {coverLetter.length}/10000
                    </span>
                  </div>

                  {errors.coverLetter && (
                    <p className="apply-field-error">
                      {errors.coverLetter}
                    </p>
                  )}

                </div>

              </div>


              {/* CONSENTEMENT */}

              <div className="apply-section">

                <div className="apply-section-title">
                  <span className="apply-number">03</span>

                  <div>
                    <h3>Confirmation</h3>
                    <p>
                      Vérifiez les informations avant de transmettre
                      votre dossier.
                    </p>
                  </div>
                </div>


                <label className="apply-consent">

                  <input
                    type="checkbox"
                    checked={consent}
                    onChange={(event) => {
                      setConsent(event.target.checked);

                      if (errors.consent) {
                        setErrors((previous) => ({
                          ...previous,
                          consent: "",
                        }));
                      }
                    }}
                  />

                  <span>
                    Je confirme que les informations transmises
                    dans ma candidature sont exactes et j'accepte
                    leur transmission à l'entreprise concernée.
                  </span>

                </label>

                {errors.consent && (
                  <p className="apply-field-error">
                    {errors.consent}
                  </p>
                )}

              </div>


              {/* BOUTON D'ENVOI */}

              <div className="apply-submit-area">

                <button
                  type="submit"
                  className="apply-submit"
                  disabled={sending || loadingCv || !cv?.has_cv}
                >

                  {sending ? (
                    <>
                      <LoaderCircle
                        size={19}
                        className="apply-spinner"
                      />
                      Envoi de votre candidature...
                    </>
                  ) : (
                    <>
                      <Send size={18} />
                      Envoyer ma candidature
                    </>
                  )}

                </button>

                {!loadingCv && !cv?.has_cv && (
                  <p className="apply-submit-hint">
                    Ajoutez d'abord votre CV dans votre profil
                    pour activer l'envoi.
                  </p>
                )}

                <p className="apply-secure-note">
                  <ShieldCheck size={15} />
                  Votre candidature est transmise de manière sécurisée.
                </p>

              </div>

            </form>

          </section>


          {/* PANNEAU LATÉRAL */}

          <aside className="apply-sidebar">

            <div className="apply-sidebar-card">

              <div className="apply-sidebar-icon">
                <ShieldCheck size={27} />
              </div>

              <h3>Votre candidature en toute simplicité</h3>

              <p>
                Votre CV déjà enregistré sera automatiquement
                associé à votre dossier.
              </p>

              <ul>
                <li>
                  <CheckCircle2 size={17} />
                  Pas besoin de téléverser le CV une deuxième fois
                </li>

                <li>
                  <CheckCircle2 size={17} />
                  Suivi de votre candidature depuis votre espace
                </li>

                <li>
                  <CheckCircle2 size={17} />
                  Notification après l'enregistrement
                </li>
              </ul>

            </div>


            <div className="apply-sidebar-help">

              <h3>Besoin d'aide ?</h3>

              <p>
                Vérifiez que votre profil candidat est à jour
                et que votre CV est bien enregistré.
              </p>

              <Link to="/candidate/cv">
                Gérer mon CV
              </Link>

            </div>

          </aside>

        </div>

      </main>

    </div>
  );
}