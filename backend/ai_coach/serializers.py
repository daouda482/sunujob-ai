
from rest_framework import serializers

from .models import CoachingQuestion, CoachingSession


class CoachingQuestionSerializer(serializers.ModelSerializer):
    class Meta:
        model = CoachingQuestion
        fields = [
            "id",
            "question_text",
            "candidate_answer",
            "ai_feedback",
            "score",
            "strengths",
            "improvements",
            "suggested_answer",
            "position",
            "created_at",
        ]

        read_only_fields = [
            "id",
            "question_text",
            "ai_feedback",
            "score",
            "strengths",
            "improvements",
            "suggested_answer",
            "position",
            "created_at",
        ]


class CoachingSessionSerializer(serializers.ModelSerializer):
    questions = CoachingQuestionSerializer(many=True, read_only=True)

    interview_type_label = serializers.CharField(
        source="get_interview_type_display",
        read_only=True,
    )

    status_label = serializers.CharField(
        source="get_status_display",
        read_only=True,
    )

    class Meta:
        model = CoachingSession

        fields = [
            "id",
            "job_title",
            "interview_type",
            "interview_type_label",
            "experience_level",
            "status",
            "status_label",
            "score",
            "questions",
            "created_at",
            "updated_at",
        ]

        read_only_fields = [
            "id",
            "status",
            "status_label",
            "score",
            "questions",
            "created_at",
            "updated_at",
        ]

    def validate_job_title(self, value):
        value = value.strip()

        if not value:
            raise serializers.ValidationError(
                "Veuillez préciser le poste que vous souhaitez préparer."
            )

        return value

    def validate_experience_level(self, value):
        return value.strip()
