from django.contrib.auth import get_user_model
from rest_framework import serializers

from users.moderation_models import ModerationReport


def get_target_model(target_type):
    """
    Retourne le modèle correspondant à la cible du signalement.
    Les imports sont différés pour limiter les risques d'import circulaire.
    """
    if target_type == ModerationReport.TargetType.JOB:
        from jobs.models import Job
        return Job

    if target_type == ModerationReport.TargetType.COMPANY:
        from companies.models import Company
        return Company

    if target_type == ModerationReport.TargetType.USER:
        return get_user_model()

    return None


def get_target_label(target):
    for field in ("title", "name", "email", "username"):
        value = getattr(target, field, None)

        if value:
            return str(value)[:250]

    return f"Élément #{target.pk}"


class ModerationReportCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ModerationReport
        fields = [
            "id",
            "target_type",
            "target_id",
            "reason",
            "description",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]

    def validate_description(self, value):
        value = value.strip()

        if len(value) < 10:
            raise serializers.ValidationError(
                "Veuillez préciser le signalement en au moins 10 caractères."
            )

        if len(value) > 5000:
            raise serializers.ValidationError(
                "La description ne peut pas dépasser 5 000 caractères."
            )

        return value

    def validate(self, attrs):
        target_type = attrs.get("target_type")
        target_id = attrs.get("target_id")
        request = self.context.get("request")

        model = get_target_model(target_type)

        if model is None:
            raise serializers.ValidationError({
                "target_type": "Le type de cible est invalide."
            })

        target = model.objects.filter(pk=target_id).first()

        if target is None:
            raise serializers.ValidationError({
                "target_id": "L'élément à signaler n'existe pas."
            })

        if (
            target_type == ModerationReport.TargetType.USER
            and request
            and target.pk == request.user.pk
        ):
            raise serializers.ValidationError({
                "target_id": "Vous ne pouvez pas signaler votre propre compte."
            })

        # Évite qu'un même utilisateur ouvre plusieurs dossiers identiques
        # encore en attente pour la même cible et le même motif.
        if request and request.user.is_authenticated:
            duplicate_exists = ModerationReport.objects.filter(
                reporter=request.user,
                target_type=target_type,
                target_id=target_id,
                reason=attrs.get("reason"),
                status__in=[
                    ModerationReport.Status.OPEN,
                    ModerationReport.Status.IN_REVIEW,
                ],
            ).exists()

            if duplicate_exists:
                raise serializers.ValidationError(
                    "Un signalement similaire est déjà en cours de traitement."
                )

        attrs["target_object"] = target
        return attrs

    def create(self, validated_data):
        request = self.context["request"]
        target = validated_data.pop("target_object")

        return ModerationReport.objects.create(
            reporter=request.user,
            reporter_email=getattr(request.user, "email", "") or "",
            target_label=get_target_label(target),
            **validated_data,
        )


class AdminModerationReportSerializer(serializers.ModelSerializer):
    reporter_label = serializers.SerializerMethodField()
    reviewer_label = serializers.SerializerMethodField()
    target_type_label = serializers.CharField(
        source="get_target_type_display",
        read_only=True,
    )
    reason_label = serializers.CharField(
        source="get_reason_display",
        read_only=True,
    )
    status_label = serializers.CharField(
        source="get_status_display",
        read_only=True,
    )

    class Meta:
        model = ModerationReport
        fields = [
            "id",
            "reporter_label",
            "reporter_email",
            "target_type",
            "target_type_label",
            "target_id",
            "target_label",
            "reason",
            "reason_label",
            "description",
            "status",
            "status_label",
            "admin_notes",
            "reviewer_label",
            "reviewed_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields

    def get_reporter_label(self, obj):
        user = obj.reporter

        if user:
            full_name = (
                f"{getattr(user, 'first_name', '') or ''} "
                f"{getattr(user, 'last_name', '') or ''}"
            ).strip()

            if full_name:
                return full_name

        return obj.reporter_email or "Utilisateur supprimé ou inconnu"

    def get_reviewer_label(self, obj):
        user = obj.reviewed_by

        if not user:
            return "—"

        full_name = (
            f"{getattr(user, 'first_name', '') or ''} "
            f"{getattr(user, 'last_name', '') or ''}"
        ).strip()

        return full_name or getattr(user, "email", "") or "Administrateur"