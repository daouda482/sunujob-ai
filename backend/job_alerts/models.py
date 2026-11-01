from django.conf import settings
from django.db import models


class JobAlert(models.Model):
    candidate = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="job_alerts",
    )

    name = models.CharField(
        max_length=150,
        default="Mon alerte emploi",
    )

    keywords = models.CharField(
        max_length=255,
        blank=True,
        help_text="Mots-clés séparés par des virgules.",
    )

    sector = models.CharField(max_length=150, blank=True)
    location = models.CharField(max_length=150, blank=True)

    contract_type = models.CharField(
        max_length=30,
        blank=True,
        choices=[
            ("CDI", "CDI"),
            ("CDD", "CDD"),
            ("INTERNSHIP", "Stage"),
            ("APPRENTICESHIP", "Alternance"),
            ("FREELANCE", "Freelance"),
            ("TEMPORARY", "Intérim"),
            ("VACATION", "Vacation"),
        ],
    )

    education_level = models.CharField(max_length=50, blank=True)

    is_active = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Alerte emploi"
        verbose_name_plural = "Alertes emploi"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.name} - {self.candidate}"