from datetime import timedelta

from django.db.models import Count
from django.db.models.functions import TruncMonth
from django.utils import timezone

from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from applications.models import Application
from interviews.models import Interview
from users.permissions import IsRecruiter

from .models import Job


class RecruiterStatisticsView(APIView):
    permission_classes = [IsAuthenticated, IsRecruiter]

    def get(self, request):
        recruiter = request.user
        today = timezone.localdate()

        # Les offres appartenant au recruteur connecté.
        jobs = Job.objects.filter(recruiter=recruiter)

        # Les candidatures associées à ses propres offres.
        applications = Application.objects.filter(
            job__recruiter=recruiter
        )

        # Les entretiens appartenant à ce recruteur.
        interviews = Interview.objects.filter(
            recruiter=recruiter
        )

        # Statistiques générales.
        total_jobs = jobs.count()
        published_jobs = jobs.filter(
            status=Job.Status.PUBLISHED
        ).count()
        closed_jobs = jobs.filter(
            status=Job.Status.CLOSED
        ).count()
        draft_jobs = jobs.filter(
            status=Job.Status.DRAFT
        ).count()

        total_applications = applications.count()
        accepted_applications = applications.filter(
            status=Application.Status.ACCEPTED
        ).count()

        # Répartition des candidatures par statut.
        status_counts = {
            item["status"]: item["total"]
            for item in applications.values("status").annotate(
                total=Count("id")
            )
        }

        application_statuses = [
            {
                "status": value,
                "label": label,
                "total": status_counts.get(value, 0),
            }
            for value, label in Application.Status.choices
        ]

        # Entretiens par statut.
        total_interviews = interviews.count()
        scheduled_interviews = interviews.filter(
            status=Interview.Status.SCHEDULED,
            scheduled_at__gte=timezone.now(),
        ).count()
        completed_interviews = interviews.filter(
            status=Interview.Status.COMPLETED
        ).count()

        # Candidatures reçues au cours des 6 derniers mois.
        start_date = today.replace(day=1) - timedelta(days=150)

        monthly_applications = (
            applications.filter(applied_at__date__gte=start_date)
            .annotate(month=TruncMonth("applied_at"))
            .values("month")
            .annotate(total=Count("id"))
            .order_by("month")
        )

        monthly_data = [
            {
                "month": item["month"].strftime("%Y-%m"),
                "total": item["total"],
            }
            for item in monthly_applications
            if item["month"] is not None
        ]

        return Response({
            "overview": {
                "total_jobs": total_jobs,
                "published_jobs": published_jobs,
                "closed_jobs": closed_jobs,
                "draft_jobs": draft_jobs,
                "total_applications": total_applications,
                "accepted_applications": accepted_applications,
                "total_interviews": total_interviews,
                "scheduled_interviews": scheduled_interviews,
                "completed_interviews": completed_interviews,
            },
            "application_statuses": application_statuses,
            "monthly_applications": monthly_data,
        })