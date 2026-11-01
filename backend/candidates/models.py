
from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator
from django.db import models


class CandidateProfile(models.Model):

    class EducationLevel(models.TextChoices):
        NONE = "NONE", "Aucun diplôme"
        BFEM = "BFEM", "BFEM"
        BAC = "BAC", "Baccalauréat"
        BAC_PLUS_2 = "BAC_PLUS_2", "Bac +2"
        BAC_PLUS_3 = "BAC_PLUS_3", "Bac +3"
        BAC_PLUS_4 = "BAC_PLUS_4", "Bac +4"
        BAC_PLUS_5 = "BAC_PLUS_5", "Bac +5"
        DOCTORATE = "DOCTORATE", "Doctorat"

    class Availability(models.TextChoices):
        IMMEDIATE = "IMMEDIATE", "Disponible immédiatement"
        ONE_MONTH = "ONE_MONTH", "Disponible dans un mois"
        THREE_MONTHS = "THREE_MONTHS", "Disponible dans trois mois"
        NOT_AVAILABLE = "NOT_AVAILABLE", "Non disponible"

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="candidate_profile",
        verbose_name="Utilisateur",
    )

    photo = models.ImageField(
        upload_to="candidates/photos/",
        blank=True,
        null=True,
        verbose_name="Photo",
    )

    date_of_birth = models.DateField(
        blank=True,
        null=True,
        verbose_name="Date de naissance",
    )

    address = models.CharField(
        max_length=255,
        blank=True,
        verbose_name="Adresse",
    )

    city = models.CharField(
        max_length=100,
        blank=True,
        verbose_name="Ville",
    )

    country = models.CharField(
        max_length=100,
        default="Sénégal",
        verbose_name="Pays",
    )

    education_level = models.CharField(
        max_length=30,
        choices=EducationLevel.choices,
        default=EducationLevel.NONE,
        verbose_name="Niveau d'études",
    )

    field_of_study = models.CharField(
        max_length=150,
        blank=True,
        verbose_name="Domaine d'études",
    )

    skills = models.TextField(
        blank=True,
        default="",
        verbose_name="Compétences",
    )

    years_of_experience = models.PositiveIntegerField(
        default=0,
        validators=[MinValueValidator(0)],
        verbose_name="Années d'expérience",
    )

    biography = models.TextField(
        blank=True,
        verbose_name="Biographie",
    )

    availability = models.CharField(
        max_length=30,
        choices=Availability.choices,
        default=Availability.IMMEDIATE,
        verbose_name="Disponibilité",
    )

    resume = models.FileField(
        upload_to="candidates/resumes/",
        blank=True,
        null=True,
        verbose_name="CV",
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
        verbose_name = "Profil candidat"
        verbose_name_plural = "Profils candidats"
        ordering = ["-created_at"]

    def __str__(self):
        return f"Profil candidat - {self.user.email}"


class CVAnalysis(models.Model):
    """
    Historique des analyses de CV réalisées par un candidat.
    Le modèle conserve le rapport, pas le texte intégral du CV.
    """

    candidate = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="cv_analyses",
    )

    resume_name = models.CharField(max_length=255)

    resume_sha256 = models.CharField(
        max_length=64,
        db_index=True,
    )

    score = models.PositiveSmallIntegerField(
        default=0,
        validators=[
            MinValueValidator(0),
            MaxValueValidator(100),
        ],
    )

    engine = models.CharField(
        max_length=50,
        default="local_rules",
    )

    result = models.JSONField(default=dict)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Analyse de CV"
        verbose_name_plural = "Analyses de CV"

    def __str__(self):
        return (
            f"Analyse CV de {self.candidate} "
            f"- {self.created_at:%d/%m/%Y}"
        )
