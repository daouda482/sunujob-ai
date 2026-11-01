
from rest_framework import serializers


class CVAnalysisSerializer(serializers.Serializer):

    cv_text = serializers.CharField(
        required=True,
        allow_blank=False,
        trim_whitespace=True,
        max_length=30000
    )

    def validate_cv_text(self, value):
        if len(value.strip()) < 50:
            raise serializers.ValidationError(
                "Le contenu du CV est trop court pour être analysé."
            )

        return value.strip()
