import logging
import os
from pathlib import Path

from django.conf import settings
from django.http import FileResponse
from django.shortcuts import get_object_or_404

from rest_framework import status
from rest_framework.exceptions import NotFound, ValidationError
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from users.permissions import IsCandidate

from .models import CandidateProfile, CVAnalysis
from .cv_services import analyze_cv_file


logger = logging.getLogger(__name__)


# =====================================================
# PROFIL DU CANDIDAT CONNECTÉ
# =====================================================

def get_candidate_profile(user):
    profile = CandidateProfile.objects.filter(user=user).first()

    if profile is None:
        raise NotFound(
            "Votre profil professionnel n'existe pas encore. "
            "Veuillez d'abord créer votre profil candidat."
        )

    return profile


# =====================================================
# VALIDATION DU CV
# =====================================================

def validate_resume_upload(uploaded_file):
    if not uploaded_file:
        raise ValidationError({
            "resume": "Veuillez sélectionner un CV."
        })

    filename = uploaded_file.name or ""
    extension = Path(filename).suffix.lower()

    allowed_extensions = {".pdf", ".docx"}

    if extension not in allowed_extensions:
        raise ValidationError({
            "resume": "Format non autorisé. Utilisez un fichier PDF ou DOCX."
        })

    max_size_mb = getattr(settings, "CV_MAX_FILE_SIZE_MB", 8)
    max_size = max_size_mb * 1024 * 1024

    if uploaded_file.size <= 0:
        raise ValidationError({
            "resume": "Le fichier sélectionné est vide."
        })

    if uploaded_file.size > max_size:
        raise ValidationError({
            "resume": (
                f"Le fichier dépasse la limite de {max_size_mb} Mo."
            )
        })

    uploaded_file.seek(0)
    header = uploaded_file.read(8)
    uploaded_file.seek(0)

    if extension == ".pdf" and not header.startswith(b"%PDF-"):
        raise ValidationError({
            "resume": "Le fichier ne semble pas être un PDF valide."
        })

    if extension == ".docx" and not header.startswith(b"PK"):
        raise ValidationError({
            "resume": "Le fichier ne semble pas être un document DOCX valide."
        })

    return uploaded_file


# =====================================================
# INFORMATIONS DU CV
# =====================================================

def serialize_resume(request, profile):
    resume = profile.resume

    if not resume:
        return {
            "has_cv": False,
            "name": None,
            "size": 0,
            "updated_at": None,
            "download_url": None,
        }

    try:
        # Vérifier que le fichier existe réellement dans le stockage.
        if not resume.storage.exists(resume.name):
            logger.warning(
                "Le CV du candidat %s est introuvable : %s",
                profile.user_id,
                resume.name,
            )

            return {
                "has_cv": False,
                "name": None,
                "size": 0,
                "updated_at": None,
                "download_url": None,
            }

        file_size = resume.size

    except (OSError, ValueError):
        file_size = 0

    return {
        "has_cv": True,
        "name": os.path.basename(resume.name),
        "size": file_size,
        "updated_at": (
            profile.updated_at.isoformat()
            if profile.updated_at
            else None
        ),
        "download_url": request.build_absolute_uri(
            "/api/candidates/profile/me/cv/download/"
        ),
    }


# =====================================================
# CONSULTER / AJOUTER / REMPLACER / SUPPRIMER LE CV
# =====================================================

class CandidateCVView(APIView):

    permission_classes = [IsAuthenticated, IsCandidate]
    parser_classes = [MultiPartParser, FormParser]

    def get(self, request):
        profile = get_candidate_profile(request.user)

        return Response(
            serialize_resume(request, profile),
            status=status.HTTP_200_OK,
        )

    def patch(self, request):
        profile = get_candidate_profile(request.user)

        uploaded_file = validate_resume_upload(
            request.FILES.get("resume")
        )

        try:
            # Enregistrer le nouveau CV dans le profil.
            profile.resume = uploaded_file
            profile.save(update_fields=["resume", "updated_at"])

        except Exception as exc:
            logger.exception(
                "Erreur pendant l'enregistrement du CV."
            )

            raise ValidationError({
                "resume": (
                    "Impossible d'enregistrer votre CV. "
                    "Veuillez réessayer."
                )
            }) from exc

        return Response(
            {
                "message": "Votre CV a été enregistré avec succès.",
                **serialize_resume(request, profile),
            },
            status=status.HTTP_200_OK,
        )

    def delete(self, request):
        profile = get_candidate_profile(request.user)

        if not profile.resume:
            raise NotFound(
                "Aucun CV n'est actuellement enregistré."
            )

        # Attention : ne pas supprimer physiquement le fichier ici.
        # Une candidature antérieure peut référencer ce même fichier.
        profile.resume = None
        profile.save(update_fields=["resume", "updated_at"])

        return Response(
            {
                "message": "Votre CV a été retiré de votre profil.",
                "has_cv": False,
                "name": None,
                "size": 0,
                "download_url": None,
            },
            status=status.HTTP_200_OK,
        )


# =====================================================
# TÉLÉCHARGEMENT DU CV DU CANDIDAT
# =====================================================

class CandidateCVDownloadView(APIView):

    permission_classes = [IsAuthenticated, IsCandidate]

    def get(self, request):
        profile = get_candidate_profile(request.user)

        if not profile.resume:
            raise NotFound(
                "Aucun CV n'est enregistré dans votre profil."
            )

        try:
            if not profile.resume.storage.exists(profile.resume.name):
                raise NotFound(
                    "Le fichier CV n'est plus disponible."
                )

            filename = os.path.basename(profile.resume.name)
            file_handle = profile.resume.open("rb")

            return FileResponse(
                file_handle,
                as_attachment=True,
                filename=filename,
            )

        except NotFound:
            raise

        except Exception as exc:
            logger.exception(
                "Erreur pendant le téléchargement du CV."
            )

            raise NotFound(
                "Le document n'est pas disponible actuellement."
            ) from exc


# =====================================================
# HISTORIQUE : FORMAT DE RÉPONSE
# =====================================================

def serialize_analysis(analysis):
    return {
        "id": analysis.id,
        "resume_name": analysis.resume_name,
        "score": analysis.score,
        "engine": analysis.engine,
        "result": analysis.result,
        "created_at": analysis.created_at.isoformat(),
    }


# =====================================================
# ANALYSE DU CV
# =====================================================

class CandidateCVAnalysisView(APIView):

    permission_classes = [IsAuthenticated, IsCandidate]

    def post(self, request):
        profile = get_candidate_profile(request.user)

        if not profile.resume:
            raise ValidationError({
                "resume": (
                    "Aucun CV n'est enregistré. "
                    "Importez d'abord votre CV dans la rubrique Mon CV."
                )
            })

        try:
            analysis_data = analyze_cv_file(profile.resume)
            result = analysis_data["result"]

            analysis = CVAnalysis.objects.create(
                candidate=request.user,
                resume_name=analysis_data["filename"],
                resume_sha256=analysis_data["sha256"],
                score=result["score"],
                engine=result["engine"],
                result=result,
            )

            return Response(
                serialize_analysis(analysis),
                status=status.HTTP_201_CREATED,
            )

        except ValueError as exc:
            return Response(
                {"detail": str(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        except Exception:
            logger.exception(
                "Erreur pendant l'analyse du CV."
            )

            return Response(
                {
                    "detail": (
                        "Une erreur est survenue pendant l'analyse "
                        "de votre CV. Veuillez réessayer."
                    )
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


# =====================================================
# HISTORIQUE DES ANALYSES
# =====================================================

class CandidateCVAnalysisHistoryView(APIView):

    permission_classes = [IsAuthenticated, IsCandidate]

    def get(self, request):
        analyses = CVAnalysis.objects.filter(
            candidate=request.user
        ).order_by("-created_at")[:20]

        data = [
            serialize_analysis(item)
            for item in analyses
        ]

        return Response(
            {
                "count": len(data),
                "results": data,
            },
            status=status.HTTP_200_OK,
        )