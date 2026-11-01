
from django.urls import path

from .views import (
    CandidateProfileCreateView,
    CandidateProfileDetailView,
)

from .cv_views import (
    CandidateCVView,
    CandidateCVDownloadView,
    CandidateCVAnalysisView,
    CandidateCVAnalysisHistoryView,
)


urlpatterns = [
    # =========================================
    # PROFIL CANDIDAT
    # =========================================

    path(
        "profile/",
        CandidateProfileCreateView.as_view(),
        name="candidate-profile-create",
    ),

    path(
        "profile/me/",
        CandidateProfileDetailView.as_view(),
        name="candidate-profile-detail",
    ),

    # =========================================
    # GESTION DU CV
    # =========================================

    path(
        "profile/me/cv/",
        CandidateCVView.as_view(),
        name="candidate-cv",
    ),

    path(
        "profile/me/cv/download/",
        CandidateCVDownloadView.as_view(),
        name="candidate-cv-download",
    ),

    # =========================================
    # ANALYSE DU CV PAR IA
    # =========================================

    path(
        "cv-analysis/",
        CandidateCVAnalysisView.as_view(),
        name="candidate-cv-analysis",
    ),

    path(
        "cv-analysis/history/",
        CandidateCVAnalysisHistoryView.as_view(),
        name="candidate-cv-analysis-history",
    ),
]
