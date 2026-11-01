
from django.db.models.signals import pre_save, post_save
from django.dispatch import receiver

from applications.models import Application
from interviews.models import Interview
from .models import Notification


# --------------------------------------------------
# 1. NOTIFICATIONS LIEES AUX CANDIDATURES
# --------------------------------------------------

@receiver(pre_save, sender=Application)
def remember_previous_application_status(sender, instance, **kwargs):
    if not instance.pk:
        instance._previous_status = None
        return

    instance._previous_status = (
        Application.objects
        .filter(pk=instance.pk)
        .values_list("status", flat=True)
        .first()
    )


@receiver(post_save, sender=Application)
def notify_after_application_change(sender, instance, created, **kwargs):
    if created:
        Notification.objects.create(
            recipient=instance.job.recruiter,
            title="Nouvelle candidature reçue",
            message=(
                f"Une nouvelle candidature a été reçue pour "
                f"l'offre « {instance.job.title} »."
            ),
            notification_type=Notification.NotificationType.APPLICATION,
            related_url=f"/applications/received/{instance.pk}",
        )
        return

    previous_status = getattr(instance, "_previous_status", None)

    if previous_status and previous_status != instance.status:
        status_labels = {
            "PENDING": "En attente",
            "REVIEWING": "En cours d'étude",
            "SHORTLISTED": "Présélectionnée",
            "INTERVIEW": "Entretien",
            "ACCEPTED": "Acceptée",
            "REJECTED": "Refusée",
            "WITHDRAWN": "Retirée",
        }

        old_label = status_labels.get(previous_status, previous_status)
        new_label = status_labels.get(instance.status, instance.status)

        Notification.objects.create(
            recipient=instance.candidate,
            title="Mise à jour de votre candidature",
            message=(
                f"Le statut de votre candidature pour "
                f"« {instance.job.title} » est passé de "
                f"« {old_label} » à « {new_label} »."
            ),
            notification_type=(
                Notification.NotificationType.APPLICATION_STATUS
            ),
            related_url=f"/applications/my/{instance.pk}",
        )


# --------------------------------------------------
# 2. NOTIFICATIONS LIEES AUX ENTRETIENS
# --------------------------------------------------

@receiver(pre_save, sender=Interview)
def remember_previous_interview_data(sender, instance, **kwargs):
    if not instance.pk:
        instance._previous_interview_data = None
        return

    instance._previous_interview_data = (
        Interview.objects
        .filter(pk=instance.pk)
        .values("scheduled_at", "status")
        .first()
    )


@receiver(post_save, sender=Interview)
def notify_after_interview_change(sender, instance, created, **kwargs):
    candidate = instance.application.candidate
    job_title = instance.application.job.title

    if created:
        Notification.objects.create(
            recipient=candidate,
            title="Nouvel entretien programmé",
            message=(
                f"Un entretien est programmé pour votre candidature "
                f"au poste « {job_title} », le "
                f"{instance.scheduled_at:%d/%m/%Y à %H:%M}."
            ),
            notification_type=Notification.NotificationType.INTERVIEW,
            related_url=f"/interviews/candidate/{instance.pk}",
        )
        return

    previous_data = getattr(
        instance,
        "_previous_interview_data",
        None,
    )

    if not previous_data:
        return

    old_status = previous_data["status"]
    old_date = previous_data["scheduled_at"]

    if old_status != instance.status:
        if instance.status == Interview.Status.CANCELLED:
            title = "Entretien annulé"
            message = (
                f"Votre entretien pour le poste « {job_title} » "
                "a été annulé."
            )
        elif instance.status == Interview.Status.RESCHEDULED:
            title = "Entretien reporté"
            message = (
                f"Votre entretien pour le poste « {job_title} » "
                f"a été reporté au "
                f"{instance.scheduled_at:%d/%m/%Y à %H:%M}."
            )
        elif instance.status == Interview.Status.COMPLETED:
            title = "Entretien terminé"
            message = (
                f"Votre entretien pour le poste « {job_title} » "
                "est marqué comme terminé."
            )
        else:
            title = "Mise à jour de votre entretien"
            message = (
                f"Le statut de votre entretien pour le poste "
                f"« {job_title} » a été modifié."
            )

    elif old_date != instance.scheduled_at:
        title = "Horaire de l'entretien modifié"
        message = (
            f"L'horaire de votre entretien pour le poste "
            f"« {job_title} » a changé. "
            f"Nouvelle date : "
            f"{instance.scheduled_at:%d/%m/%Y à %H:%M}."
        )
    else:
        return

    Notification.objects.create(
        recipient=candidate,
        title=title,
        message=message,
        notification_type=Notification.NotificationType.INTERVIEW,
        related_url=f"/interviews/candidate/{instance.pk}",
    )