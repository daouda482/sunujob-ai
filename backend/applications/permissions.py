from rest_framework.permissions import BasePermission

from users.models import User


class IsCandidate(BasePermission):
    message = "Seuls les candidats peuvent effectuer cette action."

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role == User.Role.CANDIDATE
        )


class IsRecruiter(BasePermission):
    message = "Seuls les recruteurs peuvent effectuer cette action."

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role == User.Role.RECRUITER
        )