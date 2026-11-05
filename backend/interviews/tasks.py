import logging
from datetime import timedelta

from celery import shared_task
from django.conf import settings
from django.core.mail import send_mail
from django.db import transaction
from django.db.models import F
from django.utils import timezone

from interviews.models import Interview, InterviewReminder
from notifications.models import Notification
from notifications.services import create_notification
from notifications.tasks import send_sms_task


logger = logging.getLogger(__name__)


# =========================================================
# 1. EMAILS D'INFORMATION SUR LES ENTRETIENS
# =========================================================

@shared_task(
    bind=True,
    max_retries=3,
    default_retry_delay=60,
)
def send_interview_event_email(
    self,
    recipient_email,
    candidate_name,
    subject,
    message,
):
    """
    Envoie les emails de programmation, modification
    ou annulation d'un entretien.
    """

    if not recipient_email:
        logger.warning(
            "Email non envoyé : adresse du destinataire absente."
        )
        return False

    try:
        result = send_mail(
            subject=subject,
            message=(
                f"Bonjour {candidate_name or 'Candidat'},\n\n"
                f"{message}\n\n"
                "L'équipe SunuJob AI"
            ),
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[recipient_email],
            fail_silently=False,
        )

        if result <= 0:
            raise RuntimeError(
                "Le serveur SMTP n'a accepté aucun email."
            )

        logger.info(
            "Email d'entretien envoyé à %s : %s",
            recipient_email,
            subject,
        )

        return True

    except Exception as exc:
        logger.exception(
            "Erreur lors de l'envoi de l'email d'entretien."
        )
        raise self.retry(exc=exc)


# =========================================================
# 2. OUTIL D'ENVOI SMS
# =========================================================

def schedule_interview_sms(candidate, message):
    """
    Programme un SMS via Celery.

    Retourne True si la tâche SMS a été mise en file d'attente.
    """

    if not getattr(settings, "TWILIO_ENABLED", False):
        logger.info(
            "SMS non programmé : Twilio est désactivé."
        )
        return False

    phone = getattr(candidate, "phone", None)

    if not phone:
        logger.warning(
            "SMS non programmé : numéro absent pour le candidat %s.",
            candidate.pk,
        )
        return False

    try:
        send_sms_task.delay(
            phone,
            message,
        )

        logger.info(
            "Tâche SMS mise en file d'attente pour le candidat %s.",
            candidate.pk,
        )

        return True

    except Exception:
        logger.exception(
            "Impossible de programmer le SMS pour le candidat %s.",
            candidate.pk,
        )
        raise


# =========================================================
# 3. PRÉPARATION DES RAPPELS
# =========================================================

def ensure_interview_reminders():
    """
    Crée les rappels à 24 heures et à 2 heures.

    Fonctionnalités :
    - Création des nouveaux rappels.
    - Prise en charge des entretiens reportés.
    - Réactivation des anciens rappels invalidés.
    - Conservation des canaux déjà traités.
    - Conservation des rappels déjà envoyés.
    """

    now = timezone.now()

    interviews = Interview.objects.filter(
        status__in=[
            Interview.Status.SCHEDULED,
            Interview.Status.RESCHEDULED,
        ],
        scheduled_at__gt=now,
    )

    created_count = 0
    reactivated_count = 0

    reminder_definitions = [
        (
            InterviewReminder.ReminderType.BEFORE_24_HOURS,
            timedelta(hours=24),
        ),
        (
            InterviewReminder.ReminderType.BEFORE_2_HOURS,
            timedelta(hours=2),
        ),
    ]

    for interview in interviews.iterator():

        for reminder_type, delay in reminder_definitions:

            remind_at = interview.scheduled_at - delay

            # Ne pas créer de rappel dont l'heure est passée.
            if remind_at <= now:
                continue

            reminder, created = InterviewReminder.objects.get_or_create(
                interview=interview,
                reminder_type=reminder_type,
                scheduled_at=interview.scheduled_at,
                defaults={
                    "remind_at": remind_at,
                    "is_invalidated": False,
                },
            )

            if created:
                created_count += 1
                continue

            # Réactivation uniquement si le rappel n'a jamais
            # été complètement traité.
            if reminder.is_invalidated and reminder.sent_at is None:

                reminder.remind_at = remind_at
                reminder.is_invalidated = False

                # On efface les anciennes erreurs.
                # IMPORTANT : on conserve email_sent_at,
                # sms_queued_at et notification_created_at.
                reminder.last_error = ""
                reminder.email_error = ""
                reminder.sms_error = ""
                reminder.notification_error = ""

                reminder.save(
                    update_fields=[
                        "remind_at",
                        "is_invalidated",
                        "last_error",
                        "email_error",
                        "sms_error",
                        "notification_error",
                    ]
                )

                reactivated_count += 1

    logger.info(
        "%s nouveau(x) rappel(s) créé(s), "
        "%s ancien(s) rappel(s) réactivé(s).",
        created_count,
        reactivated_count,
    )

    return created_count + reactivated_count


