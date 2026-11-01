from rest_framework import serializers

from .models import Interview


class InterviewSerializer(serializers.ModelSerializer):
    candidate_name = serializers.SerializerMethodField()
    candidate_email = serializers.SerializerMethodField()
    job_title = serializers.SerializerMethodField()
    company_name = serializers.SerializerMethodField()
    application_status = serializers.SerializerMethodField()

    class Meta:
        model = Interview
        fields = [
            "id",
            "application",
            "candidate_name",
            "candidate_email",
            "job_title",
            "company_name",
            "application_status",
            "interview_type",
            "scheduled_at",
            "location",
            "meeting_link",
            "message",
            "status",
            "created_by",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "candidate_name",
            "candidate_email",
            "job_title",
            "company_name",
            "application_status",
            "created_by",
            "created_at",
            "updated_at",
        ]

    def get_candidate_name(self, obj):
        candidate = obj.application.candidate

        full_name = ""
        if hasattr(candidate, "get_full_name"):
            full_name = candidate.get_full_name()

        if full_name and full_name.strip():
            return full_name.strip()

        first_name = getattr(candidate, "first_name", "") or ""
        last_name = getattr(candidate, "last_name", "") or ""
        name = f"{first_name} {last_name}".strip()

        return name or getattr(candidate, "email", "Candidat")

    def get_candidate_email(self, obj):
        return getattr(obj.application.candidate, "email", "")

    def get_job_title(self, obj):
        return getattr(obj.application.job, "title", "Poste")

    def get_company_name(self, obj):
        job = obj.application.job
        company = getattr(job, "company", None)

        if company is None:
            return ""

        return (
            getattr(company, "name", None)
            or getattr(company, "company_name", None)
            or str(company)
        )

    def get_application_status(self, obj):
        return obj.application.status