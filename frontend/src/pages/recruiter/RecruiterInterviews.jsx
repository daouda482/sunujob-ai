
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api";
import "./RecruiterInterviews.css";

const STATUS_LABELS = {
  SCHEDULED: "Programmé",
  COMPLETED: "Terminé",
  CANCELLED: "Annulé",
  RESCHEDULED: "Reporté",
};

const TYPE_LABELS = {
  IN_PERSON: "Présentiel",
  ONLINE: "En ligne",
  PHONE: "Téléphonique",
};

const EMPTY_FORM = {
  application: "",
  interview_type: "ONLINE",
  scheduled_at: "",
  location: "",
  meeting_link: "",
  message: "",
  status: "SCHEDULED",
};

function normalizeList(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  return [];
}

function formatDate(value) {
  if (!value) return "Non renseignée";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Date invalide";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function toLocalDateTime(value) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  const offset = date.getTimezoneOffset() * 60000;

  return new Date(date.getTime() - offset)
    .toISOString()
    .slice(0, 16);
}

function isValidHttpUrl(value) {
  if (!value?.trim()) return false;

  try {
    const url = new URL(value.trim());

    return ["http:", "https:"].includes(url.protocol);
  } catch {
    return false;
  }
}

function getErrorMessage(error) {
  const data = error?.response?.data;

  if (typeof data === "string") return data;

  if (data && typeof data === "object") {
    return Object.entries(data)
      .map(([key, value]) => {
        const message = Array.isArray(value)
          ? value
              .map((item) =>
                typeof item === "object" && item !== null
                  ? JSON.stringify(item)
                  : String(item)
              )
              .join(" ")
          : typeof value === "object" && value !== null
            ? JSON.stringify(value)
            : String(value);

        return `${key}: ${message}`;
      })
      .join("\n");
  }

  return error?.message || "Une erreur est survenue. Réessaie.";
}

