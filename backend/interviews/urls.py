
from django.urls import path

from interviews.views import (
    RecruiterInterviewListCreateView,
    RecruiterInterviewDetailView,
    CandidateInterviewListView,
    CandidateInterviewDetailView,
)

urlpatterns = [
    path(
        "recruiter/",
        RecruiterInterviewListCreateView.as_view(),
        name="recruiter-interviews",
    ),
    path(
        "recruiter/<int:pk>/",
        RecruiterInterviewDetailView.as_view(),
        name="recruiter-interview-detail",
    ),
    path(
        "candidate/",
        CandidateInterviewListView.as_view(),
        name="candidate-interviews",
    ),
    path(
        "candidate/<int:pk>/",
        CandidateInterviewDetailView.as_view(),
        name="candidate-interview-detail",
    ),
]
