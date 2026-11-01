
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/axios";
import "./Register.css";

const roles = [
  {
    value: "CANDIDATE",
    icon: "✦",
    title: "Candidat",
    description: "Trouver un emploi et valoriser mon profil",
  },
  {
    value: "RECRUITER",
    icon: "▣",
    title: "Recruteur",
    description: "Publier des offres et recruter des talents",
  },
  {
    value: "TRAINING_PROVIDER",
    icon: "⌂",
    title: "Formation",
    description: "Proposer des formations professionnelles",
  },
];

const initialForm = {
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  role: "CANDIDATE",
  password: "",
  password_confirmation: "",
};

export default function Register() {
  const navigate = useNavigate();

  const [form, setForm] = useState(initialForm);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    setError("");
    setSuccess("");
  };

  const validateForm = () => {
    if (
      !form.first_name.trim() ||
      !form.last_name.trim() ||
      !form.email.trim() ||
      !form.password ||
      !form.password_confirmation
    ) {
      return "Veuillez remplir tous les champs obligatoires.";
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      return "Veuillez saisir une adresse e-mail valide.";
    }

    if (form.password.length < 8) {
      return "Votre mot de passe doit contenir au moins 8 caractères.";
    }

    if (form.password !== form.password_confirmation) {
      return "Les deux mots de passe ne correspondent pas.";
    }

    if (!acceptedTerms) {
      return "Veuillez accepter les conditions d'utilisation.";
    }

    return "";
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);

    try {
      const payload = {
        ...form,
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim(),
      };

      await api.post("users/register/", payload);

      setSuccess(
        "Votre compte a été créé avec succès. Vous pouvez maintenant vous connecter."
      );

      setForm(initialForm);

      window.setTimeout(() => {
        navigate("/login", { replace: true });
      }, 1200);
    } catch (err) {
      const data = err.response?.data;

      if (data && typeof data === "object") {
        const messages = Object.entries(data)
          .map(([field, value]) => {
            const label =
              field === "email"
                ? "E-mail"
                : field === "password"
                  ? "Mot de passe"
                  : field === "role"
                    ? "Profil"
                    : field === "phone"
                      ? "Téléphone"
                      : field === "first_name"
                        ? "Prénom"
                        : field === "last_name"
                          ? "Nom"
                          : field;

            const detail = Array.isArray(value)
              ? value.join(" ")
              : typeof value === "string"
                ? value
                : JSON.stringify(value);

            return `${label} : ${detail}`;
          });

        setError(
          messages.join(" ") ||
            "Impossible de créer le compte. Vérifiez vos informations."
        );
      } else {
        setError(
          "Impossible de joindre le serveur. Vérifiez que Django fonctionne."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="register-page">
      <section className="register-showcase">
        <div className="register-showcase-content">
          <Link to="/" className="register-brand">
            <span className="register-brand-icon">S</span>
            <span>
              SunuJob<span className="brand-ai"> AI</span>
            </span>
          </Link>

          <div className="showcase-copy">
            <span className="showcase-eyebrow">
              <span className="eyebrow-dot" />
              L'emploi autrement
            </span>

            <h1>
              Votre avenir
              <br />
              professionnel
              <br />
              <span>commence ici.</span>
            </h1>

            <p>
              Découvrez de nouvelles opportunités, révélez votre potentiel
              et construisez votre avenir avec une plateforme de recrutement
              pensée pour vous.
            </p>

            <div className="showcase-features">
              <div className="showcase-feature">
                <span className="feature-check">✓</span>
                Des opportunités adaptées à votre profil
              </div>
              <div className="showcase-feature">
                <span className="feature-check">✓</span>
                Un suivi simplifié de vos candidatures
              </div>
              <div className="showcase-feature">
                <span className="feature-check">✓</span>
                Une expérience de recrutement intelligente
              </div>
            </div>
          </div>

          <div className="showcase-bottom">
            <div className="showcase-bottom-line" />
            <p>Le talent mérite la bonne opportunité.</p>
            <span>© {new Date().getFullYear()} SunuJob AI</span>
          </div>
        </div>

        <div className="showcase-orb showcase-orb-one" />
        <div className="showcase-orb showcase-orb-two" />
        <div className="showcase-grid-pattern" />
      </section>

      <section className="register-form-section">
        <div className="register-mobile-brand">
          <Link to="/" className="register-brand">
            <span className="register-brand-icon">S</span>
            <span>
              SunuJob<span className="brand-ai"> AI</span>
            </span>
          </Link>
        </div>

        <div className="register-form-wrapper">
          <div className="register-top-link">
            <span>Vous avez déjà un compte ?</span>
            <Link to="/login">Se connecter ↗</Link>
          </div>

          <div className="register-heading">
            <span className="register-step">VOTRE ESPACE PROFESSIONNEL</span>
            <h2>Créez votre compte</h2>
            <p>
              Rejoignez SunuJob AI et donnez une nouvelle dimension à votre
              parcours professionnel.
            </p>
          </div>

          {error && (
            <div className="register-alert register-alert-error" role="alert">
              <span className="alert-icon">!</span>
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div
              className="register-alert register-alert-success"
              role="status"
            >
              <span className="alert-icon">✓</span>
              <span>{success}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="register-form" noValidate>
            <div className="register-field">
              <label>Je souhaite m'inscrire en tant que</label>

              <div className="register-role-grid">
                {roles.map((role) => (
                  <button
                    type="button"
                    key={role.value}
                    className={`register-role-card ${
                      form.role === role.value ? "selected" : ""
                    }`}
                    onClick={() => {
                      setForm((previous) => ({
                        ...previous,
                        role: role.value,
                      }));
                      setError("");
                    }}
                    aria-pressed={form.role === role.value}
                  >
                    <span className="role-icon">{role.icon}</span>
                    <span className="role-title">{role.title}</span>
                    <span className="role-description">
                      {role.description}
                    </span>
                    <span className="role-radio">
                      {form.role === role.value ? "✓" : ""}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="register-name-grid">
              <div className="register-field">
                <label htmlFor="first_name">Prénom *</label>
                <input
                  id="first_name"
                  name="first_name"
                  type="text"
                  placeholder="Ex. : Daouda"
                  autoComplete="given-name"
                  value={form.first_name}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="register-field">
                <label htmlFor="last_name">Nom *</label>
                <input
                  id="last_name"
                  name="last_name"
                  type="text"
                  placeholder="Ex. : Ba"
                  autoComplete="family-name"
                  value={form.last_name}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="register-field">
              <label htmlFor="email">Adresse e-mail *</label>
              <div className="register-input-wrap">
                <span className="input-symbol">@</span>
                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="vous@exemple.com"
                  autoComplete="email"
                  value={form.email}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="register-field">
              <label htmlFor="phone">
                Téléphone <span className="optional-label">Facultatif</span>
              </label>
              <div className="register-input-wrap">
                <span className="input-symbol">☎</span>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  placeholder="Ex. : +221 77 000 00 00"
                  autoComplete="tel"
                  value={form.phone}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="register-name-grid">
              <div className="register-field">
                <label htmlFor="password">Mot de passe *</label>
                <div className="register-input-wrap">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="8 caractères minimum"
                    autoComplete="new-password"
                    value={form.password}
                    onChange={handleChange}
                    minLength={8}
                    required
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={
                      showPassword
                        ? "Masquer le mot de passe"
                        : "Afficher le mot de passe"
                    }
                  >
                    {showPassword ? "Masquer" : "Afficher"}
                  </button>
                </div>
              </div>

              <div className="register-field">
                <label htmlFor="password_confirmation">
                  Confirmer *
                </label>
                <div className="register-input-wrap">
                  <input
                    id="password_confirmation"
                    name="password_confirmation"
                    type={showConfirmation ? "text" : "password"}
                    placeholder="Répétez le mot de passe"
                    autoComplete="new-password"
                    value={form.password_confirmation}
                    onChange={handleChange}
                    required
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() =>
                      setShowConfirmation(!showConfirmation)
                    }
                    aria-label={
                      showConfirmation
                        ? "Masquer la confirmation"
                        : "Afficher la confirmation"
                    }
                  >
                    {showConfirmation ? "Masquer" : "Afficher"}
                  </button>
                </div>
              </div>
            </div>

            <label className="register-terms">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(event) => setAcceptedTerms(event.target.checked)}
              />
              <span>
                J'accepte les conditions d'utilisation et la politique de
                confidentialité de SunuJob AI.
              </span>
            </label>

            <button
              type="submit"
              className="register-submit"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="register-spinner" />
                  Création du compte...
                </>
              ) : (
                <>
                  Créer mon compte
                  <span className="submit-arrow">→</span>
                </>
              )}
            </button>

            <p className="register-security-note">
              <span>♢</span>
              Vos informations sont utilisées pour créer votre espace
              professionnel.
            </p>
          </form>

          <div className="register-form-footer">
            Une plateforme conçue pour connecter les talents aux opportunités.
          </div>
        </div>
      </section>
    </main>
  );
}
