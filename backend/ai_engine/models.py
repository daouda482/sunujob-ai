
from django.conf import settings
from django.db import models


class CVAnalysis(models.Model):
    """
    Historique des analyses de CV réalisées par le moteur IA
    de SunuJob AI.
    """

    class Status(models.TextChoices):
        PENDING = "PENDING", "En attente"
        COMPLETED = "COMPLETED", "Terminée"
        FAILED = "FAILED", "Échouée"

    # Utilisateur propriétaire de l'analyse.
    candidate = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="ai_engine_cv_analyses",
        verbose_name="Candidat",
    )

    # Texte extrait du CV transmis au moteur IA.
    cv_text = models.TextField(
        verbose_name="Contenu du CV",
    )

    # Résultat JSON retourné par Ollama.
    analysis_result = models.JSONField(
        default=dict,
        blank=True,
        verbose_name="Résultat de l'analyse",
    )

    # Identification du moteur et du modèle utilisés.
    provider = models.CharField(
        max_length=50,
        default="ollama",
        verbose_name="Fournisseur IA",
    )

    model_name = models.CharField(
        max_length=100,
        default="llama3.2:3b",
        verbose_name="Modèle IA",
    )

    # État de l'analyse.
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
        db_index=True,
        verbose_name="Statut",
    )

    # Message d'erreur éventuel.
    error_message = models.TextField(
        blank=True,
        default="",
        verbose_name="Message d'erreur",
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
        verbose_name = "Analyse de CV"
        verbose_name_plural = "Analyses de CV"
        ordering = ["-created_at"]
        indexes = [
            models.Index(
                fields=["candidate", "-created_at"],
                name="ai_cv_candidate_date_idx",
            ),
            models.Index(
                fields=["status", "-created_at"],
                name="ai_cv_status_date_idx",
            ),
        ]

    def __str__(self):
        return (
            f"Analyse CV - {self.candidate} "
            f"({self.get_status_display()})"
        )
