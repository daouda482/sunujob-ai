
import logging

from django.db import transaction
from django.db.models import Q
from django.utils import timezone

from rest_framework import generics
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated

from audit_logs.models import AuditLog
from audit_logs.services import record_audit

from applications.models import Application

from interviews.models import Interview, InterviewReminder
from interviews.permissions import IsRecruiter, IsCandidate
from interviews.serializers import InterviewSerializer
from interviews.tasks import (
    send_interview_event_email,
    schedule_interview_sms,
)

from notifications.models import Notification
from notifications.services import create_notification
from notifications.notification_events import notify_application_status


logger = logging.getLogger(__name__)


# =========================================================
# 1. COMMUNICATIONS AVEC LE CANDIDAT
# =========================================================

def schedule_candidate_communication(
    candidate,
    title,
    message,
    email_subject,
    email_message,
    sms_message=None,
):
    """
    Déclenche les communications après validation de la transaction.

    Canaux :
    - Notification dans le tableau de bord.
    - Email via Celery.
    - SMS si le service SMS est activé.
    """

    def callback():

        # Notification dans le tableau de bord.
        try:
            create_notification(
                recipient=candidate,
                title=title,
                message=message,
                notification_type=Notification.NotificationType.INTERVIEW,
                related_url="/candidate/interviews",
            )

            logger.info(
                "Notification créée pour le candidat %s.",
                candidate.pk,
            )

        except Exception:
            logger.exception(
                "Erreur lors de la création de la notification "
                "du candidat %s.",
                candidate.pk,
            )

        # Email.
        try:
            if candidate.email:
                send_interview_event_email.delay(
                    candidate.email,
                    candidate.first_name or "Candidat",
                    email_subject,
                    email_message,
                )

                logger.info(
                    "Email programmé pour le candidat %s.",
                    candidate.pk,
                )
            else:
                logger.warning(
                    "Aucune adresse email pour le candidat %s.",
                    candidate.pk,
                )

        except Exception:
            logger.exception(
                "Impossible de programmer l'email du candidat %s.",
                candidate.pk,
            )

        # SMS.
        if sms_message:
            try:
                schedule_interview_sms(
                    candidate=candidate,
                    message=sms_message,
                )

            except Exception:
                logger.exception(
                    "Impossible de programmer le SMS du candidat %s.",
                    candidate.pk,
                )

    transaction.on_commit(callback)


# =========================================================
# 2. REQUÊTES DES ENTRETIENS
# =========================================================

def recruiter_interviews(user):
    """
    Retourne uniquement les entretiens appartenant
    au recruteur connecté.
    """

    return (
        Interview.objects
        .filter(
            recruiter=user,
            application__job__recruiter=user,
        )
        .select_related(
            "application",
            "application__candidate",
            "application__job",
            "application__job__company",
            "recruiter",
        )
        .order_by("scheduled_at")
    )


def candidate_interviews(user):
    """
    Retourne uniquement les entretiens du candidat connecté.
    """

    return (
        Interview.objects
        .filter(
            application__candidate=user,
        )
        .select_related(
            "application",
            "application__candidate",
            "application__job",
            "application__job__company",
            "recruiter",
        )
        .order_by("scheduled_at")
    )


def filter_interviews_by_period(queryset, period=None):
    """
    Filtre les entretiens selon leur période.

    upcoming :
        Entretiens futurs programmés ou reportés.

    history :
        Entretiens passés, terminés ou annulés.

    all ou absence de paramètre :
        Tous les entretiens.
    """

    if not period or period == "all":
        return queryset

    now = timezone.now()

    if period == "upcoming":
        return queryset.filter(
            scheduled_at__gte=now,
            status__in=[
                Interview.Status.SCHEDULED,
                Interview.Status.RESCHEDULED,
            ],
        )

    if period == "history":
        return queryset.filter(
            Q(scheduled_at__lt=now)
            | Q(
                status__in=[
                    Interview.Status.COMPLETED,
                    Interview.Status.CANCELLED,
                ]
            )
        )

    raise ValidationError({
        "period": (
            "Période invalide. Valeurs autorisées : "
            "upcoming, history ou all."
        )
    })


# =========================================================
# 3. INFORMATIONS SUR LES ENTRETIENS
# =========================================================

def get_interview_metadata(interview):

    return {
        "interview_id": interview.pk,
        "application_id": interview.application_id,
        "job_title": interview.application.job.title,
        "interview_type": interview.interview_type,
        "scheduled_at": interview.scheduled_at.isoformat(),
        "location": interview.location,
        "meeting_link": interview.meeting_link,
        "message": interview.message,
        "status": interview.status,
    }


def interview_date_text(interview):

    return timezone.localtime(
        interview.scheduled_at
    ).strftime("%d/%m/%Y à %H:%M")


