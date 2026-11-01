from django.urls import path
from .views import RegisterView
from .views import (
    RegisterView,
    ProfileView,
    LogoutView,
    CandidateOnlyView,
    RecruiterOnlyView,
    TrainingProviderOnlyView,
    AdminOnlyView,
)


urlpatterns = [
    path(
        "register/",
        RegisterView.as_view(),
        name="register"
    ),

    path(
        "profile/",
        ProfileView.as_view(),
        name="profile"
    ),

    path(
        "logout/",
        LogoutView.as_view(),
        name="logout"
    ),

    path(
        "candidate/",
        CandidateOnlyView.as_view(),
        name="candidate-only"
    ),

    path(
        "recruiter/",
        RecruiterOnlyView.as_view(),
        name="recruiter-only"
    ),

    path(
        "training-provider/",
        TrainingProviderOnlyView.as_view(),
        name="training-provider-only"
    ),

    path(
        "admin-only/",
        AdminOnlyView.as_view(),
        name="admin-only"
    ),
]