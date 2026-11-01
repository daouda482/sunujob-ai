
from rest_framework.permissions import BasePermission


class IsCandidate(BasePermission):
    message = "Cette fonctionnalité est réservée aux candidats."

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and getattr(request.user, "role", None) == "CANDIDATE"
        )
