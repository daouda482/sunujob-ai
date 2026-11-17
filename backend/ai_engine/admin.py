
import json

from django.contrib import admin
from django.utils.html import format_html

from .models import CVAnalysis


@admin.register(CVAnalysis)
class CVAnalysisAdmin(admin.ModelAdmin):
    """
    Administration des analyses de CV réalisées
    par le moteur IA de SunuJob AI.
    """

    list_display = (
        "id",
        "candidate",
        "provider",
        "model_name",
        "status_badge",
        "created_at",
    )

    list_filter = (
        "status",
        "provider",
        "model_name",
        "created_at",
    )

    search_fields = (
        "candidate__email",
        "candidate__first_name",
        "candidate__last_name",
        "cv_text",
        "error_message",
    )

    readonly_fields = (
        "candidate",
        "cv_text",
        "formatted_analysis_result",
        "provider",
        "model_name",
        "status",
        "error_message",
        "created_at",
        "updated_at",
    )

    ordering = ("-created_at",)

    date_hierarchy = "created_at"

    list_per_page = 25

    actions = None

    fieldsets = (
        (
            "Informations générales",
            {
                "fields": (
                    "candidate",
                    "provider",
                    "model_name",
                    "status",
                )
            },
        ),
        (
            "Contenu du CV",
            {
                "fields": ("cv_text",),
            },
        ),
        (
            "Résultat de l'analyse IA",
            {
                "fields": ("formatted_analysis_result",),
            },
        ),
        (
            "Informations complémentaires",
            {
                "fields": (
                    "error_message",
                    "created_at",
                    "updated_at",
                )
            },
        ),
    )

    @admin.display(description="Statut", ordering="status")
    def status_badge(self, obj):
        """
        Affiche le statut de l'analyse avec une couleur.
        """

        colors = {
            CVAnalysis.Status.PENDING: "#d97706",
            CVAnalysis.Status.COMPLETED: "#15803d",
            CVAnalysis.Status.FAILED: "#dc2626",
        }

        color = colors.get(obj.status, "#64748b")

        return format_html(
            '<span style="background-color: {}; '
            'color: white; padding: 4px 9px; '
            'border-radius: 12px; font-weight: 600;">'
            '{}</span>',
            color,
            obj.get_status_display(),
        )

    @admin.display(description="Résultat JSON")
    def formatted_analysis_result(self, obj):
        """
        Présente le résultat JSON de manière lisible.
        """

        if not obj.analysis_result:
            return "Aucun résultat disponible."

        formatted_json = json.dumps(
            obj.analysis_result,
            ensure_ascii=False,
            indent=4,
        )

        return format_html(
            '<pre style="white-space: pre-wrap; '
            'word-break: break-word; '
            'max-height: 600px; overflow-y: auto; '
            'background: #f8fafc; padding: 15px; '
            'border-radius: 8px; border: 1px solid #e2e8f0;">'
            '{}</pre>',
            formatted_json,
        )
