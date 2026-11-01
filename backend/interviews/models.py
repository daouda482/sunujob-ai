
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
        verbose_name="Candidature"
    )

    recruiter = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="scheduled_interviews",
        verbose_name="Recruteur"
    )

    interview_type = models.CharField(
        max_length=20,
        choices=InterviewType.choices,
        default=InterviewType.IN_PERSON,
        verbose_name="Type d'entretien"
    )

    scheduled_at = models.DateTimeField(
        verbose_name="Date et heure de l'entretien"
    )

    location = models.CharField(
        max_length=255,
        blank=True,
        verbose_name="Lieu de l'entretien"
    )

    meeting_link = models.URLField(
        blank=True,
        verbose_name="Lien de visioconférence"
    )

    message = models.TextField(
        blank=True,
        verbose_name="Message au candidat"
    )

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.SCHEDULED,
        verbose_name="Statut"
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Date de création"
    )

    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name="Dernière modification"
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