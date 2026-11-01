import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BookOpen, BriefcaseBusiness, Check, ChevronDown, CircleAlert, Layers3,
  LoaderCircle, Pencil, Plus, RefreshCw, Search, Sparkles, Trash2, X,
} from "lucide-react";
import api from "../../api/axios";
import "./adminCatalog.css";

const EMPTY_CATEGORY = { name: "", description: "", is_active: true };
const EMPTY_SKILL = { name: "", category: "", description: "", is_active: true };

function apiMessage(error) {
  const data = error?.response?.data;
  if (typeof data?.detail === "string") return data.detail;
  if (data && typeof data === "object") {
    for (const [key, value] of Object.entries(data)) {
      if (Array.isArray(value) && value.length) return `${key}: ${value[0]}`;
      if (typeof value === "string") return value;
    }
  }
  return "Une erreur est survenue. Vérifiez l'API et les autorisations de votre compte.";
}

function unwrapList(data) {
  if (Array.isArray(data)) return data;
  return Array.isArray(data?.results) ? data.results : [];
}

export default function AdminCatalog() {
  const [tab, setTab] = useState("categories");
  const [categories, setCategories] = useState([]);
  const [skills, setSkills] = useState([]);
  const [categoryForm, setCategoryForm] = useState(EMPTY_CATEGORY);
  const [skillForm, setSkillForm] = useState(EMPTY_SKILL);
  const [editingCategory, setEditingCategory] = useState(null);
  const [editingSkill, setEditingSkill] = useState(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const fetchCatalog = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [categoryResponse, skillResponse] = await Promise.all([
        api.get("admin/catalog/categories/"),
        api.get("admin/catalog/skills/"),
      ]);
      setCategories(unwrapList(categoryResponse.data));
      setSkills(unwrapList(skillResponse.data));
    } catch (requestError) {
      setError(apiMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCatalog(); }, [fetchCatalog]);

  const activeCategories = useMemo(() => categories.filter((item) => item.is_active).length, [categories]);
  const activeSkills = useMemo(() => skills.filter((item) => item.is_active).length, [skills]);
  const visibleCategories = useMemo(() => categories.filter((item) =>
    `${item.name} ${item.description || ""}`.toLowerCase().includes(search.toLowerCase().trim())
  ), [categories, search]);
  const visibleSkills = useMemo(() => skills.filter((item) =>
    `${item.name} ${item.category_name || ""} ${item.description || ""}`.toLowerCase().includes(search.toLowerCase().trim())
  ), [skills, search]);

  function resetCategoryForm() { setCategoryForm(EMPTY_CATEGORY); setEditingCategory(null); }
  function resetSkillForm() { setSkillForm(EMPTY_SKILL); setEditingSkill(null); }

  async function saveCategory(event) {
    event.preventDefault();
    setSaving(true); setError(""); setNotice("");
    try {
      if (editingCategory) {
        await api.patch(`admin/catalog/categories/${editingCategory.id}/`, categoryForm);
        setNotice("La catégorie a été mise à jour.");
      } else {
        await api.post("admin/catalog/categories/", categoryForm);
        setNotice("La catégorie a été créée.");
      }
      resetCategoryForm();
      await fetchCatalog();
    } catch (requestError) { setError(apiMessage(requestError)); }
    finally { setSaving(false); }
  }

  async function saveSkill(event) {
    event.preventDefault();
    setSaving(true); setError(""); setNotice("");
    const payload = { ...skillForm, category: skillForm.category || null };
    try {
      if (editingSkill) {
        await api.patch(`admin/catalog/skills/${editingSkill.id}/`, payload);
        setNotice("La compétence a été mise à jour.");
      } else {
        await api.post("admin/catalog/skills/", payload);
        setNotice("La compétence a été créée.");
      }
      resetSkillForm();
      await fetchCatalog();
    } catch (requestError) { setError(apiMessage(requestError)); }
    finally { setSaving(false); }
  }

  function startEditCategory(item) {
    setEditingCategory(item);
    setCategoryForm({ name: item.name || "", description: item.description || "", is_active: Boolean(item.is_active) });
    setTab("categories"); setError(""); setNotice("");
  }

  function startEditSkill(item) {
    setEditingSkill(item);
    setSkillForm({ name: item.name || "", category: item.category ? String(item.category) : "", description: item.description || "", is_active: Boolean(item.is_active) });
    setTab("skills"); setError(""); setNotice("");
  }

  async function deleteItem(type, item) {
    const label = type === "categories" ? "cette catégorie" : "cette compétence";
    if (!window.confirm(`Voulez-vous vraiment supprimer ${label} « ${item.name} » ? Cette action est définitive.`)) return;
    setError(""); setNotice("");
    try {
      const endpoint = type === "categories" ? "admin/catalog/categories/" : "admin/catalog/skills/";
      await api.delete(`${endpoint}${item.id}/`);
      setNotice(type === "categories" ? "Catégorie supprimée." : "Compétence supprimée.");
      if (type === "categories" && editingCategory?.id === item.id) resetCategoryForm();
      if (type === "skills" && editingSkill?.id === item.id) resetSkillForm();
      await fetchCatalog();
    } catch (requestError) { setError(apiMessage(requestError)); }
  }

  return (
    <main className="admin-catalog-page">
      <div className="ac-container">
        <header className="ac-header">
          <div className="ac-title-wrap">
            <div className="ac-title-icon"><Layers3 size={27} /></div>
            <div>
              <span className="ac-eyebrow">ESPACE ADMINISTRATEUR</span>
              <h1>Catalogue des métiers</h1>
              <p>Structurez les secteurs professionnels et les compétences proposés sur SunuJob AI.</p>
            </div>
          </div>
          <button className="ac-button ac-button-light" type="button" onClick={fetchCatalog} disabled={loading}>
            {loading ? <LoaderCircle className="ac-spin" size={17} /> : <RefreshCw size={17} />} Actualiser
          </button>
        </header>

        {error && <div className="ac-alert ac-alert-error" role="alert"><CircleAlert size={18} /> <span>{error}</span><button aria-label="Fermer" onClick={() => setError("")}><X size={16} /></button></div>}
        {notice && <div className="ac-alert ac-alert-success" role="status"><Check size={18} /> <span>{notice}</span><button aria-label="Fermer" onClick={() => setNotice("")}><X size={16} /></button></div>}

        <section className="ac-stats-grid">
          <article className="ac-stat-card"><div className="ac-stat-icon ac-blue"><BriefcaseBusiness size={21} /></div><div><span>Secteurs répertoriés</span><strong>{categories.length}</strong><small>{activeCategories} actifs</small></div></article>
          <article className="ac-stat-card"><div className="ac-stat-icon ac-violet"><Sparkles size={21} /></div><div><span>Compétences</span><strong>{skills.length}</strong><small>{activeSkills} actives</small></div></article>
          <article className="ac-stat-card"><div className="ac-stat-icon ac-green"><BookOpen size={21} /></div><div><span>Compétences classées</span><strong>{skills.filter((item) => item.category).length}</strong><small>Associées à un secteur</small></div></article>
        </section>

        <div className="ac-workspace">
          <section className="ac-panel ac-editor-panel">
            <div className="ac-panel-heading"><span className="ac-panel-icon"><Plus size={19} /></span><div><h2>{tab === "categories" ? (editingCategory ? "Modifier le secteur" : "Ajouter un secteur") : (editingSkill ? "Modifier la compétence" : "Ajouter une compétence")}</h2><p>Les champs marqués sont nécessaires pour organiser le catalogue.</p></div></div>
            {tab === "categories" ? (
              <form className="ac-form" onSubmit={saveCategory}>
                <label>Nom du secteur <span>*</span><input required maxLength={120} value={categoryForm.name} onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })} placeholder="Ex. Informatique et numérique" /></label>
                <label>Description<textarea rows="4" value={categoryForm.description} onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })} placeholder="Décrivez brièvement les métiers couverts…" /></label>
                <label className="ac-checkbox-row"><input type="checkbox" checked={categoryForm.is_active} onChange={(e) => setCategoryForm({ ...categoryForm, is_active: e.target.checked })} /><span>Catégorie active</span></label>
                <div className="ac-form-actions"><button className="ac-button ac-button-primary" disabled={saving} type="submit">{saving ? <LoaderCircle className="ac-spin" size={16} /> : <Check size={16} />}{editingCategory ? "Enregistrer" : "Créer la catégorie"}</button>{editingCategory && <button className="ac-button ac-button-light" type="button" onClick={resetCategoryForm}>Annuler</button>}</div>
              </form>
            ) : (
              <form className="ac-form" onSubmit={saveSkill}>
                <label>Nom de la compétence <span>*</span><input required maxLength={120} value={skillForm.name} onChange={(e) => setSkillForm({ ...skillForm, name: e.target.value })} placeholder="Ex. React.js, Gestion de projet…" /></label>
                <label>Secteur associé<select value={skillForm.category} onChange={(e) => setSkillForm({ ...skillForm, category: e.target.value })}><option value="">Aucun secteur</option>{categories.map((item) => <option key={item.id} value={item.id}>{item.name}{!item.is_active ? " (inactif)" : ""}</option>)}</select><ChevronDown className="ac-select-chevron" size={15} /></label>
                <label>Description<textarea rows="4" value={skillForm.description} onChange={(e) => setSkillForm({ ...skillForm, description: e.target.value })} placeholder="Précisez la compétence ou ses variantes…" /></label>
                <label className="ac-checkbox-row"><input type="checkbox" checked={skillForm.is_active} onChange={(e) => setSkillForm({ ...skillForm, is_active: e.target.checked })} /><span>Compétence active</span></label>
                <div className="ac-form-actions"><button className="ac-button ac-button-primary" disabled={saving} type="submit">{saving ? <LoaderCircle className="ac-spin" size={16} /> : <Check size={16} />}{editingSkill ? "Enregistrer" : "Créer la compétence"}</button>{editingSkill && <button className="ac-button ac-button-light" type="button" onClick={resetSkillForm}>Annuler</button>}</div>
              </form>
            )}
          </section>

          <section className="ac-panel ac-list-panel">
            <div className="ac-tabs" role="tablist" aria-label="Éléments du catalogue">
              <button type="button" role="tab" aria-selected={tab === "categories"} className={tab === "categories" ? "active" : ""} onClick={() => { setTab("categories"); setSearch(""); }}><BriefcaseBusiness size={16} /> Secteurs <span>{categories.length}</span></button>
              <button type="button" role="tab" aria-selected={tab === "skills"} className={tab === "skills" ? "active" : ""} onClick={() => { setTab("skills"); setSearch(""); }}><Sparkles size={16} /> Compétences <span>{skills.length}</span></button>
            </div>
            <div className="ac-list-toolbar"><label className="ac-search"><Search size={17} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={tab === "categories" ? "Rechercher un secteur…" : "Rechercher une compétence…"} /></label><span>{tab === "categories" ? visibleCategories.length : visibleSkills.length} résultat(s)</span></div>
            {loading ? <div className="ac-empty"><LoaderCircle className="ac-spin" size={24} /><p>Chargement du catalogue…</p></div> : tab === "categories" ? (
              visibleCategories.length ? <div className="ac-item-list">{visibleCategories.map((item) => <article className="ac-item" key={item.id}><div className="ac-item-symbol"><BriefcaseBusiness size={18} /></div><div className="ac-item-main"><div className="ac-item-title"><h3>{item.name}</h3><span className={`ac-status ${item.is_active ? "is-active" : "is-inactive"}`}>{item.is_active ? "Actif" : "Inactif"}</span></div><p>{item.description || "Aucune description renseignée."}</p><small>{skills.filter((skill) => skill.category === item.id).length} compétence(s) associée(s)</small></div><div className="ac-item-actions"><button className="ac-icon-button" type="button" title="Modifier" aria-label={`Modifier ${item.name}`} onClick={() => startEditCategory(item)}><Pencil size={16} /></button><button className="ac-icon-button danger" type="button" title="Supprimer" aria-label={`Supprimer ${item.name}`} onClick={() => deleteItem("categories", item)}><Trash2 size={16} /></button></div></article>)}</div> : <div className="ac-empty"><BriefcaseBusiness size={28} /><h3>Aucun secteur trouvé</h3><p>Créez un secteur avec le formulaire ou modifiez la recherche.</p></div>
            ) : (
              visibleSkills.length ? <div className="ac-item-list">{visibleSkills.map((item) => <article className="ac-item" key={item.id}><div className="ac-item-symbol ac-item-symbol-violet"><Sparkles size={18} /></div><div className="ac-item-main"><div className="ac-item-title"><h3>{item.name}</h3><span className={`ac-status ${item.is_active ? "is-active" : "is-inactive"}`}>{item.is_active ? "Active" : "Inactive"}</span></div><p>{item.description || "Aucune description renseignée."}</p><small>{item.category_name || categories.find((category) => category.id === item.category)?.name || "Sans secteur associé"}</small></div><div className="ac-item-actions"><button className="ac-icon-button" type="button" title="Modifier" aria-label={`Modifier ${item.name}`} onClick={() => startEditSkill(item)}><Pencil size={16} /></button><button className="ac-icon-button danger" type="button" title="Supprimer" aria-label={`Supprimer ${item.name}`} onClick={() => deleteItem("skills", item)}><Trash2 size={16} /></button></div></article>)}</div> : <div className="ac-empty"><Sparkles size={28} /><h3>Aucune compétence trouvée</h3><p>Ajoutez une compétence depuis le formulaire.</p></div>
            )}
          </section>
        </div>
        <p className="ac-footer-note"><CircleAlert size={15} /> Désactiver un élément permet de le conserver dans le catalogue sans l'afficher comme actif. La suppression est définitive.</p>
      </div>
    </main>
  );
}
