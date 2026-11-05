
from django.db import transaction

from rest_framework import generics
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import (
    BasePermission,
    IsAuthenticated,
    SAFE_METHODS,
)

from audit_logs.models import AuditLog as BusinessAuditLog
from audit_logs.services import record_audit
from users.models import User

from .models import Evaluation
from .serializers import (
    EvaluationSerializer,
    CandidateEvaluationSerializer,
)


def is_admin_user(user):
    return (
        user.is_authenticated
        and (
            getattr(user, "role", None) == User.Role.ADMIN
            or user.is_staff
            or user.is_superuser
        )
    )


def is_recruiter_owner(user, evaluation):
    return (
        getattr(user, "role", None) == User.Role.RECRUITER
        and evaluation.application.job.recruiter_id == user.id
    )


class EvaluationPermission(BasePermission):
    """
    Administrateur : accès complet.
    Recruteur : accès à ses propres évaluations.
    Candidat : consultation de ses évaluations terminées uniquement.
    """

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        if request.method in SAFE_METHODS:
            return True

        return (
            is_admin_user(request.user)
            or getattr(request.user, "role", None) == User.Role.RECRUITER
        )

    def has_object_permission(self, request, view, obj):
        user = request.user

        if is_admin_user(user):
            return True

        if is_recruiter_owner(user, obj):
            return True

        if (
            request.method in SAFE_METHODS
            and getattr(user, "role", None) == User.Role.CANDIDATE
            and obj.application.candidate_id == user.id
            and obj.status == Evaluation.Status.COMPLETED
        ):
            return True

        return False


class EvaluationListCreateView(generics.ListCreateAPIView):
    serializer_class = EvaluationSerializer
    permission_classes = [IsAuthenticated, EvaluationPermission]

    def get_serializer_class(self):
        user = self.request.user

        if (
            self.request.method in SAFE_METHODS
            and getattr(user, "role", None) == User.Role.CANDIDATE
        ):
            return CandidateEvaluationSerializer

        return EvaluationSerializer

    def get_queryset(self):
        user = self.request.user

        queryset = Evaluation.objects.select_related(
            "application",
            "application__candidate",
            "application__job",
            "application__job__recruiter",
            "interview",
            "evaluator",
        ).order_by("-created_at")

        if is_admin_user(user):
            pass

        elif user.role == User.Role.RECRUITER:
            queryset = queryset.filter(
                application__job__recruiter=user
            )

        elif user.role == User.Role.CANDIDATE:
            queryset = queryset.filter(
                application__candidate=user,
                status=Evaluation.Status.COMPLETED,
            )

        else:
            return Evaluation.objects.none()

        application_id = self.request.query_params.get("application")
        if application_id:
            queryset = queryset.filter(application_id=application_id)

        status_filter = self.request.query_params.get("status")
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        recommendation = self.request.query_params.get("recommendation")
        if recommendation:
            queryset = queryset.filter(recommendation=recommendation)

        return queryset

    def perform_create(self, serializer):
        user = self.request.user

        if not (
            is_admin_user(user)
            or user.role == User.Role.RECRUITER
        ):
            raise PermissionDenied(
                "Seuls les recruteurs et les administrateurs "
                "peuvent créer une évaluation."
            )

        application = serializer.validated_data.get("application")

        if application is None:
            raise PermissionDenied(
                "Une candidature doit être sélectionnée."
            )

        if (
            not is_admin_user(user)
            and application.job.recruiter_id != user.id
        ):
            raise PermissionDenied(
                "Vous ne pouvez pas évaluer cette candidature."
            )

        with transaction.atomic():
            evaluation = serializer.save(evaluator=user)

            record_audit(
                action=BusinessAuditLog.ActionType.EVALUATION_CREATED,
                description=(
                    f"{user.email} a créé une évaluation "
                    f"pour la candidature #{evaluation.application_id}."
                ),
                actor=user,
                application=evaluation.application,
                interview=evaluation.interview,
                new_value=(
                    f"Moyenne : {evaluation.average_score}/5 ; "
                    f"Recommandation : "
                    f"{evaluation.get_recommendation_display()}"
                ),
                metadata={
                    "evaluation_id": evaluation.id,
                    "average_score": evaluation.average_score,
                    "percentage_score": evaluation.percentage_score,
                    "status": evaluation.status,
                },
                request=self.request,
            )


class EvaluationDetailView(generics.RetrieveUpdateAPIView):
    """
    Consultation et modification d'une évaluation.

    Les candidats consultent uniquement les évaluations terminées.
    La suppression physique est désactivée.
    """

    serializer_class = EvaluationSerializer
    permission_classes = [IsAuthenticated, EvaluationPermission]

    def get_serializer_class(self):
        user = self.request.user

        if (
            self.request.method in SAFE_METHODS
            and getattr(user, "role", None) == User.Role.CANDIDATE
        ):
            return CandidateEvaluationSerializer

        return EvaluationSerializer

    def get_queryset(self):
        user = self.request.user

        queryset = Evaluation.objects.select_related(
            "application",
            "application__candidate",
            "application__job",
            "application__job__recruiter",
            "interview",
            "evaluator",
        )

        if is_admin_user(user):
            return queryset

        if user.role == User.Role.RECRUITER:
            return queryset.filter(
                application__job__recruiter=user
            )

        if user.role == User.Role.CANDIDATE:
            return queryset.filter(
                application__candidate=user,
                status=Evaluation.Status.COMPLETED,
            )

        return queryset.none()

    def perform_update(self, serializer):
        evaluation = self.get_object()
        user = self.request.user

        old_values = {
            "technical_score": evaluation.technical_score,
            "communication_score": evaluation.communication_score,
            "experience_score": evaluation.experience_score,
            "motivation_score": evaluation.motivation_score,
            "adaptability_score": evaluation.adaptability_score,
            "strengths": evaluation.strengths,
            "weaknesses": evaluation.weaknesses,
            "comments": evaluation.comments,
            "recommendation": evaluation.recommendation,
            "status": evaluation.status,
        }

        with transaction.atomic():
            updated_evaluation = serializer.save()

            new_values = {
                "technical_score": updated_evaluation.technical_score,
                "communication_score": updated_evaluation.communication_score,
                "experience_score": updated_evaluation.experience_score,
                "motivation_score": updated_evaluation.motivation_score,
                "adaptability_score": updated_evaluation.adaptability_score,
                "strengths": updated_evaluation.strengths,
                "weaknesses": updated_evaluation.weaknesses,
                "comments": updated_evaluation.comments,
                "recommendation": updated_evaluation.recommendation,
                "status": updated_evaluation.status,
            }

            record_audit(
                action=BusinessAuditLog.ActionType.EVALUATION_UPDATED,
                description=(
                    f"{user.email} a modifié l'évaluation "
                    f"#{updated_evaluation.id} de la candidature "
                    f"#{updated_evaluation.application_id}."
                ),
                actor=user,
                application=updated_evaluation.application,
                interview=updated_evaluation.interview,
                old_value=str(old_values),
                new_value=str(new_values),
                metadata={
                    "evaluation_id": updated_evaluation.id,
                    "average_score": updated_evaluation.average_score,
                    "percentage_score": updated_evaluation.percentage_score,
                    "status": updated_evaluation.status,
                },
                request=self.request,
            )
