
import { Link, useLocation } from "react-router-dom";
import { MessageCircle } from "lucide-react";
import "./SupportShortcut.css";

export default function SupportShortcut() {
  const { pathname } = useLocation();

  let user = null;

  try {
    const savedUser = localStorage.getItem("user");
    user = savedUser ? JSON.parse(savedUser) : null;
  } catch (error) {
    console.error("Impossible de lire le compte connecté :", error);
  }

  const role = String(user?.role || "").toUpperCase();

  const isCandidateOrRecruiter =
    role === "CANDIDATE" || role === "RECRUITER";

  const isWorkspacePage =
    pathname.startsWith("/candidate") ||
    pathname.startsWith("/recruiter") ||
    /^\/jobs\/[^/]+\/apply\/?$/.test(pathname);

  // Ne pas afficher le bouton sur la page de support elle-même.
  if (
    !isCandidateOrRecruiter ||
    !isWorkspacePage ||
    pathname === "/support"
  ) {
    return null;
  }

  return (
    <Link
      to="/support"
      className="support-shortcut"
      aria-label="Accéder au centre de support"
      title="Besoin d'aide ?"
    >
      <MessageCircle size={20} aria-hidden="true" />
      <span>Besoin d'aide ?</span>
    </Link>
  );
}
