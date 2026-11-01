
from django.urls import path

from .views import (
    CandidateSessionDetailView,
    CandidateSessionListCreateView,
    CompleteSessionView,
    GenerateQuestionsView,
    SubmitAnswerView,
)


app_name = "ai_coach"


urlpatterns = [

    # Liste et création des séances
    path(
        "sessions/",
        CandidateSessionListCreateView.as_view(),
        name="session-list-create",
    ),

    # Détails d'une séance
    path(
        "sessions/<int:session_id>/",
        CandidateSessionDetailView.as_view(),
        name="session-detail",
    ),

    # Génération des questions par IA
    path(
        "sessions/<int:session_id>/generate/",
        GenerateQuestionsView.as_view(),
        name="generate-questions",
    ),

    # Soumission et évaluation des réponses
    path(
        "sessions/<int:session_id>/questions/<int:question_id>/answer/",
        SubmitAnswerView.as_view(),
        name="submit-answer",
    ),

    # Finalisation de la séance
    path(
        "sessions/<int:session_id>/complete/",
        CompleteSessionView.as_view(),
        name="complete-session",
    ),
]
