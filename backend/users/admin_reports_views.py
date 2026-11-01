
import csv
from datetime import datetime
from calendar import monthrange
from datetime import datetime, timedelta
from django.contrib.auth import get_user_model
from django.db.models import Count
from django.http import HttpResponse
from django.utils import timezone

from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from applications.models import Application
from companies.models import Company
from jobs.models import Job
from users.permissions import IsAdmin


User = get_user_model()


def has_field(model, field_name):
    try:
        model._meta.get_field(field_name)
        return True
    except Exception:
        return False


def get_model_fields(model):
    return {
        field.name
        for field in model._meta.get_fields()
        if getattr(field, "concrete", False)
    }


def get_month_start(year, month):
    value = datetime(year, month, 1)

    if timezone.is_aware(timezone.now()):
        return timezone.make_aware(value, timezone.get_current_timezone())

    return value


def shift_month(year, month, offset):
    index = year * 12 + (month - 1) + offset
    return index // 12, index % 12 + 1


def count_in_period(model, date_field, start, end):
    if not has_field(model, date_field):
        return None

    filters = {
        f"{date_field}__gte": start,
        f"{date_field}__lt": end,
    }

    return model.objects.filter(**filters).count()


def get_monthly_trend():
    now = timezone.localtime(timezone.now())
    months = []

    # Six mois, dont le mois courant.
    for offset in range(-5, 1):
        year, month = shift_month(now.year, now.month, offset)
        next_year, next_month = shift_month(year, month, 1)

        start = get_month_start(year, month)
        end = get_month_start(next_year, next_month)

        months.append({
            "key": f"{year:04d}-{month:02d}",
            "label": start.strftime("%b %Y"),
            "applications": count_in_period(
                Application, "applied_at", start, end
            ) or 0,
            "jobs": count_in_period(
                Job, "created_at", start, end
            ) or 0,
            "users": count_in_period(
                User, "date_joined", start, end
            ) or 0,
        })

    return months


class AdminReportsAPIView(APIView):
    """GET /api/admin/reports/"""

    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        now = timezone.now()
        today_local = timezone.localtime(now)
        start_month = get_month_start(
            today_local.year,
            today_local.month,
        )

        thirty_days_ago = now - timedelta(days=30)

        application_statuses = {
            value: Application.objects.filter(status=value).count()
            for value, label in Application.Status.choices
        }

        job_statuses = {
            value: Job.objects.filter(status=value).count()
            for value, label in Job.Status.choices
        }

        summary = {
            "total_users": User.objects.count(),
            "total_companies": Company.objects.count(),
            "total_jobs": Job.objects.count(),
            "total_applications": Application.objects.count(),
            "published_jobs": job_statuses.get(
                Job.Status.PUBLISHED, 0
            ),
            "draft_jobs": job_statuses.get(Job.Status.DRAFT, 0),
            "closed_jobs": job_statuses.get(Job.Status.CLOSED, 0),
            "pending_applications": application_statuses.get(
                Application.Status.PENDING, 0
            ),
            "applications_this_month": count_in_period(
                Application, "applied_at", start_month, now
            ),
            "new_users_last_30_days": (
                User.objects.filter(date_joined__gte=thirty_days_ago).count()
                if has_field(User, "date_joined")
                else None
            ),
        }

        return Response({
            "generated_at": now.isoformat(),
            "summary": summary,
            "application_statuses": [
                {
                    "code": value,
                    "label": label,
                    "count": application_statuses[value],
                }
                for value, label in Application.Status.choices
            ],
            "job_statuses": [
                {
                    "code": value,
                    "label": label,
                    "count": job_statuses[value],
                }
                for value, label in Job.Status.choices
            ],
            "monthly_trend": get_monthly_trend(),
            "available_exports": [
                {"value": "applications", "label": "Candidatures"},
                {"value": "jobs", "label": "Offres d'emploi"},
                {"value": "users", "label": "Utilisateurs"},
                {"value": "companies", "label": "Entreprises"},
            ],
        })


