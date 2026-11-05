
from django.db.models import Q
from django.utils import timezone

from rest_framework import generics
from rest_framework.permissions import AllowAny, IsAuthenticated

from .models import Job
from .permissions import IsRecruiter, IsRecruiterOwner
from .serializers import JobSerializer, PublishedJobSerializer


def get_public_jobs_queryset():
    """
    Retourne uniquement les offres accessibles publiquement.

    Conditions :
    - statut PUBLISHED ;
    - aucune date limite ou date limite encore valide ;
    - entreprise et recruteur chargés pour optimiser les requêtes.

    Une offre dont la date limite est aujourd'hui reste accessible
    jusqu'à la fin de cette journée à Dakar.
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

    Le recruteur ne peut consulter que ses propres offres.
    """

    serializer_class = JobSerializer
    permission_classes = [
        IsAuthenticated,
        IsRecruiter,
    ]

    def get_queryset(self):
        return (
            Job.objects
            .filter(recruiter=self.request.user)
            .select_related("company", "recruiter")
            .order_by("-created_at")
        )

    def perform_create(self, serializer):
        serializer.save(recruiter=self.request.user)


class JobDetailView(generics.RetrieveUpdateAPIView):
    """
    Consultation et modification d'une offre appartenant
    au recruteur connecté.

    La suppression physique est volontairement désactivée
    afin de préserver l'historique des recrutements.
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
    Liste publique des offres disponibles pour les candidats.

    Les offres suspendues, clôturées, expirées et archivées
    ne sont jamais retournées.
    """

    serializer_class = PublishedJobSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        queryset = get_public_jobs_queryset()
        params = self.request.query_params

        # Recherche générale
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

        # Filtrage par localisation
        location = params.get("location", "").strip()

        if location:
            queryset = queryset.filter(
                location__icontains=location
            )

        # Filtrage par secteur
        sector = params.get("sector", "").strip()

        if sector:
            queryset = queryset.filter(
                sector__icontains=sector
            )

        # Filtrage par type de contrat
        contract_type = (
            params.get("contract_type", "")
            .strip()
            .upper()
        )

        if contract_type:
            valid_types = [
                value
                for value, label in Job.ContractType.choices
            ]

            if contract_type not in valid_types:
                return queryset.none()

            queryset = queryset.filter(
                contract_type=contract_type
            )

        return queryset


class PublishedJobDetailView(generics.RetrieveAPIView):
    """
    Détail public d'une offre publiée et encore accessible.

    Une offre suspendue, clôturée ou expirée renvoie une
    réponse 404, même si son identifiant est connu.
    """

    serializer_class = PublishedJobSerializer
    permission_classes = [AllowAny]
    lookup_field = "pk"

    def get_queryset(self):
        return get_public_jobs_queryset()
