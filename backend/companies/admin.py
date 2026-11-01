from django.contrib import admin

from .models import Company


@admin.register(Company)
class CompanyAdmin(admin.ModelAdmin):

    list_display = (
        "id",
        "name",
        "recruiter",
        "sector",
        "city",
        "country",
        "created_at",
    )

    list_filter = (
        "sector",
        "city",
        "country",
        "created_at",
    )

    search_fields = (
        "name",
        "sector",
        "city",
        "recruiter__email",
        "recruiter__first_name",
        "recruiter__last_name",
    )

    readonly_fields = (
        "created_at",
        "updated_at",
    )