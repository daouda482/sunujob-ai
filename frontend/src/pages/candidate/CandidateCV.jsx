
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Upload, FileText, Download, Trash2, RefreshCw, ShieldCheck, CheckCircle2, AlertCircle } from "lucide-react";
import api from "../../api/axios";
import "./CandidateCV.css";

const CV_ENDPOINT = "candidates/profile/me/cv/";
const DOWNLOAD_ENDPOINT = "candidates/profile/me/cv/download/";

function formatSize(bytes = 0) {
  if (!bytes) return "Taille inconnue";
  return bytes < 1024 * 1024
    ? `${(bytes / 1024).toFixed(0)} Ko`
    : `${(bytes / (1024 * 1024)).toFixed(2)} Mo`;
}

function getError(error) {
  const data = error?.response?.data;
  if (!error.response) return "Impossible de joindre Django. Vérifiez que le serveur est démarré.";
  if (error.response.status === 401) return "Votre session a expiré. Veuillez vous reconnecter.";
  if (error.response.status === 403) return "Cette fonctionnalité est réservée aux candidats.";
  if (typeof data?.detail === "string") return data.detail;
  if (data?.resume) return Array.isArray(data.resume) ? data.resume[0] : data.resume;
  return "Une erreur est survenue. Vérifiez le fichier et réessayez.";
}

