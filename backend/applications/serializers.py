from django.utils import timezone

from rest_framework import serializers

from jobs.models import Job
from .models import Application


class ApplicationSerializer(serializers.ModelSerializer):
    candidate_email = serializers.EmailField(
        source="candidate.email",
        read_only=True,
    )
    candidate_first_name = serializers.CharField(
        source="candidate.first_name",
        read_only=True,
        allow_blank=True,
    )
    candidate_last_name = serializers.CharField(
        source="candidate.last_name",
        read_only=True,
        allow_blank=True,
    )
    job_title = serializers.CharField(
        source="job.title",
        read_only=True,
    )
    company_name = serializers.CharField(
        source="job.company.name",
        read_only=True,
        allow_null=True,
    )
    recruiter_email = serializers.EmailField(
        source="job.recruiter.email",
        read_only=True,
        allow_null=True,
    )

    class Meta:
        model = Application
        fields = [
            "id",
            "candidate",
            "candidate_email",
            "candidate_first_name",
            "candidate_last_name",
            "job",
            "job_title",
            "company_name",
            "recruiter_email",
            "cover_letter",
            "resume",
            "status",
            "recruiter_note",
            "applied_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "candidate",
            "candidate_email",
            "candidate_first_name",
            "candidate_last_name",
            "job_title",
            "company_name",
            "recruiter_email",
            "status",
            "recruiter_note",
            "applied_at",
            "updated_at",
        ]

    def validate_job(self, job):
        if job.status != Job.Status.PUBLISHED:
            raise serializers.ValidationError(
                "Vous ne pouvez postuler qu'à une offre publiée."
            )

        if job.deadline and job.deadline < timezone.localdate():
            raise serializers.ValidationError(
                "La date limite de candidature est dépassée."
            )

        return job

    def validate(self, attrs):
        request = self.context.get("request")

        if request is None or not request.user.is_authenticated:
            raise serializers.ValidationError(
                "Vous devez être connecté pour postuler."
            )

        # La vérification des doublons concerne uniquement une nouvelle
        # candidature. Elle ne doit pas bloquer une éventuelle mise à jour.
        if self.instance is None:
            job = attrs.get("job")

            if job is None:
                raise serializers.ValidationError({
                    "job": "Veuillez sélectionner une offre d'emploi."
                })

            if Application.objects.filter(
                candidate=request.user,
                job=job,
            ).exists():
                raise serializers.ValidationError({
                    "job": "Vous avez déjà postulé à cette offre."
                })

        return attrs


class ApplicationStatusUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Application
        fields = ["status", "recruiter_note"]

    def validate_status(self, value):
        allowed_statuses = {
            Application.Status.PENDING,
            Application.Status.REVIEWING,
            Application.Status.SHORTLISTED,
            Application.Status.INTERVIEW,
            Application.Status.ACCEPTED,
            Application.Status.REJECTED,
        }

        if value not in allowed_statuses:
            raise serializers.ValidationError(
                "Ce statut ne peut pas être attribué par le recruteur."
            )

        return value

    def validate(self, attrs):
        if not attrs:
            raise serializers.ValidationError(
                "Indique le statut ou la note à modifier."
            )

        return attrs
