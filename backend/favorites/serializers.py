from rest_framework import serializers

from .models import Favorite


class FavoriteSerializer(serializers.ModelSerializer):
    job_id = serializers.IntegerField(source="job.id", read_only=True)
    title = serializers.CharField(source="job.title", read_only=True)
    company_name = serializers.CharField(
        source="job.company.name",
        read_only=True,
    )
    location = serializers.CharField(source="job.location", read_only=True)
    contract_type = serializers.CharField(
        source="job.get_contract_type_display",
        read_only=True,
    )
    sector = serializers.CharField(source="job.sector", read_only=True)
    deadline = serializers.DateField(source="job.deadline", read_only=True)

    class Meta:
        model = Favorite
        fields = [
            "id",
            "job_id",
            "title",
            "company_name",
            "location",
            "contract_type",
            "sector",
            "deadline",
            "created_at",
        ]
        read_only_fields = fields


class FavoriteCreateSerializer(serializers.Serializer):
    job_id = serializers.IntegerField()

    def validate_job_id(self, value):
        from jobs.models import Job

        try:
            job = Job.objects.get(
                pk=value,
                status=Job.Status.PUBLISHED,
            )
        except Job.DoesNotExist:
            raise serializers.ValidationError(
                "Cette offre n'existe pas ou n'est plus publiée."
            )

        self.context["job"] = job
        return value