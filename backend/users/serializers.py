from django.contrib.auth import get_user_model
from rest_framework import serializers


User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    """
    Serializer permettant de retourner les informations
    publiques d'un utilisateur.
    """

    class Meta:
        model = User

        fields = [
            "id",
            "email",
            "first_name",
            "last_name",
            "phone",
            "role",
            "date_joined",
        ]

        read_only_fields = [
            "id",
            "date_joined",
        ]


class RegisterSerializer(serializers.ModelSerializer):
    """
    Serializer utilisé pour l'inscription d'un nouvel utilisateur.
    """

    password = serializers.CharField(
        write_only=True,
        min_length=8
    )

    password_confirmation = serializers.CharField(
        write_only=True
    )

    class Meta:
        model = User

        fields = [
            "email",
            "first_name",
            "last_name",
            "phone",
            "role",
            "password",
            "password_confirmation",
        ]

    def validate_email(self, value):
        """
        Vérifie que l'email n'est pas déjà utilisé.
        """

        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError(
                "Cette adresse email est déjà utilisée."
            )

        return value.lower()

    def validate_role(self, value):
        """
        Empêche un utilisateur de s'inscrire directement
        comme administrateur.
        """

        if value == User.Role.ADMIN:
            raise serializers.ValidationError(
                "La création d'un compte administrateur n'est pas autorisée via l'inscription."
            )

        return value

    def validate(self, attrs):
        """
        Vérifie que les deux mots de passe correspondent.
        """

        if attrs["password"] != attrs["password_confirmation"]:
            raise serializers.ValidationError({
                "password_confirmation": "Les mots de passe ne correspondent pas."
            })

        return attrs

    def create(self, validated_data):
        """
        Création sécurisée de l'utilisateur.
        """

        validated_data.pop("password_confirmation")

        password = validated_data.pop("password")

        user = User.objects.create_user(
            password=password,
            **validated_data
        )

        return user