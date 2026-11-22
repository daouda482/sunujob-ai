
from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path

from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

# ==================================================
# DIAGNOSTIC TEMPORAIRE DU STOCKAGE SUPABASE
# ==================================================

from config.storage_diagnostic import storage_diagnostic


# ==================================================
# PARAMÈTRES DE LA PLATEFORME
# ==================================================

from users.platform_settings_views import (
    AdminPlatformSettingsAPIView,
)


# ==================================================
# ADMINISTRATION SUNUJOB AI
# ==================================================

from users.admin_views import AdminDashboardAPIView

from users.admin_user_views import (
    AdminUserListAPIView,
    AdminUserStatusAPIView,
)

from users.admin_notification_views import (
    AdminNotificationListAPIView,
)

from users.admin_job_views import (
    AdminJobListAPIView,
    AdminJobStatusAPIView,
)

from users.admin_application_views import (
    AdminApplicationListAPIView,
    AdminApplicationStatusAPIView,
)

from users.admin_reports_views import (
    AdminReportsAPIView,
    AdminReportsExportAPIView,
)

from users.moderation_views import (
    ModerationReportCreateAPIView,
    AdminModerationReportListAPIView,
    AdminModerationReportStatusAPIView,
)

from users.verification_views import (
    RecruiterCompanyVerificationAPIView,
    AdminCompanyVerificationListAPIView,
    AdminCompanyVerificationDecisionAPIView,
    AdminCompanyVerificationDocumentAPIView,
)

from users.catalog_views import (
    AdminJobCategoryListCreateAPIView,
    AdminJobCategoryDetailAPIView,
    AdminPlatformSkillListCreateAPIView,
    AdminPlatformSkillDetailAPIView,
)

from users.support_views import (
    UserSupportTicketListCreateAPIView,
    UserSupportTicketDetailAPIView,
    UserSupportMessageCreateAPIView,
    AdminSupportTicketListAPIView,
    AdminSupportTicketDetailAPIView,
    AdminSupportMessageCreateAPIView,
    AdminSupportTicketUpdateAPIView,
)

from users.admin_audit_views import AdminAuditLogListAPIView
from users.admin_company_views import AdminCompanyListAPIView


# ==================================================
# ROUTES PRINCIPALES
# ==================================================

