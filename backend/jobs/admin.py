
from django.contrib import admin

from .models import Job


@admin.register(Job)
class JobAdmin(admin.ModelAdmin):
    list_display = (
        "title",
        "company",
        "recruiter",
        "contract_type",
        "location",
        "status",
        "deadline",
        "created_at",
    )

    list_filter = (
        "status",
        "contract_type",
        "sector",
        "location",
    )

    search_fields = (
        "title",
        "description",
        "sector",
        "company__name",
        "recruiter__email",
    )

    list_editable = ("status",)

    readonly_fields = (
        "created_at",
        "updated_at",
    )

    ordering = ("-created_at",)

    fieldsets = (
        (
            "Informations principales",
            {
                "fields": (
                    "title",
                    "company",
                    "recruiter",
                    "description",
                    "sector",
                    "location",
                )
            },
        ),
        (
            "Conditions du poste",
            {
                "fields": (
                    "contract_type",
                    "experience_required",
                    "education_level",
                    "skills_required",
                    "salary_min",
                    "salary_max",
                    "deadline",
                )
            },
        ),
        (
            "Publication",
            {
                "fields": (
                    "status",
                    "created_at",
                    "updated_at",
                )
            },
        ),
    )
