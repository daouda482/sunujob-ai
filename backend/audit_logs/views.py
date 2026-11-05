
from rest_framework import generics
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated

from applications.models import Application
from users.models import User
from users.permissions import IsCandidate, IsRecruiter

from .models import AuditLog
from .serializers import AuditLogSerializer


def is_admin_user(user):
    """
    Vérifie si l'utilisateur est administrateur.
    Prend en compte le rôle ADMIN de SunuJob AI,
    ainsi que les comptes Django staff et superuser.
    """
    return (
        user.is_authenticated
        and (
            getattr(user, "role", None) == User.Role.ADMIN
            or user.is_staff
            or user.is_superuser
        )
    )


class AuditLogListView(generics.ListAPIView):
    """
    Liste des activités métier accessibles à l'utilisateur connecté.

    ADMIN : toutes les activités.
    CANDIDATE : activités liées à ses candidatures.
    RECRUITER : activités liées aux offres dont il est responsable.
    """

    serializer_class = AuditLogSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user

        queryset = AuditLog.objects.select_related(
            "actor",
            "application",
            "interview",
        ).order_by("-created_at")

        # Administrateur : accès à tous les journaux métier.
        if is_admin_user(user):
            return queryset

        # Candidat : uniquement ses propres candidatures.
        if user.role == User.Role.CANDIDATE:
            return queryset.filter(
                application__candidate=user
            )

        # Recruteur : uniquement les candidatures liées à ses offres.
        if user.role == User.Role.RECRUITER:
            return queryset.filter(
                application__job__recruiter=user
            )

        # Autres rôles : aucun accès.
        return queryset.none()


class ApplicationAuditLogListView(generics.ListAPIView):
    """
    Historique des activités d'une candidature précise.

    ADMIN : accès à toutes les candidatures.
    CANDIDATE : accès à ses propres candidatures.
    RECRUITER : accès aux candidatures de ses offres.
    """

    serializer_class = AuditLogSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        application_id = self.kwargs["application_id"]

        try:
            application = Application.objects.select_related(
                "candidate",
                "job",
                "job__recruiter",
            ).get(pk=application_id)

        except Application.DoesNotExist:
            return AuditLog.objects.none()

        is_admin = is_admin_user(user)

        is_candidate = (
            user.role == User.Role.CANDIDATE
            and application.candidate_id == user.id
        )

        is_recruiter = (
            user.role == User.Role.RECRUITER
            and application.job.recruiter_id == user.id
        )

        if not (is_admin or is_candidate or is_recruiter):
            raise PermissionDenied(
                "Vous n'avez pas accès à l'historique de cette candidature."
            )

        return AuditLog.objects.filter(
            application=application
        ).select_related(
            "actor",
            "application",
            "interview",
        ).order_by("-created_at")
