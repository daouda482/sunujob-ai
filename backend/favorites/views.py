from django.shortcuts import get_object_or_404

from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from users.permissions import IsCandidate

from .models import Favorite
from .serializers import (
    FavoriteSerializer,
    FavoriteCreateSerializer,
)


class FavoriteListCreateView(APIView):
    permission_classes = [IsAuthenticated, IsCandidate]

    def get(self, request):
        favorites = Favorite.objects.filter(
            candidate=request.user,
            job__status="PUBLISHED",
        ).select_related("job", "job__company")

        serializer = FavoriteSerializer(favorites, many=True)

        return Response(serializer.data)

    def post(self, request):
        serializer = FavoriteCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        job = serializer.context["job"]

        favorite, created = Favorite.objects.get_or_create(
            candidate=request.user,
            job=job,
        )

        return Response(
            {
                "message": (
                    "Offre ajoutée aux favoris."
                    if created
                    else "Cette offre figure déjà dans vos favoris."
                ),
                "favorite": FavoriteSerializer(favorite).data,
                "is_favorite": True,
            },
            status=(
                status.HTTP_201_CREATED
                if created
                else status.HTTP_200_OK
            ),
        )


class FavoriteDeleteView(APIView):
    permission_classes = [IsAuthenticated, IsCandidate]

    def delete(self, request, job_id):
        favorite = get_object_or_404(
            Favorite,
            candidate=request.user,
            job_id=job_id,
        )

        favorite.delete()

        return Response(
            {"message": "Offre retirée de vos favoris."},
            status=status.HTTP_200_OK,
        )


class FavoriteCheckView(APIView):
    permission_classes = [IsAuthenticated, IsCandidate]

    def get(self, request, job_id):
        is_favorite = Favorite.objects.filter(
            candidate=request.user,
            job_id=job_id,
        ).exists()

        return Response({"is_favorite": is_favorite})