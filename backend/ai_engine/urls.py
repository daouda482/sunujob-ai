
from django.urls import path

from .views import CVAnalysisAPIView

urlpatterns = [
    path(
        "analyze-cv/",
        CVAnalysisAPIView.as_view(),
        name="analyze-cv"
    ),
]
