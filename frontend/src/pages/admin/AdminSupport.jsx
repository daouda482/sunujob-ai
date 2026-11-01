import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, ArrowDownToLine, CheckCircle2, Clock3, LifeBuoy, MessageSquareText, RefreshCw, Search, Send, ShieldAlert, UserRound } from "lucide-react";
import api from "../../api/axios";
import "../support/support.css";

const STATUS = [
  ["", "Tous les statuts"], ["OPEN", "Ouvert"], ["IN_PROGRESS", "En cours"],
  ["WAITING_USER", "En attente du demandeur"], ["RESOLVED", "Résolu"], ["CLOSED", "Fermé"],
];
const PRIORITY = [["", "Toutes les priorités"], ["LOW", "Faible"], ["NORMAL", "Normale"], ["HIGH", "Élevée"], ["URGENT", "Urgente"]];
const CATEGORY = [["", "Toutes les catégories"], ["ACCOUNT", "Compte et connexion"], ["COMPANY", "Entreprise"], ["JOB", "Offre d'emploi"], ["APPLICATION", "Candidature"], ["TECHNICAL", "Problème technique"], ["OTHER", "Autre demande"]];
const dateLabel = (value) => value ? new Date(value).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" }) : "—";
const statusClass = (value) => ({ OPEN: "support-status-open", IN_PROGRESS: "support-status-progress", WAITING_USER: "support-status-waiting", RESOLVED: "support-status-resolved", CLOSED: "support-status-closed" }[value] || "");

