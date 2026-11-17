
from rest_framework.permissions import BasePermission

from users.models import User


class IsCandidate(BasePermission):
    """
    Autorise uniquement les utilisateurs authentifiés
    ayant le rôle CANDIDATE.
    """

    message = "Cette fonctionnalité est réservée aux candidats."

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role == User.Role.CANDIDATE
        )
