
import React, { Component } from "react";
import { Routes, Route, useLocation } from "react-router-dom";

// =====================================================
// COMPOSANTS COMMUNS
// =====================================================

import Navbar from "./components/Navbar.jsx";
import Footer from "./components/Footer.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";

// =====================================================
// PAGES PUBLIQUES
// =====================================================

import Home from "./pages/Home.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import ComingSoon from "./pages/ComingSoon.jsx";

// =====================================================
// PAGES CANDIDAT
// =====================================================

import CandidateDashboard from "./pages/CandidateDashboard.jsx";
import CandidateProfile from "./pages/CandidateProfile.jsx";
import Applications from "./pages/candidate/Applications.jsx";
import ApplicationSuccess from "./pages/ApplicationSuccess.jsx";
import MyApplications from "./pages/MyApplications.jsx";
import Interviews from "./pages/candidate/Interviews.jsx";
import Recommendations from "./pages/candidate/Recommendations.jsx";
import CVAnalysis from "./pages/candidate/CVAnalysis.jsx";
import AICoach from "./pages/candidate/AICoach.jsx";
import CandidateCV from "./pages/candidate/CandidateCV.jsx";

// =====================================================
// PAGES EMPLOI
// =====================================================

import Jobs from "./pages/Jobs.jsx";
import JobDetails from "./pages/JobDetails.jsx";
import Apply from "./pages/Apply.jsx";
import NotificationsPage from "./pages/NotificationsPage.jsx";

// =====================================================
// PAGES RECRUTEUR
// =====================================================

import RecruiterDashboard from "./pages/recruiter/RecruiterDashboard.jsx";
import RecruiterJobs from "./pages/recruiter/RecruiterJobs.jsx";
import RecruiterJobForm from "./pages/recruiter/RecruiterJobForm.jsx";
import RecruiterApplications from "./pages/recruiter/RecruiterApplications.jsx";
import RecruiterInterviews from "./pages/recruiter/RecruiterInterviews.jsx";
import RecruiterCompanies from "./pages/recruiter/RecruiterCompanies.jsx";
import RecruiterStatistics from "./pages/recruiter/RecruiterStatistics.jsx";
import CompanyVerification from "./pages/recruiter/CompanyVerification.jsx";

// =====================================================
// PAGES ADMINISTRATEUR
// =====================================================

import AdminDashboard from "./pages/admin/AdminDashboard.jsx";
import AdminUsers from "./pages/admin/AdminUsers.jsx";
import AdminCompanies from "./pages/admin/AdminCompanies.jsx";
import AdminJobs from "./pages/admin/AdminJobs.jsx";
import AdminApplications from "./pages/admin/AdminApplications.jsx";
import AdminNotifications from "./pages/admin/AdminNotifications.jsx";
import AdminNavigation from "./pages/admin/AdminNavigation.jsx";
import AdminReports from "./pages/admin/AdminReports.jsx";
import AdminAuditLogs from "./pages/admin/AdminAuditLogs.jsx";
import AdminModeration from "./pages/admin/AdminModeration.jsx";
import AdminVerifications from "./pages/admin/AdminVerifications.jsx";
import AdminCatalog from "./pages/admin/AdminCatalog.jsx";
import AdminSupport from "./pages/admin/AdminSupport.jsx";

// =====================================================
// SUPPORT
// =====================================================

import SupportCenter from "./pages/support/SupportCenter.jsx";

// =====================================================
// GESTION DES ERREURS REACT
// =====================================================

class AppErrorBoundary extends Component {
  constructor(props) {
    super(props);

    this.state = {
      hasError: false,
      message: "",
    };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      message: error?.message || "Erreur inconnue",
    };
  }

  componentDidCatch(error, info) {
    console.error(
      "Erreur React dans SunuJob AI :",
      error,
      info
    );
  }

  render() {
    if (this.state.hasError) {
      return (
        <main
          style={{
            maxWidth: "800px",
            margin: "60px auto",
            padding: "24px",
            fontFamily: "Arial, sans-serif",
          }}
        >
          <h1>Une erreur empêche l'affichage</h1>

          <p>
            Un composant de SunuJob AI a rencontré une erreur.
          </p>

          <pre
            style={{
              padding: "16px",
              background: "#fff0f0",
              color: "#9b1c1c",
              whiteSpace: "pre-wrap",
              overflowWrap: "anywhere",
            }}
          >
            {this.state.message}
          </pre>

          <button onClick={() => window.location.reload()}>
            Recharger l'application
          </button>
        </main>
      );
    }

    return this.props.children;
  }
}

// =====================================================
// GESTION DES ROUTES DE L'APPLICATION
// =====================================================

