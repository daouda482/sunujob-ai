from django.db.models import Q
from django.utils.dateparse import parse_date

from rest_framework import generics, serializers
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAuthenticated

from users.permissions import IsAdmin
from users.audit_log_models import AuditLog


class AdminAuditLogSerializer(serializers.ModelSerializer):
    actor_label = serializers.SerializerMethodField()

    class Meta:
        model = AuditLog
        fields = [
            "id",
            "actor_label",
            "actor_email",
            "action",
            "method",
            "path",
            "status_code",
            "succeeded",
            "ip_address",
            "user_agent",
            "created_at",
        ]

    def get_actor_label(self, obj):
        if obj.actor:
            first_name = getattr(obj.actor, "first_name", "") or ""
            last_name = getattr(obj.actor, "last_name", "") or ""
            full_name = f"{first_name} {last_name}".strip()

            if full_name:
                return full_name

        return obj.actor_email or "Administrateur"


class AdminAuditLogPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100


class AdminAuditLogListAPIView(generics.ListAPIView):
    serializer_class = AdminAuditLogSerializer
    permission_classes = [IsAuthenticated, IsAdmin]
    pagination_class = AdminAuditLogPagination

    def get_queryset(self):
        queryset = AuditLog.objects.select_related("actor").all()

        search = self.request.query_params.get("search", "").strip()
        method = self.request.query_params.get("method", "").upper()
        result = self.request.query_params.get("result", "").lower()
        start_date = parse_date(
            self.request.query_params.get("start_date", "")
        )
        end_date = parse_date(
            self.request.query_params.get("end_date", "")
        )

        if search:
            queryset = queryset.filter(
                Q(actor_email__icontains=search)
                | Q(action__icontains=search)
                | Q(path__icontains=search)
                | Q(ip_address__icontains=search)
            )

        if method in {"POST", "PUT", "PATCH", "DELETE"}:
            queryset = queryset.filter(method=method)

        if result == "success":
            queryset = queryset.filter(succeeded=True)
        elif result == "failed":
            queryset = queryset.filter(succeeded=False)

        if start_date:
            queryset = queryset.filter(
                created_at__date__gte=start_date
            )

        if end_date:
            queryset = queryset.filter(
                created_at__date__lte=end_date
            )

        return queryset