def interview_email_details(interview):

    details = (
        f"Poste : {interview.application.job.title}\n"
        f"Date et heure : {interview_date_text(interview)}\n"
        f"Type : {interview.get_interview_type_display()}\n"
        f"Statut : {interview.get_status_display()}\n"
    )

    if interview.location:
        details += f"Lieu : {interview.location}\n"

    if interview.meeting_link:
        details += (
            f"Lien de visioconférence : "
            f"{interview.meeting_link}\n"
        )

    if interview.message:
        details += (
            f"\nMessage du recruteur :\n"
            f"{interview.message}\n"
        )

    return details


def interview_sms_details(interview, introduction):
    """
    Prépare le contenu du SMS.
    """

    date_text = interview_date_text(interview)
    job_title = interview.application.job.title

    message = (
        f"SunuJob AI : {introduction} "
        f"Entretien pour {job_title}, le {date_text}. "
    )

    if interview.location:
        message += f"Lieu : {interview.location}. "

    if interview.meeting_link:
        message += f"Lien : {interview.meeting_link}"

    return message.strip()


# =========================================================
# 4. INVALIDATION DES ANCIENS RAPPELS
# =========================================================

def invalidate_old_interview_reminders(interview):
    """
    Invalide les rappels non terminés lorsque :
    - La date de l'entretien change.
    - L'entretien est annulé.

    Les rappels sont conservés dans la base de données.
    """

    now = timezone.now()

    reminders = InterviewReminder.objects.filter(
        interview=interview,
        sent_at__isnull=True,
        is_invalidated=False,
    )

    if interview.status == Interview.Status.CANCELLED:

        updated_count = reminders.update(
            is_invalidated=True,
            remind_at=now,
            last_error="Rappel invalidé : entretien annulé.",
        )

    else:

        updated_count = reminders.exclude(
            scheduled_at=interview.scheduled_at,
        ).update(
            is_invalidated=True,
            remind_at=now,
            last_error=(
                "Rappel invalidé : la date de l'entretien a changé."
            ),
        )

    if updated_count:
        logger.info(
            "%s ancien(s) rappel(s) invalidé(s) pour l'entretien %s.",
            updated_count,
            interview.pk,
        )

    return updated_count


# =========================================================
# 5. RECRUTEUR : LISTE ET CRÉATION
# =========================================================

class RecruiterInterviewListCreateView(generics.ListCreateAPIView):

    serializer_class = InterviewSerializer
    permission_classes = [IsAuthenticated, IsRecruiter]

    def get_queryset(self):

        queryset = recruiter_interviews(self.request.user)

        if self.request.method == "GET":
            period = self.request.query_params.get("period")

            return filter_interviews_by_period(
                queryset,
                period,
            )

        return queryset

    @transaction.atomic
    def perform_create(self, serializer):

        application = serializer.validated_data.get("application")

        if application is None:
            raise ValidationError({
                "application": "Veuillez sélectionner une candidature."
            })

        if application.job.recruiter_id != self.request.user.id:
            raise ValidationError({
                "application": (
                    "Cette candidature ne concerne pas l'une de vos offres."
                )
            })

        if application.status in [
            Application.Status.ACCEPTED,
            Application.Status.REJECTED,
            Application.Status.WITHDRAWN,
        ]:
            raise ValidationError({
                "application": (
                    "Cette candidature est clôturée et ne peut pas "
                    "faire l'objet d'un entretien."
                )
            })

        previous_status = application.status

        interview = serializer.save(
            recruiter=self.request.user,
        )

        # Synchronisation automatique du statut ATS.
        if previous_status != Application.Status.INTERVIEW:

            application.status = Application.Status.INTERVIEW

            application.save(
                update_fields=["status", "updated_at"]
            )

            record_audit(
                actor=self.request.user,
                application=application,
                action=AuditLog.ActionType.APPLICATION_STATUS_CHANGED,
                description=(
                    f"La candidature #{application.pk} est passée "
                    f"automatiquement au statut INTERVIEW après "
                    f"la programmation d'un entretien pour le poste "
                    f"« {application.job.title} »."
                ),
                old_value=previous_status,
                new_value=Application.Status.INTERVIEW,
                metadata={
                    "source": "INTERVIEW_CREATED",
                    "interview_id": interview.pk,
                    "job_id": application.job_id,
                    "job_title": application.job.title,
                },
                request=self.request,
            )

            notify_application_status(
                application,
                previous_status,
                Application.Status.INTERVIEW,
            )

        # Audit de création.
        record_audit(
            actor=self.request.user,
            application=application,
            interview=interview,
            action=AuditLog.ActionType.INTERVIEW_CREATED,
            description=(
                f"Le recruteur {self.request.user.email} a programmé "
                f"un entretien pour le poste "
                f"« {application.job.title} »."
            ),
            new_value=interview.status,
            metadata=get_interview_metadata(interview),
            request=self.request,
        )

        # Communication au candidat.
        candidate = application.candidate
        job_title = application.job.title
        date_text = interview_date_text(interview)

        email_message = (
            f"Un entretien a été programmé pour votre candidature "
            f"au poste « {job_title} ».\n\n"
            f"{interview_email_details(interview)}"
        )

        sms_message = interview_sms_details(
            interview,
            "Un nouvel entretien est programmé.",
        )

        schedule_candidate_communication(
            candidate=candidate,
            title="Nouvel entretien programmé",
            message=(
                f"Un entretien a été programmé pour le poste "
                f"« {job_title} » le {date_text}."
            ),
            email_subject=(
                f"Confirmation de votre entretien - {job_title}"
            ),
            email_message=email_message,
            sms_message=sms_message,
        )


