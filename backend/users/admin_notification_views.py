from django.contrib.auth import get_user_model
from django.db.models import Q
from django.utils import timezone

from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from notifications.models import Notification
from users.permissions import IsAdmin


User = get_user_model()

TITLE_FIELDS = ("title", "subject", "titre")
MESSAGE_FIELDS = ("message", "body", "content", "description", "text")
READ_FIELDS = ("is_read", "read", "is_seen", "seen")
DATE_FIELDS = ("created_at", "created_on", "timestamp", "sent_at")
URL_FIELDS = ("related_url", "action_url", "url", "link")


def get_concrete_fields(model):
    return {
        field.name: field
        for field in model._meta.get_fields()
        if getattr(field, "concrete", False)
    }


def first_existing_field(fields, candidates):
    for name in candidates:
        if name in fields:
            return name
    return None


def find_user_relation(fields):
    """
    Cherche le champ relationnel pointant directement vers le modèle User.
    Les noms courants sont prioritaires.
    """
    preferred_names = (
        "user",
        "recipient",
        "receiver",
        "owner",
        "target_user",
    )

    for name in preferred_names:
        field = fields.get(name)
        if (
            field is not None
            and getattr(field, "is_relation", False)
            and getattr(field, "related_model", None) == User
        ):
            return name

    for name, field in fields.items():
        if (
            getattr(field, "is_relation", False)
            and getattr(field, "related_model", None) == User
        ):
            return name

    return None


def serialize_notification(notification, fields, user_field):
    title_field = first_existing_field(fields, TITLE_FIELDS)
    message_field = first_existing_field(fields, MESSAGE_FIELDS)
    read_field = first_existing_field(fields, READ_FIELDS)
    date_field = first_existing_field(fields, DATE_FIELDS)
    url_field = first_existing_field(fields, URL_FIELDS)

    recipient = (
        getattr(notification, user_field, None)
        if user_field
        else None
    )

    recipient_name = ""
    recipient_email = ""
    recipient_role = ""

    if recipient is not None:
        first_name = getattr(recipient, "first_name", "") or ""
        last_name = getattr(recipient, "last_name", "") or ""

        recipient_name = f"{first_name} {last_name}".strip()
        recipient_email = getattr(recipient, "email", "") or ""
        recipient_role = getattr(recipient, "role", "") or ""

        if not recipient_name:
            recipient_name = (
                recipient_email
                or getattr(recipient, "username", "")
                or f"Utilisateur #{recipient.pk}"
            )

    created_at = (
        getattr(notification, date_field, None)
        if date_field
        else None
    )

    if hasattr(created_at, "isoformat"):
        created_at = created_at.isoformat()

    is_read = (
        getattr(notification, read_field, None)
        if read_field
        else None
    )

    title = (
        getattr(notification, title_field, None)
        if title_field
        else None
    )

    message = (
        getattr(notification, message_field, None)
        if message_field
        else None
    )

    url = (
        getattr(notification, url_field, None)
        if url_field
        else None
    )

    return {
        "id": notification.pk,
        "title": str(title or "Notification"),
        "message": str(message or ""),
        "is_read": is_read,
        "created_at": created_at,
        "related_url": str(url or ""),
        "recipient_id": getattr(recipient, "pk", None),
        "recipient_name": recipient_name or "Destinataire non renseigné",
        "recipient_email": recipient_email,
        "recipient_role": str(recipient_role),
    }


class AdminNotificationListAPIView(APIView):
    """
    GET /api/admin/notifications/

    Liste administrative en lecture seule :
    recherche, filtre de lecture et pagination.
    """

    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        fields = get_concrete_fields(Notification)

        title_field = first_existing_field(fields, TITLE_FIELDS)
        message_field = first_existing_field(fields, MESSAGE_FIELDS)
        read_field = first_existing_field(fields, READ_FIELDS)
        date_field = first_existing_field(fields, DATE_FIELDS)
        user_field = find_user_relation(fields)

        queryset = Notification.objects.all()

        if user_field:
            queryset = queryset.select_related(user_field)

        # Recherche textuelle.
        search = request.query_params.get("search", "").strip()

        if search:
            conditions = Q()

            for field_name in (title_field, message_field):
                if field_name:
                    conditions |= Q(**{
                        f"{field_name}__icontains": search
                    })

            if search.isdigit():
                conditions |= Q(pk=int(search))

            if user_field:
                user_model_fields = get_concrete_fields(User)

                for user_field_name in (
                    "email",
                    "first_name",
                    "last_name",
                    "username",
                ):
                    if user_field_name in user_model_fields:
                        conditions |= Q(**{
                            f"{user_field}__{user_field_name}__icontains": search
                        })

            if conditions.children:
                queryset = queryset.filter(conditions)
            else:
                queryset = queryset.none()

        # Filtre de lecture.
        read_filter = request.query_params.get("read", "all").strip().lower()

        if read_filter not in ("all", "read", "unread"):
            return Response(
                {"detail": "Le filtre de lecture est invalide."},
                status=400,
            )

        if read_filter != "all":
            if not read_field:
                return Response(
                    {
                        "detail": (
                            "Le modèle Notification ne possède pas "
                            "de champ de lecture reconnu."
                        )
                    },
                    status=400,
                )

            queryset = queryset.filter(**{
                read_field: read_filter == "read"
            })

        # Tri par date si un champ compatible existe.
        if date_field:
            queryset = queryset.order_by(f"-{date_field}", "-pk")
        else:
            queryset = queryset.order_by("-pk")

        # Indicateurs calculés sur l'ensemble des notifications.
        all_notifications = Notification.objects.all()

        summary = {
            "total": all_notifications.count(),
            "read": (
                all_notifications.filter(**{read_field: True}).count()
                if read_field
                else None
            ),
            "unread": (
                all_notifications.filter(**{read_field: False}).count()
                if read_field
                else None
            ),
        }

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
        total_pages = max(1, (count + page_size - 1) // page_size)

        start = (page - 1) * page_size

        notifications = queryset[start:start + page_size]

        results = [
            serialize_notification(notification, fields, user_field)
            for notification in notifications
        ]

        return Response({
            "results": results,
            "summary": summary,
            "count": count,
            "page": page,
            "page_size": page_size,
            "total_pages": total_pages,
            "read_filter_available": bool(read_field),
            "generated_at": timezone.now().isoformat(),
        })