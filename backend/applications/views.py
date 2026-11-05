
import logging

from django.db import IntegrityError, transaction
from django.db.models import Q

from rest_framework import generics, status
from rest_framework.exceptions import ValidationError
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from audit_logs.models import AuditLog
from audit_logs.services import record_audit

from notifications.notification_events import (
    notify_application_status,
    notify_new_application,
)

from users.permissions import IsCandidate, IsRecruiter

from .models import Application
from .serializers import (
    ApplicationSerializer,
    ApplicationStatusUpdateSerializer,
)

logger = logging.getLogger(__name__)


def application_queryset():
    """
    Charge les relations utilisées par le sérialiseur afin de limiter
    les requêtes à la base de données.
    """
    return Application.objects.select_related(
        "candidate",
        "job",
        "job__company",
        "job__recruiter",
    )


class ApplicationCreateView(generics.CreateAPIView):
    """
    Permet à un candidat authentifié de postuler à une offre publiée.

    Le CV est automatiquement récupéré depuis le profil candidat.
    Une notification est envoyée au recruteur après l'enregistrement.
    L'action est également enregistrée dans le journal d'activité.
    """

    serializer_class = ApplicationSerializer
    permission_classes = [IsAuthenticated, IsCandidate]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            with transaction.atomic():

                candidate_profile = getattr(
                    request.user,
                    "candidate_profile",
                    None,
                )

                # Vérifier que le candidat possède un CV enregistré.
                if (
                    not candidate_profile
                    or not candidate_profile.resume
                ):
                    return Response(
                        {
                            "resume": [
                                "Vous devez d'abord enregistrer votre CV "
                                "dans la rubrique Mon CV."
                            ]
                        },
                        status=status.HTTP_400_BAD_REQUEST,
                    )

                # Créer la candidature.
                application = serializer.save(
                    candidate=request.user,
                    resume=candidate_profile.resume,
                )

                # Enregistrer l'action dans le journal d'activité.
                record_audit(
                    actor=request.user,
                    application=application,
                    action=AuditLog.ActionType.APPLICATION_CREATED,
                    description=(
                        f"{request.user.email} a soumis une candidature "
                        f"pour l'offre : {application.job.title}."
                    ),
                    new_value=application.status,
                    metadata={
                        "job_id": application.job_id,
                        "job_title": application.job.title,
                    },
                    request=request,
                )

                # Notifier le recruteur.
                notify_new_application(application)

        except IntegrityError:
            logger.warning(
                "Tentative de candidature en doublon pour l'utilisateur %s.",
                request.user.pk,
            )

            raise ValidationError({
                "job": "Vous avez déjà postulé à cette offre."
            })

        output_serializer = self.get_serializer(application)

        return Response(
            output_serializer.data,
            status=status.HTTP_201_CREATED,
        )


class MyApplicationListView(generics.ListAPIView):
    """Liste uniquement les candidatures du candidat connecté."""

    serializer_class = ApplicationSerializer
    permission_classes = [IsAuthenticated, IsCandidate]

    def get_queryset(self):
        return application_queryset().filter(
            candidate=self.request.user
        ).order_by("-applied_at")


class MyApplicationDetailView(generics.RetrieveAPIView):
    """Affiche uniquement une candidature appartenant au candidat connecté."""

    serializer_class = ApplicationSerializer
    permission_classes = [IsAuthenticated, IsCandidate]

    def get_queryset(self):
        return application_queryset().filter(
            candidate=self.request.user
        )


