from django.urls import path

from .views import (
    JobAlertListCreateView,
    JobAlertDetailView,
)

urlpatterns = [
    path("", JobAlertListCreateView.as_view(), name="job-alert-list-create"),
    path("<int:pk>/", JobAlertDetailView.as_view(), name="job-alert-detail"),
]