function AppRoutes() {
  const location = useLocation();

  const isRecruiterPage =
    location.pathname.startsWith("/recruiter");

  const isAdminPage =
    location.pathname.startsWith("/admin");

  const isCandidateDashboardPage =
    location.pathname.replace(/\/+$/, "") ===
    "/candidate/dashboard";

  const showPublicLayout =
    !isRecruiterPage &&
    !isAdminPage &&
    !isCandidateDashboardPage;

  return (
    <>
      {/* Navigation publique */}
      {showPublicLayout && <Navbar />}

      {/* Navigation administrateur */}
      {isAdminPage && <AdminNavigation />}

      <Routes>
        {/* =========================================
            PAGES PUBLIQUES
        ========================================= */}

        <Route path="/" element={<Home />} />

        <Route path="/login" element={<Login />} />

        <Route path="/register" element={<Register />} />

        <Route path="/jobs" element={<Jobs />} />

        <Route path="/jobs/:id" element={<JobDetails />} />

        <Route
          path="/notifications"
          element={<NotificationsPage />}
        />

        {/* =========================================
            ESPACE CANDIDAT
        ========================================= */}

        <Route
          element={
            <ProtectedRoute allowedRoles={["CANDIDATE"]} />
          }
        >
          <Route
            path="/candidate/dashboard"
            element={<CandidateDashboard />}
          />

          <Route
            path="/candidate/profile"
            element={<CandidateProfile />}
          />
          {/* Gestion du CV du candidat */}
          <Route
            path="/candidate/cv"
            element={<CandidateCV />}
          />

          <Route
            path="/candidate/applications"
            element={<Applications />}
          />

          <Route
            path="/application-success"
            element={<ApplicationSuccess />}
          />

          <Route
            path="/my-applications"
            element={<MyApplications />}
          />

          <Route
            path="/candidate/notifications"
            element={<NotificationsPage />}
          />

          <Route
            path="/candidate/recommendations"
            element={<Recommendations />}
          />

          <Route
            path="/candidate/interviews"
            element={<Interviews />}
          />

          {/* Coach carrière IA */}
          <Route
            path="/candidate/ai-coach"
            element={<AICoach />}
          />

          {/* Analyse de CV */}
          <Route
            path="/candidate/cv-analysis"
            element={<CVAnalysis />}
          />

          {/* Formulaire de candidature */}
          <Route
            path="/jobs/:id/apply"
            element={<Apply />}
          />
        </Route>

        {/* =========================================
            ESPACE RECRUTEUR
        ========================================= */}

        <Route
          element={
            <ProtectedRoute allowedRoles={["RECRUITER"]} />
          }
        >
          <Route
            path="/recruiter/dashboard"
            element={<RecruiterDashboard />}
          />

          <Route
            path="/recruiter/jobs"
            element={<RecruiterJobs />}
          />

          <Route
            path="/recruiter/jobs/new"
            element={<RecruiterJobForm />}
          />

          <Route
            path="/recruiter/jobs/:id/edit"
            element={<RecruiterJobForm />}
          />

          <Route
            path="/recruiter/applications"
            element={<RecruiterApplications />}
          />

          <Route
            path="/recruiter/statistics"
            element={<RecruiterStatistics />}
          />

          <Route
            path="/recruiter/interviews"
            element={<RecruiterInterviews />}
          />

          <Route
            path="/recruiter/company"
            element={<RecruiterCompanies />}
          />

          <Route
            path="/recruiter/company-verification"
            element={<CompanyVerification />}
          />
        </Route>

        {/* =========================================
            ESPACE ORGANISME DE FORMATION
        ========================================= */}

        <Route
          element={
            <ProtectedRoute
              allowedRoles={["TRAINING_PROVIDER"]}
            />
          }
        >
          <Route
            path="/training-provider/dashboard"
            element={
              <ComingSoon title="Espace organisme de formation" />
            }
          />
        </Route>

        {/* =========================================
            CENTRE DE SUPPORT
        ========================================= */}

        <Route
          element={
            <ProtectedRoute
              allowedRoles={["CANDIDATE", "RECRUITER"]}
            />
          }
        >
          <Route
            path="/support"
            element={<SupportCenter />}
          />
        </Route>

        {/* =========================================
            ESPACE ADMINISTRATEUR
        ========================================= */}

        <Route
          element={
            <ProtectedRoute allowedRoles={["ADMIN"]} />
          }
        >
          <Route
            path="/admin"
            element={<AdminDashboard />}
          />

          <Route
            path="/admin/dashboard"
            element={<AdminDashboard />}
          />

          <Route
            path="/admin/users"
            element={<AdminUsers />}
          />

          <Route
            path="/admin/companies"
            element={<AdminCompanies />}
          />

          <Route
            path="/admin/jobs"
            element={<AdminJobs />}
          />

          <Route
            path="/admin/applications"
            element={<AdminApplications />}
          />

          <Route
            path="/admin/notifications"
            element={<AdminNotifications />}
          />

          <Route
            path="/admin/reports"
            element={<AdminReports />}
          />

          <Route
            path="/admin/audit-logs"
            element={<AdminAuditLogs />}
          />

          <Route
            path="/admin/moderation"
            element={<AdminModeration />}
          />

          <Route
            path="/admin/verifications"
            element={<AdminVerifications />}
          />

          <Route
            path="/admin/catalog"
            element={<AdminCatalog />}
          />

          <Route
            path="/admin/support"
            element={<AdminSupport />}
          />
        </Route>

        {/* =========================================
            ROUTE INCONNUE
        ========================================= */}

        <Route
          path="*"
          element={<ComingSoon title="Page introuvable" />}
        />
      </Routes>

      {/* Pied de page public */}
      {showPublicLayout && <Footer />}
    </>
  );
}

// =====================================================
// COMPOSANT PRINCIPAL
// =====================================================

export default function App() {
  return (
    <AppErrorBoundary>
      <AppRoutes />
    </AppErrorBoundary>
  );
}
