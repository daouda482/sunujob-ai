from django.db.models import Count
from django.utils import timezone

from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from applications.models import Application
from companies.models import Company
from jobs.models import Job
from users.models import User
from users.permissions import IsAdmin


class AdminDashboardAPIView(APIView):
    """
    Retourne les statistiques globales de SunuJob AI.
    Réservé aux administrateurs authentifiés.
    """

    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request, *args, **kwargs):
        # Statistiques des utilisateurs
        stats = {
            "total_users": User.objects.count(),
            "total_candidates": User.objects.filter(
                role=User.Role.CANDIDATE
            ).count(),
            "total_recruiters": User.objects.filter(
                role=User.Role.RECRUITER
            ).count(),
            "total_training_providers": User.objects.filter(
                role=User.Role.TRAINING_PROVIDER
            ).count(),
            "total_admins": User.objects.filter(
                role=User.Role.ADMIN
            ).count(),

            # Entreprises et offres
            "total_companies": Company.objects.count(),
            "total_jobs": Job.objects.count(),
            "published_jobs": Job.objects.filter(
                status=Job.Status.PUBLISHED
            ).count(),
            "draft_jobs": Job.objects.filter(
                status=Job.Status.DRAFT
            ).count(),
            "closed_jobs": Job.objects.filter(
                status=Job.Status.CLOSED
            ).count(),

            # Candidatures
            "total_applications": Application.objects.count(),
        }

        stats["pending_applications"] = Application.objects.filter(
            status=Application.Status.PENDING
        ).count()

        # Répartition des candidatures par statut
        status_counts = {
            item["status"]: item["total"]
            for item in Application.objects.values("status").annotate(
                total=Count("id")
            )
        }

        application_statuses = [
            {
                "code": code,
                "label": label,
                "count": status_counts.get(code, 0),
            }
            for code, label in Application.Status.choices
        ]

        # Les 8 dernières candidatures
        recent_applications = []

        applications = (
            Application.objects
            .select_related("candidate", "job", "job__company")
            .order_by("-applied_at")[:8]
        )

        for application in applications:
            candidate = application.candidate
            candidate_name = (
                f"{candidate.first_name or ''} "
                f"{candidate.last_name or ''}"
            ).strip() or candidate.email

            recent_applications.append({
                "id": application.pk,
                "candidate_name": candidate_name,
                "candidate_email": candidate.email,
                "job_title": application.job.title,
                "company_name": application.job.company.name,
                "status": application.status,
                "status_label": application.get_status_display(),
                "applied_at": application.applied_at.isoformat(),
            })

        # Les 6 dernières offres créées
        recent_jobs = []

        jobs = (
            Job.objects
            .select_related("company")
            .order_by("-created_at")[:6]
        )

        for job in jobs:
            recent_jobs.append({
                "id": job.pk,
                "title": job.title,
                "company_name": job.company.name,
                "location": job.location,
                "contract_type": job.contract_type,
                "status": job.status,
                "status_label": job.get_status_display(),
                "created_at": job.created_at.isoformat(),
            })

        return Response({
            "generated_at": timezone.now().isoformat(),
            "stats": stats,
            "application_statuses": application_statuses,
            "recent_applications": recent_applications,
            "recent_jobs": recent_jobs,
        })