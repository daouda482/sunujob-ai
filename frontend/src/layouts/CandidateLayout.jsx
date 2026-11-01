import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  BriefcaseBusiness,
  FileText,
  Sparkles,
  CalendarDays,
  Bot,
  Bell,
  UserRound,
  Headset,
  LogOut,
  Menu,
  X,
  ChevronRight,
  Search,
  ScanText,
} from "lucide-react";
import api from "../api/axios";
import "./CandidateLayout.css";

// Le CV est une rubrique distincte du profil.
// L'analyse IA est affichée comme fonctionnalité en préparation tant que
// le backend d'analyse dédié n'est pas branché.
const NAV_GROUPS = [
  {
    title: "MON ESPACE",
    items: [
      { label: "Tableau de bord", path: "/candidate/dashboard", icon: LayoutDashboard, exact: true },
      { label: "Trouver un emploi", path: "/candidate/jobs", icon: Search },
      { label: "Mes candidatures", path: "/candidate/applications", icon: FileText },
      { label: "Recommandations IA", path: "/candidate/recommendations", icon: Sparkles },
    ],
  },
  {
    title: "MON PROFIL ET MES DOCUMENTS",
    items: [
      { label: "Mon profil professionnel", path: "/candidate/profile", icon: UserRound },
      { label: "Mon CV", path: "/candidate/cv", icon: FileText },
    ],
  },
  {
    title: "MES OUTILS CARRIÈRE",
    items: [
      { label: "Mes entretiens", path: "/candidate/interviews", icon: CalendarDays },
      { label: "Coach carrière IA", path: "/candidate/ai-coach", icon: Bot },
      { label: "Analyse de CV par IA", path: "/candidate/cv-analysis", icon: ScanText, badge: "Bientôt" },
    ],
  },
  {
    title: "MON COMPTE",
    items: [
      { label: "Notifications", path: "/candidate/notifications", icon: Bell },
      { label: "Centre de support", path: "/support", icon: Headset },
    ],
  },
];

function readStoredUser() {
  try {
    return JSON.parse(
      localStorage.getItem("user") || sessionStorage.getItem("user") || "{}"
    );
  } catch {
    return {};
  }
}

function getInitials(profile) {
  const first = profile?.first_name || profile?.user?.first_name || "";
  const last = profile?.last_name || profile?.user?.last_name || "";
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase() || "C";
}

const API_ORIGIN = (
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api/"
)
  .replace(/\/$/, "")
  .replace(/\/api$/i, "");

function mediaUrl(value) {
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  return `${API_ORIGIN}${value.startsWith("/") ? value : `/${value}`}`;
}

function getPageTitle(pathname) {
  const path = pathname.replace(/\/+$/, "");
  const titles = {
    "/candidate/profile": "Mon profil professionnel",
    "/candidate/cv": "Mon CV",
    "/candidate/jobs": "Trouver un emploi",
    "/candidate/applications": "Mes candidatures",
    "/candidate/recommendations": "Recommandations IA",
    "/candidate/interviews": "Mes entretiens",
    "/candidate/ai-coach": "Coach carrière IA",
    "/candidate/cv-analysis": "Analyse de CV par IA",
    "/candidate/notifications": "Mes notifications",
    "/support": "Centre de support",
    "/application-success": "Confirmation de candidature",
    "/my-applications": "Historique de mes candidatures",
  };

  if (titles[path]) return titles[path];
  if (/^\/jobs\/[^/]+\/apply$/.test(path)) return "Déposer une candidature";
  return "Mon espace personnel";
}

