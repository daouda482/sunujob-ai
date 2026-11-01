
from django.conf import settings
from django.db import models


class CoachingSession(models.Model):
    class InterviewType(models.TextChoices):
        HR = "HR", "Entretien RH"
        TECHNICAL = "TECHNICAL", "Entretien technique"
        SITUATIONAL = "SITUATIONAL", "Mise en situation"
        GENERAL = "GENERAL", "Entretien général"

    class Status(models.TextChoices):
        IN_PROGRESS = "IN_PROGRESS", "En cours"
        COMPLETED = "COMPLETED", "Terminé"

    candidate = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="coaching_sessions",
    )

    job_title = models.CharField(
        max_length=200,
        verbose_name="Métier ou poste visé",
    )

    interview_type = models.CharField(
        max_length=20,
        choices=InterviewType.choices,
        default=InterviewType.GENERAL,
    )

    experience_level = models.CharField(
        max_length=100,
        blank=True,
        verbose_name="Niveau d'expérience",
    )

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.IN_PROGRESS,
    )

    score = models.PositiveSmallIntegerField(
        null=True,
        blank=True,
        help_text="Score indicatif sur 100",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.job_title} - {self.candidate}"


class CoachingQuestion(models.Model):
    session = models.ForeignKey(
        CoachingSession,
        on_delete=models.CASCADE,
        related_name="questions",
    )

    question_text = models.TextField()
    candidate_answer = models.TextField(blank=True)
    ai_feedback = models.TextField(blank=True)

    # Score attribué par l'IA : valeur indicative sur 100.
    score = models.PositiveSmallIntegerField(
        null=True,
        blank=True,
        help_text="Score indicatif sur 100",
    )

    # Points forts détectés dans la réponse du candidat.
    strengths = models.JSONField(
        default=list,
        blank=True,
    )

    # Points à améliorer dans la réponse.
    improvements = models.JSONField(
        default=list,
        blank=True,
    )

    # Exemple de réponse améliorée proposé par l'IA.
    suggested_answer = models.TextField(blank=True)

    position = models.PositiveIntegerField(default=1)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["position", "id"]

    def __str__(self):
        return f"Question {self.position} - Session {self.session_id}"
