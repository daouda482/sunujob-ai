from rest_framework.permissions import BasePermission


class IsRecruiter(BasePermission):
    message = "Cette fonctionnalité est réservée aux recruteurs."

    def has_permission(self, request, view):
        user = request.user

        return bool(
            user
            and user.is_authenticated
            and getattr(user, "role", None) == "RECRUITER"
        )


class IsCandidate(BasePermission):
    message = "Cette fonctionnalité est réservée aux candidats."

    def has_permission(self, request, view):
        user = request.user

        return bool(
            user
            and user.is_authenticated
            and getattr(user, "role", None) == "CANDIDATE"
        )