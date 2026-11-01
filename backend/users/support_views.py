from django.db.models import Count, Q
from django.shortcuts import get_object_or_404
from django.utils import timezone

from rest_framework import generics, status
from rest_framework.exceptions import ValidationError
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from users.permissions import IsAdmin
from notifications.notification_events import notify_support_reply

from users.support_models import SupportMessage, SupportTicket
from users.support_serializers import (
    AdminSupportMessageCreateSerializer,
    SupportMessageCreateSerializer,
    SupportTicketCreateSerializer,
    SupportTicketSerializer,
)


class SupportTicketPagination(PageNumberPagination):
    page_size = 15
    page_size_query_param = "page_size"
    max_page_size = 100


class UserSupportTicketListCreateAPIView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    pagination_class = SupportTicketPagination

    def get_queryset(self):
        return SupportTicket.objects.filter(created_by=self.request.user).select_related(
            "created_by", "assigned_to"
        ).prefetch_related("messages__sender")

    def get_serializer_class(self):
        return SupportTicketCreateSerializer if self.request.method == "POST" else SupportTicketSerializer

    def get_serializer_context(self):
        return {**super().get_serializer_context(), "request": self.request}

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        ticket = serializer.save(created_by=request.user)
        ticket = SupportTicket.objects.select_related("created_by", "assigned_to").prefetch_related("messages__sender").get(pk=ticket.pk)
        return Response(SupportTicketSerializer(ticket, context={"request": request}).data, status=status.HTTP_201_CREATED)


class UserSupportTicketDetailAPIView(generics.RetrieveAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = SupportTicketSerializer

    def get_queryset(self):
        return SupportTicket.objects.filter(created_by=self.request.user).select_related(
            "created_by", "assigned_to"
        ).prefetch_related("messages__sender")


class UserSupportMessageCreateAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        ticket = get_object_or_404(SupportTicket, pk=pk, created_by=request.user)
        if ticket.status in {SupportTicket.Status.RESOLVED, SupportTicket.Status.CLOSED}:
            raise ValidationError({"detail": "Ce ticket est clôturé. Créez une nouvelle demande si le problème persiste."})
        serializer = SupportMessageCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        message = SupportMessage.objects.create(ticket=ticket, sender=request.user, message=serializer.validated_data["message"])
        if ticket.status == SupportTicket.Status.WAITING_USER:
            ticket.status = SupportTicket.Status.IN_PROGRESS
        ticket.updated_at = timezone.now()
        ticket.save(update_fields=["status", "updated_at"])
        return Response({"id": message.pk, "message": "Votre réponse a été envoyée."}, status=status.HTTP_201_CREATED)


class AdminSupportTicketListAPIView(generics.ListAPIView):
    permission_classes = [IsAuthenticated, IsAdmin]
    serializer_class = SupportTicketSerializer
    pagination_class = SupportTicketPagination

    def get_queryset(self):
        qs = SupportTicket.objects.select_related("created_by", "assigned_to").prefetch_related("messages__sender")
        params = self.request.query_params
        search = params.get("search", "").strip()
        selected_status = params.get("status", "").upper()
        selected_priority = params.get("priority", "").upper()
        selected_category = params.get("category", "").upper()
        if selected_status in SupportTicket.Status.values:
            qs = qs.filter(status=selected_status)
        if selected_priority in SupportTicket.Priority.values:
            qs = qs.filter(priority=selected_priority)
        if selected_category in SupportTicket.Category.values:
            qs = qs.filter(category=selected_category)
        if search:
            qs = qs.filter(
                Q(subject__icontains=search)
                | Q(description__icontains=search)
                | Q(created_by__email__icontains=search)
                | Q(messages__message__icontains=search)
            ).distinct()
        return qs

    def list(self, request, *args, **kwargs):
        response = super().list(request, *args, **kwargs)
        response.data["summary"] = SupportTicket.objects.aggregate(
            total=Count("id"),
            open=Count("id", filter=Q(status=SupportTicket.Status.OPEN)),
            in_progress=Count("id", filter=Q(status=SupportTicket.Status.IN_PROGRESS)),
            waiting_user=Count("id", filter=Q(status=SupportTicket.Status.WAITING_USER)),
            resolved=Count("id", filter=Q(status=SupportTicket.Status.RESOLVED)),
            urgent=Count("id", filter=Q(priority=SupportTicket.Priority.URGENT) & ~Q(status__in=[SupportTicket.Status.RESOLVED, SupportTicket.Status.CLOSED])),
        )
        return response


class AdminSupportTicketDetailAPIView(generics.RetrieveAPIView):
    permission_classes = [IsAuthenticated, IsAdmin]
    serializer_class = SupportTicketSerializer
    queryset = SupportTicket.objects.select_related("created_by", "assigned_to").prefetch_related("messages__sender")


class AdminSupportMessageCreateAPIView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request, pk):
        ticket = get_object_or_404(SupportTicket, pk=pk)
        serializer = AdminSupportMessageCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        is_internal = serializer.validated_data.get("is_internal", False)
        message = SupportMessage.objects.create(
            ticket=ticket,
            sender=request.user,
            message=serializer.validated_data["message"],
            is_internal=is_internal,
        )

        # Une réponse publique du support déclenche une notification au demandeur.
        # Les notes internes ne déclenchent jamais de notification utilisateur.
        if not is_internal:
            notify_support_reply(ticket=ticket, support_message=message)

        if not is_internal and ticket.status not in {SupportTicket.Status.RESOLVED, SupportTicket.Status.CLOSED}:
            ticket.status = SupportTicket.Status.WAITING_USER
        ticket.updated_at = timezone.now()
        ticket.save(update_fields=["status", "updated_at"])
        return Response({"id": message.pk, "message": "Réponse enregistrée."}, status=status.HTTP_201_CREATED)


class AdminSupportTicketUpdateAPIView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def patch(self, request, pk):
        ticket = get_object_or_404(SupportTicket, pk=pk)
        new_status = request.data.get("status", ticket.status)
        new_priority = request.data.get("priority", ticket.priority)
        valid_statuses = set(SupportTicket.Status.values)
        valid_priorities = set(SupportTicket.Priority.values)
        if new_status not in valid_statuses:
            raise ValidationError({"status": "Statut non valide."})
        if new_priority not in valid_priorities:
            raise ValidationError({"priority": "Priorité non valide."})
        ticket.status = new_status
        ticket.priority = new_priority
        if new_status == SupportTicket.Status.CLOSED:
            ticket.assigned_to = request.user
        elif "assigned_to_me" in request.data and request.data["assigned_to_me"] is True:
            ticket.assigned_to = request.user
        ticket.updated_at = timezone.now()
        ticket.save(update_fields=["status", "priority", "assigned_to", "updated_at"])
        ticket = SupportTicket.objects.select_related("created_by", "assigned_to").prefetch_related("messages__sender").get(pk=ticket.pk)
        return Response(SupportTicketSerializer(ticket, context={"request": request}).data)
