from django.conf import settings
from django.db import models


class Company(models.Model):
    recruiter = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="companies",
        verbose_name="Recruteur",
    )
    name = models.CharField(
        max_length=200,
        verbose_name="Nom de l'entreprise",
    )
    description = models.TextField(blank=True, verbose_name="Description")
    sector = models.CharField(max_length=150, verbose_name="Secteur d'activité")
    website = models.URLField(blank=True, verbose_name="Site web")
    email = models.EmailField(blank=True, verbose_name="Email")
    phone = models.CharField(max_length=30, blank=True, verbose_name="Téléphone")
    address = models.CharField(max_length=255, blank=True, verbose_name="Adresse")
    city = models.CharField(max_length=100, blank=True, verbose_name="Ville")
    country = models.CharField(
        max_length=100,
        default="Sénégal",
        verbose_name="Pays",
    )
    logo = models.ImageField(
        upload_to="companies/logos/",
        blank=True,
        null=True,
        verbose_name="Logo",
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
        verbose_name = "Entreprise"
        verbose_name_plural = "Entreprises"
        ordering = ["-created_at"]

    def __str__(self):
        return self.name
