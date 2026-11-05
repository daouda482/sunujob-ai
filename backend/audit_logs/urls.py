
from django.urls import path

from .views import (
    AuditLogListView,
    ApplicationAuditLogListView,
)

urlpatterns = [
    path(
        "",
        AuditLogListView.as_view(),
        name="audit-log-list",
    ),
    path(
        "applications/<int:application_id>/",
        ApplicationAuditLogListView.as_view(),
        name="application-audit-logs",
    ),
]
