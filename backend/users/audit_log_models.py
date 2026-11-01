from django.conf import settings
from django.db import models

class AuditLog(models.Model):
    """
    Historique des opérations réalisées par les administrateurs.
    Ne stocke ni mots de passe ni contenu des requêtes.
    """

    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="admin_audit_logs",
    )

    actor_email = models.EmailField(blank=True, default="")

    action = models.CharField(max_length=180)
    method = models.CharField(max_length=10)
    path = models.CharField(max_length=500)

    status_code = models.PositiveSmallIntegerField(
        null=True,
        blank=True,
    )

    succeeded = models.BooleanField(default=False)

    ip_address = models.GenericIPAddressField(
        null=True,
        blank=True,
    )

    user_agent = models.CharField(
        max_length=500,
        blank=True,
        default="",
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Journal d'activité"
        verbose_name_plural = "Journaux d'activité"
        indexes = [
            models.Index(
                fields=["-created_at"],
                name="audit_created_idx",
            ),
            models.Index(
                fields=["succeeded", "-created_at"],
                name="audit_result_date_idx",
            ),
            models.Index(
                fields=["method", "-created_at"],
                name="audit_method_date_idx",
            ),
        ]

    def __str__(self):
        return (
            f"{self.actor_email or 'Administrateur'} - "
            f"{self.method} {self.path} - "
            f"{self.created_at:%Y-%m-%d %H:%M}"
        )