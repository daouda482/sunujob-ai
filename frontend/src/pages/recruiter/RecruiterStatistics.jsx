
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { NavLink } from "react-router-dom";
import {
  Activity,
  ArrowDownRight,
  ArrowLeft,
  ArrowUpRight,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Clock3,
  FileText,
  RefreshCw,
  TrendingUp,
  Users,
  XCircle,
  CircleHelp,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import api from "../../api/axios";
import "./RecruiterStatistics.css";

const STATUS_META = {
  PENDING: { label: "En attente", color: "#F59E0B" },
  REVIEWING: { label: "En cours d'étude", color: "#3B82F6" },
  SHORTLISTED: { label: "Présélectionnées", color: "#8B5CF6" },
  INTERVIEW: { label: "Entretien", color: "#06B6D4" },
  ACCEPTED: { label: "Acceptées", color: "#10B981" },
  REJECTED: { label: "Rejetées", color: "#EF4444" },
  WITHDRAWN: { label: "Retirées", color: "#94A3B8" },
};

const MONTHS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

const PERIOD_OPTIONS = [
  { value: "3", label: "3 derniers mois" },
  { value: "6", label: "6 derniers mois" },
  { value: "12", label: "12 derniers mois" },
];

function getErrorMessage(error) {
  const data = error?.response?.data;

  if (typeof data === "string") return data;
  if (data?.detail) return data.detail;
  if (data?.message) return data.message;

  if (data && typeof data === "object") {
    const firstValue = Object.values(data)[0];

    if (Array.isArray(firstValue)) return firstValue[0];
    if (typeof firstValue === "string") return firstValue;
  }

  if (error?.response?.status === 401) {
    return "Votre session a expiré. Veuillez vous reconnecter.";
  }

  if (error?.response?.status === 403) {
    return "Vous n'avez pas l'autorisation de consulter ces statistiques.";
  }

  return "Impossible de charger les statistiques. Vérifiez votre connexion et réessayez.";
}

function formatMonth(value) {
  if (!value || typeof value !== "string") return value || "";

  const parts = value.split("-");
  if (parts.length !== 2) return value;

  const year = Number(parts[0]);
  const month = Number(parts[1]);

  if (!year || month < 1 || month > 12) return value;

  return `${MONTHS[month - 1].slice(0, 3)} ${String(year).slice(-2)}`;
}

function formatNumber(value) {
  return new Intl.NumberFormat("fr-FR").format(Number(value) || 0);
}

function getPeriodData(data, period) {
  const count = Number(period) || 6;
  const now = new Date();
  const result = [];

  for (let offset = count - 1; offset >= 0; offset -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const found = data.find((item) => item.month === key);

    result.push({
      month: key,
      label: formatMonth(key),
      total: Number(found?.total) || 0,
    });
  }

  return result;
}

function MetricCard({
  title,
  value,
  description,
  icon: Icon,
  color,
  loading,
}) {
  return (
    <article className="rs-metric-card">
      <div className="rs-metric-top">
        <span className={`rs-metric-icon rs-icon-${color}`}>
          <Icon size={21} strokeWidth={2} />
        </span>
        <span className="rs-metric-decoration" aria-hidden="true">
          <TrendingUp size={16} />
        </span>
      </div>

      <p className="rs-metric-title">{title}</p>

      {loading ? (
        <div className="rs-skeleton rs-skeleton-number" />
      ) : (
        <div className="rs-metric-value">{formatNumber(value)}</div>
      )}

      <p className="rs-metric-description">{description}</p>
    </article>
  );
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rs-chart-tooltip">
      <p className="rs-tooltip-label">{label}</p>
      {payload.map((item) => (
        <div className="rs-tooltip-row" key={item.dataKey}>
          <span
            className="rs-tooltip-dot"
            style={{ backgroundColor: item.color || item.fill }}
          />
          <span>{item.name || "Candidatures"}</span>
          <strong>{formatNumber(item.value)}</strong>
        </div>
      ))}
    </div>
  );
}

