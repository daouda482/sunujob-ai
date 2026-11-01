
from datetime import date, datetime
from decimal import Decimal

from django.db.models import Q
from django.shortcuts import get_object_or_404

from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from applications.models import Application
from users.permissions import IsAdmin


def concrete_fields(model):
    return {
        field.name
        for field in model._meta.get_fields()
        if getattr(field, "concrete", False)
    }


def serialize_value(value):
    if isinstance(value, (datetime, date)):
        return value.isoformat()

    if isinstance(value, Decimal):
        return float(value)

    if isinstance(value, (str, int, float, bool)) or value is None:
        return value

    if isinstance(value, (list, dict)):
        return value

    return str(value)


def choice_label(model, field_name, value):
    try:
        choices = dict(model._meta.get_field(field_name).choices)
        return str(choices.get(value, value or "Non renseigné"))
    except Exception:
        return str(value or "Non renseigné")


def relation_model(model, field_name):
    try:
        field = model._meta.get_field(field_name)
        if field.is_relation:
            return field.remote_field.model
    except Exception:
        pass

    return None


def get_candidate_information(application):
    """
    Accepte un candidat directement lié à User ou lié à un profil
    possédant une relation user.
    """
    candidate = getattr(application, "candidate", None)

    if candidate is None:
        return {
            "candidate_id": None,
            "candidate_name": "Candidat inconnu",
            "candidate_email": "",
            "candidate_phone": "",
            "candidate_city": "",
        }

    user = getattr(candidate, "user", None) or candidate

    first_name = getattr(user, "first_name", "") or ""
    last_name = getattr(user, "last_name", "") or ""
    name = f"{first_name} {last_name}".strip()

    if not name:
        name = (
            getattr(user, "username", "")
            or getattr(user, "email", "")
            or "Candidat"
        )

    city = (
        getattr(candidate, "city", "")
        or getattr(user, "city", "")
        or ""
    )

    return {
        "candidate_id": getattr(user, "pk", None),
        "candidate_name": name,
        "candidate_email": getattr(user, "email", "") or "",
        "candidate_phone": (
            getattr(candidate, "phone", "")
            or getattr(user, "phone", "")
            or ""
        ),
        "candidate_city": city,
    }


def serialize_application(application, request=None):
    job = getattr(application, "job", None)
    company = getattr(job, "company", None) if job else None

    data = {
        "id": application.pk,
        "status": getattr(application, "status", ""),
        "status_label": choice_label(
            Application,
            "status",
            getattr(application, "status", None),
        ),
        "job_id": getattr(application, "job_id", None),
        "job_title": getattr(job, "title", "Offre inconnue")
        if job else "Offre inconnue",
        "company_name": getattr(company, "name", "")
        or "Entreprise non renseignée",
        **get_candidate_information(application),
    }

    fields = concrete_fields(Application)

    # Champs facultatifs : seuls ceux réellement présents sont exposés.
    for field_name in (
        "created_at",
        "updated_at",
        "cover_letter",
        "motivation",
        "message",
    ):
        if field_name in fields:
            data[field_name] = serialize_value(
                getattr(application, field_name, None)
            )

    # Le fichier de candidature n'est exposé qu'aux administrateurs.
    for field_name in ("resume", "cv", "cv_file"):
        if field_name in fields:
            file_value = getattr(application, field_name, None)

            try:
                file_url = file_value.url if file_value else None
                if file_url and request is not None:
                    file_url = request.build_absolute_uri(file_url)
                data["resume_url"] = file_url
            except (ValueError, AttributeError):
                data["resume_url"] = None

            if data.get("resume_url"):
                break

    return data


def build_search_query(search):
    query = Q()
    app_fields = concrete_fields(Application)

    # Chercher dans le titre et les informations de l'offre.
    job_model = relation_model(Application, "job")
    if job_model:
        job_fields = concrete_fields(job_model)

        if "title" in job_fields:
            query |= Q(job__title__icontains=search)

        if "company" in job_fields:
            company_model = relation_model(job_model, "company")
            if company_model and "name" in concrete_fields(company_model):
                query |= Q(job__company__name__icontains=search)

    # Chercher le candidat, qu'il soit lié directement à User
    # ou à un profil ayant une relation user.
    candidate_model = relation_model(Application, "candidate")

    if candidate_model:
        candidate_fields = concrete_fields(candidate_model)
        prefix = "candidate"

        if "user" in candidate_fields:
            user_model = relation_model(candidate_model, "user")
            user_fields = (
                concrete_fields(user_model) if user_model else set()
            )
            prefix = "candidate__user"
        else:
            user_fields = candidate_fields

        for field_name in ("email", "username", "first_name", "last_name"):
            if field_name in user_fields:
                query |= Q(**{
                    f"{prefix}__{field_name}__icontains": search
                })

    # Permet aussi de chercher une référence numérique.
    if search.isdigit():
        query |= Q(pk=int(search))

    # Évite un filtre vide si les relations sont différentes du modèle prévu.
    if not query.children and "status" in app_fields:
        query |= Q(status__icontains=search)

    return query


