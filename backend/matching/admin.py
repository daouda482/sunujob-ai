
from django.contrib import admin

from .models import MatchResult


@admin.register(MatchResult)
class MatchResultAdmin(admin.ModelAdmin):
    """
    Administration des résultats de matching entre
    les candidats et les offres d'emploi.
    """

    list_display = (
        "id",
        "get_candidate",
        "get_job",
        "score",
        "get_matched_skills_count",
        "get_missing_skills_count",
        "calculated_at",
    )

    list_filter = (
        "calculated_at",
    )

    search_fields = (
        "candidate__user__email",
        "candidate__user__first_name",
        "candidate__user__last_name",
        "job__title",
    )

    readonly_fields = (
        "calculated_at",
    )

    ordering = (
        "-score",
        "-calculated_at",
    )

    list_per_page = 25

    date_hierarchy = "calculated_at"

    fieldsets = (
        (
            "Informations générales",
            {
                "fields": (
                    "candidate",
                    "job",
                    "score",
                    "calculated_at",
                )
            },
        ),
        (
            "Analyse des compétences",
            {
                "fields": (
                    "matched_skills",
                    "missing_skills",
                )
            },
        ),
        (
            "Explications du matching",
            {
                "fields": (
                    "reasons",
                )
            },
        ),
    )

    @admin.display(
        description="Candidat",
        ordering="candidate__user__email",
    )
    def get_candidate(self, obj):
        return obj.candidate.user.email

    @admin.display(
        description="Offre d'emploi",
        ordering="job__title",
    )
    def get_job(self, obj):
        return obj.job.title

    @admin.display(description="Compétences correspondantes")
    def get_matched_skills_count(self, obj):
        if not isinstance(obj.matched_skills, list):
            return 0

        return len(obj.matched_skills)

    @admin.display(description="Compétences manquantes")
    def get_missing_skills_count(self, obj):
        if not isinstance(obj.missing_skills, list):
            return 0

        return len(obj.missing_skills)