class AdminReportsExportAPIView(APIView):
    """
    GET /api/admin/reports/export/?type=applications
    Exports CSV réservés aux administrateurs.
    """

    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        report_type = request.query_params.get(
            "type", "applications"
        ).strip().lower()

        response = HttpResponse(
            content_type="text/csv; charset=utf-8"
        )
        response.write("\ufeff")

        writer = csv.writer(response, delimiter=";")

        if report_type == "applications":
            writer.writerow([
                "Référence",
                "Candidat",
                "E-mail candidat",
                "Offre",
                "Entreprise",
                "Statut",
                "Date de candidature",
            ])

            queryset = Application.objects.select_related(
                "candidate", "job", "job__company"
            ).order_by("-applied_at", "-pk")

            for item in queryset.iterator():
                candidate = item.candidate
                job = item.job
                company = getattr(job, "company", None)

                candidate_name = (
                    f"{getattr(candidate, 'first_name', '') or ''} "
                    f"{getattr(candidate, 'last_name', '') or ''}"
                ).strip()

                writer.writerow([
                    item.pk,
                    candidate_name or getattr(candidate, "email", ""),
                    getattr(candidate, "email", ""),
                    getattr(job, "title", ""),
                    getattr(company, "name", ""),
                    item.get_status_display(),
                    item.applied_at.isoformat()
                    if getattr(item, "applied_at", None)
                    else "",
                ])

        elif report_type == "jobs":
            writer.writerow([
                "Référence",
                "Intitulé",
                "Entreprise",
                "Localisation",
                "Contrat",
                "Statut",
                "Date de création",
            ])

            queryset = Job.objects.select_related(
                "company"
            ).order_by("-created_at", "-pk")

            for item in queryset.iterator():
                company = getattr(item, "company", None)

                writer.writerow([
                    item.pk,
                    getattr(item, "title", ""),
                    getattr(company, "name", ""),
                    getattr(item, "location", ""),
                    item.get_contract_type_display()
                    if hasattr(item, "get_contract_type_display")
                    else getattr(item, "contract_type", ""),
                    item.get_status_display()
                    if hasattr(item, "get_status_display")
                    else getattr(item, "status", ""),
                    item.created_at.isoformat()
                    if getattr(item, "created_at", None)
                    else "",
                ])

        elif report_type == "users":
            writer.writerow([
                "Référence",
                "Prénom",
                "Nom",
                "E-mail",
                "Rôle",
                "Compte actif",
                "Date d'inscription",
            ])

            queryset = User.objects.all().order_by("pk")

            for item in queryset.iterator():
                writer.writerow([
                    item.pk,
                    getattr(item, "first_name", ""),
                    getattr(item, "last_name", ""),
                    getattr(item, "email", ""),
                    item.get_role_display()
                    if hasattr(item, "get_role_display")
                    else getattr(item, "role", ""),
                    "Oui" if getattr(item, "is_active", False) else "Non",
                    item.date_joined.isoformat()
                    if getattr(item, "date_joined", None)
                    else "",
                ])

        elif report_type == "companies":
            writer.writerow([
                "Référence",
                "Entreprise",
                "E-mail",
                "Site web",
                "Recruteur",
            ])

            queryset = Company.objects.all()

            if "recruiter" in get_model_fields(Company):
                queryset = queryset.select_related("recruiter")

            queryset = queryset.order_by("pk")

            for item in queryset.iterator():
                recruiter = getattr(item, "recruiter", None)

                writer.writerow([
                    item.pk,
                    getattr(item, "name", ""),
                    getattr(item, "email", ""),
                    getattr(item, "website", ""),
                    getattr(recruiter, "email", "") if recruiter else "",
                ])

        else:
            return Response(
                {
                    "detail": (
                        "Type d'export invalide. Choisissez applications, "
                        "jobs, users ou companies."
                    )
                },
                status=400,
            )

        filename = f"sunujob_{report_type}_{timezone.now():%Y%m%d_%H%M%S}.csv"
        response["Content-Disposition"] = (
            f'attachment; filename="{filename}"'
        )
        response["Cache-Control"] = "no-store"

        return response
