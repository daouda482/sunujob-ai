
from django.utils import timezone

from rest_framework import serializers

from .models import Job


class JobSerializer(serializers.ModelSerializer):
    """Sérialiseur sécurisé pour la gestion des offres par le recruteur."""

    recruiter = serializers.PrimaryKeyRelatedField(read_only=True)

    recruiter_email = serializers.EmailField(
        source="recruiter.email",
        read_only=True,
    )

    company_name = serializers.CharField(
        source="company.name",
        read_only=True,
    )

    class Meta:
        model = Job
        fields = [
            "id",
            "recruiter",
            "recruiter_email",
            "company",
            "company_name",
            "title",
            "description",
            "sector",
            "location",
            "contract_type",
            "experience_required",
            "education_level",
            "salary_min",
            "salary_max",
            "skills_required",
            "deadline",
            "status",
            "created_at",
            "updated_at",
        ]

        read_only_fields = [
            "id",
            "recruiter",
            "recruiter_email",
            "company_name",
            "created_at",
            "updated_at",
        ]

    # Transitions de statuts autorisées pour un recruteur.
    ALLOWED_STATUS_TRANSITIONS = {
        Job.Status.DRAFT: {
            Job.Status.PUBLISHED,
            Job.Status.CLOSED,
        },
        Job.Status.PUBLISHED: {
            Job.Status.SUSPENDED,
            Job.Status.CLOSED,
        },
        Job.Status.SUSPENDED: {
            Job.Status.PUBLISHED,
            Job.Status.CLOSED,
        },
        Job.Status.CLOSED: set(),
        Job.Status.EXPIRED: set(),
        Job.Status.ARCHIVED: set(),
    }

    def validate_company(self, company):
        """Vérifie que l'entreprise appartient au recruteur connecté."""

        request = self.context.get("request")

        if (
            request is None
            or not request.user.is_authenticated
        ):
            raise serializers.ValidationError(
                "Vous devez être connecté pour sélectionner une entreprise."
            )

        if company.recruiter_id != request.user.id:
            raise serializers.ValidationError(
                "Vous ne pouvez utiliser que votre propre entreprise."
            )

        return company

    def validate_status(self, status):
        """Empêche le recruteur de définir les statuts système."""

        protected_statuses = {
            Job.Status.EXPIRED,
            Job.Status.ARCHIVED,
        }

        if status in protected_statuses:
            raise serializers.ValidationError(
                "Ce statut est réservé au système et ne peut pas "
                "être défini manuellement."
            )

        return status

    def validate(self, attrs):
        instance = self.instance

        # --------------------------------------------------
        # 1. Validation des salaires
        # --------------------------------------------------

        salary_min = attrs.get(
            "salary_min",
            getattr(instance, "salary_min", None),
        )

        salary_max = attrs.get(
            "salary_max",
            getattr(instance, "salary_max", None),
        )

        if (
            salary_min is not None
            and salary_max is not None
            and salary_min > salary_max
        ):
            raise serializers.ValidationError({
                "salary_max": (
                    "Le salaire maximum doit être supérieur "
                    "ou égal au salaire minimum."
                )
            })

        # --------------------------------------------------
        # 2. Validation du statut et des transitions
        # --------------------------------------------------

        requested_status = attrs.get(
            "status",
            instance.status if instance else Job.Status.DRAFT,
        )

        if instance is None:
            # À la création, seules les offres brouillon
            # ou publiées sont autorisées.
            if requested_status not in {
                Job.Status.DRAFT,
                Job.Status.PUBLISHED,
            }:
                raise serializers.ValidationError({
                    "status": (
                        "Une nouvelle offre doit être créée "
                        "en brouillon ou publiée."
                    )
                })

        else:
            current_status = instance.status

            # Un statut inchangé est accepté.
            if requested_status != current_status:

                allowed_transitions = (
                    self.ALLOWED_STATUS_TRANSITIONS.get(
                        current_status,
                        set(),
                    )
                )

                if requested_status not in allowed_transitions:
                    raise serializers.ValidationError({
                        "status": (
                            f"Transition interdite : "
                            f"{current_status} vers {requested_status}. "
                            "Veuillez respecter le cycle de vie "
                            "des offres d'emploi."
                        )
                    })

        # --------------------------------------------------
        # 3. Validation de la date limite
        # --------------------------------------------------

        deadline = attrs.get(
            "deadline",
            getattr(instance, "deadline", None),
        )

        deadline_was_supplied = "deadline" in attrs

        if (
            deadline is not None
            and deadline < timezone.localdate()
            and (instance is None or deadline_was_supplied)
        ):
            raise serializers.ValidationError({
                "deadline": (
                    "La date limite ne peut pas être dans le passé."
                )
            })

        # Une offre dont la date limite est dépassée
        # ne peut pas être publiée ou republiée.
        if (
            requested_status == Job.Status.PUBLISHED
            and deadline is not None
            and deadline < timezone.localdate()
        ):
            raise serializers.ValidationError({
                "deadline": (
                    "Impossible de publier une offre dont "
                    "la date limite est dépassée. "
                    "Veuillez choisir une nouvelle date."
                )
            })

        return attrs


class PublishedJobSerializer(serializers.ModelSerializer):
    """
    Sérialiseur public : ne divulgue pas l'identifiant du recruteur
    ni son adresse e-mail.
    """

    company_name = serializers.CharField(
        source="company.name",
        read_only=True,
    )

    class Meta:
        model = Job

        fields = [
            "id",
            "company",
            "company_name",
            "title",
            "description",
            "sector",
            "location",
            "contract_type",
            "experience_required",
            "education_level",
            "salary_min",
            "salary_max",
            "skills_required",
            "deadline",
            "status",
            "created_at",
            "updated_at",
        ]

        read_only_fields = fields
