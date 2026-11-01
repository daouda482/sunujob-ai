
from pathlib import Path

from rest_framework import serializers

from .models import CandidateProfile


class CandidateProfileSerializer(serializers.ModelSerializer):
    user = serializers.PrimaryKeyRelatedField(read_only=True)

    email = serializers.EmailField(
        source="user.email",
        read_only=True,
    )

    first_name = serializers.CharField(
        source="user.first_name",
        read_only=True,
    )

    last_name = serializers.CharField(
        source="user.last_name",
        read_only=True,
    )

    photo = serializers.ImageField(
        required=False,
        allow_null=True,
    )

    resume = serializers.FileField(
        required=False,
        allow_null=True,
    )

    has_cv = serializers.SerializerMethodField()
    resume_name = serializers.SerializerMethodField()
    resume_size = serializers.SerializerMethodField()
    resume_url = serializers.SerializerMethodField()

    class Meta:
        model = CandidateProfile

        fields = [
            "id",
            "user",
            "email",
            "first_name",
            "last_name",
            "photo",
            "date_of_birth",
            "address",
            "city",
            "country",
            "education_level",
            "field_of_study",
            "skills",
            "years_of_experience",
            "biography",
            "availability",
            "resume",
            "has_cv",
            "resume_name",
            "resume_size",
            "resume_url",
            "created_at",
            "updated_at",
        ]

        read_only_fields = [
            "id",
            "user",
            "email",
            "first_name",
            "last_name",
            "has_cv",
            "resume_name",
            "resume_size",
            "resume_url",
            "created_at",
            "updated_at",
        ]

    def get_has_cv(self, obj):
        return bool(obj.resume)

    def get_resume_name(self, obj):
        if not obj.resume:
            return None

        return Path(obj.resume.name).name

    def get_resume_size(self, obj):
        if not obj.resume:
            return None

        try:
            return obj.resume.size
        except (OSError, ValueError):
            return None

    def get_resume_url(self, obj):
        if not obj.resume:
            return None

        try:
            url = obj.resume.url
        except (ValueError, OSError):
            return None

        request = self.context.get("request")

        if request:
            return request.build_absolute_uri(url)

        return url

    def validate_resume(self, file):
        if file is None:
            return file

        allowed_extensions = {".pdf", ".doc", ".docx"}
        extension = Path(file.name).suffix.lower()

        if extension not in allowed_extensions:
            raise serializers.ValidationError(
                "Le CV doit être au format PDF, DOC ou DOCX."
            )

        if file.size > 5 * 1024 * 1024:
            raise serializers.ValidationError(
                "La taille du CV ne doit pas dépasser 5 Mo."
            )

        return file

    def validate_photo(self, file):
        if file is None:
            return file

        if file.size > 2 * 1024 * 1024:
            raise serializers.ValidationError(
                "La photo ne doit pas dépasser 2 Mo."
            )

        return file
