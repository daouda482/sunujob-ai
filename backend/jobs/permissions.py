from rest_framework.permissions import BasePermission

from users.models import User


class IsRecruiter(BasePermission):
    """
    Autorise uniquement les utilisateurs ayant le rôle RECRUITER.
    """

    message = "Seuls les recruteurs peuvent gérer les offres d'emploi."

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role == User.Role.RECRUITER
        )


class IsRecruiterOwner(BasePermission):
    """
    Vérifie que le recruteur connecté est bien propriétaire
    de l'offre d'emploi concernée.
    """

    message = "Vous ne pouvez pas gérer une offre qui ne vous appartient pas."

    def has_object_permission(self, request, view, obj):
        return obj.recruiter == request.user