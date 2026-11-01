
from django.conf import settings
from django.db import models


class Notification(models.Model):
    class NotificationType(models.TextChoices):
        APPLICATION = "APPLICATION", "Candidature"
        APPLICATION_STATUS = "APPLICATION_STATUS", "Statut de candidature"
        INTERVIEW = "INTERVIEW", "Entretien"
        SYSTEM = "SYSTEM", "Système"

    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notifications",
        verbose_name="Destinataire",
    )
    title = models.CharField(
        max_length=200,
        verbose_name="Titre",
    )
    message = models.TextField(verbose_name="Message")
    notification_type = models.CharField(
        max_length=30,
        choices=NotificationType.choices,
        default=NotificationType.SYSTEM,
        verbose_name="Type de notification",
    )
    related_url = models.CharField(
        max_length=255,
        blank=True,
        verbose_name="Lien associé",
    )
    is_read = models.BooleanField(default=False, verbose_name="Lue")
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Date de création",
    )

    class Meta:
        verbose_name = "Notification"
        verbose_name_plural = "Notifications"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.title} - {self.recipient.email}"
