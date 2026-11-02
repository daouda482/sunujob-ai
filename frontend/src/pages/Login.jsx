
import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  CheckCircle2,
  Eye,
  EyeOff,
  FileText,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Users,
} from "lucide-react";
import api from "../api/axios";
import "./Login.css";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    const normalizedEmail = email.trim();

    if (!normalizedEmail || !password) {
      setError("Veuillez renseigner votre adresse e-mail et votre mot de passe.");
      return;
    }

    setLoading(true);

    try {
      const response = await api.post("token/", {
        email: normalizedEmail,
        password,
      });

      const access = response.data.access;
      const refresh = response.data.refresh;

      if (!access) {
        throw new Error("Le serveur n'a pas renvoyé de jeton d'accès.");
      }

      // Nettoyage des anciennes sessions avant d'enregistrer la nouvelle.
      localStorage.removeItem("access");
      localStorage.removeItem("refresh");
      localStorage.removeItem("user");
      sessionStorage.removeItem("access");
      sessionStorage.removeItem("refresh");
      sessionStorage.removeItem("user");

      const storage = rememberMe ? localStorage : sessionStorage;
      storage.setItem("access", access);

      if (refresh) storage.setItem("refresh", refresh);

      let user = response.data.user || null;

      if (!user) {
        try {
          const profileResponse = await api.get("users/profile/", {
            headers: { Authorization: `Bearer ${access}` },
          });

          user = profileResponse.data.user || profileResponse.data;
        } catch {
          user = null;
        }
      }

      if (user) {
        storage.setItem("user", JSON.stringify(user));
      }

      const role = String(user?.role || "").toUpperCase();

      const roleDestinations = {
        CANDIDATE: "/candidate/dashboard",
        RECRUITER: "/recruiter/dashboard",
        TRAINING_PROVIDER: "/training-provider/dashboard",
        ADMIN: "/admin/dashboard",
      };

      const destination =
        location.state?.from?.pathname ||
        roleDestinations[role] ||
        (user ? "/" : "/candidate/dashboard");

      navigate(destination, { replace: true });
    } catch (err) {
      if (err.response?.status === 401) {
        setError("Adresse e-mail ou mot de passe incorrect.");
      } else if (err.response?.status === 400) {
        setError(
          "Les informations fournies sont invalides. Vérifiez votre adresse e-mail et votre mot de passe."
        );
      } else if (!err.response) {
        setError(
          err.message === "Le serveur n'a pas renvoyé de jeton d'accès."
            ? err.message
            : "Impossible de joindre le serveur. Vérifiez que Django est démarré."
        );
      } else {
        setError(
          err.response?.data?.detail ||
            err.response?.data?.message ||
            "La connexion a échoué. Veuillez réessayer."
        );
      }

      localStorage.removeItem("access");
      localStorage.removeItem("refresh");
      localStorage.removeItem("user");
      sessionStorage.removeItem("access");
      sessionStorage.removeItem("refresh");
      sessionStorage.removeItem("user");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="sj-login-page">
      <div className="sj-login-shell">
        <section className="sj-login-visual">
          <Link to="/" className="sj-login-brand" aria-label="SunuJob AI - Accueil">
            <span className="sj-login-brand-mark">SJ</span>
            <span className="sj-login-brand-name">
              SunuJob <strong>AI</strong>
            </span>
          </Link>

          <div className="sj-login-visual-content">
            <span className="sj-login-eyebrow">PLATEFORME DE RECRUTEMENT</span>

            <h1>
              Le recrutement et la carrière, au même endroit.
            </h1>

            <p className="sj-login-visual-description">
              Retrouvez votre espace professionnel pour consulter les
              opportunités, gérer vos candidatures et suivre vos démarches.
            </p>

            <div className="sj-login-service-list">
              <div className="sj-login-service-item">
                <span><BriefcaseBusiness size={19} /></span>
                <div>
                  <strong>Offres d'emploi</strong>
                  <small>Consultez les opportunités disponibles.</small>
                </div>
              </div>

              <div className="sj-login-service-item">
                <span><FileText size={19} /></span>
                <div>
                  <strong>Gestion des candidatures</strong>
                  <small>Centralisez et suivez vos démarches.</small>
                </div>
              </div>

              <div className="sj-login-service-item">
                <span><Building2 size={19} /></span>
                <div>
                  <strong>Espace recruteur</strong>
                  <small>Organisez vos processus de recrutement.</small>
                </div>
              </div>
            </div>
          </div>

          <div className="sj-login-visual-footer">
            <span><ShieldCheck size={16} /> Accès sécurisé à votre espace</span>
            <span>Conçu au Sénégal</span>
          </div>
        </section>

        <section className="sj-login-form-panel">
          <div className="sj-login-form-top">
            <Link to="/" className="sj-login-mobile-brand">
              <span className="sj-login-brand-mark">SJ</span>
              <span className="sj-login-brand-name">SunuJob <strong>AI</strong></span>
            </Link>

            <p>
              Pas encore de compte ?
              <Link to="/register"> Créer un compte</Link>
            </p>
          </div>

          <div className="sj-login-form-content">
            <div className="sj-login-form-heading">
              <span className="sj-login-form-icon">
                <LockKeyhole size={22} />
              </span>

              <p className="sj-login-kicker">ACCÈS À VOTRE ESPACE</p>
              <h2>Connexion</h2>
              <p className="sj-login-subtitle">
                Saisissez vos identifiants pour accéder à votre compte SunuJob AI.
              </p>
            </div>

            {error && (
              <div className="sj-login-error" role="alert">
                <span>!</span>
                <p>{error}</p>
              </div>
            )}

            <form className="sj-login-form" onSubmit={handleSubmit}>
              <div className="sj-login-field">
                <label htmlFor="login-email">Adresse e-mail</label>

                <div className="sj-login-input-wrap">
                  <Mail size={18} className="sj-login-input-icon" />
                  <input
                    id="login-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    placeholder="nom@exemple.com"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="sj-login-field">
                <div className="sj-login-label-row">
                  <label htmlFor="login-password">Mot de passe</label>
                  <Link to="/forgot-password" className="sj-login-forgot">
                    Mot de passe oublié ?
                  </Link>
                </div>

                <div className="sj-login-input-wrap">
                  <LockKeyhole size={18} className="sj-login-input-icon" />
                  <input
                    id="login-password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="Votre mot de passe"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                  />

                  <button
                    type="button"
                    className="sj-login-password-toggle"
                    onClick={() => setShowPassword((visible) => !visible)}
                    aria-label={
                      showPassword
                        ? "Masquer le mot de passe"
                        : "Afficher le mot de passe"
                    }
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <label className="sj-login-remember">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(event) => setRememberMe(event.target.checked)}
                />
                <span className="sj-login-checkbox-ui">
                  <CheckCircle2 size={14} />
                </span>
                <span>Rester connecté sur cet appareil</span>
              </label>

              <button
                type="submit"
                className="sj-login-submit"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="sj-login-spinner" />
                    Connexion en cours...
                  </>
                ) : (
                  <>
                    Se connecter <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>

            <div className="sj-login-security-note">
              <ShieldCheck size={18} />
              <p>
                Vos informations de connexion sont traitées de manière
                sécurisée pour protéger l'accès à votre compte.
              </p>
            </div>

            <div className="sj-login-platform-note">
              <Users size={16} />
              <span>Un espace adapté aux candidats et aux recruteurs.</span>
            </div>

            <p className="sj-login-register-mobile">
              Vous découvrez SunuJob AI ?
              <Link to="/register"> Créer un compte</Link>
            </p>
          </div>

          <div className="sj-login-form-footer">
            <Link to="/">Retour à l'accueil</Link>
            <span>© {new Date().getFullYear()} SunuJob AI</span>
          </div>
        </section>
      </div>
    </main>
  );
}
