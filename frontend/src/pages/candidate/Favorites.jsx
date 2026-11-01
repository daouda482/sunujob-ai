import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api/axios";
import "./Favorites.css";

function getList(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.favorites)) return data.favorites;
  return [];
}

function getJob(favorite) {
  return favorite.job && typeof favorite.job === "object"
    ? favorite.job
    : favorite;
}

export default function Favorites() {
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadFavorites = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("favorites/");
      setFavorites(getList(response.data));
    } catch (err) {
      console.error("Erreur de chargement des favoris :", err);
      setError(
        err.response?.data?.detail ||
          "Impossible de charger vos favoris. Vérifiez que l'API des favoris est disponible."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFavorites();
  }, [loadFavorites]);

  async function removeFavorite(favorite) {
    const favoriteId = favorite.id;

    if (!favoriteId) {
      setError("Identifiant du favori introuvable.");
      return;
    }

    setRemovingId(favoriteId);
    setError("");
    setSuccess("");

    try {
      await api.delete(`favorites/${favoriteId}/`);

      setFavorites((previous) =>
        previous.filter((item) => item.id !== favoriteId)
      );

      setSuccess("Cette offre a été retirée de vos favoris.");
    } catch (err) {
      console.error("Erreur de suppression du favori :", err);
      setError(
        err.response?.data?.detail ||
          "Impossible de retirer cette offre de vos favoris."
      );
    } finally {
      setRemovingId(null);
    }
  }

  if (loading) {
    return (
      <main className="saved-page">
        <div className="saved-loading">
          <span className="saved-spinner" />
          <strong>Chargement de vos favoris...</strong>
        </div>
      </main>
    );
  }

  return (
    <main className="saved-page">
      <section className="saved-hero">
        <div>
          <span className="saved-eyebrow">VOTRE SÉLECTION</span>
          <h1>Mes offres favorites</h1>
          <p>
            Retrouvez ici les opportunités que vous souhaitez consulter
            ou auxquelles vous envisagez de postuler.
          </p>
        </div>

        <div className="saved-hero-icon" aria-hidden="true">
          ♡
        </div>
      </section>

      <div className="saved-toolbar">
        <div>
          <strong>{favorites.length}</strong>
          <span>
            {favorites.length > 1 ? " offres enregistrées" : " offre enregistrée"}
          </span>
        </div>

        <Link to="/jobs" className="saved-primary-button">
          Découvrir les offres <span>→</span>
        </Link>
      </div>

      {error && (
        <div className="saved-alert saved-alert--error" role="alert">
          {error}
          <button type="button" onClick={loadFavorites}>
            Réessayer
          </button>
        </div>
      )}

      {success && (
        <div className="saved-alert saved-alert--success" role="status">
          {success}
        </div>
      )}

      {favorites.length === 0 ? (
        <section className="saved-empty">
          <div className="saved-empty-icon">♡</div>
          <h2>Aucune offre enregistrée pour le moment</h2>
          <p>
            Lorsque vous trouverez une offre intéressante, ajoutez-la à vos
            favoris pour la retrouver facilement ici.
          </p>
          <Link to="/jobs" className="saved-primary-button">
            Explorer les offres d'emploi →
          </Link>
        </section>
      ) : (
        <section className="saved-grid">
          {favorites.map((favorite) => {
            const job = getJob(favorite);
            const company =
              job.company_name || job.company?.name || "Entreprise";

            return (
              <article className="saved-card" key={favorite.id}>
                <div className="saved-card-top">
                  <div className="saved-company-mark">
                    {company.charAt(0).toUpperCase()}
                  </div>

                  <button
                    type="button"
                    className="saved-remove-button"
                    onClick={() => removeFavorite(favorite)}
                    disabled={removingId === favorite.id}
                    aria-label={`Retirer ${job.title || "cette offre"} des favoris`}
                    title="Retirer des favoris"
                  >
                    {removingId === favorite.id ? "..." : "♥"}
                  </button>
                </div>

                <span className="saved-company">{company}</span>
                <h2>{job.title || "Offre d'emploi"}</h2>

                <div className="saved-meta">
                  {job.location && (
                    <span>📍 {job.location}</span>
                  )}
                  {job.contract_type && (
                    <span>▣ {job.contract_type}</span>
                  )}
                  {job.sector && <span>◈ {job.sector}</span>}
                </div>

                {job.deadline && (
                  <p className="saved-deadline">
                    Date limite : {new Date(job.deadline).toLocaleDateString("fr-FR")}
                  </p>
                )}

                <div className="saved-card-footer">
                  <Link to={`/jobs/${job.id}`} className="saved-details-link">
                    Consulter l'offre <span>→</span>
                  </Link>

                  <button
                    type="button"
                    className="saved-text-button"
                    onClick={() => removeFavorite(favorite)}
                    disabled={removingId === favorite.id}
                  >
                    Retirer
                  </button>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </main>
  );
}