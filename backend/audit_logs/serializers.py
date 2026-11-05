
from rest_framework import serializers
from .models import AuditLog


class AuditLogSerializer(serializers.ModelSerializer):

    actor_email = serializers.EmailField(
        source="actor.email",
        read_only=True,
        default=None,
    )

    action_label = serializers.CharField(
        source="get_action_display",
        read_only=True,
    )

    class Meta:
        model = AuditLog
        fields = [
            "id",
            "actor",
            "actor_email",
            "application",
            "interview",
            "action",
            "action_label",
            "description",
            "old_value",
            "new_value",
            "metadata",
            "ip_address",
            "created_at",
        ]

        read_only_fields = fields
