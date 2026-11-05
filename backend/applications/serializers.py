
from django.utils import timezone

from rest_framework import serializers

from jobs.models import Job
from .models import Application


class ApplicationSerializer(serializers.ModelSerializer):
    """
    Sérialiseur principal des candidatures.

    Les informations des candidats et des offres sont accessibles
    selon les permissions de l'API.

    Les notes internes du recruteur sont masquées aux candidats.
    """

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

    def get_fields(self):
        """
        Masque les notes internes aux candidats.

        Seuls les recruteurs et les administrateurs authentifiés
        peuvent recevoir le champ recruiter_note.
        """

        fields = super().get_fields()

        request = self.context.get("request")
        user = getattr(request, "user", None)

        allowed_roles = {
            "RECRUITER",
            "ADMIN",
        }

        user_role = getattr(user, "role", None)

        if (
            not user
            or not user.is_authenticated
            or user_role not in allowed_roles
        ):
            fields.pop("recruiter_note", None)

        return fields

    def validate_job(self, job):
        """
        Vérifie que l'offre est publiée et que sa date limite
        de candidature n'est pas dépassée.
        """

        if job.status != Job.Status.PUBLISHED:
            raise serializers.ValidationError(
                "Vous ne pouvez postuler qu'à une offre publiée."
            )

        if (
            job.deadline
            and job.deadline < timezone.localdate()
        ):
            raise serializers.ValidationError(
                "La date limite de candidature est dépassée."
            )

        return job

    def validate(self, attrs):
        """
        Vérifie l'authentification du candidat et empêche
        les candidatures multiples à une même offre.
        """

        request = self.context.get("request")

        if (
            request is None
            or not request.user.is_authenticated
        ):
            raise serializers.ValidationError(
                "Vous devez être connecté pour postuler."
            )

        if self.instance is None:
            job = attrs.get("job")

            if job is None:
                raise serializers.ValidationError({
                    "job": (
                        "Veuillez sélectionner une offre d'emploi."
                    )
                })

            already_applied = Application.objects.filter(
                candidate=request.user,
                job=job,
            ).exists()

            if already_applied:
                raise serializers.ValidationError({
                    "job": (
                        "Vous avez déjà postulé à cette offre."
                    )
                })

        return attrs


class ApplicationStatusUpdateSerializer(serializers.ModelSerializer):
    """
    Gère les changements de statut et les notes internes du recruteur.

    Le passage au statut INTERVIEW est réservé au processus
    automatique de programmation d'un entretien.
    """

    ALLOWED_TRANSITIONS = {
        Application.Status.PENDING: {
            Application.Status.REVIEWING,
            Application.Status.SHORTLISTED,
            Application.Status.REJECTED,
        },

        Application.Status.REVIEWING: {
            Application.Status.SHORTLISTED,
            Application.Status.REJECTED,
        },

        Application.Status.SHORTLISTED: {
            Application.Status.REJECTED,
        },

        Application.Status.INTERVIEW: {
            Application.Status.ACCEPTED,
            Application.Status.REJECTED,
        },

        Application.Status.ACCEPTED: set(),

        Application.Status.REJECTED: set(),

        Application.Status.WITHDRAWN: set(),
    }

    class Meta:
        model = Application

        fields = [
            "status",
            "recruiter_note",
        ]

    def validate_status(self, value):
        """
        Empêche le recruteur d'attribuer directement
        certains statuts réservés au système.
        """

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
        """
        Contrôle les transitions de statut et autorise
        la modification indépendante de la note interne.
        """

        if not attrs:
            raise serializers.ValidationError(
                "Indique le statut ou la note à modifier."
            )

        # Une modification de note seule est autorisée.
        if "status" not in attrs:
            return attrs

        if self.instance is None:
            raise serializers.ValidationError(
                "Cette opération nécessite une candidature existante."
            )

        current_status = self.instance.status
        new_status = attrs["status"]

        # Autoriser la conservation du statut actuel.
        if current_status == new_status:
            return attrs

        allowed_next_statuses = self.ALLOWED_TRANSITIONS.get(
            current_status,
            set(),
        )

        if new_status not in allowed_next_statuses:

            current_label = dict(
                Application.Status.choices
            ).get(
                current_status,
                current_status,
            )

            new_label = dict(
                Application.Status.choices
            ).get(
                new_status,
                new_status,
            )

            raise serializers.ValidationError({
                "status": (
                    f"Transition interdite : {current_label} "
                    f"vers {new_label}. "
                    "Veuillez respecter les étapes du processus "
                    "de recrutement."
                )
            })

        return attrs
