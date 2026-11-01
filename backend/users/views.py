from django.contrib.auth import get_user_model

from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from rest_framework_simplejwt.tokens import RefreshToken

from .permissions import (
    IsCandidate,
    IsRecruiter,
    IsTrainingProvider,
    IsAdmin,
)

from .serializers import RegisterSerializer, UserSerializer


User = get_user_model()


# ============================================================
# INSCRIPTION
# ============================================================


class RegisterView(generics.CreateAPIView):
    """
    Permet à un nouvel utilisateur de créer son compte
    sans devoir posséder un jeton JWT valide.
    """

    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]
    authentication_classes = []


# ============================================================
# PROFIL UTILISATEUR CONNECTÉ
# ============================================================

class ProfileView(generics.RetrieveAPIView):
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user


# ============================================================
# DÉCONNEXION
# ============================================================

class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        refresh_token = request.data.get("refresh")

        if not refresh_token:
            return Response(
                {
                    "detail": "Le refresh token est obligatoire."
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            token = RefreshToken(refresh_token)
            token.blacklist()

            return Response(
                {
                    "detail": "Déconnexion réussie."
                },
                status=status.HTTP_205_RESET_CONTENT
            )

        except Exception:
            return Response(
                {
                    "detail": "Refresh token invalide."
                },
                status=status.HTTP_400_BAD_REQUEST
            )


# ============================================================
# ESPACE CANDIDAT
# ============================================================

class CandidateOnlyView(APIView):
    permission_classes = [IsAuthenticated, IsCandidate]

    def get(self, request):
        return Response(
            {
                "message": "Bienvenue dans l'espace candidat.",
                "user": request.user.email,
                "role": request.user.role,
            }
        )


# ============================================================
# ESPACE RECRUTEUR
# ============================================================

class RecruiterOnlyView(APIView):
    permission_classes = [IsAuthenticated, IsRecruiter]

    def get(self, request):
        return Response(
            {
                "message": "Bienvenue dans l'espace recruteur.",
                "user": request.user.email,
                "role": request.user.role,
            }
        )


# ============================================================
# ESPACE ORGANISME DE FORMATION
# ============================================================

class TrainingProviderOnlyView(APIView):
    permission_classes = [IsAuthenticated, IsTrainingProvider]

    def get(self, request):
        return Response(
            {
                "message": "Bienvenue dans l'espace organisme de formation.",
                "user": request.user.email,
                "role": request.user.role,
            }
        )


# ============================================================
# ESPACE ADMINISTRATEUR
# ============================================================

class AdminOnlyView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        return Response(
            {
                "message": "Bienvenue dans l'espace administrateur.",
                "user": request.user.email,
                "role": request.user.role,
            }
        )