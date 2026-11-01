
from datetime import date, datetime
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.db.models import Count, Q
from django.shortcuts import get_object_or_404

from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from applications.models import Application
from jobs.models import Job
from users.permissions import IsAdmin


User = get_user_model()


def _concrete_fields(model):
    """Retourne les noms des champs réels d'un modèle."""
    return {
        field.name
        for field in model._meta.get_fields()
        if getattr(field, "concrete", False)
    }


def _serialize_value(value):
    """Convertit les valeurs non directement simples pour la réponse JSON."""
    if isinstance(value, (datetime, date)):
        return value.isoformat()

    if isinstance(value, Decimal):
        return float(value)

    if isinstance(value, (str, int, float, bool)) or value is None:
        return value

    if isinstance(value, (list, dict)):
        return value

    return str(value)


def _choice_label(model, field_name, value):
    """Retourne le libellé associé à un choix Django."""
    try:
        choices = dict(model._meta.get_field(field_name).choices)
        return str(choices.get(value, value or "Non renseigné"))
    except Exception:
        return str(value or "Non renseigné")


def _recruiter_name(recruiter):
    """Construit le nom du recruteur sans exposer de données sensibles."""
    if not recruiter:
        return "Non renseigné"

    first_name = getattr(recruiter, "first_name", "") or ""
    last_name = getattr(recruiter, "last_name", "") or ""
    full_name = f"{first_name} {last_name}".strip()

    return full_name or getattr(recruiter, "email", "Non renseigné")


def _serialize_job(job, application_counts=None):
    """Prépare les informations publiques de l'offre pour l'interface admin."""
    application_counts = application_counts or {}
    fields = _concrete_fields(Job)

    data = {
        "id": job.pk,
        "title": getattr(job, "title", ""),
        "description": getattr(job, "description", ""),
        "status": getattr(job, "status", ""),
        "status_label": _choice_label(
            Job, "status", getattr(job, "status", None)
        ),
        "contract_type": getattr(job, "contract_type", ""),
        "contract_type_label": _choice_label(
            Job, "contract_type", getattr(job, "contract_type", None)
        ),
        "company_id": getattr(job, "company_id", None),
        "company_name": (
            getattr(getattr(job, "company", None), "name", None)
            or "Entreprise non renseignée"
        ),
        "recruiter_id": getattr(job, "recruiter_id", None),
        "recruiter_name": _recruiter_name(
            getattr(job, "recruiter", None)
        ),
        "recruiter_email": getattr(
            getattr(job, "recruiter", None), "email", ""
        ),
        "application_count": application_counts.get(job.pk, 0),
    }

    # Autres champs utiles, uniquement s'ils existent dans le modèle.
    optional_fields = (
        "sector",
        "location",
        "experience_required",
        "education_level",
        "salary_min",
        "salary_max",
        "salary_currency",
        "skills_required",
        "deadline",
        "created_at",
        "updated_at",
    )

    for field_name in optional_fields:
        if field_name in fields:
            data[field_name] = _serialize_value(
                getattr(job, field_name, None)
            )

    return data


