
from django.shortcuts import get_object_or_404

from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Notification
from .serializers import NotificationSerializer


class NotificationListView(generics.ListAPIView):
    """
    Retourne uniquement les notifications de l'utilisateur connecté.
    Les notifications les plus récentes apparaissent en premier.
    """
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(
            recipient=self.request.user
        ).order_by("-created_at")


class NotificationDetailView(generics.RetrieveAPIView):
    """
    Retourne le détail d'une notification appartenant à l'utilisateur.
    """
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(
            recipient=self.request.user
        )


class UnreadNotificationCountView(APIView):
    """
    Retourne le nombre de notifications non lues.
    Utile pour afficher le compteur sur l'icône de cloche.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        unread_count = Notification.objects.filter(
            recipient=request.user,
            is_read=False,
        ).count()

        return Response(
            {"unread_count": unread_count},
            status=status.HTTP_200_OK,
        )


class MarkNotificationReadView(APIView):
    """
    Marque une notification appartenant à l'utilisateur comme lue.
    """
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        notification = get_object_or_404(
            Notification,
            pk=pk,
            recipient=request.user,
        )

        if not notification.is_read:
            notification.is_read = True
            notification.save(update_fields=["is_read"])

        return Response(
            NotificationSerializer(notification).data,
            status=status.HTTP_200_OK,
        )


class MarkAllNotificationsReadView(APIView):
    """
    Marque toutes les notifications non lues de l'utilisateur comme lues.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        updated_count = Notification.objects.filter(
            recipient=request.user,
            is_read=False,
        ).update(is_read=True)

        return Response(
            {
                "message": (
                    "Toutes vos notifications ont été marquées comme lues."
                ),
                "updated_count": updated_count,
                "unread_count": 0,
            },
            status=status.HTTP_200_OK,
        )
