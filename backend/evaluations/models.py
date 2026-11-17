
from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator
from django.db import models


class Evaluation(models.Model):

    class Recommendation(models.TextChoices):
        STRONGLY_RECOMMENDED = (
            "STRONGLY_RECOMMENDED",
            "Fortement recommandé",
        )
        RECOMMENDED = "RECOMMENDED", "Recommandé"
        TO_DISCUSS = "TO_DISCUSS", "À discuter"
        NOT_RECOMMENDED = "NOT_RECOMMENDED", "Non recommandé"

    class Status(models.TextChoices):
        DRAFT = "DRAFT", "Brouillon"
        COMPLETED = "COMPLETED", "Terminée"

    application = models.ForeignKey(
        "applications.Application",
        on_delete=models.PROTECT,
        related_name="evaluations",
        verbose_name="Candidature",
    )

    interview = models.ForeignKey(
        "interviews.Interview",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="evaluations",
        verbose_name="Entretien associé",
    )

    evaluator = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="given_evaluations",
        verbose_name="Évaluateur",
    )

    technical_score = models.PositiveSmallIntegerField(
        default=0,
        validators=[MinValueValidator(0), MaxValueValidator(5)],
        verbose_name="Compétences techniques",
    )

    communication_score = models.PositiveSmallIntegerField(
        default=0,
        validators=[MinValueValidator(0), MaxValueValidator(5)],
        verbose_name="Communication",
    )

    experience_score = models.PositiveSmallIntegerField(
        default=0,
        validators=[MinValueValidator(0), MaxValueValidator(5)],
        verbose_name="Expérience professionnelle",
    )

    motivation_score = models.PositiveSmallIntegerField(
        default=0,
        validators=[MinValueValidator(0), MaxValueValidator(5)],
        verbose_name="Motivation",
    )

    adaptability_score = models.PositiveSmallIntegerField(
        default=0,
        validators=[MinValueValidator(0), MaxValueValidator(5)],
        verbose_name="Adaptabilité",
    )

    strengths = models.TextField(
        blank=True,
        verbose_name="Points forts",
    )

    weaknesses = models.TextField(
        blank=True,
        verbose_name="Axes d'amélioration",
    )

    comments = models.TextField(
        blank=True,
        verbose_name="Commentaire général",
    )

    recommendation = models.CharField(
        max_length=30,
        choices=Recommendation.choices,
        default=Recommendation.TO_DISCUSS,
        verbose_name="Recommandation",
    )

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.DRAFT,
        verbose_name="Statut de l'évaluation",
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Date de création",
    )

    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name="Dernière modification",
    )

    class Meta:
        verbose_name = "Évaluation"
        verbose_name_plural = "Évaluations"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["application", "created_at"]),
            models.Index(fields=["evaluator", "created_at"]),
            models.Index(fields=["status", "created_at"]),
        ]

    def __str__(self):
        return (
            f"Évaluation de la candidature "
            f"#{self.application_id} - {self.get_status_display()}"
        )

    @property
    def average_score(self):
        scores = [
            self.technical_score,
            self.communication_score,
            self.experience_score,
            self.motivation_score,
            self.adaptability_score,
        ]

        return round(sum(scores) / len(scores), 2)

    @property
    def percentage_score(self):
        return round((self.average_score / 5) * 100, 2)
