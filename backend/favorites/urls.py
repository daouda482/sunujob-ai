from django.urls import path

from .views import (
    FavoriteListCreateView,
    FavoriteDeleteView,
    FavoriteCheckView,
)

urlpatterns = [
    path("", FavoriteListCreateView.as_view(), name="favorite-list-create"),
    path(
        "<int:job_id>/",
        FavoriteDeleteView.as_view(),
        name="favorite-delete",
    ),
    path(
        "<int:job_id>/check/",
        FavoriteCheckView.as_view(),
        name="favorite-check",
    ),
]