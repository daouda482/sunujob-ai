from django.conf import settings
from django.db import models


class CompanyVerificationRequest(models.Model):

    class Status(models.TextChoices):
        PENDING = "PENDING", "En attente"
        APPROVED = "APPROVED", "Approuvée"
        REJECTED = "REJECTED", "Rejetée"

    # La demande reste conservée même si l'entreprise est supprimée.
    company = models.ForeignKey(
        "companies.Company",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="verification_requests",
    )

    company_name = models.CharField(max_length=255)

    submitted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="company_verification_submissions",
    )

    submitted_by_email = models.EmailField(blank=True, default="")
    registration_number = models.CharField(max_length=100)

    document = models.FileField(
        upload_to="company_verification_documents/",
    )

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
        db_index=True,
    )

    admin_notes = models.TextField(blank=True, default="")

    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="company_verification_reviews",
    )

    reviewed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Demande de vérification d'entreprise"
        verbose_name_plural = "Demandes de vérification d'entreprises"
        indexes = [
            models.Index(
                fields=["status", "-created_at"],
                name="company_verif_status_date",
            ),
        ]

    def __str__(self):
        return (
            f"{self.company_name} - "
            f"{self.get_status_display()}"
        )