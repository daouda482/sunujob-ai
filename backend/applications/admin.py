
from django.contrib import admin

from .models import Application


@admin.register(Application)
class ApplicationAdmin(admin.ModelAdmin):
    """
    Administration des candidatures SunuJob AI.

    Permet de consulter les candidatures, les documents
    associés et les informations de suivi du recrutement.
    """

    list_display = (
        "id",
        "candidate_email",
        "job_title",
        "company_name",
        "status",
        "applied_at",
        "updated_at",
    )

    list_filter = (
        "status",
        "applied_at",
        "updated_at",
    )

    search_fields = (
        "candidate__email",
        "candidate__first_name",
        "candidate__last_name",
        "job__title",
        "job__company__name",
    )

    ordering = ("-applied_at",)

    list_per_page = 25

    list_select_related = (
        "candidate",
        "job",
        "job__company",
    )

    readonly_fields = (
        "applied_at",
        "updated_at",
    )

    fieldsets = (
        (
            "Informations générales",
            {
                "fields": (
                    "candidate",
                    "job",
                    "status",
                )
            },
        ),
        (
            "Documents du candidat",
            {
                "fields": (
                    "cover_letter",
                    "resume",
                )
            },
        ),
        (
            "Suivi du recrutement",
            {
                "fields": (
                    "recruiter_note",
                )
            },
        ),
        (
            "Historique",
            {
                "fields": (
                    "applied_at",
                    "updated_at",
                )
            },
        ),
    )

    # Désactive les actions de masse par défaut.
    actions = None

    @admin.display(
        description="Email du candidat",
        ordering="candidate__email",
    )
    def candidate_email(self, obj):
        return obj.candidate.email

    @admin.display(
        description="Offre d'emploi",
        ordering="job__title",
    )
    def job_title(self, obj):
        return obj.job.title

    @admin.display(
        description="Entreprise",
        ordering="job__company__name",
    )
    def company_name(self, obj):
        company = getattr(obj.job, "company", None)

        if company:
            return company.name

        return "Non renseignée"
