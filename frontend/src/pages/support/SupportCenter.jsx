
import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  LifeBuoy,
  MessageCircle,
  Plus,
  Send,
} from "lucide-react";

import api from "../../api/axios";
import "./support.css";

const categories = [
  ["ACCOUNT", "Compte et connexion"],
  ["COMPANY", "Entreprise"],
  ["JOB", "Offre d'emploi"],
  ["APPLICATION", "Candidature"],
  ["TECHNICAL", "Problème technique"],
  ["OTHER", "Autre demande"],
];

const statuses = {
  OPEN: "Ouvert",
  IN_PROGRESS: "En cours",
  WAITING_USER: "En attente de votre réponse",
  RESOLVED: "Résolu",
  CLOSED: "Fermé",
};

const dateLabel = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

export default function SupportCenter() {
  const [tickets, setTickets] = useState([]);
  const [selected, setSelected] = useState(null);

  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("TECHNICAL");
  const [description, setDescription] = useState("");
  const [reply, setReply] = useState("");

  // CORRECTION : afficher le formulaire dès l'ouverture du support.
  const [creating, setCreating] = useState(true);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadTickets = useCallback(async (preferredId = null) => {
    try {
      const { data } = await api.get("support/tickets/");

      const items = Array.isArray(data)
        ? data
        : Array.isArray(data?.results)
          ? data.results
          : [];

      setTickets(items);

      const wanted = preferredId || selected?.id;

      if (wanted && items.some((ticket) => ticket.id === wanted)) {
        const detail = await api.get(`support/tickets/${wanted}/`);
        setSelected(detail.data);
      } else if (items.length > 0 && !selected) {
        const detail = await api.get(
          `support/tickets/${items[0].id}/`
        );

        setSelected(detail.data);
      } else if (wanted && !items.some((ticket) => ticket.id === wanted)) {
        setSelected(null);
      }
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Impossible de charger vos demandes de support."
      );
    }
  }, [selected]);

  useEffect(() => {
    loadTickets();
    // Chargement initial des demandes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function createTicket(event) {
    event.preventDefault();

    setBusy(true);
    setError("");
    setNotice("");

    try {
      const { data } = await api.post("support/tickets/", {
        subject: subject.trim(),
        category,
        description: description.trim(),
      });

      setSubject("");
      setDescription("");
      setNotice("Votre demande a été créée.");

      // Fermer le formulaire après une création réussie.
      setCreating(false);

      await loadTickets(data.id);

      // Charger le détail du ticket nouvellement créé.
      const detail = await api.get(`support/tickets/${data.id}/`);
      setSelected(detail.data);
    } catch (err) {
      const responseData = err.response?.data;

      setError(
        responseData?.detail ||
          responseData?.subject?.[0] ||
          responseData?.description?.[0] ||
          responseData?.category?.[0] ||
          "La création de la demande a échoué. Vérifiez le serveur."
      );
    } finally {
      setBusy(false);
    }
  }

  async function sendReply(event) {
    event.preventDefault();

    if (!selected || !reply.trim()) return;

    setBusy(true);
    setError("");
    setNotice("");

    try {
      await api.post(
        `support/tickets/${selected.id}/messages/`,
        { message: reply.trim() }
      );

      setReply("");
      setNotice("Votre réponse a été envoyée.");

      await loadTickets(selected.id);
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Impossible d'envoyer votre réponse."
      );
    } finally {
      setBusy(false);
    }
  }

  async function selectTicket(ticket) {
    setError("");

    try {
      const { data } = await api.get(
        `support/tickets/${ticket.id}/`
      );

      setSelected(data);
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Impossible d'ouvrir cette demande."
      );
    }
  }

  return (
    <main className="support-user-page">
      <div className="support-user-wrap">
        <header className="support-page-header">
          <div className="support-title-icon">
            <LifeBuoy size={26} />
          </div>

          <div className="support-heading">
            <p className="support-eyebrow">
              ASSISTANCE SUNUJOB AI
            </p>

            <h1>Centre d'aide</h1>

            <p>
              Contactez notre équipe et suivez vos demandes
              depuis un seul espace.
            </p>
          </div>

          <button
            type="button"
            className="support-btn support-btn-primary"
            onClick={() => {
              setCreating((previous) => !previous);
              setError("");
            }}
          >
            <Plus size={17} />
            {creating ? "Masquer le formulaire" : "Nouvelle demande"}
          </button>
        </header>

        {error && (
          <div className="support-alert support-alert-error" role="alert">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {notice && (
          <div className="support-alert support-alert-success" role="status">
            <CheckCircle2 size={18} />
            <span>{notice}</span>
          </div>
        )}

        {/* Formulaire de création visible dès l'ouverture */}
        {creating && (
          <form
            className="support-create-card"
            onSubmit={createTicket}
          >
            <h2>Décrire votre problème</h2>

            <label>
              Sujet
              <input
                type="text"
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                minLength={5}
                maxLength={180}
                required
                placeholder="Ex. : Impossible de déposer mon CV"
              />
            </label>

            <label>
              Catégorie
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                required
              >
                {categories.map(([value, label]) => (
                  <option value={value} key={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Description
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                minLength={15}
                maxLength={10000}
                required
                rows={5}
                placeholder="Expliquez le problème rencontré et ce que vous avez essayé."
              />
            </label>

            <button
              type="submit"
              className="support-btn support-btn-primary"
              disabled={busy}
            >
              <Send size={16} />
              {busy ? "Envoi en cours..." : "Envoyer ma demande"}
            </button>
          </form>
        )}

        <section className="support-user-layout">
          <aside className="support-user-ticket-list">
            <div className="support-list-heading">
              <h2>Mes demandes</h2>
              <span>{tickets.length}</span>
            </div>

            {tickets.length > 0 ? (
              tickets.map((ticket) => (
                <button
                  type="button"
                  key={ticket.id}
                  onClick={() => selectTicket(ticket)}
                  className={`support-ticket-row ${
                    selected?.id === ticket.id ? "is-selected" : ""
                  }`}
                >
                  <div className="support-ticket-row-top">
                    <span className="support-ticket-number">
                      #{ticket.id}
                    </span>

                    <span className="support-status">
                      {statuses[ticket.status] || ticket.status_label || ticket.status}
                    </span>
                  </div>

                  <strong>{ticket.subject}</strong>

                  <span className="support-ticket-row-bottom">
                    {ticket.category_label || ticket.category}
                  </span>

                  <small>
                    Mis à jour le {dateLabel(ticket.updated_at)}
                  </small>
                </button>
              ))
            ) : (
              <div className="support-empty">
                Vous n'avez pas encore créé de demande.
              </div>
            )}
          </aside>

          <section className="support-ticket-detail">
            {selected ? (
              <>
                <div className="support-detail-header">
                  <div>
                    <span className="support-ticket-number">
                      DEMANDE #{selected.id}
                    </span>

                    <h2>{selected.subject}</h2>

                    <p>
                      {selected.category_label || selected.category}
                      {" · "}
                      créée le {dateLabel(selected.created_at)}
                    </p>
                  </div>

                  <span className="support-status">
                    {statuses[selected.status] || selected.status_label || selected.status}
                  </span>
                </div>

                <div className="support-original-message">
                  <span>Votre message initial</span>
                  <p>{selected.description}</p>
                </div>

                <div className="support-thread-heading">
                  <h3>Échanges avec le support</h3>
                  <span>
                    {selected.messages?.length || 0} message(s)
                  </span>
                </div>

                <div className="support-message-thread">
                  {(selected.messages || []).map((message) => (
                    <article
                      className="support-message"
                      key={message.id}
                    >
                      <div className="support-message-head">
                        <strong>
                          {message.sender_role === "ADMIN"
                            ? "Équipe SunuJob AI"
                            : message.sender_name || "Vous"}
                        </strong>

                        <span>
                          {message.sender_role === "ADMIN"
                            ? "Support"
                            : "Vous"}
                        </span>

                        <time>
                          {dateLabel(message.created_at)}
                        </time>
                      </div>

                      <p>{message.message}</p>
                    </article>
                  ))}
                </div>

                {!["RESOLVED", "CLOSED"].includes(selected.status) ? (
                  <form
                    className="support-reply-form"
                    onSubmit={sendReply}
                  >
                    <label htmlFor="user-support-reply">
                      Votre réponse
                    </label>

                    <textarea
                      id="user-support-reply"
                      value={reply}
                      onChange={(event) => setReply(event.target.value)}
                      rows={3}
                      maxLength={10000}
                      required
                      placeholder="Répondez à l'équipe support..."
                    />

                    <button
                      type="submit"
                      className="support-btn support-btn-primary"
                      disabled={busy || !reply.trim()}
                    >
                      <Send size={16} />
                      Envoyer
                    </button>
                  </form>
                ) : (
                  <div className="support-alert">
                    <CheckCircle2 size={18} />
                    Cette demande est clôturée. Créez une nouvelle demande
                    si vous avez encore besoin d'aide.
                  </div>
                )}
              </>
            ) : (
              <div className="support-empty support-detail-empty">
                <MessageCircle size={34} />

                <h3>Vos échanges apparaîtront ici</h3>

                <p>
                  Sélectionnez une demande ou créez-en une nouvelle
                  pour contacter l'équipe support.
                </p>
              </div>
            )}
          </section>
        </section>
      </div>
    </main>
  );
}
