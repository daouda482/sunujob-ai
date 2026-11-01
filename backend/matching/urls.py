
from django.urls import path

from .views import RecommendedJobsView
from .cv_views import AnalyzeCVView

urlpatterns = [
    path(
        "recommended-jobs/",
        RecommendedJobsView.as_view(),
        name="recommended-jobs",
    ),
    path(
        "analyze-cv/",
        AnalyzeCVView.as_view(),
        name="analyze-cv",
    ),
]
