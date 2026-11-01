
import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import api from "../api/axios";
import "./Login.css";

function Icon({ name, size = 20 }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
  };

  const paths = {
    mail: (
      <>
        <rect x="3" y="5" width="18" height="14" rx="3" />
        <path d="m4 7 8 6 8-6" />
      </>
    ),
    lock: (
      <>
        <rect x="4" y="10" width="16" height="11" rx="2" />
        <path d="M8 10V7a4 4 0 0 1 8 0v3" />
      </>
    ),
    eye: (
      <>
        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
        <circle cx="12" cy="12" r="3" />
      </>
    ),
    eyeOff: (
      <>
        <path d="m3 3 18 18" />
        <path d="M10.6 5.2A10.7 10.7 0 0 1 12 5c6.5 0 10 7 10 7a15.8 15.8 0 0 1-3.1 3.8" />
        <path d="M6.2 6.3C3.5 8.1 2 12 2 12s3.5 7 10 7a10 10 0 0 0 4-.8" />
      </>
    ),
    arrow: <path d="M5 12h14m-6-6 6 6-6 6" />,
    check: <path d="m5 12 4 4L19 6" />,
    briefcase: (
      <>
        <rect x="3" y="7" width="18" height="13" rx="2" />
        <path d="M8 7V4h8v3M3 12h18M10 12v2h4v-2" />
      </>
    ),
    shield: (
      <>
        <path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z" />
        <path d="m9 12 2 2 4-4" />
      </>
    ),
  };

  return <svg {...common}>{paths[name]}</svg>;
}

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
      /*
       * Endpoint standard Django SimpleJWT.
       * Si ton backend utilise un autre endpoint de connexion,
       * adapte uniquement cette URL à celle de ton projet.
       */
      const response = await api.post("token/", {
        email: normalizedEmail,
        password,
      });

      const access = response.data.access;
      const refresh = response.data.refresh;

      if (!access) {
        throw new Error("Le serveur n'a pas renvoyé de jeton d'accès.");
      }

      // Le client Axios utilisera le jeton pour les requêtes suivantes.
      if (rememberMe) {
        localStorage.setItem("access", access);
        if (refresh) localStorage.setItem("refresh", refresh);
      } else {
        sessionStorage.setItem("access", access);
        if (refresh) sessionStorage.setItem("refresh", refresh);
      }

      let user = response.data.user || null;

      // Si la connexion ne renvoie pas le compte, le récupérer auprès du backend.
      if (!user) {
        try {
          const profileResponse = await api.get("users/profile/", {
            headers: { Authorization: `Bearer ${access}` },
          });

          user = profileResponse.data.user || profileResponse.data;
        } catch {
          // Le jeton peut être valide même si cet endpoint diffère.
          user = null;
        }
      }

      if (user) {
        if (rememberMe) {
          localStorage.setItem("user", JSON.stringify(user));
        } else {
          sessionStorage.setItem("user", JSON.stringify(user));
        }
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
          "Impossible de joindre le serveur. Vérifiez que Django est démarré."
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
        {/* Présentation de SunuJob AI */}
        <section className="sj-login-visual">
          <Link to="/" className="sj-login-brand">
            <span className="sj-login-brand-icon">S<span>✦</span></span>
            <span>SunuJob <strong>AI</strong></span>
          </Link>

          <div className="sj-login-visual-content">
            <span className="sj-login-eyebrow">
              <span className="sj-login-eyebrow-dot" />
              LE RECRUTEMENT ENTRE DANS UNE NOUVELLE ÈRE
            </span>

            <h1>
              Votre prochain chapitre
              <span> professionnel commence ici.</span>
            </h1>

            <p className="sj-login-visual-description">
              Connectez-vous pour découvrir les opportunités qui correspondent
              à vos compétences, suivre vos candidatures et faire avancer votre carrière.
            </p>

            <div className="sj-login-illustration">
              <div className="sj-login-orbit sj-login-orbit-one" />
              <div className="sj-login-orbit sj-login-orbit-two" />

              <div className="sj-login-illustration-center">
                <span className="sj-login-illustration-star">✦</span>
                <strong>S</strong>
                <small>AI</small>
              </div>

              <div className="sj-login-float-card sj-login-float-top">
                <span className="sj-login-float-icon purple">
                  <Icon name="briefcase" size={21} />
                </span>
                <span>
                  <strong>Des opportunités ciblées</strong>
                  <small>Découvrez les offres qui vous correspondent</small>
                </span>
              </div>

              <div className="sj-login-float-card sj-login-float-bottom">
                <span className="sj-login-float-icon green">
                  <Icon name="check" size={22} />
                </span>
                <span>
                  <strong>Un suivi simplifié</strong>
                  <small>Gardez le contrôle sur vos candidatures</small>
                </span>
              </div>
            </div>
          </div>

          <div className="sj-login-visual-footer">
            <span><Icon name="shield" size={16} /> Un espace personnel sécurisé</span>
            <span>Conçu au Sénégal 🇸🇳</span>
          </div>
        </section>

        {/* Formulaire */}
        <section className="sj-login-form-panel">
          <div className="sj-login-form-top">
            <span className="sj-login-mobile-logo">S</span>
            <p>
              Pas encore de compte ?
              <Link to="/register"> Créer un compte</Link>
            </p>
          </div>

          <div className="sj-login-form-content">
            <div className="sj-login-form-heading">
              <span className="sj-login-form-icon">
                <Icon name="lock" size={24} />
              </span>

              <p className="sj-login-kicker">HEUREUX DE VOUS REVOIR</p>
              <h2>Connexion</h2>
              <p className="sj-login-subtitle">
                Accédez à votre espace et poursuivez votre parcours professionnel.
              </p>
            </div>

            {error && (
              <div className="sj-login-error" role="alert">
                <span aria-hidden="true">!</span>
                <p>{error}</p>
              </div>
            )}

            <form className="sj-login-form" onSubmit={handleSubmit}>
              <div className="sj-login-field">
                <label htmlFor="login-email">Adresse e-mail</label>

                <div className="sj-login-input-wrap">
                  <span className="sj-login-input-icon">
                    <Icon name="mail" size={19} />
                  </span>

                  <input
                    id="login-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    placeholder="exemple@domaine.com"
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
                  <span className="sj-login-input-icon">
                    <Icon name="lock" size={19} />
                  </span>

                  <input
                    id="login-password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="Saisissez votre mot de passe"
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
                    <Icon name={showPassword ? "eyeOff" : "eye"} size={19} />
                  </button>
                </div>
              </div>

              <label className="sj-login-remember">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(event) => setRememberMe(event.target.checked)}
                />
                <span className="sj-login-custom-checkbox">
                  <Icon name="check" size={13} />
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
                    Se connecter
                    <Icon name="arrow" size={19} />
                  </>
                )}
              </button>
            </form>

            <div className="sj-login-divider">
              <span />
              <p>Votre avenir professionnel</p>
              <span />
            </div>

            <div className="sj-login-bottom-note">
              <Icon name="shield" size={17} />
              <p>
                Vos informations sont utilisées pour sécuriser votre accès
                à votre espace SunuJob AI.
              </p>
            </div>

            <p className="sj-login-register-mobile">
              Vous nous rejoignez pour la première fois ?
              <Link to="/register"> Créer un compte gratuitement</Link>
            </p>
          </div>

          <div className="sj-login-form-footer">
            <Link to="/">← Retour à l'accueil</Link>
            <span>© {new Date().getFullYear()} SunuJob AI</span>
          </div>
        </section>
      </div>
    </main>
  );
}
