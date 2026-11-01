
from rest_framework.permissions import BasePermission

from .models import User


class IsCandidate(BasePermission):
    """Autorise uniquement les candidats authentifiés."""

    message = "Accès réservé aux candidats."

    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and request.user.role == User.Role.CANDIDATE
        )


class IsRecruiter(BasePermission):
    """Autorise uniquement les recruteurs authentifiés."""

    message = "Accès réservé aux recruteurs."

    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and request.user.role == User.Role.RECRUITER
        )


class IsTrainingProvider(BasePermission):
    """Autorise uniquement les organismes de formation authentifiés."""

    message = "Accès réservé aux organismes de formation."

    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and request.user.role == User.Role.TRAINING_PROVIDER
        )


class IsAdmin(BasePermission):
    """Autorise uniquement les administrateurs authentifiés."""

    message = "Accès réservé aux administrateurs."

    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and request.user.role == User.Role.ADMIN
        )