function RecruiterSidebar() {
  const navigation = [
    { to: "/recruiter/dashboard", label: "Vue générale", icon: Activity },
    { to: "/recruiter/jobs", label: "Mes offres", icon: BriefcaseBusiness },
    { to: "/recruiter/applications", label: "Candidatures", icon: Users },
    { to: "/recruiter/interviews", label: "Entretiens", icon: CalendarDays },
    { to: "/recruiter/statistics", label: "Statistiques", icon: TrendingUp },
    { to: "/recruiter/company", label: "Mon entreprise", icon: FileText },
  ];

  const handleLogout = () => {
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    localStorage.removeItem("user");
    window.location.assign("/login");
  };

  return (
    <aside className="rs-sidebar">
      <NavLink to="/recruiter/dashboard" className="rs-brand">
        <span className="rs-brand-mark">S</span>
        <span>
          <strong>SunuJob</strong>
          <small>ESPACE RECRUTEUR</small>
        </span>
      </NavLink>

      <div className="rs-sidebar-caption">MENU PRINCIPAL</div>

      <nav className="rs-side-nav" aria-label="Navigation recruteur">
        {navigation.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/recruiter/dashboard"}
            className={({ isActive }) =>
              `rs-nav-link${isActive ? " active" : ""}`
            }
          >
            <Icon size={19} />
            <span>{label}</span>
            {to === "/recruiter/statistics" && (
              <span className="rs-nav-current" aria-label="Page actuelle" />
            )}
          </NavLink>
        ))}
      </nav>

      <div className="rs-sidebar-bottom">
        <div className="rs-help-card">
          <span className="rs-help-icon"><CircleHelp size={19} /></span>
          <strong>Besoin d'aide ?</strong>
          <p>Consultez vos données et suivez vos performances de recrutement.</p>
        </div>
        <button className="rs-logout-button" onClick={handleLogout}>
          <ArrowLeft size={18} />
          <span>Se déconnecter</span>
        </button>
      </div>
    </aside>
  );
}

