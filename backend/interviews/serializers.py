
from rest_framework import serializers

from .models import Interview


class InterviewSerializer(serializers.ModelSerializer):
    candidate_email = serializers.EmailField(
        source="application.candidate.email",
        read_only=True,
    )
    candidate_name = serializers.SerializerMethodField()
    job_title = serializers.CharField(
        source="application.job.title",
        read_only=True,
    )
    company_name = serializers.CharField(
        source="application.job.company.name",
        read_only=True,
    )

    class Meta:
        model = Interview
        fields = [
            "id",
            "application",
            "candidate_email",
            "candidate_name",
            "job_title",
            "company_name",
            "recruiter",
            "interview_type",
            "scheduled_at",
            "location",
            "meeting_link",
            "message",
            "status",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "recruiter",
            "created_at",
            "updated_at",
        ]

    def get_candidate_name(self, obj):
        candidate = obj.application.candidate
        return f"{candidate.first_name} {candidate.last_name}".strip()

    def validate_application(self, application):
        request = self.context.get("request")

        if request and application.job.recruiter_id != request.user.id:
            raise serializers.ValidationError(
                "Vous ne pouvez programmer un entretien que pour "
                "une candidature reçue sur l'une de vos offres."
            )

        if application.status in ["REJECTED", "WITHDRAWN"]:
            raise serializers.ValidationError(
                "Cette candidature ne peut pas faire l'objet d'un entretien."
            )

        return application

    def validate(self, attrs):
        interview_type = attrs.get(
            "interview_type",
            getattr(self.instance, "interview_type", None),
        )
        location = attrs.get(
            "location",
            getattr(self.instance, "location", ""),
        )
        meeting_link = attrs.get(
            "meeting_link",
            getattr(self.instance, "meeting_link", ""),
        )

        if (
            interview_type == Interview.InterviewType.IN_PERSON
            and not location
        ):
            raise serializers.ValidationError({
                "location": (
                    "Le lieu est obligatoire pour un entretien en présentiel."
                )
            })

        if (
            interview_type == Interview.InterviewType.ONLINE
            and not meeting_link
        ):
            raise serializers.ValidationError({
                "meeting_link": (
                    "Le lien de visioconférence est obligatoire."
                )
            })

        return attrs
