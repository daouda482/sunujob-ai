from rest_framework import serializers

from users.support_models import SupportMessage, SupportTicket


class SupportMessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.SerializerMethodField()
    sender_role = serializers.SerializerMethodField()

    class Meta:
        model = SupportMessage
        fields = ["id", "sender_name", "sender_role", "message", "is_internal", "created_at"]
        read_only_fields = fields

    def get_sender_name(self, obj):
        return getattr(obj.sender, "get_full_name", lambda: "")() or getattr(obj.sender, "email", "") or str(obj.sender)

    def get_sender_role(self, obj):
        return getattr(obj.sender, "role", "") or ("ADMIN" if getattr(obj.sender, "is_staff", False) else "USER")


class SupportTicketCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = SupportTicket
        fields = ["id", "subject", "category", "description"]
        read_only_fields = ["id"]

    def validate_subject(self, value):
        value = value.strip()
        if len(value) < 5:
            raise serializers.ValidationError("Le sujet doit contenir au moins 5 caractères.")
        return value

    def validate_description(self, value):
        value = value.strip()
        if len(value) < 15:
            raise serializers.ValidationError("La description doit contenir au moins 15 caractères.")
        return value


class SupportTicketSerializer(serializers.ModelSerializer):
    requester_name = serializers.SerializerMethodField()
    requester_email = serializers.SerializerMethodField()
    category_label = serializers.CharField(source="get_category_display", read_only=True)
    status_label = serializers.CharField(source="get_status_display", read_only=True)
    priority_label = serializers.CharField(source="get_priority_display", read_only=True)
    assigned_to_email = serializers.SerializerMethodField()
    messages = serializers.SerializerMethodField()

    class Meta:
        model = SupportTicket
        fields = [
            "id", "subject", "category", "category_label", "description",
            "status", "status_label", "priority", "priority_label",
            "requester_name", "requester_email", "assigned_to", "assigned_to_email",
            "created_at", "updated_at", "messages",
        ]
        read_only_fields = fields

    def get_requester_name(self, obj):
        return getattr(obj.created_by, "get_full_name", lambda: "")() or getattr(obj.created_by, "email", "") or str(obj.created_by)

    def get_requester_email(self, obj):
        return getattr(obj.created_by, "email", "") or ""

    def get_assigned_to_email(self, obj):
        return getattr(obj.assigned_to, "email", "") or ""

    def get_messages(self, obj):
        request = self.context.get("request")
        qs = obj.messages.select_related("sender").all()
        if not request or not getattr(getattr(request, "user", None), "role", None) == "ADMIN":
            qs = qs.filter(is_internal=False)
        return SupportMessageSerializer(qs, many=True, context=self.context).data


class SupportMessageCreateSerializer(serializers.Serializer):
    message = serializers.CharField(max_length=10000, trim_whitespace=True)

    def validate_message(self, value):
        value = value.strip()
        if len(value) < 2:
            raise serializers.ValidationError("Le message est trop court.")
        return value


class AdminSupportMessageCreateSerializer(SupportMessageCreateSerializer):
    is_internal = serializers.BooleanField(required=False, default=False)
