
from django.core.paginator import Paginator
from django.db.models import Count, Q

from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from companies.models import Company
from jobs.models import Job
from users.permissions import IsAdmin


def company_field_names():
    return {
        field.name
        for field in Company._meta.get_fields()
        if getattr(field, "concrete", False)
    }


def serialize_company(company, available_fields):
    recruiter = getattr(company, "recruiter", None)

    data = {
        "id": company.pk,
        "name": getattr(company, "name", "") or "",
        "recruiter_id": getattr(company, "recruiter_id", None),
        "recruiter_name": "",
        "recruiter_email": "",
        "jobs_count": int(getattr(company, "jobs_count", 0) or 0),
        "published_jobs_count": int(
            getattr(company, "published_jobs_count", 0) or 0
        ),
        "verification_configured": False,
        "is_verified": None,
        "verification_status": None,
        "verification_label": None,
    }

    if recruiter is not None:
        first_name = getattr(recruiter, "first_name", "") or ""
        last_name = getattr(recruiter, "last_name", "") or ""
        data["recruiter_name"] = (
            f"{first_name} {last_name}".strip()
            or getattr(recruiter, "email", "")
            or f"Recruteur #{recruiter.pk}"
        )
        data["recruiter_email"] = getattr(recruiter, "email", "") or ""

    # Champs facultatifs : seules les propriétés existantes sont lues.
    optional_fields = (
        "description",
        "website",
        "industry",
        "sector",
        "address",
        "city",
        "country",
        "location",
        "phone",
        "email",
        "created_at",
        "updated_at",
        "is_verified",
        "verified",
        "verification_status",
        "status",
    )

    for field_name in optional_fields:
        if field_name not in available_fields:
            continue

        value = getattr(company, field_name, None)

        if field_name in ("created_at", "updated_at"):
            data[field_name] = value.isoformat() if value else None
        elif field_name in ("is_verified", "verified"):
            data[field_name] = value
        else:
            data[field_name] = str(value) if value is not None else None

    if "is_verified" in available_fields:
        data["verification_configured"] = True
        data["is_verified"] = bool(company.is_verified)
        data["verification_label"] = (
            "Vérifiée" if company.is_verified else "À vérifier"
        )
    elif "verified" in available_fields:
        data["verification_configured"] = True
        data["is_verified"] = bool(company.verified)
        data["verification_label"] = (
            "Vérifiée" if company.verified else "À vérifier"
        )
    elif "verification_status" in available_fields:
        data["verification_configured"] = True
        verification_field = Company._meta.get_field("verification_status")
        choices = dict(getattr(verification_field, "choices", []) or [])
        value = getattr(company, "verification_status", None)
        data["verification_label"] = choices.get(value, value)

    return data


class AdminCompanyListAPIView(APIView):
    """
    Annuaire des entreprises, avec recherche, filtres et pagination.
    Réservé aux administrateurs authentifiés.
    """

    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request, *args, **kwargs):
        fields = company_field_names()

        queryset = Company.objects.select_related("recruiter").annotate(
            jobs_count=Count("jobs", distinct=True),
            published_jobs_count=Count(
                "jobs",
                filter=Q(jobs__status=Job.Status.PUBLISHED),
                distinct=True,
            ),
        )

        search = request.query_params.get("search", "").strip()
        has_jobs = request.query_params.get("has_jobs", "all").strip().lower()
        sort = request.query_params.get("sort", "recent").strip().lower()

        # Recherche par entreprise et responsable.
        if search:
            condition = Q(name__icontains=search)

            if "recruiter" in fields:
                condition |= Q(recruiter__email__icontains=search)
                condition |= Q(recruiter__first_name__icontains=search)
                condition |= Q(recruiter__last_name__icontains=search)

            for field_name in ("sector", "industry", "city", "country"):
                if field_name in fields:
                    condition |= Q(**{f"{field_name}__icontains": search})

            queryset = queryset.filter(condition)

        if has_jobs == "yes":
            queryset = queryset.filter(jobs_count__gt=0)
        elif has_jobs == "no":
            queryset = queryset.filter(jobs_count=0)
        elif has_jobs != "all":
            return Response(
                {"detail": "Le filtre has_jobs doit être all, yes ou no."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if sort == "name":
            queryset = queryset.order_by("name", "pk")
        elif sort == "jobs":
            queryset = queryset.order_by("-jobs_count", "name")
        else:
            queryset = queryset.order_by(
                "-created_at" if "created_at" in fields else "-pk",
                "-pk",
            )

        try:
            requested_page = max(
                int(request.query_params.get("page", 1)),
                1,
            )
        except (TypeError, ValueError):
            requested_page = 1

        try:
            page_size = int(request.query_params.get("page_size", 10))
        except (TypeError, ValueError):
            page_size = 10

        if page_size not in (10, 20, 50):
            page_size = 10

        paginator = Paginator(queryset, page_size)
        page_obj = paginator.get_page(requested_page)

        # Compteurs globaux, non influencés par la recherche.
        all_companies = Company.objects.all().annotate(
            jobs_count=Count("jobs", distinct=True)
        )

        total_companies = Company.objects.count()

        return Response({
            "count": paginator.count,
            "page": page_obj.number,
            "page_size": page_size,
            "total_pages": paginator.num_pages,
            "has_next": page_obj.has_next(),
            "has_previous": page_obj.has_previous(),
            "results": [
                serialize_company(company, fields)
                for company in page_obj.object_list
            ],
            "summary": {
                "total_companies": total_companies,
                "companies_with_jobs": all_companies.filter(
                    jobs_count__gt=0
                ).count(),
                "companies_without_jobs": all_companies.filter(
                    jobs_count=0
                ).count(),
            },
        })
