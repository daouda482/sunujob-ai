
from django.urls import path

from .statistics_views import RecruiterStatisticsView
from .views import (
    JobListCreateView,
    JobDetailView,
    PublishedJobListView,
    PublishedJobDetailView,
)

urlpatterns = [
    # Consultation publique des offres
    path(
        "published/",
        PublishedJobListView.as_view(),
        name="published-job-list",
    ),
    path(
        "published/<int:pk>/",
        PublishedJobDetailView.as_view(),
        name="published-job-detail",
    ),

    # Gestion des offres par le recruteur connecté
    path(
        "",
        JobListCreateView.as_view(),
        name="job-list-create",
    ),
    path(
        "<int:pk>/",
        JobDetailView.as_view(),
        name="job-detail",
    ),

    # Statistiques du recruteur
    path(
        "recruiter/statistics/",
        RecruiterStatisticsView.as_view(),
        name="recruiter-statistics",
    ),
]
