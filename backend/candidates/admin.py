from django.contrib import admin

from .models import CandidateProfile


@admin.register(CandidateProfile)
class CandidateProfileAdmin(admin.ModelAdmin):

    list_display = (
        "id",
        "user",
        "city",
        "country",
        "education_level",
        "years_of_experience",
        "availability",
        "created_at",
    )

    list_filter = (
        "education_level",
        "availability",
        "country",
        "created_at",
    )

    search_fields = (
        "user__email",
        "user__first_name",
        "user__last_name",
        "city",
        "field_of_study",
    )

    readonly_fields = (
        "created_at",
        "updated_at",
    )