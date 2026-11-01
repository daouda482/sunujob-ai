
from rest_framework import serializers


class RecommendedJobSerializer(serializers.Serializer):
    """Structure les données d'une offre recommandée."""

    job_id = serializers.IntegerField(read_only=True)
    title = serializers.CharField(read_only=True)
    company = serializers.CharField(read_only=True, allow_blank=True)
    sector = serializers.CharField(read_only=True, allow_blank=True)
    location = serializers.CharField(read_only=True, allow_blank=True)
    contract_type = serializers.CharField(read_only=True, allow_blank=True)

    experience_required = serializers.IntegerField(
        read_only=True,
        allow_null=True,
    )
    education_level = serializers.CharField(
        read_only=True,
        allow_blank=True,
        allow_null=True,
    )
    skills_required = serializers.CharField(
        read_only=True,
        allow_blank=True,
        allow_null=True,
    )

    score = serializers.FloatField(read_only=True)
    coverage = serializers.FloatField(read_only=True, required=False)

    matched_skills = serializers.ListField(
        child=serializers.CharField(),
        read_only=True,
    )
    missing_skills = serializers.ListField(
        child=serializers.CharField(),
        read_only=True,
    )
    reasons = serializers.ListField(
        child=serializers.CharField(),
        read_only=True,
    )


class RecommendedJobsResponseSerializer(serializers.Serializer):
    """Structure la réponse complète de l'API."""

    count = serializers.IntegerField(read_only=True)
    results = RecommendedJobSerializer(many=True, read_only=True)
