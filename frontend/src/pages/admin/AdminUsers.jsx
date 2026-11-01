
import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../../api/axios";
import "./adminUsers.css";

const DEFAULT_ROLES = [
  { value: "CANDIDATE", label: "Candidat" },
  { value: "RECRUITER", label: "Recruteur" },
  { value: "TRAINING_PROVIDER", label: "Organisme de formation" },
  { value: "ADMIN", label: "Administrateur" },
];

const numberFormatter = new Intl.NumberFormat("fr-FR");

function formatNumber(value) {
  return numberFormatter.format(Number(value) || 0);
}

function formatDate(value) {
  if (!value) return "Non renseignée";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Non renseignée";

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getInitials(user) {
  const source =
    user.full_name || user.email || `Utilisateur ${user.id || ""}`;

  return (
    source
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0))
      .join("")
      .toUpperCase() || "U"
  );
}

function getCurrentUser() {
  try {
    const stored =
      localStorage.getItem("user") ||
      sessionStorage.getItem("user");

    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

function getErrorMessage(error) {
  const status = error.response?.status;

  if (status === 401) {
    return "Votre session a expiré. Reconnectez-vous pour accéder à l'administration.";
  }

  if (status === 403) {
    return "Accès refusé. Cette fonctionnalité est réservée aux administrateurs.";
  }

  if (status === 404) {
    return "Route API introuvable. Vérifiez les routes ajoutées dans config/urls.py.";
  }

  if (!error.response) {
    return "Impossible de joindre Django. Vérifiez que le serveur est démarré.";
  }

  const data = error.response?.data;
  if (typeof data?.detail === "string") return data.detail;

  return "Une erreur est survenue pendant le chargement des utilisateurs.";
}

function UserStatusBadge({ active }) {
  return (
    <span
      className={`au-status ${
        active ? "au-status--active" : "au-status--inactive"
      }`}
    >
      <span />
      {active ? "Actif" : "Désactivé"}
    </span>
  );
}

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [summary, setSummary] = useState({
    total_users: 0,
    active_users: 0,
    inactive_users: 0,
  });
  const [roles, setRoles] = useState(DEFAULT_ROLES);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [count, setCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyUserId, setBusyUserId] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);

  const currentUser = useMemo(() => getCurrentUser(), []);

  // Recherche retardée afin d'éviter un appel API à chaque caractère.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 350);

    return () => window.clearTimeout(timer);
  }, [search]);

  const loadUsers = useCallback(async (manualRefresh = false) => {
    if (manualRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");
    setNotice("");

    try {
      const response = await api.get("admin/users/", {
        params: {
          search: debouncedSearch,
          role: roleFilter,
          status: statusFilter,
          page,
          page_size: pageSize,
        },
      });

      const data = response.data;

      setUsers(Array.isArray(data.results) ? data.results : []);
      setSummary(
        data.summary || {
          total_users: 0,
          active_users: 0,
          inactive_users: 0,
        }
      );
      setRoles(Array.isArray(data.roles) ? data.roles : DEFAULT_ROLES);
      setCount(Number(data.count) || 0);
      setTotalPages(Math.max(1, Number(data.total_pages) || 1));

      setSelectedUser((previous) => {
        if (!previous) return null;

        const updated = data.results?.find(
          (user) => user.id === previous.id
        );

        return updated || previous;
      });
    } catch (err) {
      setError(getErrorMessage(err));
      setUsers([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [debouncedSearch, roleFilter, statusFilter, page, pageSize]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, roleFilter, statusFilter, pageSize]);

  async function handleToggleStatus(user) {
    const nextState = !user.is_active;

    const message = nextState
      ? `Voulez-vous réactiver le compte de ${user.full_name} ?`
      : `Voulez-vous désactiver le compte de ${user.full_name} ?`;

    if (!window.confirm(message)) return;

    setBusyUserId(user.id);
    setError("");
    setNotice("");

    try {
      const response = await api.patch(
        `admin/users/${user.id}/status/`,
        { is_active: nextState }
      );

      const updatedUser = response.data.user;

      setUsers((previous) =>
        previous.map((item) =>
          item.id === updatedUser.id ? updatedUser : item
        )
      );

      setSelectedUser((previous) =>
        previous?.id === updatedUser.id ? updatedUser : previous
      );

      setNotice(response.data.message || "Statut du compte mis à jour.");

      // Recharger les compteurs et respecter les filtres en cours.
      await loadUsers(true);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusyUserId(null);
    }
  }

  function resetFilters() {
    setSearch("");
    setDebouncedSearch("");
    setRoleFilter("");
    setStatusFilter("all");
    setPage(1);
  }

  const visibleRangeStart = count === 0 ? 0 : (page - 1) * pageSize + 1;
  const visibleRangeEnd = Math.min(page * pageSize, count);

  const roleName = (role) =>
    roles.find((item) => item.value === role)?.label || role || "Non renseigné";

  return (
    <main className="admin-users">
      <header className="au-hero">
        <div className="au-hero__content">
          <div className="au-eyebrow">
            <span />
            CENTRE DE CONTRÔLE
          </div>

          <h1>Gestion des utilisateurs</h1>

          <p>
            Gérez les comptes, contrôlez les accès et suivez les membres
            de la communauté SunuJob AI depuis un espace centralisé.
          </p>

          <div className="au-hero__meta">
            <span className="au-hero__live">
              <span />
              Données de la plateforme
            </span>
            <span>Gestion sécurisée des comptes</span>
          </div>
        </div>

        <button
          type="button"
          className="au-refresh"
          onClick={() => loadUsers(true)}
          disabled={refreshing}
        >
          <span className={refreshing ? "au-refresh__icon is-spinning" : "au-refresh__icon"}>
            ↻
          </span>
          {refreshing ? "Actualisation..." : "Actualiser"}
        </button>
      </header>

      {notice && (
        <div className="au-alert au-alert--success" role="status">
          <span className="au-alert__symbol">✓</span>
          <p>{notice}</p>
          <button type="button" onClick={() => setNotice("")} aria-label="Fermer">
            ×
          </button>
        </div>
      )}

      {error && (
        <div className="au-alert au-alert--error" role="alert">
          <span className="au-alert__symbol">!</span>
          <p>{error}</p>
          <button type="button" onClick={() => setError("")} aria-label="Fermer">
            ×
          </button>
        </div>
      )}

      <section className="au-summary" aria-label="Statistiques des comptes">
        <article className="au-summary-card au-summary-card--total">
          <span className="au-summary-card__icon">♙</span>
          <div>
            <span className="au-summary-card__label">Total des comptes</span>
            <strong>{formatNumber(summary.total_users)}</strong>
            <small>Tous les profils enregistrés</small>
          </div>
        </article>

        <article className="au-summary-card au-summary-card--active">
          <span className="au-summary-card__icon">✓</span>
          <div>
            <span className="au-summary-card__label">Comptes actifs</span>
            <strong>{formatNumber(summary.active_users)}</strong>
            <small>Accès autorisé à la plateforme</small>
          </div>
        </article>

        <article className="au-summary-card au-summary-card--inactive">
          <span className="au-summary-card__icon">⊘</span>
          <div>
            <span className="au-summary-card__label">Comptes désactivés</span>
            <strong>{formatNumber(summary.inactive_users)}</strong>
            <small>Accès actuellement suspendu</small>
          </div>
        </article>
      </section>

      <section className="au-role-strip" aria-label="Répartition des rôles">
        <div>
          <span className="au-role-strip__caption">RÉPARTITION DES PROFILS</span>
          <strong>Communauté SunuJob AI</strong>
        </div>

        <div className="au-role-strip__items">
          {roles.map((role) => {
            const roleCount =
              summary.role_counts?.find((item) => item.value === role.value)?.count;

            return (
              <button
                type="button"
                key={role.value}
                className={`au-role-chip ${roleFilter === role.value ? "is-selected" : ""}`}
                onClick={() => {
                  setPage(1);
                  setRoleFilter((current) =>
                    current === role.value ? "" : role.value
                  );
                }}
                title={`Filtrer : ${role.label}`}
              >
                <span>{role.label}</span>
                {roleCount !== undefined && (
                  <strong>{formatNumber(roleCount)}</strong>
                )}
              </button>
            );
          })}
        </div>
      </section>

      <section className="au-directory">
        <div className="au-directory__header">
          <div>
            <span className="au-section-kicker">ANNUAIRE</span>
            <h2>Répertoire des comptes</h2>
            <p>Recherchez, filtrez et consultez les utilisateurs de la plateforme.</p>
          </div>

          <div className="au-directory__count">
            <strong>{formatNumber(count)}</strong>
            <span>résultat(s)</span>
          </div>
        </div>

        <div className="au-toolbar">
          <label className="au-search">
            <span aria-hidden="true">⌕</span>
            <input
              type="search"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Rechercher un nom ou une adresse e-mail..."
              aria-label="Rechercher un utilisateur"
            />
            {search && (
              <button
                type="button"
                aria-label="Effacer la recherche"
                onClick={() => {
                  setSearch("");
                  setPage(1);
                }}
              >
                ×
              </button>
            )}
          </label>

          <label className="au-filter">
            <span>Rôle</span>
            <select
              value={roleFilter}
              onChange={(event) => {
                setRoleFilter(event.target.value);
                setPage(1);
              }}
            >
              <option value="">Tous les rôles</option>
              {roles.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
          </label>

          <label className="au-filter">
            <span>État du compte</span>
            <select
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value);
                setPage(1);
              }}
            >
              <option value="all">Tous les états</option>
              <option value="active">Actifs</option>
              <option value="inactive">Désactivés</option>
            </select>
          </label>

          <label className="au-filter au-filter--size">
            <span>Par page</span>
            <select
              value={pageSize}
              onChange={(event) => {
                setPageSize(Number(event.target.value));
                setPage(1);
              }}
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </label>

          <button
            type="button"
            className="au-reset"
            onClick={resetFilters}
          >
            Réinitialiser
          </button>
        </div>

        <div className="au-table-meta">
          <span>
            Affichage de <strong>{formatNumber(visibleRangeStart)}</strong> à{" "}
            <strong>{formatNumber(visibleRangeEnd)}</strong> sur{" "}
            <strong>{formatNumber(count)}</strong> compte(s)
          </span>
          <span className="au-table-meta__secure">
            <span>✓</span> Accès administrateur
          </span>
        </div>

        {loading ? (
          <div className="au-state">
            <span className="au-spinner" />
            <h3>Chargement des utilisateurs</h3>
            <p>Récupération des données sécurisées de la plateforme.</p>
          </div>
        ) : users.length === 0 ? (
          <div className="au-state">
            <span className="au-state__icon">⌕</span>
            <h3>Aucun utilisateur trouvé</h3>
            <p>
              Aucun compte ne correspond à ces critères. Essayez une autre
              recherche ou réinitialisez les filtres.
            </p>
            <button type="button" className="au-primary-button" onClick={resetFilters}>
              Voir tous les comptes
            </button>
          </div>
        ) : (
          <div className="au-table-wrap">
            <table className="au-table">
              <thead>
                <tr>
                  <th>Utilisateur</th>
                  <th>Rôle</th>
                  <th>État du compte</th>
                  <th>Inscription</th>
                  <th>Dernière connexion</th>
                  <th><span className="au-visually-hidden">Actions</span></th>
                </tr>
              </thead>

              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <div className="au-user-cell">
                        <span className="au-avatar">
                          {getInitials(user)}
                        </span>
                        <div className="au-user-cell__identity">
                          <strong>{user.full_name}</strong>
                          <span>{user.email}</span>
                          <small>Compte #{user.id}</small>
                        </div>
                      </div>
                    </td>

                    <td>
                      <span className={`au-role-badge au-role-badge--${String(user.role).toLowerCase()}`}>
                        {roleName(user.role)}
                      </span>
                    </td>

                    <td>
                      <UserStatusBadge active={user.is_active} />
                    </td>

                    <td className="au-date-cell">
                      {formatDate(user.date_joined)}
                    </td>

                    <td className="au-date-cell">
                      {formatDate(user.last_login)}
                    </td>

                    <td>
                      <button
                        type="button"
                        className="au-view-button"
                        onClick={() => setSelectedUser(user)}
                      >
                        Voir le profil <span aria-hidden="true">→</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <footer className="au-pagination">
          <span>
            Page <strong>{page}</strong> sur <strong>{totalPages}</strong>
          </span>

          <div className="au-pagination__buttons">
            <button
              type="button"
              onClick={() => setPage((value) => Math.max(1, value - 1))}
              disabled={page <= 1 || loading}
            >
              ← Précédent
            </button>

            <button
              type="button"
              onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
              disabled={page >= totalPages || loading}
            >
              Suivant →
            </button>
          </div>
        </footer>
      </section>

      {selectedUser && (
        <div
          className="au-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setSelectedUser(null);
            }
          }}
        >
          <section
            className="au-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="au-modal-title"
          >
            <header className="au-modal__header">
              <div>
                <span className="au-section-kicker">FICHE UTILISATEUR</span>
                <h2 id="au-modal-title">Informations du compte</h2>
              </div>

              <button
                type="button"
                className="au-modal__close"
                onClick={() => setSelectedUser(null)}
                aria-label="Fermer la fiche"
              >
                ×
              </button>
            </header>

            <div className="au-profile">
              <span className="au-profile__avatar">
                {getInitials(selectedUser)}
              </span>

              <div>
                <h3>{selectedUser.full_name}</h3>
                <p>{selectedUser.email}</p>
                <UserStatusBadge active={selectedUser.is_active} />
              </div>
            </div>

            <div className="au-detail-grid">
              <div className="au-detail-item">
                <span>Identifiant</span>
                <strong>#{selectedUser.id}</strong>
              </div>

              <div className="au-detail-item">
                <span>Rôle</span>
                <strong>{roleName(selectedUser.role)}</strong>
              </div>

              <div className="au-detail-item">
                <span>Prénom</span>
                <strong>{selectedUser.first_name || "Non renseigné"}</strong>
              </div>

              <div className="au-detail-item">
                <span>Nom</span>
                <strong>{selectedUser.last_name || "Non renseigné"}</strong>
              </div>

              <div className="au-detail-item">
                <span>Date d'inscription</span>
                <strong>{formatDate(selectedUser.date_joined)}</strong>
              </div>

              <div className="au-detail-item">
                <span>Dernière connexion</span>
                <strong>{formatDate(selectedUser.last_login)}</strong>
              </div>
            </div>

            {selectedUser.is_superuser && (
              <div className="au-protected-note">
                Ce compte est un superutilisateur. Sa gestion est protégée et
                ne peut pas être effectuée depuis cette interface.
              </div>
            )}

            {currentUser?.id === selectedUser.id && (
              <div className="au-protected-note">
                Il s'agit de votre propre compte. Vous ne pouvez pas le
                désactiver depuis cette page.
              </div>
            )}

            <footer className="au-modal__footer">
              <button
                type="button"
                className="au-secondary-button"
                onClick={() => setSelectedUser(null)}
              >
                Fermer
              </button>

              <button
                type="button"
                className={
                  selectedUser.is_active
                    ? "au-danger-button"
                    : "au-primary-button"
                }
                disabled={
                  busyUserId === selectedUser.id ||
                  selectedUser.is_superuser ||
                  currentUser?.id === selectedUser.id
                }
                onClick={() => handleToggleStatus(selectedUser)}
              >
                {busyUserId === selectedUser.id
                  ? "Traitement..."
                  : selectedUser.is_active
                    ? "Désactiver le compte"
                    : "Réactiver le compte"}
              </button>
            </footer>
          </section>
        </div>
      )}
    </main>
  );
}