export default function RecruiterStatistics() {
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [period, setPeriod] = useState("6");

  const loadStatistics = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");

    try {
      const response = await api.get("jobs/recruiter/statistics/");
      const data = response?.data;

      if (!data || typeof data !== "object" || !data.overview) {
        throw new Error("La réponse du serveur ne contient pas les statistiques attendues.");
      }

      setStatistics({
        overview: data.overview || {},
        application_statuses: Array.isArray(data.application_statuses)
          ? data.application_statuses
          : [],
        monthly_applications: Array.isArray(data.monthly_applications)
          ? data.monthly_applications
          : [],
      });
    } catch (err) {
      console.error("Erreur de chargement des statistiques :", err);
      setError(
        err.message?.includes("ne contient pas")
          ? err.message
          : getErrorMessage(err)
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadStatistics();
  }, [loadStatistics]);

  const overview = statistics?.overview || {};

  const monthlyData = useMemo(
    () => getPeriodData(statistics?.monthly_applications || [], period),
    [statistics, period]
  );

  const statusData = useMemo(() => {
    return (statistics?.application_statuses || []).map((item) => {
      const meta = STATUS_META[item.status] || {
        label: item.label || item.status,
        color: "#94A3B8",
      };

      return {
        status: item.status,
        name: item.label || meta.label,
        value: Number(item.total) || 0,
        color: meta.color,
      };
    });
  }, [statistics]);

  const totalStatusApplications = statusData.reduce(
    (sum, item) => sum + item.value,
    0
  );

  const maxMonthly = Math.max(
    1,
    ...monthlyData.map((item) => item.total)
  );

  const acceptanceRate =
    Number(overview.total_applications) > 0
      ? Math.round(
          (Number(overview.accepted_applications || 0) /
            Number(overview.total_applications)) *
            100
        )
      : 0;

  return (
    <div className="rs-layout">
      <RecruiterSidebar />

      <main className="rs-main">
        <header className="rs-header">
          <div className="rs-header-breadcrumb">
            <span>Espace recruteur</span>
            <span className="rs-breadcrumb-separator">/</span>
            <strong>Statistiques</strong>
          </div>

          <div className="rs-header-right">
            <span className="rs-header-status">
              <span className="rs-status-dot" />
              Tableau de bord analytique
            </span>
            <button
              className="rs-refresh-button"
              onClick={() => loadStatistics(true)}
              disabled={loading || refreshing}
              title="Actualiser les statistiques"
            >
              <RefreshCw
                size={17}
                className={refreshing ? "rs-spinning" : ""}
              />
              <span>Actualiser</span>
            </button>
          </div>
        </header>

        <section className="rs-content">
          <div className="rs-page-heading">
            <div>
              <div className="rs-eyebrow">
                <span className="rs-eyebrow-line" />
                PILOTAGE DU RECRUTEMENT
              </div>
              <h1>Statistiques &amp; rapports</h1>
              <p>
                Visualisez vos performances et suivez l'évolution de vos
                recrutements en un seul endroit.
              </p>
            </div>

            <div className="rs-heading-period">
              <CalendarDays size={18} />
              <span>Vue d'ensemble</span>
            </div>
          </div>

          {error && (
            <div className="rs-error-banner" role="alert">
              <div className="rs-error-icon"><XCircle size={21} /></div>
              <div className="rs-error-content">
                <strong>Impossible de charger les statistiques</strong>
                <p>{error}</p>
              </div>
              <button
                className="rs-error-retry"
                onClick={() => loadStatistics()}
              >
                Réessayer
              </button>
            </div>
          )}

          <div className="rs-section-heading">
            <div>
              <h2>Indicateurs clés</h2>
              <p>Résumé global de votre activité de recrutement</p>
            </div>
            <span className="rs-live-label">
              <span /> Données de votre compte
            </span>
          </div>

          <div className="rs-metrics-grid">
            <MetricCard
              title="Offres publiées"
              value={overview.published_jobs}
              description={`${formatNumber(overview.total_jobs)} offres au total`}
              icon={BriefcaseBusiness}
              color="blue"
              loading={loading}
            />
            <MetricCard
              title="Candidatures reçues"
              value={overview.total_applications}
              description="Toutes vos offres confondues"
              icon={Users}
              color="violet"
              loading={loading}
            />
            <MetricCard
              title="Entretiens programmés"
              value={overview.scheduled_interviews}
              description={`${formatNumber(overview.total_interviews)} entretiens au total`}
              icon={CalendarDays}
              color="cyan"
              loading={loading}
            />
            <MetricCard
              title="Candidatures acceptées"
              value={overview.accepted_applications}
              description={`${acceptanceRate}% des candidatures reçues`}
              icon={CheckCircle2}
              color="green"
              loading={loading}
            />
          </div>

          <div className="rs-section-heading rs-second-heading">
            <div>
              <h2>Analyse de l'activité</h2>
              <p>Comprenez les tendances et la progression de vos recrutements</p>
            </div>
          </div>

          <div className="rs-charts-grid">
            <section className="rs-panel rs-trend-panel">
              <div className="rs-panel-header">
                <div>
                  <h3>Évolution des candidatures</h3>
                  <p>Nombre de candidatures reçues par mois</p>
                </div>

                <label className="rs-period-select">
                  <span className="rs-visually-hidden">Période du graphique</span>
                  <select
                    value={period}
                    onChange={(event) => setPeriod(event.target.value)}
                  >
                    {PERIOD_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={15} />
                </label>
              </div>

              <div className="rs-chart-legend">
                <span className="rs-legend-dot rs-legend-blue" />
                Candidatures
              </div>

              <div className="rs-trend-chart">
                {loading ? (
                  <div className="rs-chart-loading">
                    <span className="rs-loader" />
                    Chargement du graphique…
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={monthlyData}
                      margin={{ top: 12, right: 8, left: -20, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="rsAreaGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#3867F4" stopOpacity={0.22} />
                          <stop offset="95%" stopColor="#3867F4" stopOpacity={0.01} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        stroke="#EDF0F6"
                        strokeDasharray="4 5"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="label"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "#8791A5", fontSize: 11 }}
                        dy={10}
                      />
                      <YAxis
                        allowDecimals={false}
                        domain={[0, "auto"]}
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "#8791A5", fontSize: 11 }}
                      />
                      <Tooltip content={<ChartTooltip />} />
                      <Area
                        type="monotone"
                        dataKey="total"
                        name="Candidatures"
                        stroke="#3867F4"
                        strokeWidth={3}
                        fill="url(#rsAreaGradient)"
                        activeDot={{ r: 5, strokeWidth: 0 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>

              <div className="rs-chart-footnote">
                <Activity size={15} />
                <span>
                  {monthlyData.reduce((sum, item) => sum + item.total, 0)}{" "}
                  candidatures sur la période affichée
                </span>
              </div>
            </section>

            <section className="rs-panel rs-status-panel">
              <div className="rs-panel-header">
                <div>
                  <h3>Répartition des candidatures</h3>
                  <p>Vue globale par statut</p>
                </div>
                <span className="rs-panel-icon"><Users size={18} /></span>
              </div>

              <div className="rs-donut-wrap">
                {loading ? (
                  <div className="rs-chart-loading">
                    <span className="rs-loader" />
                    Chargement…
                  </div>
                ) : totalStatusApplications === 0 ? (
                  <div className="rs-empty-chart">
                    <Users size={28} />
                    <strong>Aucune candidature</strong>
                    <span>Les données apparaîtront ici.</span>
                  </div>
                ) : (
                  <>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={statusData.filter((item) => item.value > 0)}
                          dataKey="value"
                          nameKey="name"
                          innerRadius="64%"
                          outerRadius="88%"
                          paddingAngle={3}
                          stroke="none"
                        >
                          {statusData
                            .filter((item) => item.value > 0)
                            .map((item) => (
                              <Cell key={item.status} fill={item.color} />
                            ))}
                        </Pie>
                        <Tooltip content={<ChartTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>

                    <div className="rs-donut-center">
                      <strong>{formatNumber(totalStatusApplications)}</strong>
                      <span>Candidatures</span>
                    </div>
                  </>
                )}
              </div>

              <div className="rs-status-legend">
                {statusData.map((item) => {
                  const percentage = totalStatusApplications
                    ? Math.round((item.value / totalStatusApplications) * 100)
                    : 0;

                  return (
                    <div className="rs-status-row" key={item.status}>
                      <span
                        className="rs-status-color"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="rs-status-name">{item.name}</span>
                      <span className="rs-status-percent">{percentage}%</span>
                      <strong>{formatNumber(item.value)}</strong>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>

          <div className="rs-lower-grid">
            <section className="rs-panel rs-bars-panel">
              <div className="rs-panel-header">
                <div>
                  <h3>Volume des candidatures</h3>
                  <p>Comparaison mensuelle sur la période choisie</p>
                </div>
                <span className="rs-panel-icon"><TrendingUp size={18} /></span>
              </div>

              <div className="rs-bars-chart">
                {loading ? (
                  <div className="rs-chart-loading">
                    <span className="rs-loader" />
                    Chargement…
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={monthlyData}
                      margin={{ top: 12, right: 8, left: -20, bottom: 0 }}
                    >
                      <CartesianGrid
                        stroke="#EDF0F6"
                        strokeDasharray="4 5"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="label"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "#8791A5", fontSize: 11 }}
                        dy={8}
                      />
                      <YAxis
                        allowDecimals={false}
                        domain={[0, "auto"]}
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "#8791A5", fontSize: 11 }}
                      />
                      <Tooltip content={<ChartTooltip />} />
                      <Bar
                        dataKey="total"
                        name="Candidatures"
                        fill="#3867F4"
                        radius={[6, 6, 0, 0]}
                        maxBarSize={38}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </section>

            <section className="rs-panel rs-summary-panel">
              <div className="rs-panel-header">
                <div>
                  <h3>Résumé du recrutement</h3>
                  <p>État actuel de votre activité</p>
                </div>
                <span className="rs-panel-icon"><FileText size={18} /></span>
              </div>

              <div className="rs-summary-list">
                <div className="rs-summary-item">
                  <span className="rs-summary-icon rs-summary-blue">
                    <BriefcaseBusiness size={18} />
                  </span>
                  <div className="rs-summary-copy">
                    <strong>Offres en brouillon</strong>
                    <span>Pas encore publiées</span>
                  </div>
                  <strong className="rs-summary-value">
                    {loading ? "—" : formatNumber(overview.draft_jobs)}
                  </strong>
                </div>

                <div className="rs-summary-item">
                  <span className="rs-summary-icon rs-summary-orange">
                    <Clock3 size={18} />
                  </span>
                  <div className="rs-summary-copy">
                    <strong>Entretiens terminés</strong>
                    <span>Entretiens clôturés</span>
                  </div>
                  <strong className="rs-summary-value">
                    {loading ? "—" : formatNumber(overview.completed_interviews)}
                  </strong>
                </div>

                <div className="rs-summary-item">
                  <span className="rs-summary-icon rs-summary-green">
                    <CheckCircle2 size={18} />
                  </span>
                  <div className="rs-summary-copy">
                    <strong>Recrutements acceptés</strong>
                    <span>Candidatures acceptées</span>
                  </div>
                  <strong className="rs-summary-value">
                    {loading ? "—" : formatNumber(overview.accepted_applications)}
                  </strong>
                </div>

                <div className="rs-summary-item">
                  <span className="rs-summary-icon rs-summary-red">
                    <XCircle size={18} />
                  </span>
                  <div className="rs-summary-copy">
                    <strong>Offres fermées</strong>
                    <span>Offres non actives</span>
                  </div>
                  <strong className="rs-summary-value">
                    {loading ? "—" : formatNumber(overview.closed_jobs)}
                  </strong>
                </div>
              </div>

              <div className="rs-summary-footer">
                <span className="rs-summary-footer-icon"><TrendingUp size={17} /></span>
                <div>
                  <strong>{acceptanceRate}% de taux d'acceptation</strong>
                  <p>
                    Part des candidatures acceptées parmi toutes les candidatures reçues.
                  </p>
                </div>
              </div>
            </section>
          </div>

          <footer className="rs-page-footer">
            <span>© {new Date().getFullYear()} SunuJob AI</span>
            <span>Conçu au Sénégal <span aria-label="drapeau du Sénégal">🇸🇳</span></span>
          </footer>
        </section>
      </main>
    </div>
  );
}
