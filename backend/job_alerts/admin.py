from django.contrib import admin

from .models import JobAlert


@admin.register(JobAlert)
class JobAlertAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "name",
        "candidate",
        "sector",
        "location",
        "is_active",
        "created_at",
    )
    list_filter = ("is_active", "contract_type", "created_at")
    search_fields = (
        "name",
        "candidate__email",
        "keywords",
        "sector",
        "location",
    )