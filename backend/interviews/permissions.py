
from rest_framework.permissions import BasePermission


class IsRecruiter(BasePermission):
    message = "Cette action est réservée aux recruteurs."

    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and request.user.role == "RECRUITER"
        )


class IsCandidate(BasePermission):
    message = "Cette action est réservée aux candidats."

    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and request.user.role == "CANDIDATE"
        )