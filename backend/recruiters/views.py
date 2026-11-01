from django.core.exceptions import FieldDoesNotExist
from django.db.models import Q
from rest_framework import generics
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from applications.models import Application
from .models import Interview
from .permissions import IsCandidate, IsRecruiter
from .serializers import InterviewSerializer


def valid_lookup(model, lookup):
    """
    Vérifie qu'un chemin de relation ORM existe réellement
    avant de l'utiliser dans une requête.
    """
    current_model = model

    for part in lookup.split("__"):
        try:
            field = current_model._meta.get_field(part)
        except FieldDoesNotExist:
            return False

        related_model = getattr(field, "related_model", None)

        if related_model is None:
            if part != lookup.split("__")[-1]:
                return False
        else:
            current_model = related_model

    return True


def recruiter_application_lookups():
    """
    Chemins possibles entre une candidature, son offre et le recruteur.
    On conserve uniquement ceux qui existent dans les modèles du projet.
    """
    job_model = Application._meta.get_field("job").related_model

    possible_paths = [
        "job__recruiter",
        "job__created_by",
        "job__company__user",
        "job__company__owner",
        "job__company__recruiter",
        "job__company__created_by",
    ]

    return [
        path
        for path in possible_paths
        if valid_lookup(Application, path)
    ]


def recruiter_applications(user):
    """
    Renvoie les candidatures appartenant aux offres du recruteur.
    """
    paths = recruiter_application_lookups()

    if not paths:
        raise ValidationError({
            "configuration": (
                "Impossible de déterminer le propriétaire des offres. "
                "Vérifiez la relation entre Job, Company et le recruteur "
                "dans jobs/models.py et companies/models.py."
            )
        })

    condition = Q()

    for path in paths:
        condition |= Q(**{path: user})

    return (
        Application.objects
        .filter(condition)
        .select_related("candidate", "job")
        .distinct()
    )


def recruiter_interviews(user):
    """
    Entretiens liés uniquement aux candidatures de ce recruteur.
    """
    application_ids = recruiter_applications(user).values_list(
        "id", flat=True
    )

    return (
        Interview.objects
        .filter(application_id__in=application_ids)
        .select_related(
            "application",
            "application__candidate",
            "application__job",
            "created_by",
        )
        .order_by("scheduled_at")
    )


class RecruiterInterviewListCreateView(APIView):
    permission_classes = [IsAuthenticated, IsRecruiter]

    def get(self, request):
        interviews = recruiter_interviews(request.user)
        serializer = InterviewSerializer(interviews, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = InterviewSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        application_id = serializer.validated_data.get("application")

        if not application_id:
            raise ValidationError({
                "application": "Veuillez sélectionner une candidature."
            })

        try:
            application = recruiter_applications(request.user).get(
                pk=application_id.pk
            )
        except Application.DoesNotExist:
            raise PermissionDenied(
                "Cette candidature n'existe pas ou ne vous appartient pas."
            )

        # Les candidatures rejetées ou retirées ne peuvent pas être convoquées.
        if application.status in ["REJECTED", "WITHDRAWN"]:
            raise ValidationError({
                "application": (
                    "Impossible de programmer un entretien pour "
                    "une candidature rejetée ou retirée."
                )
            })

        interview = serializer.save(
            application=application,
            created_by=request.user,
        )

        return Response(
            InterviewSerializer(interview).data,
            status=201,
        )


class RecruiterInterviewDetailView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated, IsRecruiter]
    serializer_class = InterviewSerializer

    def get_object(self):
        try:
            return recruiter_interviews(self.request.user).get(
                pk=self.kwargs["pk"]
            )
        except Interview.DoesNotExist:
            from rest_framework.exceptions import NotFound
            raise NotFound("Entretien introuvable.")

    def get(self, request, pk):
        interview = self.get_object()
        return Response(self.get_serializer(interview).data)

    def patch(self, request, pk):
        interview = self.get_object()
        serializer = self.get_serializer(
            interview,
            data=request.data,
            partial=True,
        )
        serializer.is_valid(raise_exception=True)

        if "application" in serializer.validated_data:
            new_application = serializer.validated_data["application"]

            if new_application.pk != interview.application_id:
                try:
                    recruiter_applications(request.user).get(
                        pk=new_application.pk
                    )
                except Application.DoesNotExist:
                    raise PermissionDenied(
                        "Cette candidature ne vous appartient pas."
                    )

                if new_application.status in ["REJECTED", "WITHDRAWN"]:
                    raise ValidationError({
                        "application": (
                            "Cette candidature ne peut pas être convoquée."
                        )
                    })

        interview = serializer.save()
        return Response(self.get_serializer(interview).data)

    def delete(self, request, pk):
        interview = self.get_object()
        interview.delete()
        return Response(status=204)


class CandidateInterviewListView(generics.ListAPIView):
    permission_classes = [IsAuthenticated, IsCandidate]
    serializer_class = InterviewSerializer

    def get_queryset(self):
        return (
            Interview.objects
            .filter(application__candidate=self.request.user)
            .select_related(
                "application",
                "application__candidate",
                "application__job",
                "created_by",
            )
            .order_by("scheduled_at")
        )


class CandidateInterviewDetailView(generics.RetrieveAPIView):
    permission_classes = [IsAuthenticated, IsCandidate]
    serializer_class = InterviewSerializer

    def get_queryset(self):
        return (
            Interview.objects
            .filter(application__candidate=self.request.user)
            .select_related(
                "application",
                "application__candidate",
                "application__job",
                "created_by",
            )
        )