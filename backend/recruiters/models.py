from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone


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
        "applications.Application",
        on_delete=models.CASCADE,
        related_name="interviews",
        verbose_name="Candidature",
    )

    interview_type = models.CharField(
        max_length=20,
        choices=InterviewType.choices,
        default=InterviewType.ONLINE,
        verbose_name="Type d'entretien",
    )

    scheduled_at = models.DateTimeField(
        verbose_name="Date et heure",
    )

    location = models.CharField(
        max_length=255,
        blank=True,
        verbose_name="Lieu",
    )

    meeting_link = models.URLField(
        max_length=500,
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

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="created_interviews",
        verbose_name="Recruteur créateur",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Entretien"
        verbose_name_plural = "Entretiens"
        ordering = ["scheduled_at"]
        indexes = [
            models.Index(fields=["scheduled_at"]),
            models.Index(fields=["status"]),
        ]

    def clean(self):
        errors = {}

        if self.interview_type == self.InterviewType.IN_PERSON:
            if not self.location.strip():
                errors["location"] = (
                    "Le lieu est obligatoire pour un entretien en présentiel."
                )

        if self.interview_type == self.InterviewType.ONLINE:
            if not self.meeting_link.strip():
                errors["meeting_link"] = (
                    "Le lien est obligatoire pour un entretien en ligne."
                )

        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return (
            f"Entretien #{self.pk} — "
            f"{self.application} — {self.scheduled_at}"
        )