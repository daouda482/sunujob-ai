from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator
from django.db import models


class PlatformSettings(models.Model):
    """Paramètres généraux globaux de SunuJob AI (ligne unique, pk=1)."""

    platform_name = models.CharField(max_length=120, default="SunuJob AI")
    support_email = models.EmailField(blank=True, default="")
    support_phone = models.CharField(max_length=40, blank=True, default="")
    website_url = models.URLField(blank=True, default="")
    support_hours = models.CharField(max_length=180, blank=True, default="")
    welcome_message = models.CharField(
        max_length=500,
        blank=True,
        default="Connectez les talents aux opportunités.",
    )
    footer_text = models.CharField(
        max_length=255,
        blank=True,
        default="Conçu au Sénégal 🇸🇳",
    )
    default_page_size = models.PositiveSmallIntegerField(
        default=20,
        validators=[MinValueValidator(10), MaxValueValidator(100)],
        help_text="Paramètre de référence pour les futurs écrans paginés (10 à 100).",
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="platform_settings_updates",
    )
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Paramètre de la plateforme"
        verbose_name_plural = "Paramètres de la plateforme"

    def save(self, *args, **kwargs):
        # Conserve une seule ligne de paramètres, à l'identifiant 1.
        self.pk = 1
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        # Évite la suppression accidentelle des paramètres globaux.
        return None

    def __str__(self):
        return f"Paramètres — {self.platform_name}"
