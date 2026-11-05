
from django.conf import settings
from django.db import models


class AuditLog(models.Model):
    """
    Historique des actions importantes réalisées sur SunuJob AI.
    """

    class ActionType(models.TextChoices):
        APPLICATION_CREATED = "APPLICATION_CREATED", "Candidature créée"
        APPLICATION_STATUS_CHANGED = "APPLICATION_STATUS_CHANGED", "Statut modifié"
        APPLICATION_NOTE_UPDATED = "APPLICATION_NOTE_UPDATED", "Note du recruteur modifiée"

        INTERVIEW_CREATED = "INTERVIEW_CREATED", "Entretien programmé"
        INTERVIEW_UPDATED = "INTERVIEW_UPDATED", "Entretien modifié"
        INTERVIEW_CANCELLED = "INTERVIEW_CANCELLED", "Entretien annulé"
        INTERVIEW_DELETED = "INTERVIEW_DELETED", "Entretien supprimé"

        EVALUATION_CREATED = "EVALUATION_CREATED", "Évaluation créée"
        EVALUATION_UPDATED = "EVALUATION_UPDATED", "Évaluation modifiée"

        OTHER = "OTHER", "Autre action"

    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="audit_logs",
        verbose_name="Utilisateur responsable",
    )

    application = models.ForeignKey(
        "applications.Application",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="audit_logs",
        verbose_name="Candidature concernée",
    )

    interview = models.ForeignKey(
        "interviews.Interview",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="audit_logs",
        verbose_name="Entretien concerné",
    )

    action = models.CharField(
        max_length=50,
        choices=ActionType.choices,
        default=ActionType.OTHER,
        verbose_name="Type d'action",
    )

    description = models.TextField(
        verbose_name="Description de l'action",
    )

    old_value = models.TextField(
        blank=True,
        verbose_name="Ancienne valeur",
    )

    new_value = models.TextField(
        blank=True,
        verbose_name="Nouvelle valeur",
    )

    metadata = models.JSONField(
        default=dict,
        blank=True,
        verbose_name="Informations complémentaires",
    )

    ip_address = models.GenericIPAddressField(
        null=True,
        blank=True,
        verbose_name="Adresse IP",
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Date de l'action",
    )

    class Meta:
        verbose_name = "Journal d'activité"
        verbose_name_plural = "Journaux d'activité"
        ordering = ["-created_at"]

        indexes = [
            models.Index(fields=["action", "created_at"]),
            models.Index(fields=["application", "created_at"]),
            models.Index(fields=["actor", "created_at"]),
        ]

    def __str__(self):
        return f"{self.get_action_display()} - {self.created_at:%d/%m/%Y %H:%M}"
