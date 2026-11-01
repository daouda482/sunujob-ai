from rest_framework import serializers

from .models import Company


class CompanySerializer(serializers.ModelSerializer):
    recruiter = serializers.PrimaryKeyRelatedField(read_only=True)
    recruiter_email = serializers.EmailField(
        source="recruiter.email",
        read_only=True,
    )
    recruiter_first_name = serializers.CharField(
        source="recruiter.first_name",
        read_only=True,
    )
    recruiter_last_name = serializers.CharField(
        source="recruiter.last_name",
        read_only=True,
    )

    class Meta:
        model = Company
        fields = [
            "id",
            "recruiter",
            "recruiter_email",
            "recruiter_first_name",
            "recruiter_last_name",
            "name",
            "description",
            "sector",
            "website",
            "email",
            "phone",
            "address",
            "city",
            "country",
            "logo",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "recruiter",
            "recruiter_email",
            "recruiter_first_name",
            "recruiter_last_name",
            "created_at",
            "updated_at",
        ]