class AdminJobListAPIView(APIView):
    """
    GET /api/admin/jobs/

    Liste toutes les offres pour l'administrateur :
    recherche, filtrage, tri et pagination.
    """

    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        fields = _concrete_fields(Job)
        queryset = Job.objects.all()

        # Charger les relations existantes afin d'éviter des requêtes répétées.
        relations = [
            name for name in ("company", "recruiter")
            if name in fields
        ]
        if relations:
            queryset = queryset.select_related(*relations)

        # Recherche textuelle.
        search = request.query_params.get("search", "").strip()

        if search:
            conditions = Q()

            for field_name in (
                "title",
                "description",
                "location",
                "sector",
                "education_level",
            ):
                if field_name in fields:
                    conditions |= Q(**{
                        f"{field_name}__icontains": search
                    })

            if "company" in fields:
                conditions |= Q(company__name__icontains=search)

            if "recruiter" in fields:
                conditions |= (
                    Q(recruiter__email__icontains=search)
                    | Q(recruiter__first_name__icontains=search)
                    | Q(recruiter__last_name__icontains=search)
                )

            queryset = queryset.filter(conditions)

        # Filtrage par statut.
        selected_status = request.query_params.get("status", "").strip()

        if selected_status and "status" in fields:
            valid_statuses = {
                str(value)
                for value, label in Job._meta.get_field("status").choices
            }

            if selected_status not in valid_statuses:
                return Response(
                    {"detail": "Le statut demandé est invalide."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            queryset = queryset.filter(status=selected_status)

        # Filtrage par type de contrat.
        contract_type = request.query_params.get(
            "contract_type", ""
        ).strip()

        if contract_type and "contract_type" in fields:
            valid_contracts = {
                str(value)
                for value, label in Job._meta.get_field(
                    "contract_type"
                ).choices
            }

            if contract_type not in valid_contracts:
                return Response(
                    {"detail": "Le type de contrat est invalide."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            queryset = queryset.filter(contract_type=contract_type)

        # Tri limité aux options prévues par l'API.
        sort = request.query_params.get("sort", "recent")

        ordering_options = {
            "recent": "-created_at" if "created_at" in fields else "-pk",
            "oldest": "created_at" if "created_at" in fields else "pk",
            "title": "title" if "title" in fields else "pk",
            "title_desc": "-title" if "title" in fields else "-pk",
        }

        queryset = queryset.order_by(
            ordering_options.get(sort, ordering_options["recent"]),
            "-pk",
        )

        # Résumé global, indépendamment des filtres de la page.
        all_jobs = Job.objects.all()
        total_jobs = all_jobs.count()
        status_counts = {}

        if "status" in fields:
            choices = Job._meta.get_field("status").choices

            for value, label in choices:
                status_counts[str(value)] = all_jobs.filter(
                    status=value
                ).count()

        summary = {
            "total_jobs": total_jobs,
            "by_status": status_counts,
            "draft_jobs": status_counts.get("DRAFT", 0),
            "published_jobs": status_counts.get("PUBLISHED", 0),
            "closed_jobs": status_counts.get("CLOSED", 0),
        }

        # Pagination : 10 résultats par défaut, maximum 50.
        try:
            page = max(1, int(request.query_params.get("page", 1)))
        except (TypeError, ValueError):
            page = 1

        try:
            page_size = int(
                request.query_params.get("page_size", 10)
            )
        except (TypeError, ValueError):
            page_size = 10

        page_size = min(max(page_size, 1), 50)

        count = queryset.count()
        total_pages = (count + page_size - 1) // page_size
        start = (page - 1) * page_size
        page_jobs = list(queryset[start:start + page_size])

        # Nombre de candidatures associé à chaque offre de la page.
        application_counts = {}
        job_ids = [job.pk for job in page_jobs]

        if job_ids and any(
            field.name == "job"
            for field in Application._meta.get_fields()
        ):
            application_counts = dict(
                Application.objects.filter(
                    job_id__in=job_ids
                )
                .values("job_id")
                .annotate(total=Count("pk"))
                .values_list("job_id", "total")
            )

        results = [
            _serialize_job(job, application_counts)
            for job in page_jobs
        ]

        return Response({
            "results": results,
            "summary": summary,
            "count": count,
            "page": page,
            "page_size": page_size,
            "total_pages": total_pages,
        })


class AdminJobStatusAPIView(APIView):
    """
    PATCH /api/admin/jobs/<id>/status/

    Permet à un administrateur de modifier le statut d'une offre.
    """

    permission_classes = [IsAuthenticated, IsAdmin]

    def patch(self, request, pk):
        job = get_object_or_404(Job, pk=pk)

        if not any(
            field.name == "status"
            for field in Job._meta.get_fields()
        ):
            return Response(
                {"detail": "Le modèle ne possède pas de champ statut."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        new_status = request.data.get("status")

        if not isinstance(new_status, str) or not new_status.strip():
            return Response(
                {"detail": "Le nouveau statut est obligatoire."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        new_status = new_status.strip().upper()

        status_choices = {
            str(value): str(label)
            for value, label in Job._meta.get_field("status").choices
        }

        if new_status not in status_choices:
            return Response(
                {
                    "detail": "Statut invalide.",
                    "allowed_statuses": list(status_choices.keys()),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        job.status = new_status
        job.save()

        return Response({
            "detail": "Le statut de l'offre a été mis à jour.",
            "job": _serialize_job(job),
        })
