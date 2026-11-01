from django.conf import settings
from django.db import models


class Favorite(models.Model):
    candidate = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="job_favorites",
    )

    job = models.ForeignKey(
        "jobs.Job",
        on_delete=models.CASCADE,
        related_name="favorited_by",
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Offre favorite"
        verbose_name_plural = "Offres favorites"
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["candidate", "job"],
                name="unique_candidate_favorite_job",
            )
        ]

    def __str__(self):
        return f"{self.candidate} - {self.job.title}"