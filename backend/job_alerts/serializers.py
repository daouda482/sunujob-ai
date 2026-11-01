from rest_framework import serializers

from .models import JobAlert


class JobAlertSerializer(serializers.ModelSerializer):
    class Meta:
        model = JobAlert
        fields = [
            "id",
            "name",
            "keywords",
            "sector",
            "location",
            "contract_type",
            "education_level",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
        ]

    def validate(self, attrs):
        instance = getattr(self, "instance", None)

        values = {
            "keywords": attrs.get(
                "keywords",
                getattr(instance, "keywords", ""),
            ),
            "sector": attrs.get(
                "sector",
                getattr(instance, "sector", ""),
            ),
            "location": attrs.get(
                "location",
                getattr(instance, "location", ""),
            ),
            "contract_type": attrs.get(
                "contract_type",
                getattr(instance, "contract_type", ""),
            ),
            "education_level": attrs.get(
                "education_level",
                getattr(instance, "education_level", ""),
            ),
        }

        if not any(str(value).strip() for value in values.values()):
            raise serializers.ValidationError(
                "Renseignez au moins un critère pour créer une alerte."
            )

        return attrs