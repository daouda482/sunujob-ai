from django.urls import path

from .views import (
    ApplicationCreateView,
    MyApplicationListView,
    MyApplicationDetailView,
    ReceivedApplicationListView,
    ReceivedApplicationDetailView,
    ApplicationStatusUpdateView,
)

urlpatterns = [
    path("", ApplicationCreateView.as_view(), name="application-create"),
    path("my/", MyApplicationListView.as_view(), name="my-applications"),
    path(
        "my/<int:pk>/",
        MyApplicationDetailView.as_view(),
        name="my-application-detail",
    ),
    path(
        "received/",
        ReceivedApplicationListView.as_view(),
        name="received-applications",
    ),
    path(
        "received/<int:pk>/",
        ReceivedApplicationDetailView.as_view(),
        name="received-application-detail",
    ),
    path(
        "received/<int:pk>/status/",
        ApplicationStatusUpdateView.as_view(),
        name="application-status-update",
    ),
]