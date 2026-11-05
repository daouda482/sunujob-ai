
from django.utils import timezone

from rest_framework import serializers

from applications.models import Application
from .models import Interview


class InterviewSerializer(serializers.ModelSerializer):
    """
    Sérialiseur sécurisé pour la programmation et la gestion
    des entretiens de recrutement.
    """

    candidate_email = serializers.EmailField(
        source="application.candidate.email",
        read_only=True,
    )

    candidate_name = serializers.SerializerMethodField()

    job_title = serializers.CharField(
        source="application.job.title",
        read_only=True,
    )

    company_name = serializers.CharField(
        source="application.job.company.name",
        read_only=True,
    )

    recruiter = serializers.PrimaryKeyRelatedField(
        read_only=True,
    )

    class Meta:
        model = Interview

        fields = [
            "id",
            "application",
            "candidate_email",
            "candidate_name",
            "job_title",
            "company_name",
            "recruiter",
            "interview_type",
            "scheduled_at",
            "location",
            "meeting_link",
            "message",
            "status",
            "created_at",
            "updated_at",
        ]

        read_only_fields = [
            "id",
            "recruiter",
            "created_at",
            "updated_at",
        ]

    ALLOWED_STATUS_TRANSITIONS = {
        Interview.Status.SCHEDULED: {
            Interview.Status.RESCHEDULED,
            Interview.Status.COMPLETED,
            Interview.Status.CANCELLED,
        },
        Interview.Status.RESCHEDULED: {
            Interview.Status.RESCHEDULED,
            Interview.Status.COMPLETED,
            Interview.Status.CANCELLED,
        },
        Interview.Status.COMPLETED: set(),
        Interview.Status.CANCELLED: set(),
    }

    FINAL_STATUSES = {
        Interview.Status.COMPLETED,
        Interview.Status.CANCELLED,
    }

    CLOSED_APPLICATION_STATUSES = {
        Application.Status.ACCEPTED,
        Application.Status.REJECTED,
        Application.Status.WITHDRAWN,
    }

    def get_candidate_name(self, obj):
        candidate = obj.application.candidate

        full_name = (
            f"{candidate.first_name or ''} "
            f"{candidate.last_name or ''}"
        ).strip()

        return full_name or candidate.email

    def validate_application(self, application):
        """
        Vérifie que la candidature appartient au recruteur connecté
        et qu'elle peut encore recevoir un entretien.
        """

        request = self.context.get("request")

        if request and request.user.is_authenticated:
            if application.job.recruiter_id != request.user.id:
                raise serializers.ValidationError(
                    "Cette candidature n'appartient pas à vos offres."
                )

        if application.status in self.CLOSED_APPLICATION_STATUSES:
            raise serializers.ValidationError(
                "Cette candidature est clôturée. "
                "Impossible de programmer un entretien."
            )

        return application

    def validate_scheduled_at(self, value):
        """
        Toute nouvelle date d'entretien doit être dans le futur.
        """

        if value <= timezone.now():
            raise serializers.ValidationError(
                "La date de l'entretien doit être dans le futur."
            )

        return value

    def validate_status(self, value):
        """
        Vérifie les transitions autorisées du statut.
        """

        if not self.instance:
            if value not in {
                Interview.Status.SCHEDULED,
                Interview.Status.RESCHEDULED,
            }:
                raise serializers.ValidationError(
                    "Un nouvel entretien doit être programmé."
                )

            return value

        current_status = self.instance.status

        if current_status in self.FINAL_STATUSES:
            if value != current_status:
                raise serializers.ValidationError(
                    "Un entretien terminé ou annulé ne peut plus "
                    "être modifié."
                )

        allowed = self.ALLOWED_STATUS_TRANSITIONS.get(
            current_status,
            set(),
        )

        if value != current_status and value not in allowed:
            raise serializers.ValidationError(
                "Cette transition de statut n'est pas autorisée."
            )

        return value

    def validate(self, attrs):
        """
        Validation globale de l'entretien.
        """

        instance = self.instance

        if instance:
            if "application" in attrs:
                if attrs["application"].pk != instance.application_id:
                    raise serializers.ValidationError({
                        "application": (
                            "La candidature d'un entretien existant "
                            "ne peut pas être remplacée."
                        )
                    })

            if instance.status in self.FINAL_STATUSES:
                raise serializers.ValidationError(
                    "Cet entretien est déjà terminé ou annulé. "
                    "Aucune modification n'est autorisée."
                )

        interview_type = attrs.get(
            "interview_type",
            instance.interview_type if instance else None,
        )

        location = attrs.get(
            "location",
            instance.location if instance else "",
        )

        meeting_link = attrs.get(
            "meeting_link",
            instance.meeting_link if instance else "",
        )

        if interview_type == Interview.InterviewType.IN_PERSON:
            if not location or not location.strip():
                raise serializers.ValidationError({
                    "location": (
                        "Le lieu est obligatoire pour un entretien "
                        "en présentiel."
                    )
                })

        if interview_type == Interview.InterviewType.ONLINE:
            if not meeting_link or not meeting_link.strip():
                raise serializers.ValidationError({
                    "meeting_link": (
                        "Le lien de visioconférence est obligatoire "
                        "pour un entretien en ligne."
                    )
                })

        if instance and "scheduled_at" in attrs:
            new_date = attrs["scheduled_at"]

            if new_date != instance.scheduled_at:
                requested_status = attrs.get(
                    "status",
                    instance.status,
                )

                if requested_status == Interview.Status.SCHEDULED:
                    attrs["status"] = Interview.Status.RESCHEDULED

        return attrs
