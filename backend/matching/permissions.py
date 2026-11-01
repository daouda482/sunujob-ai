
from rest_framework.permissions import BasePermission


class IsCandidate(BasePermission):
    """
    Autorise uniquement les utilisateurs ayant le rôle CANDIDATE.
    """

    message = (
        "Accès refusé : cette fonctionnalité est réservée "
        "aux candidats."
    )

    def has_permission(self, request, view):
        user = request.user

        if not user or not user.is_authenticated:
            return False

        return getattr(user, "role", None) == "CANDIDATE"