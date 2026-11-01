from rest_framework import serializers

from users.platform_settings_models import PlatformSettings


class PlatformSettingsSerializer(serializers.ModelSerializer):
    updated_by_email = serializers.SerializerMethodField()

    class Meta:
        model = PlatformSettings
        fields = [
            "id",
            "platform_name",
            "support_email",
            "support_phone",
            "website_url",
            "support_hours",
            "welcome_message",
            "footer_text",
            "default_page_size",
            "updated_by_email",
            "updated_at",
        ]
        read_only_fields = ["id", "updated_by_email", "updated_at"]

    def get_updated_by_email(self, obj):
        if not obj.updated_by:
            return "—"
        return getattr(obj.updated_by, "email", "") or str(obj.updated_by)

    def validate_platform_name(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Le nom de la plateforme est obligatoire.")
        return value

    def validate_default_page_size(self, value):
        if not 10 <= value <= 100:
            raise serializers.ValidationError("La taille doit être comprise entre 10 et 100.")
        return value
