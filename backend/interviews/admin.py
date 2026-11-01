
from django.contrib import admin

from .models import Interview


@admin.register(Interview)
class InterviewAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "application",
        "recruiter",
        "interview_type",
        "scheduled_at",
        "status",
    )

    list_filter = (
        "interview_type",
        "status",
        "scheduled_at",
    )

    search_fields = (
        "application__candidate__email",
        "application__job__title",
        "recruiter__email",
    )

    readonly_fields = (
        "created_at",
        "updated_at",
    )