export default function CandidateLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profile, setProfile] = useState(readStoredUser);

  const currentPath = location.pathname.replace(/\/+$/, "") || "/";
  const isDashboard = currentPath === "/candidate/dashboard";

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      const results = await Promise.allSettled([
        api.get("users/profile/"),
        api.get("candidates/profile/me/"),
      ]);

      if (!active) return;

      const userData = results[0].status === "fulfilled"
        ? results[0].value.data || {}
        : {};
      const candidateData = results[1].status === "fulfilled"
        ? results[1].value.data || {}
        : {};
      const nestedUser = userData.user || userData;

      setProfile({
        ...nestedUser,
        ...userData,
        ...candidateData,
        user: { ...nestedUser, ...(candidateData.user || {}) },
      });
    }

    loadProfile().catch((error) => {
      console.error("Chargement du profil candidat impossible :", error);
    });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!sidebarOpen) return undefined;

    function handleEscape(event) {
      if (event.key === "Escape") setSidebarOpen(false);
    }

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [sidebarOpen]);

  // Le dashboard contient déjà sa propre sidebar : ne pas en afficher une seconde.
  if (isDashboard) return <Outlet />;

  const firstName = profile?.first_name || profile?.user?.first_name || "";
  const lastName = profile?.last_name || profile?.user?.last_name || "";
  const fullName = `${firstName} ${lastName}`.trim() || "Espace candidat";
  const email = profile?.email || profile?.user?.email || "Profil professionnel";
  const initials = getInitials(profile);

  function handleLogout() {
    ["access", "refresh", "user"].forEach((key) => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    });
    navigate("/login", { replace: true });
  }

  return (
    <div className="candidate-layout">
      {sidebarOpen && (
        <button
          type="button"
          className="candidate-layout-overlay"
          aria-label="Fermer le menu"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        id="candidate-sidebar"
        className={`candidate-layout-sidebar ${sidebarOpen ? "is-open" : ""}`}
        aria-label="Navigation de l'espace candidat"
      >
        <div className="candidate-layout-brand-row">
          <Link to="/candidate/dashboard" className="candidate-layout-brand" onClick={() => setSidebarOpen(false)}>
            <span className="candidate-layout-brand-mark">S</span>
            <span className="candidate-layout-brand-copy">
              <strong>SunuJob <b>AI</b></strong>
              <small>La carrière en mouvement</small>
            </span>
          </Link>
          <button type="button" className="candidate-layout-close" aria-label="Fermer le menu" onClick={() => setSidebarOpen(false)}>
            <X size={20} />
          </button>
        </div>

        <div className="candidate-layout-profile">
          <div className="candidate-layout-avatar">
            {profile?.photo ? <img src={mediaUrl(profile.photo)} alt="" /> : initials}
          </div>
          <div className="candidate-layout-profile-copy">
            <strong>{fullName}</strong>
            <span>{email}</span>
          </div>
          <i className="candidate-layout-online-dot" title="Compte connecté" />
        </div>

        <nav className="candidate-layout-nav">
          {NAV_GROUPS.map((group) => (
            <section className="candidate-layout-nav-group" key={group.title}>
              <h2>{group.title}</h2>
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.exact}
                    className={({ isActive }) =>
                      `candidate-layout-nav-link ${isActive ? "is-active" : ""}`
                    }
                    onClick={() => setSidebarOpen(false)}
                  >
                    <Icon size={18} strokeWidth={1.8} />
                    <span>{item.label}</span>
                    {item.badge && <small className="candidate-layout-coming-soon">{item.badge}</small>}
                    {!item.badge && <ChevronRight size={14} className="candidate-layout-nav-chevron" />}
                  </NavLink>
                );
              })}
            </section>
          ))}
        </nav>

        <div className="candidate-layout-bottom">
          <div className="candidate-layout-help-card">
            <span className="candidate-layout-help-icon"><Sparkles size={18} /></span>
            <strong>Faites avancer votre carrière !</strong>
            <p>Gardez votre profil et votre CV à jour pour mieux valoriser votre parcours.</p>
            <Link to="/candidate/profile" onClick={() => setSidebarOpen(false)}>
              Améliorer mon profil <ChevronRight size={14} />
            </Link>
          </div>
          <button type="button" className="candidate-layout-logout" onClick={handleLogout}>
            <LogOut size={17} /> Déconnexion
          </button>
          <small className="candidate-layout-footnote">Conçu au Sénégal 🇸🇳</small>
        </div>
      </aside>

      <div className="candidate-layout-main">
        <header className="candidate-layout-topbar">
          <div className="candidate-layout-heading-wrap">
            <button
              type="button"
              className="candidate-layout-menu-button"
              aria-label="Ouvrir le menu"
              aria-controls="candidate-sidebar"
              aria-expanded={sidebarOpen}
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={22} />
            </button>
            <div className="candidate-layout-page-heading">
              <span>ESPACE PERSONNEL</span>
              <strong>{getPageTitle(location.pathname)}</strong>
            </div>
          </div>

          <div className="candidate-layout-top-actions">
            <span className="candidate-layout-status"><i /> En ligne</span>
            <Link to="/candidate/notifications" className="candidate-layout-notification" aria-label="Notifications">
              <Bell size={19} />
            </Link>
            <Link to="/candidate/profile" className="candidate-layout-account">
              <span>{initials}</span>
              <b>Mon compte</b>
            </Link>
          </div>
        </header>

        <main className="candidate-layout-content">
          <Outlet />
        </main>

        <footer className="candidate-layout-footer">
          <span>© {new Date().getFullYear()} SunuJob AI</span>
          <span>Chaque talent mérite une opportunité.</span>
        </footer>
      </div>
    </div>
  );
}
