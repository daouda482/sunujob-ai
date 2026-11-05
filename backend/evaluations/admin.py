
from django.contrib import admin

from .models import Evaluation


@admin.register(Evaluation)
class EvaluationAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "application",
        "evaluator",
        "average_display",
        "recommendation",
        "status",
        "created_at",
    )

    list_filter = (
        "status",
        "recommendation",
        "created_at",
    )

    search_fields = (
        "application__id",
        "evaluator__email",
        "comments",
        "strengths",
    )

    readonly_fields = (
        "created_at",
        "updated_at",
    )

    ordering = ("-created_at",)

    def average_display(self, obj):
        return f"{obj.average_score}/5"

    average_display.short_description = "Moyenne"