urlpatterns = [

    # Administration Django
    path("admin/", admin.site.urls),

    # ==================================================
    # DIAGNOSTIC TEMPORAIRE DU STOCKAGE SUPABASE
    # ==================================================

    path(
        "api/internal/storage-diagnostic/",
        storage_diagnostic,
        name="storage-diagnostic",
    ),

    # ==================================================
    # AUTHENTIFICATION JWT
    # ==================================================

    path(
        "api/token/",
        TokenObtainPairView.as_view(),
        name="token_obtain_pair",
    ),

    path(
        "api/token/refresh/",
        TokenRefreshView.as_view(),
        name="token_refresh",
    ),

    # Anciennes adresses conservées
    path(
        "api/auth/token/",
        TokenObtainPairView.as_view(),
        name="auth_token_obtain_pair",
    ),

    path(
        "api/auth/token/refresh/",
        TokenRefreshView.as_view(),
        name="auth_token_refresh",
    ),

    # ==================================================
    # UTILISATEURS ET CANDIDATS
    # ==================================================

    path(
        "api/users/",
        include("users.urls"),
    ),

    path(
        "api/candidates/",
        include("candidates.urls"),
    ),

    # ==================================================
    # ENTREPRISES ET OFFRES D'EMPLOI
    # ==================================================

    path(
        "api/companies/",
        include("companies.urls"),
    ),

    path(
        "api/jobs/",
        include("jobs.urls"),
    ),

    # ==================================================
    # CANDIDATURES ET ENTRETIENS
    # ==================================================

    path(
        "api/applications/",
        include("applications.urls"),
    ),

    path(
        "api/interviews/",
        include("interviews.urls"),
    ),

    path(
        "api/evaluations/",
        include("evaluations.urls"),
    ),

    # ==================================================
    # NOTIFICATIONS ET INTELLIGENCE ARTIFICIELLE
    # ==================================================

    path(
        "api/notifications/",
        include("notifications.urls"),
    ),

    path(
        "api/matching/",
        include("matching.urls"),
    ),

    path(
        "api/ai-coach/",
        include("ai_coach.urls"),
    ),

    path(
        "api/ai/",
        include("ai_engine.urls"),
    ),

    # ==================================================
    # ADMINISTRATION SUNUJOB AI
    # ==================================================

    path(
        "api/admin/dashboard/",
        AdminDashboardAPIView.as_view(),
        name="admin-dashboard",
    ),

    path(
        "api/admin/users/",
        AdminUserListAPIView.as_view(),
        name="admin-users",
    ),

    path(
        "api/admin/users/<int:pk>/status/",
        AdminUserStatusAPIView.as_view(),
        name="admin-user-status",
    ),

    path(
        "api/admin/companies/",
        AdminCompanyListAPIView.as_view(),
        name="admin-companies",
    ),

    path(
        "api/admin/jobs/",
        AdminJobListAPIView.as_view(),
        name="admin-jobs",
    ),

    path(
        "api/admin/jobs/<int:pk>/status/",
        AdminJobStatusAPIView.as_view(),
        name="admin-job-status",
    ),

    path(
        "api/favorites/",
        include("favorites.urls"),
    ),

    path(
        "api/job-alerts/",
        include("job_alerts.urls"),
    ),

    path(
        "api/admin/applications/",
        AdminApplicationListAPIView.as_view(),
        name="admin-applications",
    ),

    path(
        "api/admin/applications/<int:pk>/status/",
        AdminApplicationStatusAPIView.as_view(),
        name="admin-application-status",
    ),

    path(
        "api/admin/notifications/",
        AdminNotificationListAPIView.as_view(),
        name="admin-notifications",
    ),

    path(
        "api/admin/reports/",
        AdminReportsAPIView.as_view(),
        name="admin-reports",
    ),

    path(
        "api/admin/reports/export/",
        AdminReportsExportAPIView.as_view(),
        name="admin-reports-export",
    ),

    path(
        "api/admin/audit-logs/",
        AdminAuditLogListAPIView.as_view(),
        name="admin-audit-logs",
    ),

    # ==================================================
    # MODÉRATION
    # ==================================================

    path(
        "api/moderation/reports/",
        AdminModerationReportListAPIView.as_view(),
        name="admin-moderation-reports",
    ),

    path(
        "api/moderation/reports/<int:pk>/status/",
        AdminModerationReportStatusAPIView.as_view(),
        name="admin-moderation-report-status",
    ),

    path(
        "api/moderation/reports/create/",
        ModerationReportCreateAPIView.as_view(),
        name="moderation-report-create",
    ),

    # ==================================================
    # VÉRIFICATION DES ENTREPRISES
    # ==================================================

    path(
        "api/recruiter/company-verification/",
        RecruiterCompanyVerificationAPIView.as_view(),
        name="recruiter-company-verification",
    ),

    path(
        "api/admin/verifications/",
        AdminCompanyVerificationListAPIView.as_view(),
        name="admin-company-verifications",
    ),

    path(
        "api/admin/verifications/<int:pk>/decision/",
        AdminCompanyVerificationDecisionAPIView.as_view(),
        name="admin-company-verification-decision",
    ),

    path(
        "api/admin/verifications/<int:pk>/document/",
        AdminCompanyVerificationDocumentAPIView.as_view(),
        name="admin-company-verification-document",
    ),

    # ==================================================
    # CATALOGUE DE LA PLATEFORME
    # ==================================================

    path(
        "api/admin/catalog/categories/",
        AdminJobCategoryListCreateAPIView.as_view(),
        name="admin-catalog-categories",
    ),

    path(
        "api/admin/catalog/categories/<int:pk>/",
        AdminJobCategoryDetailAPIView.as_view(),
        name="admin-catalog-category-detail",
    ),

    path(
        "api/admin/catalog/skills/",
        AdminPlatformSkillListCreateAPIView.as_view(),
        name="admin-catalog-skills",
    ),

    path(
        "api/admin/catalog/skills/<int:pk>/",
        AdminPlatformSkillDetailAPIView.as_view(),
        name="admin-catalog-skill-detail",
    ),

    # ==================================================
    # SUPPORT UTILISATEURS
    # ==================================================

    path(
        "api/support/tickets/",
        UserSupportTicketListCreateAPIView.as_view(),
        name="support-ticket-list-create",
    ),

    path(
        "api/support/tickets/<int:pk>/",
        UserSupportTicketDetailAPIView.as_view(),
        name="support-ticket-detail",
    ),

    path(
        "api/support/tickets/<int:pk>/messages/",
        UserSupportMessageCreateAPIView.as_view(),
        name="support-ticket-message-create",
    ),

    path(
        "api/admin/support/tickets/",
        AdminSupportTicketListAPIView.as_view(),
        name="admin-support-ticket-list",
    ),

    path(
        "api/admin/support/tickets/<int:pk>/",
        AdminSupportTicketDetailAPIView.as_view(),
        name="admin-support-ticket-detail",
    ),

    path(
        "api/admin/support/tickets/<int:pk>/messages/",
        AdminSupportMessageCreateAPIView.as_view(),
        name="admin-support-ticket-message-create",
    ),

    path(
        "api/admin/support/tickets/<int:pk>/status/",
        AdminSupportTicketUpdateAPIView.as_view(),
        name="admin-support-ticket-update",
    ),

    # ==================================================
    # PARAMÈTRES DE LA PLATEFORME
    # ==================================================

    path(
        "api/admin/platform-settings/",
        AdminPlatformSettingsAPIView.as_view(),
        name="admin-platform-settings",
    ),

    # ==================================================
    # JOURNAUX D'AUDIT
    # ==================================================

    path(
        "api/audit-logs/",
        include("audit_logs.urls"),
    ),
]


# ==================================================
# FICHIERS MÉDIAS EN DÉVELOPPEMENT
# ==================================================

if settings.DEBUG:
    urlpatterns += static(
        settings.MEDIA_URL,
        document_root=settings.MEDIA_ROOT,
    )
