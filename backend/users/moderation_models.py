from django.conf import settings
from django.db import models


class ModerationReport(models.Model):

    class TargetType(models.TextChoices):
        JOB = "JOB", "Offre d'emploi"
        COMPANY = "COMPANY", "Entreprise"
        USER = "USER", "Compte utilisateur"

    class Reason(models.TextChoices):
        FAKE_JOB = "FAKE_JOB", "Offre frauduleuse"
        SCAM = "SCAM", "Tentative d'escroquerie"
        FALSE_INFORMATION = "FALSE_INFORMATION", "Informations trompeuses"
        IMPERSONATION = "IMPERSONATION", "Usurpation d'identité"
        DISCRIMINATION = "DISCRIMINATION", "Discrimination"
        INAPPROPRIATE = "INAPPROPRIATE", "Contenu inapproprié"
        OTHER = "OTHER", "Autre motif"

    class Status(models.TextChoices):
        OPEN = "OPEN", "Nouveau"
        IN_REVIEW = "IN_REVIEW", "En cours d'examen"
        RESOLVED = "RESOLVED", "Résolu"
        DISMISSED = "DISMISSED", "Rejeté"

    reporter = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="moderation_reports_sent",
    )

    reporter_email = models.EmailField(
        blank=True,
        default="",
    )

    target_type = models.CharField(
        max_length=20,
        choices=TargetType.choices,
    )

    # Identifiant conservé indépendamment de la cible.
    target_id = models.PositiveBigIntegerField()

    target_label = models.CharField(
        max_length=250,
        blank=True,
        default="",
    )

    reason = models.CharField(
        max_length=30,
        choices=Reason.choices,
    )

    description = models.TextField()

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.OPEN,
    )

    admin_notes = models.TextField(
        blank=True,
        default="",
    )

    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="moderation_reports_reviewed",
    )

    reviewed_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Signalement"
        verbose_name_plural = "Signalements"
        indexes = [
            models.Index(
                fields=["status", "-created_at"],
                name="mod_report_status_date",
            ),
            models.Index(
                fields=["target_type", "target_id"],
                name="mod_report_target_idx",
            ),
            models.Index(
                fields=["reason", "-created_at"],
                name="mod_report_reason_date",
            ),
        ]

    def __str__(self):
        return (
            f"Signalement #{self.pk} - "
            f"{self.get_target_type_display()} - "
            f"{self.get_status_display()}"
        )