export default function RecruiterInterviews() {
  const navigate = useNavigate();

  const [interviews, setInterviews] = useState([]);
  const [applications, setApplications] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actionId, setActionId] = useState(null);

  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingInterview, setEditingInterview] = useState(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });

  // =====================================================
  // CHARGEMENT DES ENTRETIENS ET DES CANDIDATURES
  // =====================================================

  const loadData = useCallback(async ({ showLoading = true } = {}) => {
    if (showLoading) {
      setLoading(true);
    }

    setError("");

    try {
      const [interviewResponse, applicationResponse] =
        await Promise.all([
          api.get("interviews/recruiter/"),
          api.get("applications/received/"),
        ]);

      setInterviews(normalizeList(interviewResponse.data));
      setApplications(normalizeList(applicationResponse.data));

      return true;
    } catch (err) {
      setError(
        `Impossible de charger les données. ${getErrorMessage(err)}`
      );

      return false;
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // =====================================================
  // CANDIDATURES AUTORISÉES POUR LA PROGRAMMATION
  // =====================================================

  const eligibleApplications = useMemo(() => {
    return applications.filter(
      (application) =>
        !["REJECTED", "WITHDRAWN"].includes(application.status)
    );
  }, [applications]);

  // =====================================================
  // RECHERCHE ET FILTRAGE
  // =====================================================

  const filteredInterviews = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return interviews.filter((interview) => {
      const matchesStatus =
        statusFilter === "ALL" ||
        interview.status === statusFilter;

      const searchableText = [
        interview.candidate_name,
        interview.candidate_email,
        interview.job_title,
        interview.company_name,
        TYPE_LABELS[interview.interview_type],
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return (
        matchesStatus &&
        (!normalizedSearch ||
          searchableText.includes(normalizedSearch))
      );
    });
  }, [interviews, search, statusFilter]);

  // =====================================================
  // STATISTIQUES
  // =====================================================

  const stats = useMemo(() => {
    const now = Date.now();

    return {
      total: interviews.length,

      scheduled: interviews.filter(
        (item) => item.status === "SCHEDULED"
      ).length,

      upcoming: interviews.filter((item) => {
        if (item.status !== "SCHEDULED") return false;

        const date = new Date(item.scheduled_at).getTime();

        return Number.isFinite(date) && date >= now;
      }).length,

      completed: interviews.filter(
        (item) => item.status === "COMPLETED"
      ).length,
    };
  }, [interviews]);

  // =====================================================
  // GESTION DE LA FENÊTRE MODALE
  // =====================================================

  function closeModal() {
    if (saving) return;

    setModalOpen(false);
    setFormError("");
  }

  function openCreateModal() {
    setEditingInterview(null);
    setForm({ ...EMPTY_FORM });

    setFormError("");
    setError("");
    setSuccess("");

    setModalOpen(true);
  }

  function openEditModal(interview) {
    setEditingInterview(interview);

    setForm({
      application: String(interview.application ?? ""),
      interview_type: interview.interview_type || "ONLINE",
      scheduled_at: toLocalDateTime(interview.scheduled_at),
      location: interview.location || "",
      meeting_link: interview.meeting_link || "",
      message: interview.message || "",
      status: interview.status || "SCHEDULED",
    });

    setFormError("");
    setError("");
    setSuccess("");

    setModalOpen(true);
  }

  function updateField(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  // =====================================================
  // PROGRAMMER OU MODIFIER UN ENTRETIEN
  // =====================================================

  async function handleSubmit(event) {
    event.preventDefault();

    if (saving || actionId !== null) return;

    setFormError("");
    setError("");
    setSuccess("");

    // Vérification de la date
    if (!form.scheduled_at) {
      setFormError("Veuillez saisir une date et une heure.");
      return;
    }

    const scheduledDate = new Date(form.scheduled_at);

    if (Number.isNaN(scheduledDate.getTime())) {
      setFormError("Veuillez saisir une date et une heure valides.");
      return;
    }

    // Empêcher une nouvelle programmation dans le passé.
    // Une date déjà enregistrée peut être conservée lors d'une modification.
    const previousDate = editingInterview?.scheduled_at
      ? new Date(editingInterview.scheduled_at).getTime()
      : null;

    const isUnchangedDate =
      previousDate !== null &&
      Number.isFinite(previousDate) &&
      scheduledDate.getTime() === previousDate;

    if (
      scheduledDate.getTime() < Date.now() &&
      !isUnchangedDate
    ) {
      setFormError(
        "La date de l'entretien ne peut pas être dans le passé."
      );
      return;
    }

    // Vérification du type d'entretien
    if (
      !["ONLINE", "IN_PERSON", "PHONE"].includes(
        form.interview_type
      )
    ) {
      setFormError("Veuillez sélectionner un type d'entretien valide.");
      return;
    }

    // Vérification du lieu pour un entretien présentiel
    if (
      form.interview_type === "IN_PERSON" &&
      !form.location.trim()
    ) {
      setFormError(
        "Le lieu est obligatoire pour un entretien en présentiel."
      );
      return;
    }

    // Vérification du lien pour un entretien en ligne
    if (form.interview_type === "ONLINE") {
      if (!form.meeting_link.trim()) {
        setFormError(
          "Le lien de visioconférence est obligatoire."
        );
        return;
      }

      if (!isValidHttpUrl(form.meeting_link)) {
        setFormError(
          "Veuillez saisir un lien de visioconférence valide commençant par http:// ou https://."
        );
        return;
      }
    }

    // Vérification de la candidature
    if (!editingInterview && !form.application) {
      setFormError("Veuillez sélectionner une candidature.");
      return;
    }

    if (
      !editingInterview &&
      !eligibleApplications.some(
        (application) =>
          String(application.id) === String(form.application)
      )
    ) {
      setFormError(
        "La candidature sélectionnée n'est plus disponible."
      );
      return;
    }

    // Vérification du statut lors d'une modification
    if (
      editingInterview &&
      !Object.prototype.hasOwnProperty.call(
        STATUS_LABELS,
        form.status
      )
    ) {
      setFormError("Veuillez sélectionner un statut valide.");
      return;
    }

    setSaving(true);

    try {
      const payload = {
        interview_type: form.interview_type,
        scheduled_at: scheduledDate.toISOString(),
        location: form.location.trim(),
        meeting_link: form.meeting_link.trim(),
        message: form.message.trim(),
      };

      if (editingInterview) {
        payload.status = form.status;

        await api.patch(
          `interviews/recruiter/${editingInterview.id}/`,
          payload
        );
      } else {
        payload.application = Number(form.application);

        await api.post("interviews/recruiter/", payload);
      }

      // L'enregistrement serveur est réussi.
      setModalOpen(false);
      setFormError("");

      // Actualiser sans faire disparaître le tableau.
      const refreshed = await loadData({
        showLoading: false,
      });

      if (refreshed) {
        setSuccess(
          editingInterview
            ? "Entretien modifié avec succès. Le candidat sera notifié si les notifications sont configurées côté serveur."
            : "Entretien programmé avec succès. Le candidat sera notifié si les notifications sont configurées côté serveur."
        );
      } else {
        setSuccess(
          "L'opération a bien été enregistrée, mais l'actualisation des données a échoué. Utilisez le bouton Actualiser."
        );
      }
    } catch (err) {
      setFormError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  // =====================================================
  // MODIFIER LE STATUT D'UN ENTRETIEN
  // =====================================================

  async function changeStatus(interview, nextStatus) {
    if (saving || actionId !== null) return;

    const label = STATUS_LABELS[nextStatus];

    if (!label) return;

    if (
      !window.confirm(
        `Confirmer le changement du statut de cet entretien : ${label} ?`
      )
    ) {
      return;
    }

    setActionId(interview.id);
    setError("");
    setSuccess("");

    try {
      await api.patch(
        `interviews/recruiter/${interview.id}/`,
        {
          status: nextStatus,
        }
      );

      const refreshed = await loadData({
        showLoading: false,
      });

      if (refreshed) {
        setSuccess(
          `Statut mis à jour : ${label}. Le candidat sera notifié si les notifications sont configurées côté serveur.`
        );
      } else {
        setSuccess(
          `Le statut a bien été enregistré (${label}), mais l'actualisation a échoué. Utilisez le bouton Actualiser.`
        );
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setActionId(null);
    }
  }

  // =====================================================
  // SUPPRIMER UN ENTRETIEN
  // =====================================================

  async function deleteInterview(interview) {
    if (saving || actionId !== null) return;

    if (
      !window.confirm(
        "Supprimer définitivement cet entretien ? Cette action ne peut pas être annulée."
      )
    ) {
      return;
    }

    setActionId(interview.id);
    setError("");
    setSuccess("");

    try {
      await api.delete(
        `interviews/recruiter/${interview.id}/`
      );

      const refreshed = await loadData({
        showLoading: false,
      });

      if (refreshed) {
        setSuccess("Entretien supprimé avec succès.");
      } else {
        setSuccess(
          "L'entretien a bien été supprimé, mais l'actualisation a échoué. Utilisez le bouton Actualiser."
        );
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setActionId(null);
    }
  }

  // =====================================================
  // AFFICHAGE
  // =====================================================

  return (
    <main className="ri-page">
      <section className="ri-hero">
        <div className="ri-hero-content">
          <span className="ri-eyebrow">ESPACE RECRUTEUR</span>

          <h1>Gestion des entretiens</h1>

          <p>
            Organisez vos rendez-vous, suivez les entretiens et accompagnez
            chaque candidat jusqu'à la prochaine étape du recrutement.
          </p>
        </div>

        <div className="ri-hero-actions">
          <button
            type="button"
            className="ri-back-dashboard"
            onClick={() => navigate("/recruiter/dashboard")}
          >
            <span aria-hidden="true">←</span>
            Retour au tableau de bord
          </button>

          <button
            type="button"
            className="ri-primary-button"
            onClick={openCreateModal}
            disabled={saving || actionId !== null}
          >
            <span aria-hidden="true">＋</span>
            Programmer un entretien
          </button>
        </div>
      </section>

      {error && !modalOpen && (
        <div className="ri-alert ri-alert-error" role="alert">
          <span>{error}</span>

          <button
            type="button"
            onClick={() => setError("")}
            aria-label="Fermer"
          >
            ×
          </button>
        </div>
      )}

      {success && (
        <div className="ri-alert ri-alert-success" role="status">
          <span>{success}</span>

          <button
            type="button"
            onClick={() => setSuccess("")}
            aria-label="Fermer"
          >
            ×
          </button>
        </div>
      )}

      {/* STATISTIQUES */}

      <section className="ri-stats">
        <article className="ri-stat-card">
          <div className="ri-stat-icon ri-icon-purple">▤</div>

          <div>
            <span className="ri-stat-label">
              Total des entretiens
            </span>

            <strong>{stats.total}</strong>

            <small>Tous les entretiens enregistrés</small>
          </div>
        </article>

        <article className="ri-stat-card">
          <div className="ri-stat-icon ri-icon-blue">◷</div>

          <div>
            <span className="ri-stat-label">Programmés</span>

            <strong>{stats.scheduled}</strong>

            <small>Entretiens en cours de planification</small>
          </div>
        </article>

        <article className="ri-stat-card">
          <div className="ri-stat-icon ri-icon-orange">↗</div>

          <div>
            <span className="ri-stat-label">À venir</span>

            <strong>{stats.upcoming}</strong>

            <small>Rendez-vous futurs</small>
          </div>
        </article>

        <article className="ri-stat-card">
          <div className="ri-stat-icon ri-icon-green">✓</div>

          <div>
            <span className="ri-stat-label">Terminés</span>

            <strong>{stats.completed}</strong>

            <small>Entretiens réalisés</small>
          </div>
        </article>
      </section>

      {/* LISTE DES ENTRETIENS */}

      <section className="ri-panel">
        <div className="ri-panel-heading">
          <div>
            <h2>Vos entretiens</h2>

            <p>
              Consultez et gérez les rendez-vous avec les candidats.
            </p>
          </div>

          <span className="ri-result-count">
            {filteredInterviews.length} résultat(s)
          </span>
        </div>

        <div className="ri-toolbar">
          <label className="ri-search">
            <span aria-hidden="true">⌕</span>

            <input
              type="search"
              placeholder="Rechercher un candidat, un poste..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>

          <select
            className="ri-filter"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            aria-label="Filtrer par statut"
          >
            <option value="ALL">Tous les statuts</option>
            <option value="SCHEDULED">Programmés</option>
            <option value="RESCHEDULED">Reportés</option>
            <option value="COMPLETED">Terminés</option>
            <option value="CANCELLED">Annulés</option>
          </select>

          <button
            type="button"
            className="ri-refresh-button"
            onClick={() => loadData()}
            disabled={loading || saving || actionId !== null}
            title="Actualiser les données"
          >
            ↻ Actualiser
          </button>
        </div>

        {loading ? (
          <div className="ri-state">
            <div className="ri-spinner" />
            <p>Chargement de vos entretiens...</p>
          </div>
        ) : filteredInterviews.length === 0 ? (
          <div className="ri-empty">
            <div className="ri-empty-icon">▦</div>

            <h3>
              {interviews.length === 0
                ? "Aucun entretien pour le moment"
                : "Aucun résultat trouvé"}
            </h3>

            <p>
              {interviews.length === 0
                ? "Programmez votre premier entretien à partir d'une candidature reçue."
                : "Essayez de modifier votre recherche ou votre filtre."}
            </p>

            {interviews.length === 0 && (
              <button
                type="button"
                className="ri-primary-button"
                onClick={openCreateModal}
                disabled={saving || actionId !== null}
              >
                Programmer un entretien
              </button>
            )}
          </div>
        ) : (
          <div className="ri-table-wrap">
            <table className="ri-table">
              <thead>
                <tr>
                  <th>CANDIDAT</th>
                  <th>POSTE / ENTREPRISE</th>
                  <th>DATE ET HEURE</th>
                  <th>TYPE</th>
                  <th>STATUT</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>

              <tbody>
                {filteredInterviews.map((interview) => {
                  const safeMeetingLink = isValidHttpUrl(
                    interview.meeting_link
                  )
                    ? interview.meeting_link.trim()
                    : "";

                  const isBusy =
                    actionId === interview.id || saving;

                  return (
                    <tr key={interview.id}>
                      <td>
                        <div className="ri-candidate">
                          <div className="ri-avatar">
                            {(interview.candidate_name || "C")
                              .trim()
                              .charAt(0)
                              .toUpperCase()}
                          </div>

                          <div className="ri-candidate-info">
                            <strong>
                              {interview.candidate_name || "Candidat"}
                            </strong>

                            <span>
                              {interview.candidate_email || "—"}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td>
                        <div className="ri-job-info">
                          <strong>
                            {interview.job_title || "Poste non précisé"}
                          </strong>

                          <span>
                            {interview.company_name || "Entreprise"}
                          </span>
                        </div>
                      </td>

                      <td>
                        <div className="ri-date">
                          <strong>
                            {formatDate(interview.scheduled_at)}
                          </strong>

                          {interview.location && (
                            <span>⌖ {interview.location}</span>
                          )}

                          {safeMeetingLink && (
                            <a
                              href={safeMeetingLink}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              Rejoindre la réunion ↗
                            </a>
                          )}
                        </div>
                      </td>

                      <td>
                        <span className="ri-type">
                          {TYPE_LABELS[interview.interview_type] ||
                            "Autre"}
                        </span>
                      </td>

                      <td>
                        <span
                          className={`ri-status ri-status-${(
                            interview.status || "SCHEDULED"
                          ).toLowerCase()}`}
                        >
                          {STATUS_LABELS[interview.status] ||
                            interview.status ||
                            "Non défini"}
                        </span>
                      </td>

                      <td>
                        <div className="ri-actions">
                          <button
                            type="button"
                            className="ri-action-button"
                            onClick={() => openEditModal(interview)}
                            disabled={isBusy}
                            title="Modifier"
                            aria-label="Modifier l'entretien"
                          >
                            ✎
                          </button>

                          {["SCHEDULED", "RESCHEDULED"].includes(
                            interview.status
                          ) && (
                            <>
                              <button
                                type="button"
                                className="ri-action-button ri-action-done"
                                onClick={() =>
                                  changeStatus(interview, "COMPLETED")
                                }
                                disabled={isBusy}
                                title="Marquer comme terminé"
                                aria-label="Marquer comme terminé"
                              >
                                ✓
                              </button>

                              <button
                                type="button"
                                className="ri-action-button ri-action-cancel"
                                onClick={() =>
                                  changeStatus(interview, "CANCELLED")
                                }
                                disabled={isBusy}
                                title="Annuler l'entretien"
                                aria-label="Annuler l'entretien"
                              >
                                ×
                              </button>
                            </>
                          )}

                          <button
                            type="button"
                            className="ri-action-button ri-action-delete"
                            onClick={() => deleteInterview(interview)}
                            disabled={isBusy}
                            title="Supprimer"
                            aria-label="Supprimer l'entretien"
                          >
                            ⌫
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* FENÊTRE MODALE */}

      {modalOpen && (
        <div
          className="ri-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeModal();
            }
          }}
        >
          <section
            className="ri-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ri-modal-title"
          >
            <div className="ri-modal-header">
              <div className="ri-modal-heading-content">
                {!editingInterview && (
                  <button
                    type="button"
                    className="ri-back-dashboard ri-modal-back-dashboard"
                    onClick={() => {
                      closeModal();
                      navigate("/recruiter/dashboard");
                    }}
                    disabled={saving}
                  >
                    <span aria-hidden="true">←</span>
                    Retour au tableau de bord
                  </button>
                )}

                <span className="ri-eyebrow">RECRUTEMENT</span>

                <h2 id="ri-modal-title">
                  {editingInterview
                    ? "Modifier l'entretien"
                    : "Programmer un entretien"}
                </h2>

                <p>
                  {editingInterview
                    ? "Actualisez les informations du rendez-vous."
                    : "Complétez les informations pour inviter le candidat."}
                </p>
              </div>

              <button
                type="button"
                className="ri-modal-close"
                onClick={closeModal}
                disabled={saving}
                aria-label="Fermer la fenêtre"
              >
                ×
              </button>
            </div>

            <form className="ri-form" onSubmit={handleSubmit}>
              {!editingInterview && (
                <label className="ri-field ri-field-full">
                  <span>
                    Candidature <b>*</b>
                  </span>

                  <select
                    name="application"
                    value={form.application}
                    onChange={updateField}
                    required
                    disabled={saving}
                  >
                    <option value="">
                      Sélectionner une candidature
                    </option>

                    {eligibleApplications.map((application) => (
                      <option
                        key={application.id}
                        value={application.id}
                      >
                        {(application.candidate_name ||
                          application.candidate_email ||
                          application.candidate ||
                          `Candidature #${application.id}`) +
                          " — " +
                          (application.job_title ||
                            application.job?.title ||
                            "Poste")}
                      </option>
                    ))}
                  </select>

                  {eligibleApplications.length === 0 && (
                    <small>
                      Aucune candidature disponible pour programmer
                      un entretien. Vérifiez les candidatures reçues
                      et leurs statuts.
                    </small>
                  )}
                </label>
              )}

              <label className="ri-field">
                <span>
                  Type d'entretien <b>*</b>
                </span>

                <select
                  name="interview_type"
                  value={form.interview_type}
                  onChange={updateField}
                  required
                  disabled={saving}
                >
                  <option value="ONLINE">En ligne</option>
                  <option value="IN_PERSON">Présentiel</option>
                  <option value="PHONE">Téléphonique</option>
                </select>
              </label>

              <label className="ri-field">
                <span>
                  Date et heure <b>*</b>
                </span>

                <input
                  type="datetime-local"
                  name="scheduled_at"
                  value={form.scheduled_at}
                  onChange={updateField}
                  required
                  disabled={saving}
                />
              </label>

              {form.interview_type === "IN_PERSON" && (
                <label className="ri-field ri-field-full">
                  <span>
                    Lieu de l'entretien <b>*</b>
                  </span>

                  <input
                    name="location"
                    value={form.location}
                    onChange={updateField}
                    placeholder="Ex. : Dakar, VDN, siège de l'entreprise"
                    required
                    disabled={saving}
                  />
                </label>
              )}

              {form.interview_type === "ONLINE" && (
                <label className="ri-field ri-field-full">
                  <span>
                    Lien de visioconférence <b>*</b>
                  </span>

                  <input
                    type="url"
                    name="meeting_link"
                    value={form.meeting_link}
                    onChange={updateField}
                    placeholder="https://meet.google.com/..."
                    required
                    disabled={saving}
                  />
                </label>
              )}

              {editingInterview && (
                <label className="ri-field ri-field-full">
                  <span>Statut de l'entretien</span>

                  <select
                    name="status"
                    value={form.status}
                    onChange={updateField}
                    disabled={saving}
                  >
                    <option value="SCHEDULED">Programmé</option>
                    <option value="RESCHEDULED">Reporté</option>
                    <option value="COMPLETED">Terminé</option>
                    <option value="CANCELLED">Annulé</option>
                  </select>
                </label>
              )}

              <label className="ri-field ri-field-full">
                <span>Message au candidat</span>

                <textarea
                  name="message"
                  value={form.message}
                  onChange={updateField}
                  rows={4}
                  placeholder="Précisez les documents à apporter, les consignes ou les informations utiles..."
                  disabled={saving}
                />
              </label>

              <div className="ri-form-note ri-field-full">
                <span>ⓘ</span>

                Le candidat sera notifié si le système de notifications
                est correctement configuré côté serveur.
              </div>

              {formError && (
                <div
                  className="ri-alert ri-alert-error ri-field-full"
                  role="alert"
                >
                  <span>{formError}</span>

                  <button
                    type="button"
                    onClick={() => setFormError("")}
                    aria-label="Fermer"
                  >
                    ×
                  </button>
                </div>
              )}

              {error && (
                <div
                  className="ri-alert ri-alert-error ri-field-full"
                  role="alert"
                >
                  <span>{error}</span>

                  <button
                    type="button"
                    onClick={() => setError("")}
                    aria-label="Fermer"
                  >
                    ×
                  </button>
                </div>
              )}

              <div className="ri-form-actions ri-field-full">
                <button
                  type="button"
                  className="ri-secondary-button"
                  onClick={closeModal}
                  disabled={saving}
                >
                  Annuler
                </button>

                <button
                  type="submit"
                  className="ri-primary-button"
                  disabled={
                    saving ||
                    actionId !== null ||
                    (!editingInterview &&
                      eligibleApplications.length === 0)
                  }
                >
                  {saving
                    ? "Enregistrement..."
                    : editingInterview
                      ? "Enregistrer les modifications"
                      : "Programmer l'entretien"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}