# =========================================================
# 4. EMAIL DE RAPPEL
# =========================================================

def send_interview_reminder_email(reminder):
    """
    Envoie un email selon le type de rappel :
    - 24 heures avant ;
    - 2 heures avant.
    """

    interview = reminder.interview
    candidate = interview.application.candidate

    if not candidate.email:
        raise ValueError(
            "Adresse email du candidat absente."
        )

    job_title = interview.application.job.title

    date_text = timezone.localtime(
        interview.scheduled_at
    ).strftime("%d/%m/%Y à %H:%M")

    candidate_name = (
        candidate.first_name or "Candidat"
    )

    if (
        reminder.reminder_type
        == InterviewReminder.ReminderType.BEFORE_24_HOURS
    ):
        subject = (
            f"Rappel : votre entretien demain pour le poste {job_title}"
        )

        introduction = (
            f"Nous vous rappelons que votre entretien pour le poste "
            f"« {job_title} » est prévu demain."
        )

    elif (
        reminder.reminder_type
        == InterviewReminder.ReminderType.BEFORE_2_HOURS
    ):
        subject = (
            f"Important : votre entretien commence dans 2 heures - "
            f"{job_title}"
        )

        introduction = (
            f"Nous vous rappelons que votre entretien pour le poste "
            f"« {job_title} » commence dans environ 2 heures."
        )

    else:
        raise ValueError(
            f"Type de rappel inconnu : {reminder.reminder_type}"
        )

    message = (
        f"Bonjour {candidate_name},\n\n"
        f"{introduction}\n\n"
        f"Poste : {job_title}\n"
        f"Date et heure : {date_text}\n"
        f"Type : {interview.get_interview_type_display()}\n"
    )

    if interview.location:
        message += f"Lieu : {interview.location}\n"

    if interview.meeting_link:
        message += (
            f"Lien de visioconférence : "
            f"{interview.meeting_link}\n"
        )

    if interview.message:
        message += (
            f"\nMessage du recruteur :\n"
            f"{interview.message}\n"
        )

    message += (
        "\nNous vous souhaitons une excellente préparation.\n\n"
        "L'équipe SunuJob AI"
    )

    result = send_mail(
        subject=subject,
        message=message,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[candidate.email],
        fail_silently=False,
    )

    if result <= 0:
        raise RuntimeError(
            "Le serveur SMTP n'a accepté aucun email."
        )

    logger.info(
        "Email de rappel envoyé : candidat=%s, rappel=%s",
        candidate.pk,
        reminder.pk,
    )

    return True


# =========================================================
# 5. SUIVI DES CANAUX DE NOTIFICATION
# =========================================================

def mark_reminder_channel(
    reminder,
    field_name,
    error_field,
    error=None,
):
    """
    Enregistre le résultat d'un canal de notification.

    Succès :
    - enregistre la date de traitement ;
    - efface l'ancienne erreur.

    Échec :
    - conserve la date de traitement inchangée ;
    - enregistre l'erreur.
    """

    setattr(
        reminder,
        error_field,
        str(error)[:2000] if error else "",
    )

    update_fields = [error_field]

    if error is None:
        setattr(
            reminder,
            field_name,
            timezone.now(),
        )
        update_fields.append(field_name)

    reminder.save(
        update_fields=update_fields
    )


