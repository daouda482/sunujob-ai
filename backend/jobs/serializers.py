
from django.utils import timezone

from rest_framework import serializers

from .models import Job


class JobSerializer(serializers.ModelSerializer):
    """Sérialiseur utilisé pour la gestion des offres par le recruteur."""

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

    def validate_company(self, company):
        request = self.context.get("request")

        if request is None or not request.user.is_authenticated:
            raise serializers.ValidationError(
                "Vous devez être connecté pour sélectionner une entreprise."
            )

        if company.recruiter_id != request.user.id:
            raise serializers.ValidationError(
                "Vous ne pouvez utiliser que votre propre entreprise."
            )

        return company

    def validate(self, attrs):
        instance = self.instance

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

        deadline = attrs.get(
            "deadline",
            getattr(instance, "deadline", None),
        )

        # À la création, une date passée est refusée.
        # En modification, elle est vérifiée uniquement si elle est
        # explicitement fournie. Cela permet de corriger ou fermer
        # une offre expirée sans devoir modifier sa date limite.
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
