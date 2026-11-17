
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
    """
    Permet à un utilisateur authentifié de signaler
    une offre, une entreprise ou un compte utilisateur.

    Après la création du signalement, les administrateurs
    actifs sont notifiés.
    """

    serializer_class = ModerationReportCreateSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        report = serializer.save()

        # Import local pour éviter les dépendances circulaires.
        from notifications.notification_events import (
            notify_new_moderation_report,
        )

        notify_new_moderation_report(report)

class ModerationReportPagination(PageNumberPagination):
    """Pagination de la liste des signalements."""

    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100

class AdminModerationReportListAPIView(generics.ListAPIView):
    """
    Liste et filtre les signalements.

    Accès strictement réservé aux administrateurs.
    """

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

        start_date_value = params.get("start_date", "").strip()
        end_date_value = params.get("end_date", "").strip()

        start_date = parse_date(start_date_value) if start_date_value else None
        end_date = parse_date(end_date_value) if end_date_value else None

        # Vérification des dates.
        if start_date_value and start_date is None:
            raise ValidationError({
                "start_date": "Veuillez fournir une date valide (AAAA-MM-JJ)."
            })

        if end_date_value and end_date is None:
            raise ValidationError({
                "end_date": "Veuillez fournir une date valide (AAAA-MM-JJ)."
            })

        if start_date and end_date and start_date > end_date:
            raise ValidationError({
                "end_date": "La date de fin doit être postérieure à la date de début."
            })

        # Valeurs autorisées selon les choix du modèle.
        valid_statuses = {
            item.value for item in ModerationReport.Status
        }

        valid_target_types = {
            item.value for item in ModerationReport.TargetType
        }

        valid_reasons = {
            item.value for item in ModerationReport.Reason
        }

        # Filtrage par statut.
        if selected_status:
            if selected_status not in valid_statuses:
                raise ValidationError({
                    "status": "Statut de signalement invalide."
                })

            queryset = queryset.filter(status=selected_status)

        # Filtrage par type de cible.
        if target_type:
            if target_type not in valid_target_types:
                raise ValidationError({
                    "target_type": "Type de cible invalide."
                })

            queryset = queryset.filter(target_type=target_type)

        # Filtrage par motif.
        if reason:
            if reason not in valid_reasons:
                raise ValidationError({
                    "reason": "Motif de signalement invalide."
                })

            queryset = queryset.filter(reason=reason)

        # Recherche textuelle.
        if search:
            queryset = queryset.filter(
                Q(target_label__icontains=search)
                | Q(reporter_email__icontains=search)
                | Q(description__icontains=search)
                | Q(admin_notes__icontains=search)
                | Q(reporter__email__icontains=search)
            )

        # Filtrage par période.
        if start_date:
            queryset = queryset.filter(
                created_at__date__gte=start_date
            )

        if end_date:
            queryset = queryset.filter(
                created_at__date__lte=end_date
            )

        return queryset.order_by("-created_at")

    def list(self, request, *args, **kwargs):
        response = super().list(request, *args, **kwargs)

        # Statistiques globales, indépendantes des filtres.
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

        # La pagination DRF renvoie normalement un dictionnaire.
        if isinstance(response.data, dict):
            response.data["summary"] = counts

        return response

class AdminModerationReportStatusAPIView(APIView):
    """
    Permet à un administrateur de modifier le statut
    et les notes internes d'un signalement.
    """

    permission_classes = [IsAuthenticated, IsAdmin]

    def patch(self, request, pk):
        report = get_object_or_404(
            ModerationReport,
            pk=pk,
        )

        new_status = str(
            request.data.get("status", "")
        ).strip().upper()

        valid_statuses = {
            item.value for item in ModerationReport.Status
        }

        if new_status not in valid_statuses:
            raise ValidationError({
                "status": "Veuillez choisir un statut valide."
            })

        update_fields = [
            "status",
            "updated_at",
        ]

        # Mise à jour facultative des notes administratives.
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
            update_fields.append("admin_notes")

        # Mise à jour du statut.
        report.status = new_status

        # Le statut OPEN signifie que le dossier n'est pas encore traité.
        if new_status == ModerationReport.Status.OPEN:
            report.reviewed_by = None
            report.reviewed_at = None
        else:
            report.reviewed_by = request.user
            report.reviewed_at = timezone.now()

        update_fields.extend([
            "reviewed_by",
            "reviewed_at",
        ])

        report.save(update_fields=update_fields)

        serializer = AdminModerationReportSerializer(report)

        return Response(
            serializer.data,
            status=status.HTTP_200_OK,
        )