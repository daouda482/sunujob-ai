
from django.urls import path

from .views import (
    NotificationListView,
    NotificationDetailView,
    UnreadNotificationCountView,
    MarkNotificationReadView,
    MarkAllNotificationsReadView,
)

urlpatterns = [
    # Liste des notifications de l'utilisateur connecté
    path(
        "",
        NotificationListView.as_view(),
        name="notification-list",
    ),

    # Nombre de notifications non lues
    path(
        "unread-count/",
        UnreadNotificationCountView.as_view(),
        name="notification-unread-count",
    ),

    # Marquer toutes les notifications comme lues
    path(
        "mark-all-read/",
        MarkAllNotificationsReadView.as_view(),
        name="notification-mark-all-read",
    ),

    # Marquer une notification précise comme lue
    path(
        "<int:pk>/read/",
        MarkNotificationReadView.as_view(),
        name="notification-mark-read",
    ),

    # Détail d'une notification
    path(
        "<int:pk>/",
        NotificationDetailView.as_view(),
        name="notification-detail",
    ),
]
