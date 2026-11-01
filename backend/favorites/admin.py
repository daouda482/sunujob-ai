from django.contrib import admin

from .models import Favorite


@admin.register(Favorite)
class FavoriteAdmin(admin.ModelAdmin):
    list_display = ("id", "candidate", "job", "created_at")
    list_filter = ("created_at",)
    search_fields = (
        "candidate__email",
        "job__title",
        "job__company__name",
    )
    readonly_fields = ("created_at",)