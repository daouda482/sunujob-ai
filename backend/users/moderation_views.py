from django.db.models import Count, Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.dateparse import parse_date

from rest_framework import generics, status
from rest_framework.exceptions import ValidationError
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from users.permissions import IsAdmin
from users.moderation_models import ModerationReport
from users.moderation_serializers import (
    ModerationReportCreateSerializer,
    AdminModerationReportSerializer,
)


class ModerationReportCreateAPIView(generics.CreateAPIView):
    serializer_class = ModerationReportCreateSerializer
    permission_classes = [IsAuthenticated]


class ModerationReportPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100


class AdminModerationReportListAPIView(generics.ListAPIView):
    serializer_class = AdminModerationReportSerializer
    permission_classes = [IsAuthenticated, IsAdmin]
    pagination_class = ModerationReportPagination

    def get_queryset(self):
        queryset = ModerationReport.objects.select_related(
            "reporter",
            "reviewed_by",
        ).all()

        params = self.request.query_params

        search = params.get("search", "").strip()
        selected_status = params.get("status", "").upper()
        target_type = params.get("target_type", "").upper()
        reason = params.get("reason", "").upper()
        start_date = parse_date(params.get("start_date", ""))
        end_date = parse_date(params.get("end_date", ""))

        valid_statuses = {
            item.value for item in ModerationReport.Status
        }
        valid_target_types = {
            item.value for item in ModerationReport.TargetType
        }
        valid_reasons = {
            item.value for item in ModerationReport.Reason
        }

        if selected_status in valid_statuses:
            queryset = queryset.filter(status=selected_status)

        if target_type in valid_target_types:
            queryset = queryset.filter(target_type=target_type)

        if reason in valid_reasons:
            queryset = queryset.filter(reason=reason)

        if search:
            queryset = queryset.filter(
                Q(target_label__icontains=search)
                | Q(reporter_email__icontains=search)
                | Q(description__icontains=search)
                | Q(admin_notes__icontains=search)
                | Q(reporter__email__icontains=search)
            )

        if start_date:
            queryset = queryset.filter(created_at__date__gte=start_date)

        if end_date:
            queryset = queryset.filter(created_at__date__lte=end_date)

        return queryset

    def list(self, request, *args, **kwargs):
        response = super().list(request, *args, **kwargs)

        counts = ModerationReport.objects.aggregate(
            total=Count("id"),
            open=Count(
                "id",
                filter=Q(status=ModerationReport.Status.OPEN),
            ),
            in_review=Count(
                "id",
                filter=Q(status=ModerationReport.Status.IN_REVIEW),
            ),
            resolved=Count(
                "id",
                filter=Q(status=ModerationReport.Status.RESOLVED),
            ),
            dismissed=Count(
                "id",
                filter=Q(status=ModerationReport.Status.DISMISSED),
            ),
        )

        response.data["summary"] = counts
        return response


class AdminModerationReportStatusAPIView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def patch(self, request, pk):
        report = get_object_or_404(ModerationReport, pk=pk)

        new_status = str(request.data.get("status", "")).upper()

        valid_statuses = {
            item.value for item in ModerationReport.Status
        }

        if new_status not in valid_statuses:
            raise ValidationError({
                "status": "Veuillez choisir un statut valide."
            })

        if "admin_notes" in request.data:
            notes = request.data.get("admin_notes")

            if not isinstance(notes, str):
                raise ValidationError({
                    "admin_notes": "La note doit être du texte."
                })

            if len(notes) > 10000:
                raise ValidationError({
                    "admin_notes": (
                        "La note ne peut pas dépasser "
                        "10 000 caractères."
                    )
                })

            report.admin_notes = notes.strip()

        report.status = new_status

        if new_status == ModerationReport.Status.OPEN:
            report.reviewed_by = None
            report.reviewed_at = None
        else:
            report.reviewed_by = request.user
            report.reviewed_at = timezone.now()

        report.save()

        return Response(
            AdminModerationReportSerializer(report).data,
            status=status.HTTP_200_OK,
        )