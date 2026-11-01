
import logging

from django.db import transaction
from django.shortcuts import get_object_or_404

from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import CoachingQuestion, CoachingSession
from .permissions import IsCandidate
from .serializers import CoachingSessionSerializer

from .services import (
    DEMO_MODE,
    AICoachError,
    evaluate_answer,
    generate_questions,
)


logger = logging.getLogger(__name__)


def get_mode():
    return "DEMO" if DEMO_MODE else "OLLAMA"


# =====================================================
# SESSIONS DE PRÉPARATION AUX ENTRETIENS
# =====================================================

class CandidateSessionListCreateView(APIView):

    permission_classes = [IsAuthenticated, IsCandidate]

    def get(self, request):

        sessions = (
            CoachingSession.objects
            .filter(candidate=request.user)
            .prefetch_related("questions")
        )

        serializer = CoachingSessionSerializer(
            sessions,
            many=True,
        )

        return Response({
            "success": True,
            "results": serializer.data,
        })

    def post(self, request):

        serializer = CoachingSessionSerializer(
            data=request.data
        )

        serializer.is_valid(raise_exception=True)

        session = serializer.save(
            candidate=request.user
        )

        return Response(
            {
                "success": True,
                "detail": "Votre séance de préparation a été créée.",
                "session": CoachingSessionSerializer(session).data,
            },
            status=status.HTTP_201_CREATED,
        )


# =====================================================
# DÉTAIL D'UNE SESSION
# =====================================================

class CandidateSessionDetailView(APIView):

    permission_classes = [IsAuthenticated, IsCandidate]

    def get_session(self, request, session_id):

        return get_object_or_404(
            CoachingSession.objects.prefetch_related("questions"),
            id=session_id,
            candidate=request.user,
        )

    def get(self, request, session_id):

        session = self.get_session(
            request,
            session_id,
        )

        serializer = CoachingSessionSerializer(session)

        return Response({
            "success": True,
            "session": serializer.data,
        })


# =====================================================
# GÉNÉRATION DES QUESTIONS AVEC L'IA
# =====================================================

