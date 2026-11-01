import os

from rest_framework import serializers

from users.verification_models import CompanyVerificationRequest


ALLOWED_EXTENSIONS = {".pdf", ".jpg", ".jpeg", ".png"}
MAX_DOCUMENT_SIZE = 5 * 1024 * 1024  # 5 Mo


class CompanyVerificationRequestSerializer(serializers.ModelSerializer):
    """Serializer de consultation des demandes de vérification."""

    document_name = serializers.SerializerMethodField()
    status_label = serializers.CharField(
        source="get_status_display",
        read_only=True,
    )
    reviewer_email = serializers.SerializerMethodField()

    class Meta:
        model = CompanyVerificationRequest
        fields = [
            "id",
            "company",
            "company_name",
            "registration_number",
            "document_name",
            "submitted_by_email",
            "status",
            "status_label",
            "admin_notes",
            "reviewer_email",
            "reviewed_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields

    def get_document_name(self, obj):
        if obj.document:
            return os.path.basename(obj.document.name)
        return ""

    def get_reviewer_email(self, obj):
        if obj.reviewed_by:
            return getattr(obj.reviewed_by, "email", "") or "Administrateur"
        return ""


class CompanyVerificationCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = CompanyVerificationRequest
        fields = [
            "registration_number",
            "document",
        ]

    def validate_registration_number(self, value):
        value = value.strip()

        if len(value) < 3:
            raise serializers.ValidationError(
                "Le numéro d'immatriculation doit contenir au moins 3 caractères."
            )

        return value

    def validate_document(self, document):
        import os

        allowed_extensions = {".pdf", ".jpg", ".jpeg", ".png"}
        extension = os.path.splitext(document.name)[1].lower()

        if extension not in allowed_extensions:
            raise serializers.ValidationError(
                "Formats acceptés : PDF, JPG, JPEG et PNG."
            )

        if document.size > 5 * 1024 * 1024:
            raise serializers.ValidationError(
                "Le justificatif ne doit pas dépasser 5 Mo."
            )

        return document