class ReceivedApplicationListView(generics.ListAPIView):
    """
    Liste les candidatures reçues pour les offres du recruteur connecté.

    Filtres disponibles :
    - status : statut de la candidature ;
    - job : identifiant de l'offre ;
    - search : nom, prénom, email, titre de l'offre ou entreprise.
    """

    serializer_class = ApplicationSerializer
    permission_classes = [IsAuthenticated, IsRecruiter]

    def get_queryset(self):
        queryset = application_queryset().filter(
            job__recruiter=self.request.user
        )

        status_filter = self.request.query_params.get(
            "status", ""
        ).strip()

        job_id = self.request.query_params.get(
            "job", ""
        ).strip()

        search = self.request.query_params.get(
            "search", ""
        ).strip()

        valid_statuses = {
            value for value, label in Application.Status.choices
        }

        if status_filter in valid_statuses:
            queryset = queryset.filter(status=status_filter)

        if job_id:
            if not job_id.isdigit():
                raise ValidationError({
                    "job": "L'identifiant de l'offre doit être un entier."
                })

            queryset = queryset.filter(job_id=int(job_id))

        if search:
            queryset = queryset.filter(
                Q(candidate__email__icontains=search)
                | Q(candidate__first_name__icontains=search)
                | Q(candidate__last_name__icontains=search)
                | Q(job__title__icontains=search)
                | Q(job__company__name__icontains=search)
            )

        return queryset.order_by("-applied_at")


class ReceivedApplicationDetailView(generics.RetrieveAPIView):
    """
    Affiche une candidature uniquement si elle concerne une offre
    appartenant au recruteur connecté.
    """

    serializer_class = ApplicationSerializer
    permission_classes = [IsAuthenticated, IsRecruiter]

    def get_queryset(self):
        return application_queryset().filter(
            job__recruiter=self.request.user
        )


class ApplicationStatusUpdateView(generics.UpdateAPIView):
    """
    Permet au recruteur de modifier le statut ou la note interne
    d'une candidature reçue pour l'une de ses offres.

    Les changements sont enregistrés dans le journal d'activité.
    Le candidat est notifié uniquement si le statut change.
    """

    permission_classes = [IsAuthenticated, IsRecruiter]
    serializer_class = ApplicationStatusUpdateSerializer
    http_method_names = ["patch", "put", "head", "options"]

    def get_queryset(self):
        return application_queryset().filter(
            job__recruiter=self.request.user
        )

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()

        # Sauvegarder les anciennes valeurs.
        previous_status = instance.status
        previous_note = instance.recruiter_note

        input_serializer = self.get_serializer(
            instance,
            data=request.data,
            partial=partial,
        )

        input_serializer.is_valid(raise_exception=True)

        with transaction.atomic():

            # Enregistrer les nouvelles valeurs.
            application = input_serializer.save()

            # Journaliser le changement de statut.
            if previous_status != application.status:

                record_audit(
                    actor=request.user,
                    application=application,
                    action=AuditLog.ActionType.APPLICATION_STATUS_CHANGED,
                    description=(
                        f"Le recruteur {request.user.email} a modifié "
                        f"le statut de la candidature "
                        f"#{application.pk}."
                    ),
                    old_value=previous_status,
                    new_value=application.status,
                    metadata={
                        "old_status_label": dict(
                            Application.Status.choices
                        ).get(previous_status, previous_status),
                        "new_status_label": dict(
                            Application.Status.choices
                        ).get(
                            application.status,
                            application.status,
                        ),
                    },
                    request=request,
                )

                # Notifier le candidat uniquement si le statut change.
                notify_application_status(
                    application,
                    previous_status,
                    application.status,
                )

            # Journaliser séparément la modification de la note.
            if previous_note != application.recruiter_note:

                record_audit(
                    actor=request.user,
                    application=application,
                    action=AuditLog.ActionType.APPLICATION_NOTE_UPDATED,
                    description=(
                        f"Le recruteur {request.user.email} a modifié "
                        f"la note interne de la candidature "
                        f"#{application.pk}."
                    ),
                    old_value=previous_note,
                    new_value=application.recruiter_note,
                    request=request,
                )

        output_serializer = ApplicationSerializer(
            application,
            context=self.get_serializer_context(),
        )

        return Response(
            output_serializer.data,
            status=status.HTTP_200_OK,
        )

    def partial_update(self, request, *args, **kwargs):
        kwargs["partial"] = True
        return self.update(request, *args, **kwargs)