export default function AdminSupport() {
  const [tickets, setTickets] = useState([]);
  const [summary, setSummary] = useState({ total: 0, open: 0, in_progress: 0, waiting_user: 0, resolved: 0, urgent: 0 });
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [category, setCategory] = useState("");
  const [reply, setReply] = useState("");
  const [internal, setInternal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadTickets = useCallback(async (preferredId = null) => {
    setBusy(true); setError("");
    try {
      const response = await api.get("admin/support/tickets/", { params: { search, status, priority, category, page_size: 100 } });
      const data = response.data;
      const items = Array.isArray(data) ? data : (data.results || []);
      setTickets(items);
      setSummary(data.summary || { total: items.length, open: 0, in_progress: 0, waiting_user: 0, resolved: 0, urgent: 0 });
      const wanted = preferredId || selected?.id;
      if (wanted && items.some((t) => t.id === wanted)) {
        const detail = await api.get(`admin/support/tickets/${wanted}/`);
        setSelected(detail.data);
      } else if (items.length && !selected) {
        const detail = await api.get(`admin/support/tickets/${items[0].id}/`);
        setSelected(detail.data);
      } else if (wanted && !items.some((t) => t.id === wanted)) setSelected(null);
    } catch (err) {
      setError(err.response?.data?.detail || "Impossible de charger les demandes de support. Vérifiez les routes API et les permissions administrateur.");
    } finally { setBusy(false); }
  }, [search, status, priority, category, selected]);

  useEffect(() => { loadTickets(); }, [search, status, priority, category]);

  async function openTicket(ticket) {
    setError("");
    try { const { data } = await api.get(`admin/support/tickets/${ticket.id}/`); setSelected(data); }
    catch (err) { setError(err.response?.data?.detail || "Impossible d'ouvrir ce ticket."); }
  }

  async function updateTicket(fields) {
    if (!selected) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const { data } = await api.patch(`admin/support/tickets/${selected.id}/status/`, fields);
      setSelected(data); setNotice("Les modifications ont été enregistrées."); await loadTickets(selected.id);
    } catch (err) { setError(err.response?.data?.detail || "La mise à jour a échoué."); }
    finally { setBusy(false); }
  }

  async function sendReply(event) {
    event.preventDefault();
    if (!selected || !reply.trim()) return;
    setBusy(true); setError(""); setNotice("");
    try {
      await api.post(`admin/support/tickets/${selected.id}/messages/`, { message: reply.trim(), is_internal: internal });
      setReply(""); setInternal(false);
      const { data } = await api.get(`admin/support/tickets/${selected.id}/`); setSelected(data);
      await loadTickets(selected.id); setNotice(internal ? "Note interne ajoutée." : "Réponse envoyée au demandeur.");
    } catch (err) { setError(err.response?.data?.detail || "Impossible d'envoyer le message."); }
    finally { setBusy(false); }
  }

  const visibleTickets = useMemo(() => tickets, [tickets]);

  return <main className="support-admin-page"><div className="support-admin-wrap">
    <header className="support-page-header"><div className="support-title-icon"><LifeBuoy size={26}/></div><div className="support-heading"><p className="support-eyebrow">ESPACE ADMINISTRATEUR</p><h1>Centre de support</h1><p>Centralisez les demandes, échangez avec les utilisateurs et suivez leur résolution.</p></div><button className="support-btn support-btn-light" onClick={() => loadTickets(selected?.id)} disabled={busy}><RefreshCw size={16}/> Actualiser</button></header>
    {error && <div className="support-alert support-alert-error"><AlertCircle size={18}/>{error}</div>}{notice && <div className="support-alert support-alert-success"><CheckCircle2 size={18}/>{notice}</div>}
    <section className="support-stat-grid">
      <article className="support-stat-card"><span>Total des demandes</span><strong>{summary.total ?? 0}</strong><MessageSquareText/></article>
      <article className="support-stat-card"><span>Ouvertes</span><strong>{summary.open ?? 0}</strong><LifeBuoy/></article>
      <article className="support-stat-card"><span>En cours</span><strong>{summary.in_progress ?? 0}</strong><Clock3/></article>
      <article className="support-stat-card support-stat-urgent"><span>Urgentes actives</span><strong>{summary.urgent ?? 0}</strong><ShieldAlert/></article>
    </section>
    <section className="support-filter-bar"><label className="support-search"><Search size={17}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Rechercher un sujet, un utilisateur…"/></label><select aria-label="Filtrer par statut" value={status} onChange={e=>setStatus(e.target.value)}>{STATUS.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select><select aria-label="Filtrer par priorité" value={priority} onChange={e=>setPriority(e.target.value)}>{PRIORITY.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select><select aria-label="Filtrer par catégorie" value={category} onChange={e=>setCategory(e.target.value)}>{CATEGORY.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></section>
    <section className="support-workspace">
      <div className="support-ticket-list"><div className="support-list-heading"><h2>Demandes</h2><span>{visibleTickets.length} affichée(s)</span></div>{busy && !visibleTickets.length ? <div className="support-empty">Chargement des demandes…</div> : visibleTickets.length ? visibleTickets.map(ticket=><button key={ticket.id} className={`support-ticket-row ${selected?.id===ticket.id?"is-selected":""}`} onClick={()=>openTicket(ticket)}><div className="support-ticket-row-top"><span className="support-ticket-number">#{ticket.id}</span><span className={`support-status ${statusClass(ticket.status)}`}>{ticket.status_label}</span></div><strong>{ticket.subject}</strong><span className="support-ticket-requester"><UserRound size={14}/>{ticket.requester_name || ticket.requester_email || "Utilisateur"}</span><div className="support-ticket-row-bottom"><span>{ticket.category_label}</span><span className={`support-priority priority-${(ticket.priority||"normal").toLowerCase()}`}>{ticket.priority_label || ticket.priority}</span></div><small>Mis à jour le {dateLabel(ticket.updated_at)}</small></button>) : <div className="support-empty">Aucune demande ne correspond aux filtres.</div>}</div>
      <div className="support-ticket-detail">{selected ? <><div className="support-detail-header"><div><span className="support-ticket-number">DEMANDE #{selected.id}</span><h2>{selected.subject}</h2><p>{selected.requester_name} · {selected.requester_email}</p></div><span className={`support-status ${statusClass(selected.status)}`}>{selected.status_label}</span></div><div className="support-detail-meta"><div><span>Catégorie</span><strong>{selected.category_label}</strong></div><div><span>Créée le</span><strong>{dateLabel(selected.created_at)}</strong></div><div><span>Dernière activité</span><strong>{dateLabel(selected.updated_at)}</strong></div></div><div className="support-original-message"><span>Description initiale</span><p>{selected.description}</p></div>
        <div className="support-thread-heading"><h3>Historique des échanges</h3><span>{selected.messages?.length || 0} message(s)</span></div><div className="support-message-thread">{(selected.messages||[]).length ? selected.messages.map(msg=><article key={msg.id} className={`support-message ${msg.is_internal?"is-internal":""}`}><div className="support-message-head"><strong>{msg.sender_name}</strong><span>{msg.is_internal?"Note interne":msg.sender_role==="ADMIN"?"Équipe SunuJob AI":"Demandeur"}</span><time>{dateLabel(msg.created_at)}</time></div><p>{msg.message}</p></article>) : <div className="support-empty">Aucun échange pour le moment.</div>}</div>
        <form className="support-reply-form" onSubmit={sendReply}><label htmlFor="support-reply">Votre message</label><textarea id="support-reply" rows="4" value={reply} onChange={e=>setReply(e.target.value)} placeholder="Répondez au demandeur ou ajoutez une note interne…" required maxLength={10000}/><label className="support-check-label"><input type="checkbox" checked={internal} onChange={e=>setInternal(e.target.checked)}/> Note interne (non visible par l'utilisateur)</label><button className="support-btn support-btn-primary" disabled={busy||!reply.trim()}><Send size={16}/>{internal?"Ajouter la note":"Envoyer la réponse"}</button></form>
        <div className="support-admin-actions"><label>Statut<select value={selected.status} onChange={e=>updateTicket({status:e.target.value})}>{STATUS.filter(([v])=>v).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label><label>Priorité<select value={selected.priority} onChange={e=>updateTicket({priority:e.target.value})}>{PRIORITY.filter(([v])=>v).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label><button className="support-btn support-btn-light" onClick={()=>updateTicket({assigned_to_me:true})} disabled={busy}><UserRound size={16}/> M'assigner</button></div>
      </> : <div className="support-empty support-detail-empty"><MessageSquareText size={35}/><h3>Sélectionnez une demande</h3><p>Choisissez un ticket dans la liste pour consulter les échanges et intervenir.</p></div>}</div>
    </section>
    <p className="support-footnote"><ArrowDownToLine size={14}/> Les notes internes sont réservées aux administrateurs et ne sont pas transmises aux demandeurs.</p>
  </div></main>;
}