export default function CandidateCV() {
  const fileInput = useRef(null);
  const [cv, setCv] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadCV = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get(CV_ENDPOINT);
      setCv(response.data);
    } catch (err) {
      setError(getError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCV();
  }, []);

  const chooseFile = (event) => {
    const file = event.target.files?.[0];
    setError("");
    setSuccess("");

    if (!file) return;

    const extension = file.name.split(".").pop()?.toLowerCase();
    if (!["pdf", "docx"].includes(extension)) {
      setError("Formats acceptés : PDF et DOCX.");
      event.target.value = "";
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      setError("Le fichier ne doit pas dépasser 8 Mo.");
      event.target.value = "";
      return;
    }

    setSelectedFile(file);
  };

  const uploadCV = async (event) => {
    event.preventDefault();
    if (!selectedFile) {
      setError("Veuillez d'abord sélectionner un fichier PDF ou DOCX.");
      return;
    }

    const formData = new FormData();
    formData.append("resume", selectedFile);

    setUploading(true);
    setError("");
    setSuccess("");

    try {
      const response = await api.patch(CV_ENDPOINT, formData);

      setCv(response.data);
      setSelectedFile(null);
      if (fileInput.current) fileInput.current.value = "";
      setSuccess(response.data.message || "Votre CV a été enregistré.");
    } catch (err) {
      setError(getError(err));
    } finally {
      setUploading(false);
    }
  };

  const downloadCV = async () => {
    setDownloading(true);
    setError("");

    try {
      const response = await api.get(DOWNLOAD_ENDPOINT, {
        responseType: "blob",
      });

      const blobUrl = window.URL.createObjectURL(
        new Blob([response.data])
      );
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = cv?.name || "mon-cv";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      setError(getError(err));
    } finally {
      setDownloading(false);
    }
  };

  const deleteCV = async () => {
    const confirmed = window.confirm(
      "Voulez-vous vraiment supprimer le CV enregistré ?"
    );
    if (!confirmed) return;

    setDeleting(true);
    setError("");
    setSuccess("");

    try {
      const response = await api.delete(CV_ENDPOINT);
      setCv({ has_cv: false, name: null, size: 0 });
      setSelectedFile(null);
      setSuccess(response.data.message || "CV supprimé.");
    } catch (err) {
      setError(getError(err));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <main className="candidate-cv-page">
      <div className="candidate-cv-container">
        <nav className="candidate-cv-breadcrumb">
          <Link to="/candidate/dashboard">Mon espace</Link>
          <span>/</span>
          <span>Mon CV</span>
        </nav>

        <section className="candidate-cv-hero">
          <div>
            <span className="candidate-cv-eyebrow">SUNUJOB AI · ESPACE CANDIDAT</span>
            <h1>Votre CV, votre meilleur <span>atout professionnel.</span></h1>
            <p>
              Centralisez votre CV sur SunuJob AI pour faciliter vos candidatures
              et accéder à une analyse de votre document.
            </p>
          </div>
          <div className="candidate-cv-hero-icon">
            <FileText size={76} strokeWidth={1.3} />
          </div>
        </section>

        {(error || success) && (
          <div className={`candidate-cv-alert ${error ? "is-error" : "is-success"}`} role="alert">
            {error ? <AlertCircle size={19} /> : <CheckCircle2 size={19} />}
            <span>{error || success}</span>
            <button type="button" onClick={() => { setError(""); setSuccess(""); }} aria-label="Fermer">×</button>
          </div>
        )}

        <section className="candidate-cv-grid">
          <article className="candidate-cv-card candidate-cv-upload-card">
            <div className="candidate-cv-card-heading">
              <div className="candidate-cv-icon"><Upload size={22} /></div>
              <div>
                <h2>Importer votre CV</h2>
                <p>Ajoutez ou remplacez votre document professionnel.</p>
              </div>
            </div>

            <form onSubmit={uploadCV}>
              <label className="candidate-cv-dropzone">
                <input
                  ref={fileInput}
                  type="file"
                  accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={chooseFile}
                />
                <span className="candidate-cv-upload-symbol"><Upload size={28} /></span>
                <strong>{selectedFile ? selectedFile.name : "Choisir un fichier sur votre ordinateur"}</strong>
                <span>
                  {selectedFile
                    ? formatSize(selectedFile.size)
                    : "Cliquez ici pour parcourir vos fichiers"}
                </span>
              </label>

              <div className="candidate-cv-file-rules">
                <span>PDF ou DOCX</span>
                <span>8 Mo maximum</span>
              </div>

              <button className="candidate-cv-primary-button" type="submit" disabled={!selectedFile || uploading}>
                {uploading ? <><RefreshCw className="candidate-cv-spin" size={18} /> Enregistrement...</> : <><Upload size={18} /> Enregistrer mon CV</>}
              </button>
            </form>
          </article>

          <article className="candidate-cv-card candidate-cv-current-card">
            <div className="candidate-cv-card-heading">
              <div className="candidate-cv-icon candidate-cv-icon-green"><FileText size={22} /></div>
              <div>
                <h2>Mon document actuel</h2>
                <p>Le CV associé à votre espace candidat.</p>
              </div>
            </div>

            {loading ? (
              <div className="candidate-cv-loading"><RefreshCw className="candidate-cv-spin" /> Chargement du CV...</div>
            ) : cv?.has_cv ? (
              <>
                <div className="candidate-cv-file-card">
                  <div className="candidate-cv-pdf-icon"><FileText size={28} /></div>
                  <div className="candidate-cv-file-info">
                    <strong title={cv.name}>{cv.name}</strong>
                    <span>{formatSize(cv.size)}</span>
                    <small><CheckCircle2 size={14} /> Document enregistré</small>
                  </div>
                </div>
                <div className="candidate-cv-document-actions">
                  <button type="button" onClick={downloadCV} disabled={downloading} className="candidate-cv-primary-button">
                    {downloading ? "Téléchargement..." : <><Download size={17} /> Télécharger</>}
                  </button>
                  <button type="button" onClick={deleteCV} disabled={deleting} className="candidate-cv-delete-button">
                    <Trash2 size={17} /> {deleting ? "Suppression..." : "Supprimer"}
                  </button>
                </div>
              </>
            ) : (
              <div className="candidate-cv-empty">
                <FileText size={42} />
                <strong>Aucun CV enregistré</strong>
                <p>Importez votre CV pour le conserver dans votre espace candidat.</p>
              </div>
            )}
          </article>
        </section>

        <section className="candidate-cv-security">
          <ShieldCheck size={25} />
          <div>
            <strong>Votre document reste dans votre espace sécurisé</strong>
            <p>Le téléchargement est réservé à votre session candidat. Vérifiez toujours que les informations de votre CV sont exactes et à jour.</p>
          </div>
        </section>

        <section className="candidate-cv-next-step">
          <div>
            <span>ÉTAPE SUIVANTE</span>
            <h2>Découvrez ce que votre CV met en valeur</h2>
            <p>Lancez l'analyse pour consulter les compétences identifiées et obtenir des pistes d'amélioration.</p>
          </div>
          <Link to="/candidate/cv-analysis">Analyser mon CV <span>→</span></Link>
        </section>
      </div>
    </main>
  );
}
