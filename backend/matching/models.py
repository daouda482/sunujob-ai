
from django.core.validators import MinValueValidator, MaxValueValidator
from django.db import models

from candidates.models import CandidateProfile
from jobs.models import Job


class MatchResult(models.Model):
    """
    Résultat de compatibilité entre un profil candidat
    et une offre d'emploi.
    """

    candidate = models.ForeignKey(
        CandidateProfile,
        on_delete=models.CASCADE,
        related_name="match_results",
        verbose_name="Profil candidat",
    )

    job = models.ForeignKey(
        Job,
        on_delete=models.CASCADE,
        related_name="match_results",
        verbose_name="Offre d'emploi",
    )

    score = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=0,
        validators=[
            MinValueValidator(0),
            MaxValueValidator(100),
        ],
        verbose_name="Score de compatibilité (%)",
    )

    matched_skills = models.JSONField(
        default=list,
        blank=True,
        verbose_name="Compétences correspondantes",
    )

    missing_skills = models.JSONField(
        default=list,
        blank=True,
        verbose_name="Compétences manquantes",
    )

    reasons = models.JSONField(
        default=list,
        blank=True,
        verbose_name="Explications du score",
    )

    calculated_at = models.DateTimeField(
        auto_now=True,
        verbose_name="Date du dernier calcul",
    )

    class Meta:
        verbose_name = "Résultat de matching"
        verbose_name_plural = "Résultats de matching"
        ordering = ["-score", "-calculated_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["candidate", "job"],
                name="unique_candidate_job_match",
            ),
        ]

    def __str__(self):
        return (
            f"{self.candidate.user.email} - "
            f"{self.job.title} - {self.score}%"
        )