class AdminApplicationListAPIView(APIView):
    """GET /api/admin/applications/"""

    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        fields = concrete_fields(Application)
        queryset = Application.objects.all()

        # Charger les relations habituelles pour limiter les requêtes.
        related_paths = []

        if relation_model(Application, "candidate"):
            related_paths.append("candidate")

            candidate_model = relation_model(Application, "candidate")
            if "user" in concrete_fields(candidate_model):
                related_paths.append("candidate__user")

        if relation_model(Application, "job"):
            related_paths.append("job")
            job_model = relation_model(Application, "job")

            if "company" in concrete_fields(job_model):
                related_paths.append("job__company")

        if related_paths:
            queryset = queryset.select_related(*related_paths)

        search = request.query_params.get("search", "").strip()
        if search:
            queryset = queryset.filter(build_search_query(search))

        selected_status = request.query_params.get("status", "").strip()

        status_choices = {}
        if "status" in fields:
            status_choices = {
                str(value): str(label)
                for value, label in Application._meta.get_field(
                    "status"
                ).choices
            }

        if selected_status:
            if selected_status not in status_choices:
                return Response(
                    {"detail": "Le statut demandé est invalide."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            queryset = queryset.filter(status=selected_status)

        sort_options = {
            "recent": "-created_at" if "created_at" in fields else "-pk",
            "oldest": "created_at" if "created_at" in fields else "pk",
        }

        sort = request.query_params.get("sort", "recent")
        queryset = queryset.order_by(
            sort_options.get(sort, sort_options["recent"]),
            "-pk",
        )

        # Statistiques globales, sans tenir compte des filtres.
        all_applications = Application.objects.all()
        by_status = {
            value: all_applications.filter(status=value).count()
            for value in status_choices
        }

        summary = {
            "total": all_applications.count(),
            "by_status": by_status,
            "pending": by_status.get("PENDING", 0),
            "reviewing": by_status.get("REVIEWING", 0),
            "shortlisted": by_status.get("SHORTLISTED", 0),
            "interview": by_status.get("INTERVIEW", 0),
            "accepted": by_status.get("ACCEPTED", 0),
            "rejected": by_status.get("REJECTED", 0),
            "withdrawn": by_status.get("WITHDRAWN", 0),
        }

        try:
            page = max(1, int(request.query_params.get("page", 1)))
        except (ValueError, TypeError):
            page = 1

        try:
            page_size = int(request.query_params.get("page_size", 10))
        except (ValueError, TypeError):
            page_size = 10

        page_size = min(max(page_size, 1), 50)

        count = queryset.count()
        total_pages = max(1, (count + page_size - 1) // page_size)
        start = (page - 1) * page_size
        applications = queryset[start:start + page_size]

        return Response({
            "results": [
                serialize_application(application, request)
                for application in applications
            ],
            "summary": summary,
            "count": count,
            "page": page,
            "page_size": page_size,
            "total_pages": total_pages,
            "status_choices": [
                {"value": value, "label": label}
                for value, label in status_choices.items()
            ],
        })


class AdminApplicationStatusAPIView(APIView):
    """PATCH /api/admin/applications/<id>/status/"""

    permission_classes = [IsAuthenticated, IsAdmin]

    def patch(self, request, pk):
        application = get_object_or_404(Application, pk=pk)

        fields = concrete_fields(Application)
        if "status" not in fields:
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

        choices = {
            str(value): str(label)
            for value, label in Application._meta.get_field(
                "status"
            ).choices
        }

        if new_status not in choices:
            return Response(
                {
                    "detail": "Statut invalide.",
                    "allowed_statuses": [
                        {"value": value, "label": label}
                        for value, label in choices.items()
                    ],
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        application.status = new_status
        application.save(update_fields=["status"])

        return Response({
            "detail": "Le statut de la candidature a été mis à jour.",
            "application": serialize_application(application, request),
        })
