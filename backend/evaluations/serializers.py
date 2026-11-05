
from rest_framework import serializers

from .models import Evaluation


class EvaluationSerializer(serializers.ModelSerializer):
    """
    Sérialiseur complet réservé aux recruteurs et administrateurs.
    """

    evaluator_email = serializers.EmailField(
        source="evaluator.email",
        read_only=True,
    )

    recommendation_label = serializers.CharField(
        source="get_recommendation_display",
        read_only=True,
    )

    status_label = serializers.CharField(
        source="get_status_display",
        read_only=True,
    )

    average_score = serializers.FloatField(read_only=True)
    percentage_score = serializers.FloatField(read_only=True)

    candidate_name = serializers.SerializerMethodField()
    job_title = serializers.SerializerMethodField()

    class Meta:
        model = Evaluation

        fields = [
            "id",
            "application",
            "interview",
            "evaluator",
            "evaluator_email",
            "candidate_name",
            "job_title",
            "technical_score",
            "communication_score",
            "experience_score",
            "motivation_score",
            "adaptability_score",
            "average_score",
            "percentage_score",
            "strengths",
            "weaknesses",
            "comments",
            "recommendation",
            "recommendation_label",
            "status",
            "status_label",
            "created_at",
            "updated_at",
        ]

        read_only_fields = [
            "id",
            "evaluator",
            "evaluator_email",
            "candidate_name",
            "job_title",
            "average_score",
            "percentage_score",
            "recommendation_label",
            "status_label",
            "created_at",
            "updated_at",
        ]

    def get_candidate_name(self, obj):
        try:
            candidate = obj.application.candidate
            user = getattr(candidate, "user", None) or candidate

            first_name = (
                getattr(user, "first_name", "")
                or getattr(candidate, "first_name", "")
                or ""
            )

            last_name = (
                getattr(user, "last_name", "")
                or getattr(candidate, "last_name", "")
                or ""
            )

            full_name = f"{first_name} {last_name}".strip()

            if full_name:
                return full_name

            for field in (
                "full_name",
                "name",
                "username",
                "email",
            ):
                value = getattr(user, field, None)

                if value:
                    return str(value)

            candidate_id = getattr(candidate, "id", None)

            if candidate_id:
                return f"Candidat #{candidate_id}"

            return "Candidat non identifié"

        except (AttributeError, TypeError):
            return "Candidat non identifié"

    def get_job_title(self, obj):
        try:
            job = obj.application.job

            return (
                getattr(job, "title", None)
                or getattr(job, "name", None)
                or str(job)
            )

        except (AttributeError, TypeError):
            return "Offre non identifiée"

    def validate_application(self, application):
        request = self.context.get("request")

        if request is None:
            return application

        user = request.user

        if (
            getattr(user, "role", None) == "RECRUITER"
            and application.job.recruiter_id != user.id
        ):
            raise serializers.ValidationError(
                "Vous ne pouvez pas évaluer une candidature "
                "qui ne dépend pas de vos offres."
            )

        return application

    def validate_interview(self, interview):
        if interview is None:
            return interview

        instance = getattr(self, "instance", None)

        application_id = self.initial_data.get("application")

        if application_id is None and instance:
            application_id = instance.application_id

        if application_id is None:
            raise serializers.ValidationError(
                "Veuillez sélectionner une candidature "
                "pour associer cet entretien."
            )

        try:
            application_id = int(application_id)
        except (TypeError, ValueError):
            raise serializers.ValidationError(
                "Identifiant de candidature invalide."
            )

        if interview.application_id != application_id:
            raise serializers.ValidationError(
                "Cet entretien ne correspond pas à cette candidature."
            )

        return interview

    def validate(self, attrs):
        attrs = super().validate(attrs)

        instance = getattr(self, "instance", None)

        status = attrs.get(
            "status",
            instance.status if instance else Evaluation.Status.DRAFT,
        )

        if status == Evaluation.Status.COMPLETED:
            strengths = attrs.get(
                "strengths",
                instance.strengths if instance else "",
            ) or ""

            comments = attrs.get(
                "comments",
                instance.comments if instance else "",
            ) or ""

            if not strengths.strip():
                raise serializers.ValidationError({
                    "strengths": (
                        "Les points forts sont obligatoires "
                        "pour terminer une évaluation."
                    )
                })

            if not comments.strip():
                raise serializers.ValidationError({
                    "comments": (
                        "Le commentaire général est obligatoire "
                        "pour terminer une évaluation."
                    )
                })

        return attrs


class CandidateEvaluationSerializer(serializers.ModelSerializer):
    """
    Sérialiseur limité aux informations communicables au candidat.

    Les évaluations en brouillon ne sont pas exposées.
    Les notes et commentaires internes ne sont jamais retournés.
    """

    status_label = serializers.CharField(
        source="get_status_display",
        read_only=True,
    )

    job_title = serializers.SerializerMethodField()

    class Meta:
        model = Evaluation

        fields = [
            "id",
            "job_title",
            "status",
            "status_label",
            "created_at",
            "updated_at",
        ]

        read_only_fields = fields

    def get_job_title(self, obj):
        try:
            job = obj.application.job

            return (
                getattr(job, "title", None)
                or getattr(job, "name", None)
                or str(job)
            )

        except (AttributeError, TypeError):
            return "Offre non identifiée"
