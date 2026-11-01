
from pathlib import Path

from django.conf import settings
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from candidates.models import CandidateProfile
from users.permissions import IsCandidate
from .cv_analyzer import analyze_cv


class AnalyzeCVView(APIView):
    permission_classes = [IsAuthenticated, IsCandidate]

    def post(self, request):
        try:
            profile = CandidateProfile.objects.get(
                user=request.user
            )
        except CandidateProfile.DoesNotExist:
            return Response(
                {
                    "detail": (
                        "Crée d'abord ton profil candidat "
                        "avant d'analyser ton CV."
                    )
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        if not profile.resume:
            return Response(
                {
                    "detail": (
                        "Aucun CV n'est enregistré dans ton profil. "
                        "Téléverse d'abord un fichier PDF."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if Path(profile.resume.name).suffix.lower() != ".pdf":
            return Response(
                {
                    "detail": "Le fichier du CV doit être au format PDF."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            # Vérification supplémentaire du chemin local.
            file_path = Path(profile.resume.path).resolve()
            media_root = Path(settings.MEDIA_ROOT).resolve()

            if not file_path.is_relative_to(media_root):
                return Response(
                    {"detail": "Chemin du fichier non autorisé."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            result = analyze_cv(
                file_path=str(file_path),
                current_skills=profile.skills,
            )

            return Response(
                {
                    "message": "Analyse du CV terminée.",
                    **result,
                },
                status=status.HTTP_200_OK,
            )

        except ValueError as exc:
            return Response(
                {"detail": str(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        except (OSError, AttributeError):
            return Response(
                {
                    "detail": (
                        "Le fichier PDF est introuvable "
                        "ou inaccessible."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        except Exception:
            return Response(
                {
                    "detail": (
                        "Une erreur est survenue pendant "
                        "l'analyse du CV."
                    )
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )