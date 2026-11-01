
from decimal import Decimal, InvalidOperation

from django.db import transaction
from django.db.models import Q
from django.utils import timezone

from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from candidates.models import CandidateProfile
from jobs.models import Job
from users.permissions import IsCandidate

from .models import MatchResult
from .serializers import RecommendedJobsResponseSerializer
from .services import calculate_match


class RecommendedJobsView(APIView):

    permission_classes = [IsAuthenticated, IsCandidate]

    def get(self, request):

        # 1. Vérifier le profil du candidat
        try:
            profile = CandidateProfile.objects.get(
                user=request.user
            )

        except CandidateProfile.DoesNotExist:

            return Response(
                {
                    "detail": (
                        "Veuillez compléter votre profil candidat "
                        "avant de consulter les recommandations."
                    )
                },
                status=status.HTTP_404_NOT_FOUND
            )

        # 2. Récupérer les offres publiées et valides
        today = timezone.localdate()

        jobs = (
            Job.objects.filter(
                status=Job.Status.PUBLISHED
            )
            .filter(
                Q(deadline__isnull=True)
                | Q(deadline__gte=today)
            )
            .select_related(
                "company",
                "recruiter"
            )
            .order_by("-created_at")
        )

        recommendations = []

        # 3. Calculer et enregistrer les résultats
        with transaction.atomic():

            for job in jobs:

                result = calculate_match(
                    profile,
                    job
                )

                # Sécuriser les valeurs numériques
                try:
                    score = Decimal(
                        str(result.get("score", 0))
                    )

                    coverage = float(
                        result.get("coverage", 0)
                    )

                except (InvalidOperation, TypeError, ValueError):

                    score = Decimal("0")
                    coverage = 0.0

                score = max(
                    Decimal("0"),
                    min(score, Decimal("100"))
                )

                coverage = max(
                    0.0,
                    min(coverage, 100.0)
                )

                score = round(score, 2)
                coverage = round(coverage, 2)

                matched_skills = result.get(
                    "matched_skills",
                    []
                )

                missing_skills = result.get(
                    "missing_skills",
                    []
                )

                reasons = result.get(
                    "reasons",
                    []
                )

                # 4. Enregistrer le matching
                MatchResult.objects.update_or_create(
                    candidate=profile,
                    job=job,
                    defaults={
                        "score": score,
                        "matched_skills": matched_skills,
                        "missing_skills": missing_skills,
                        "reasons": reasons,
                    }
                )

                # 5. Construire la réponse API
                recommendations.append({

                    "job_id": job.id,

                    "title": job.title,

                    "company": job.company.name,

                    "sector": job.sector,

                    "location": job.location,

                    "contract_type": job.contract_type,

                    "experience_required": (
                        job.experience_required
                    ),

                    "education_level": (
                        job.education_level or ""
                    ),

                    "skills_required": (
                        job.skills_required or ""
                    ),

                    "score": float(score),

                    "coverage": coverage,

                    "matched_skills": matched_skills,

                    "missing_skills": missing_skills,

                    "reasons": reasons,
                })

        # 6. Classer les recommandations
        recommendations.sort(
            key=lambda item: (
                item["score"],
                item["coverage"]
            ),
            reverse=True
        )

        # 7. Préparer la réponse
        response_data = {
            "count": len(recommendations),
            "results": recommendations
        }

        serializer = RecommendedJobsResponseSerializer(
            instance=response_data
        )

        return Response(
            serializer.data,
            status=status.HTTP_200_OK
        )
