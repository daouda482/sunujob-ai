
from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models

from companies.models import Company


class Job(models.Model):

    class ContractType(models.TextChoices):
        CDI = "CDI", "CDI"
        CDD = "CDD", "CDD"
        INTERNSHIP = "INTERNSHIP", "Stage"
        APPRENTICESHIP = "APPRENTICESHIP", "Alternance"
        FREELANCE = "FREELANCE", "Freelance"
        TEMPORARY = "TEMPORARY", "Intérim"
        VACATION = "VACATION", "Vacation"

    class Status(models.TextChoices):
        DRAFT = "DRAFT", "Brouillon"
        PUBLISHED = "PUBLISHED", "Publiée"
        CLOSED = "CLOSED", "Fermée"

    recruiter = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="jobs",
        verbose_name="Recruteur",
    )

    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="jobs",
        verbose_name="Entreprise",
    )

    title = models.CharField(
        max_length=200,
        verbose_name="Titre du poste",
    )

    description = models.TextField(
        verbose_name="Description du poste",
    )

    sector = models.CharField(
        max_length=150,
        verbose_name="Secteur d'activité",
    )

    location = models.CharField(
        max_length=150,
        verbose_name="Lieu de travail",
    )

    contract_type = models.CharField(
        max_length=30,
        choices=ContractType.choices,
        verbose_name="Type de contrat",
    )

    experience_required = models.PositiveIntegerField(
        default=0,
        validators=[MinValueValidator(0)],
        verbose_name="Années d'expérience requises",
    )

    education_level = models.CharField(
        max_length=50,
        blank=True,
        verbose_name="Niveau d'études requis",
    )

    salary_min = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        blank=True,
        null=True,
        validators=[MinValueValidator(0)],
        verbose_name="Salaire minimum",
    )

    salary_max = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        blank=True,
        null=True,
        validators=[MinValueValidator(0)],
        verbose_name="Salaire maximum",
    )

    skills_required = models.TextField(
        blank=True,
        verbose_name="Compétences requises",
    )

    deadline = models.DateField(
        blank=True,
        null=True,
        verbose_name="Date limite de candidature",
    )

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.DRAFT,
        verbose_name="Statut",
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
        verbose_name = "Offre d'emploi"
        verbose_name_plural = "Offres d'emploi"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.title} - {self.company.name}"
