
from django.conf import settings
from django.db import models

from applications.models import Application


class Interview(models.Model):

    class InterviewType(models.TextChoices):
        IN_PERSON = "IN_PERSON", "Présentiel"
        ONLINE = "ONLINE", "En ligne"
        PHONE = "PHONE", "Téléphonique"

    class Status(models.TextChoices):
        SCHEDULED = "SCHEDULED", "Programmé"
        COMPLETED = "COMPLETED", "Terminé"
        CANCELLED = "CANCELLED", "Annulé"
        RESCHEDULED = "RESCHEDULED", "Reporté"

    application = models.ForeignKey(
        Application,
        on_delete=models.CASCADE,
        related_name="interviews",
        verbose_name="Candidature",
    )

    recruiter = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="scheduled_interviews",
        verbose_name="Recruteur",
    )

    interview_type = models.CharField(
        max_length=20,
        choices=InterviewType.choices,
        default=InterviewType.IN_PERSON,
        verbose_name="Type d'entretien",
    )

    scheduled_at = models.DateTimeField(
        verbose_name="Date et heure de l'entretien"
    )

    location = models.CharField(
        max_length=255,
        blank=True,
        verbose_name="Lieu de l'entretien",
    )

    meeting_link = models.URLField(
        blank=True,
        verbose_name="Lien de visioconférence",
    )

    message = models.TextField(
        blank=True,
        verbose_name="Message au candidat",
    )

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.SCHEDULED,
        verbose_name="Statut",
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Date de création",
    )

    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name="Dernière modification",
    )

    class Meta:
        verbose_name = "Entretien"
        verbose_name_plural = "Entretiens"
        ordering = ["scheduled_at"]

    def __str__(self):
        return (
            f"Entretien - {self.application.candidate.email} "
            f"- {self.scheduled_at:%Y-%m-%d %H:%M}"
        )


class InterviewReminder(models.Model):

    class ReminderType(models.TextChoices):
        BEFORE_24_HOURS = "24H", "24 heures avant"
        BEFORE_2_HOURS = "2H", "2 heures avant"

    interview = models.ForeignKey(
        Interview,
        on_delete=models.CASCADE,
        related_name="reminders",
        verbose_name="Entretien",
    )

    reminder_type = models.CharField(
        max_length=5,
        choices=ReminderType.choices,
        verbose_name="Type de rappel",
    )

    scheduled_at = models.DateTimeField(
        verbose_name="Date prévue de l'entretien"
    )

    remind_at = models.DateTimeField(
        verbose_name="Date d'envoi du rappel"
    )

    # Ancien indicateur global conservé pour compatibilité.
    sent_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Date de traitement global",
    )

    # Suivi indépendant des différents canaux.
    email_sent_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Date d'envoi de l'email",
    )

    sms_queued_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Date de mise en file du SMS",
    )

    notification_created_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Date de création de la notification",
    )

    # Empêche le traitement des rappels devenus obsolètes.
    is_invalidated = models.BooleanField(
        default=False,
        verbose_name="Rappel invalidé",
    )

    attempts = models.PositiveIntegerField(
        default=0,
        verbose_name="Nombre de tentatives",
    )

    last_error = models.TextField(
        blank=True,
        verbose_name="Dernière erreur",
    )

    email_error = models.TextField(
        blank=True,
        verbose_name="Erreur email",
    )

    sms_error = models.TextField(
        blank=True,
        verbose_name="Erreur SMS",
    )

    notification_error = models.TextField(
        blank=True,
        verbose_name="Erreur notification",
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Date de création",
    )

    class Meta:
        verbose_name = "Rappel d'entretien"
        verbose_name_plural = "Rappels d'entretiens"
        ordering = ["remind_at"]

        constraints = [
            models.UniqueConstraint(
                fields=["interview", "reminder_type", "scheduled_at"],
                name="unique_interview_reminder_schedule",
            )
        ]

        indexes = [
            models.Index(
                fields=["remind_at", "is_invalidated"],
                name="interview_reminder_due_idx",
            )
        ]

    def __str__(self):
        return (
            f"Rappel {self.get_reminder_type_display()} "
            f"- Entretien #{self.interview_id}"
        )
