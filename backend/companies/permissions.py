
from rest_framework.permissions import BasePermission

from users.models import User


class IsRecruiter(BasePermission):
    """
    Autorise uniquement les recruteurs authentifiés.
    """

    message = "Seuls les recruteurs peuvent gérer une entreprise."

    def has_permission(self, request, view):
        user = request.user

        return (
            user is not None
            and user.is_authenticated
            and user.role == User.Role.RECRUITER
        )
