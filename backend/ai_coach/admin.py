
from django.contrib import admin

from .models import CoachingQuestion, CoachingSession


class CoachingQuestionInline(admin.TabularInline):
    model = CoachingQuestion
    extra = 0


@admin.register(CoachingSession)
class CoachingSessionAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "candidate",
        "job_title",
        "interview_type",
        "status",
        "score",
        "created_at",
    )
    list_filter = ("interview_type", "status", "created_at")
    search_fields = (
        "candidate__username",
        "candidate__email",
        "job_title",
    )
    inlines = [CoachingQuestionInline]


@admin.register(CoachingQuestion)
class CoachingQuestionAdmin(admin.ModelAdmin):
    list_display = ("id", "session", "position", "score", "created_at")
    search_fields = ("question_text", "candidate_answer")