def reminder_channels_completed(reminder):
    """
    Vérifie que tous les canaux applicables ont été traités.
    """

    # Email obligatoire.
    if not reminder.email_sent_at:
        return False

    candidate = reminder.interview.application.candidate

    # SMS obligatoire uniquement si Twilio est activé
    # et si le candidat possède un numéro.
    sms_required = (
        getattr(settings, "TWILIO_ENABLED", False)
        and bool(getattr(candidate, "phone", None))
    )

    if sms_required and not reminder.sms_queued_at:
        return False

    # Notification du tableau de bord obligatoire.
    if not reminder.notification_created_at:
        return False

    return True


# =========================================================
# 6. TRAITEMENT D'UN RAPPEL
# =========================================================

def process_one_reminder(reminder_id):
    """
    Traite un rappel individuel.

    Canaux :
    - Email.
    - SMS si activé.
    - Notification dans le tableau de bord.

    Le verrouillage select_for_update permet de limiter
    les traitements concurrents sur les bases qui le prennent
    effectivement en charge.
    """

    with transaction.atomic():

        try:
            reminder = (
                InterviewReminder.objects
                .select_for_update()
                .select_related(
                    "interview",
                    "interview__application",
                    "interview__application__candidate",
                    "interview__application__job",
                )
                .get(pk=reminder_id)
            )

        except InterviewReminder.DoesNotExist:
            logger.warning(
                "Rappel introuvable : %s",
                reminder_id,
            )
            return False

        # Ne pas retraiter un rappel terminé ou invalidé.
        if reminder.sent_at or reminder.is_invalidated:
            return False

        interview = reminder.interview

        # Vérifier le statut de l'entretien.
        if interview.status not in [
            Interview.Status.SCHEDULED,
            Interview.Status.RESCHEDULED,
        ]:
            logger.info(
                "Rappel %s ignoré : entretien non programmé.",
                reminder.pk,
            )
            return False

        # Vérifier que la date du rappel correspond
        # toujours à la date actuelle de l'entretien.
        if interview.scheduled_at != reminder.scheduled_at:
            logger.warning(
                "Rappel %s ignoré : la date de l'entretien a changé.",
                reminder.pk,
            )
            return False

        if reminder.remind_at > timezone.now():
            return False

        candidate = interview.application.candidate
        job_title = interview.application.job.title

        # -------------------------------------------------
        # Détermination du message
        # -------------------------------------------------

        if (
            reminder.reminder_type
            == InterviewReminder.ReminderType.BEFORE_24_HOURS
        ):
            title = "Rappel : entretien demain"

            notification_message = (
                f"Votre entretien pour le poste « {job_title} » "
                f"est prévu demain à "
                f"{timezone.localtime(interview.scheduled_at):%H:%M}."
            )

        elif (
            reminder.reminder_type
            == InterviewReminder.ReminderType.BEFORE_2_HOURS
        ):
            title = "Rappel : entretien dans 2 heures"

            notification_message = (
                f"Votre entretien pour le poste « {job_title} » "
                f"commence dans environ 2 heures."
            )

        else:
            logger.warning(
                "Type de rappel inconnu : %s",
                reminder.reminder_type,
            )
            return False

        reminder.attempts += 1
        reminder.last_error = ""

        # -------------------------------------------------
        # A. EMAIL
        # -------------------------------------------------

        if not reminder.email_sent_at:

            try:
                send_interview_reminder_email(reminder)

                mark_reminder_channel(
                    reminder,
                    "email_sent_at",
                    "email_error",
                )

            except Exception as exc:

                mark_reminder_channel(
                    reminder,
                    "email_sent_at",
                    "email_error",
                    exc,
                )

                logger.exception(
                    "Erreur email pour le rappel %s.",
                    reminder.pk,
                )

        # -------------------------------------------------
        # B. SMS
        # -------------------------------------------------

        sms_required = (
            getattr(settings, "TWILIO_ENABLED", False)
            and bool(getattr(candidate, "phone", None))
        )

        if sms_required and not reminder.sms_queued_at:

            if (
                reminder.reminder_type
                == InterviewReminder.ReminderType.BEFORE_24_HOURS
            ):
                sms_message = (
                    f"SunuJob AI : rappel, votre entretien pour "
                    f"{job_title} est prévu demain à "
                    f"{timezone.localtime(interview.scheduled_at):%H:%M}."
                )

            else:
                sms_message = (
                    f"SunuJob AI : votre entretien pour {job_title} "
                    f"commence dans environ 2 heures. "
                    f"Consultez votre espace candidat pour les détails."
                )

            try:
                queued = schedule_interview_sms(
                    candidate,
                    sms_message,
                )

                if queued:
                    mark_reminder_channel(
                        reminder,
                        "sms_queued_at",
                        "sms_error",
                    )

            except Exception as exc:

                mark_reminder_channel(
                    reminder,
                    "sms_queued_at",
                    "sms_error",
                    exc,
                )

                logger.exception(
                    "Erreur SMS pour le rappel %s.",
                    reminder.pk,
                )

        else:
            # Si le SMS n'est plus applicable, on ne conserve
            # pas une ancienne erreur SMS comme erreur active.
            if reminder.sms_error:
                reminder.sms_error = ""

                reminder.save(
                    update_fields=["sms_error"]
                )

        # -------------------------------------------------
        # C. NOTIFICATION TABLEAU DE BORD
        # -------------------------------------------------

        if not reminder.notification_created_at:

            try:
                notification = create_notification(
                    recipient=candidate,
                    title=title,
                    message=notification_message,
                    notification_type=(
                        Notification.NotificationType.INTERVIEW
                    ),
                    related_url="/candidate/interviews",
                )

                if notification is None:
                    raise RuntimeError(
                        "La notification n'a pas été créée."
                    )

                mark_reminder_channel(
                    reminder,
                    "notification_created_at",
                    "notification_error",
                )

            except Exception as exc:

                mark_reminder_channel(
                    reminder,
                    "notification_created_at",
                    "notification_error",
                    exc,
                )

                logger.exception(
                    "Erreur de notification pour le rappel %s.",
                    reminder.pk,
                )

        # -------------------------------------------------
        # D. FINALISATION
        # -------------------------------------------------

        errors = [
            reminder.email_error,
            reminder.sms_error,
            reminder.notification_error,
        ]

        reminder.last_error = "\n".join(
            error for error in errors if error
        )[:2000]

        update_fields = [
            "attempts",
            "last_error",
        ]

        if reminder_channels_completed(reminder):
            reminder.sent_at = timezone.now()
            update_fields.append("sent_at")

        reminder.save(
            update_fields=update_fields
        )

        logger.info(
            "Rappel examiné : entretien=%s, type=%s, terminé=%s",
            interview.pk,
            reminder.reminder_type,
            bool(reminder.sent_at),
        )

        return bool(reminder.sent_at)


# =========================================================
# 7. TÂCHE CELERY PRINCIPALE
# =========================================================

@shared_task
def process_due_interview_reminders():
    """
    Vérifie les entretiens et traite les rappels arrivés à échéance.

    Cette tâche est exécutée chaque minute par Celery Beat.
    """

    logger.info(
        "Démarrage de la vérification des rappels."
    )

    # Création et réactivation des rappels nécessaires.
    ensure_interview_reminders()

    now = timezone.now()

    due_reminders = (
        InterviewReminder.objects
        .filter(
            sent_at__isnull=True,
            is_invalidated=False,
            remind_at__lte=now,
            interview__status__in=[
                Interview.Status.SCHEDULED,
                Interview.Status.RESCHEDULED,
            ],
            interview__scheduled_at=F("scheduled_at"),
        )
        .order_by("remind_at")
        .values_list("id", flat=True)
    )

    processed = 0
    completed = 0

    for reminder_id in due_reminders.iterator():

        result = process_one_reminder(reminder_id)

        processed += 1

        if result:
            completed += 1

    logger.info(
        "Vérification terminée : %s rappel(s) examiné(s), "
        "%s rappel(s) terminé(s).",
        processed,
        completed,
    )

    return {
        "processed": processed,
        "completed": completed,
    }