from django.db import models


class JobCategory(models.Model):
    """Secteur ou catégorie professionnelle gérée par l'administration."""

    name = models.CharField(max_length=120, unique=True)
    description = models.TextField(blank=True, default="")
    is_active = models.BooleanField(default=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]
        verbose_name = "catégorie de métier"
        verbose_name_plural = "catégories de métiers"

    def __str__(self):
        return self.name


class PlatformSkill(models.Model):
    """Compétence réutilisable dans le catalogue de SunuJob AI."""

    name = models.CharField(max_length=120, unique=True)
    category = models.ForeignKey(
        JobCategory,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="skills",
    )
    description = models.TextField(blank=True, default="")
    is_active = models.BooleanField(default=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]
        verbose_name = "compétence"
        verbose_name_plural = "compétences"

    def __str__(self):
        return self.name
