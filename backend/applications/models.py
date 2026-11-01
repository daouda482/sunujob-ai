
from django.conf import settings
from django.db import models

from jobs.models import Job


class Application(models.Model):

    class Status(models.TextChoices):
        PENDING = "PENDING", "En attente"
        REVIEWING = "REVIEWING", "En cours d'étude"
        SHORTLISTED = "SHORTLISTED", "Présélectionnée"
        INTERVIEW = "INTERVIEW", "Entretien"
        ACCEPTED = "ACCEPTED", "Acceptée"
        REJECTED = "REJECTED", "Rejetée"
        WITHDRAWN = "WITHDRAWN", "Retirée"

    candidate = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="applications",
        verbose_name="Candidat",
    )

    job = models.ForeignKey(
        Job,
        on_delete=models.CASCADE,
        related_name="applications",
        verbose_name="Offre d'emploi",
    )

    cover_letter = models.TextField(
        blank=True,
        verbose_name="Lettre de motivation",
    )

    resume = models.FileField(
        upload_to="applications/resumes/",
        blank=True,
        null=True,
        verbose_name="CV",
    )

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
        verbose_name="Statut",
    )

    recruiter_note = models.TextField(
        blank=True,
        verbose_name="Note du recruteur",
    )

    applied_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Date de candidature",
    )

    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name="Dernière modification",
    )

    class Meta:
        verbose_name = "Candidature"
        verbose_name_plural = "Candidatures"
        ordering = ["-applied_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["candidate", "job"],
                name="unique_candidate_job_application",
            )
        ]

    def __str__(self):
        return f"{self.candidate.email} - {self.job.title}"