class GenerateQuestionsView(APIView):

    permission_classes = [IsAuthenticated, IsCandidate]

    def post(self, request, session_id):

        session = get_object_or_404(
            CoachingSession,
            id=session_id,
            candidate=request.user,
        )

        if session.status == CoachingSession.Status.COMPLETED:

            return Response(
                {
                    "success": False,
                    "detail": "Cette séance est déjà terminée.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Éviter de générer plusieurs fois les mêmes questions.
        if session.questions.exists():

            session.refresh_from_db()

            return Response(
                {
                    "success": True,
                    "detail": "Les questions de cette séance existent déjà.",
                    "mode": get_mode(),
                    "session": CoachingSessionSerializer(session).data,
                },
                status=status.HTTP_200_OK,
            )

        try:

            questions = generate_questions(
                job_title=session.job_title,
                interview_type=session.interview_type,
                experience_level=session.experience_level,
            )

            if not questions:

                return Response(
                    {
                        "success": False,
                        "detail": "Aucune question n'a été générée.",
                    },
                    status=status.HTTP_503_SERVICE_UNAVAILABLE,
                )

            # Vérifier les questions générées.
            valid_questions = []

            for index, item in enumerate(questions, start=1):

                if not isinstance(item, dict):
                    continue

                question_text = item.get("question_text", "")

                if not isinstance(question_text, str):
                    continue

                question_text = question_text.strip()

                if not question_text:
                    continue

                position = item.get("position", index)

                if not isinstance(position, int) or position < 1:
                    position = index

                valid_questions.append(
                    CoachingQuestion(
                        session=session,
                        question_text=question_text,
                        position=position,
                    )
                )

            if not valid_questions:

                return Response(
                    {
                        "success": False,
                        "detail": "Le moteur IA n'a retourné aucune question valide.",
                    },
                    status=status.HTTP_503_SERVICE_UNAVAILABLE,
                )

            with transaction.atomic():

                CoachingQuestion.objects.bulk_create(
                    valid_questions
                )

            session.refresh_from_db()

            return Response(
                {
                    "success": True,
                    "detail": "Questions générées avec succès.",
                    "mode": get_mode(),
                    "total_questions": len(valid_questions),
                    "session": CoachingSessionSerializer(session).data,
                },
                status=status.HTTP_201_CREATED,
            )

        except AICoachError as exc:

            logger.warning(
                "Erreur IA pendant la génération des questions : %s",
                exc,
            )

            return Response(
                {
                    "success": False,
                    "detail": str(exc),
                    "mode": get_mode(),
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        except Exception:

            logger.exception(
                "Erreur interne pendant la génération des questions."
            )

            return Response(
                {
                    "success": False,
                    "detail": (
                        "Une erreur interne est survenue "
                        "pendant la génération des questions."
                    ),
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


# =====================================================
# ÉVALUATION DES RÉPONSES AVEC L'IA
# =====================================================

class SubmitAnswerView(APIView):

    permission_classes = [IsAuthenticated, IsCandidate]

    def post(self, request, session_id, question_id):

        session = get_object_or_404(
            CoachingSession,
            id=session_id,
            candidate=request.user,
        )

        if session.status == CoachingSession.Status.COMPLETED:

            return Response(
                {
                    "success": False,
                    "detail": "Cette séance est déjà terminée.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        question = get_object_or_404(
            CoachingQuestion,
            id=question_id,
            session=session,
        )

        answer = request.data.get("answer", "")

        if not isinstance(answer, str) or not answer.strip():

            return Response(
                {
                    "success": False,
                    "detail": "Veuillez saisir une réponse avant de continuer.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        answer = answer.strip()

        if len(answer) > 10000:

            return Response(
                {
                    "success": False,
                    "detail": "Votre réponse ne doit pas dépasser 10 000 caractères.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:

            evaluation = evaluate_answer(
                question_text=question.question_text,
                candidate_answer=answer,
                job_title=session.job_title,
            )

            if not isinstance(evaluation, dict):
                raise AICoachError(
                    "Le moteur IA a retourné un résultat invalide."
                )

            feedback = evaluation.get("feedback", "")
            score = evaluation.get("score")

            if not isinstance(feedback, str) or not feedback.strip():
                raise AICoachError(
                    "Le moteur IA n'a pas retourné de commentaire valide."
                )

            if (
                not isinstance(score, int)
                or isinstance(score, bool)
                or not 0 <= score <= 100
            ):
                raise AICoachError(
                    "Le score retourné par le moteur IA est invalide."
                )

            strengths = evaluation.get("strengths", [])
            improvements = evaluation.get("improvements", [])
            suggested_answer = evaluation.get("suggested_answer", "")

            if not isinstance(strengths, list):
                strengths = []

            if not isinstance(improvements, list):
                improvements = []

            if not isinstance(suggested_answer, str):
                suggested_answer = ""

            # Nettoyage des listes retournées par l'IA.
            strengths = [
                item.strip()
                for item in strengths
                if isinstance(item, str) and item.strip()
            ]

            improvements = [
                item.strip()
                for item in improvements
                if isinstance(item, str) and item.strip()
            ]

            # Sauvegarder tous les résultats dans la base de données.
            question.candidate_answer = answer
            question.ai_feedback = feedback.strip()
            question.score = score
            question.strengths = strengths
            question.improvements = improvements
            question.suggested_answer = suggested_answer.strip()

            question.save(
                update_fields=[
                    "candidate_answer",
                    "ai_feedback",
                    "score",
                    "strengths",
                    "improvements",
                    "suggested_answer",
                ]
            )

            return Response(
                {
                    "success": True,
                    "detail": "Votre réponse a été analysée avec succès.",
                    "question_id": question.id,
                    "answer": question.candidate_answer,
                    "feedback": question.ai_feedback,
                    "score": question.score,
                    "strengths": question.strengths,
                    "improvements": question.improvements,
                    "suggested_answer": question.suggested_answer,
                    "mode": evaluation.get("mode", get_mode()),
                },
                status=status.HTTP_200_OK,
            )

        except AICoachError as exc:

            logger.warning(
                "Erreur IA pendant l'évaluation de la réponse : %s",
                exc,
            )

            return Response(
                {
                    "success": False,
                    "detail": str(exc),
                    "mode": get_mode(),
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        except ValueError as exc:

            return Response(
                {
                    "success": False,
                    "detail": str(exc),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        except Exception:

            logger.exception(
                "Erreur interne pendant l'évaluation de la réponse."
            )

            return Response(
                {
                    "success": False,
                    "detail": (
                        "Une erreur est survenue pendant "
                        "l'évaluation de votre réponse."
                    ),
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


# =====================================================
# TERMINER UNE SESSION
# =====================================================

class CompleteSessionView(APIView):

    permission_classes = [IsAuthenticated, IsCandidate]

    def post(self, request, session_id):

        session = get_object_or_404(
            CoachingSession.objects.prefetch_related("questions"),
            id=session_id,
            candidate=request.user,
        )

        if session.status == CoachingSession.Status.COMPLETED:

            return Response(
                {
                    "success": True,
                    "detail": "Cette séance est déjà terminée.",
                    "mode": get_mode(),
                    "session": CoachingSessionSerializer(session).data,
                },
                status=status.HTTP_200_OK,
            )

        questions = list(session.questions.all())

        if not questions:

            return Response(
                {
                    "success": False,
                    "detail": "Générez d'abord les questions de cette séance.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        unanswered = [
            question.position
            for question in questions
            if not (question.candidate_answer or "").strip()
        ]

        if unanswered:

            return Response(
                {
                    "success": False,
                    "detail": "Répondez à toutes les questions avant de terminer.",
                    "unanswered_positions": unanswered,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Chaque réponse doit avoir été évaluée.
        unevaluated = [
            question.position
            for question in questions
            if question.score is None
        ]

        if unevaluated:

            return Response(
                {
                    "success": False,
                    "detail": (
                        "Certaines réponses n'ont pas encore été évaluées "
                        "par l'intelligence artificielle."
                    ),
                    "unevaluated_positions": unevaluated,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        scores = [
            question.score
            for question in questions
            if question.score is not None
        ]

        if not scores:

            return Response(
                {
                    "success": False,
                    "detail": "Aucun score disponible pour terminer cette séance.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        session.score = round(sum(scores) / len(scores))

        session.status = CoachingSession.Status.COMPLETED

        session.save(
            update_fields=[
                "score",
                "status",
                "updated_at",
            ]
        )

        session.refresh_from_db()

        return Response(
            {
                "success": True,
                "detail": "Votre séance de préparation est terminée.",
                "mode": get_mode(),
                "total_questions": len(questions),
                "answered_questions": len(questions),
                "average_score": session.score,
                "session": CoachingSessionSerializer(session).data,
            },
            status=status.HTTP_200_OK,
        )
