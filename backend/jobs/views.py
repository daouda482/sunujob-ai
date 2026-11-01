
from django.db.models import Q
from django.utils import timezone

from rest_framework import generics
from rest_framework.permissions import AllowAny, IsAuthenticated

from .models import Job
from .permissions import IsRecruiter, IsRecruiterOwner
from .serializers import JobSerializer, PublishedJobSerializer


def get_public_jobs_queryset():
    """
    Retourne les offres publiées et encore accessibles
    aux candidats.

    Une offre est publique si :
    - son statut est PUBLISHED ;
    - elle ne possède pas de date limite ;
    - ou sa date limite n'est pas dépassée.
    """
    today = timezone.localdate()

    return (
        Job.objects
        .filter(status=Job.Status.PUBLISHED)
        .filter(
            Q(deadline__isnull=True)
            | Q(deadline__gte=today)
        )
        .select_related("company")
        .order_by("-created_at")
    )


class JobListCreateView(generics.ListCreateAPIView):
    """
    Liste et création des offres du recruteur connecté.
    """

    serializer_class = JobSerializer
    permission_classes = [IsAuthenticated, IsRecruiter]

    def get_queryset(self):
        return (
            Job.objects
            .filter(recruiter=self.request.user)
            .select_related("company", "recruiter")
            .order_by("-created_at")
        )

    def perform_create(self, serializer):
        serializer.save(recruiter=self.request.user)


class JobDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    Consultation, modification et suppression
    d'une offre appartenant au recruteur connecté.
    """

    serializer_class = JobSerializer
    permission_classes = [
        IsAuthenticated,
        IsRecruiter,
        IsRecruiterOwner,
    ]

    def get_queryset(self):
        return (
            Job.objects
            .filter(recruiter=self.request.user)
            .select_related("company", "recruiter")
        )


class PublishedJobListView(generics.ListAPIView):
    """
    Liste publique des offres disponibles.
    """

    serializer_class = PublishedJobSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        queryset = get_public_jobs_queryset()
        params = self.request.query_params

        search = params.get("search", "").strip()

        if search:
            queryset = queryset.filter(
                Q(title__icontains=search)
                | Q(description__icontains=search)
                | Q(sector__icontains=search)
                | Q(location__icontains=search)
                | Q(skills_required__icontains=search)
                | Q(company__name__icontains=search)
            )

        location = params.get("location", "").strip()

        if location:
            queryset = queryset.filter(
                location__icontains=location
            )

        sector = params.get("sector", "").strip()

        if sector:
            queryset = queryset.filter(
                sector__icontains=sector
            )

        contract_type = (
            params.get("contract_type", "")
            .strip()
            .upper()
        )

        if contract_type:
            valid_types = [
                value for value, label
                in Job.ContractType.choices
            ]

            if contract_type not in valid_types:
                return queryset.none()

            queryset = queryset.filter(
                contract_type=contract_type
            )

        return queryset


class PublishedJobDetailView(generics.RetrieveAPIView):
    """
    Détail public d'une offre publiée et non expirée.
    """

    serializer_class = PublishedJobSerializer
    permission_classes = [AllowAny]
    lookup_field = "pk"

    def get_queryset(self):
        return get_public_jobs_queryset()