# =========================================================
# 6. RECRUTEUR : DÉTAIL ET MODIFICATION
# =========================================================

class RecruiterInterviewDetailView(generics.RetrieveUpdateAPIView):

    serializer_class = InterviewSerializer
    permission_classes = [IsAuthenticated, IsRecruiter]

    def get_queryset(self):
        return recruiter_interviews(self.request.user)

    @transaction.atomic
    def perform_update(self, serializer):

        interview = serializer.instance

        previous_data = get_interview_metadata(interview)
        previous_status = interview.status
        previous_scheduled_at = interview.scheduled_at

        updated_interview = serializer.save()

        new_data = get_interview_metadata(updated_interview)

        changed_fields = [
            field
            for field in previous_data
            if previous_data[field] != new_data[field]
        ]

        if not changed_fields:
            return

        is_cancelled = (
            updated_interview.status == Interview.Status.CANCELLED
            and previous_status != Interview.Status.CANCELLED
        )

        is_rescheduled = (
            updated_interview.scheduled_at != previous_scheduled_at
        )

        # Invalidation des anciens rappels.
        if is_rescheduled or is_cancelled:
            invalidate_old_interview_reminders(updated_interview)

        # Préparation des communications.
        if is_cancelled:

            action = AuditLog.ActionType.INTERVIEW_CANCELLED
            title = "Entretien annulé"

            message = (
                f"L'entretien prévu pour le poste "
                f"« {updated_interview.application.job.title} » "
                f"a été annulé."
            )

            email_subject = "Annulation de votre entretien"

            email_message = (
                f"{message}\n\n"
                "Nous vous remercions de votre compréhension."
            )

            sms_message = (
                f"SunuJob AI : votre entretien pour "
                f"{updated_interview.application.job.title} "
                f"a été annulé. Consultez votre espace candidat."
            )

        else:

            action = AuditLog.ActionType.INTERVIEW_UPDATED
            title = "Entretien mis à jour"

            if is_rescheduled:
                message = (
                    f"La date de votre entretien pour le poste "
                    f"« {updated_interview.application.job.title} » "
                    f"a été modifiée. Nouvelle date : "
                    f"{interview_date_text(updated_interview)}."
                )
            else:
                message = (
                    f"Les informations de votre entretien pour le poste "
                    f"« {updated_interview.application.job.title} » "
                    f"ont été mises à jour."
                )

            email_subject = "Modification de votre entretien"

            email_message = (
                f"{message}\n\n"
                f"{interview_email_details(updated_interview)}"
            )

            sms_message = interview_sms_details(
                updated_interview,
                "Les informations de votre entretien ont été modifiées.",
            )

        # Journal d'activité.
        record_audit(
            actor=self.request.user,
            application=updated_interview.application,
            interview=updated_interview,
            action=action,
            description=message,
            old_value=str(previous_data),
            new_value=str(new_data),
            metadata={
                "changed_fields": changed_fields,
                "previous_data": previous_data,
                "new_data": new_data,
            },
            request=self.request,
        )

        # Communication au candidat.
        schedule_candidate_communication(
            candidate=updated_interview.application.candidate,
            title=title,
            message=message,
            email_subject=email_subject,
            email_message=email_message,
            sms_message=sms_message,
        )


# =========================================================
# 7. CANDIDAT : LISTE DE SES ENTRETIENS
# =========================================================

class CandidateInterviewListView(generics.ListAPIView):

    serializer_class = InterviewSerializer
    permission_classes = [IsAuthenticated, IsCandidate]

    def get_queryset(self):

        queryset = candidate_interviews(self.request.user)

        period = self.request.query_params.get("period")

        return filter_interviews_by_period(
            queryset,
            period,
        )


# =========================================================
# 8. CANDIDAT : DÉTAIL D'UN ENTRETIEN
# =========================================================

class CandidateInterviewDetailView(generics.RetrieveAPIView):

    serializer_class = InterviewSerializer
    permission_classes = [IsAuthenticated, IsCandidate]

    def get_queryset(self):
        return candidate_interviews(self.request.user)
