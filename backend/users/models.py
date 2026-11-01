
from django.contrib.auth.models import (
    AbstractBaseUser,
    BaseUserManager,
    PermissionsMixin,
)
from django.db import models
from .moderation_models import ModerationReport
from .verification_models import CompanyVerificationRequest
from .catalog_models import JobCategory, PlatformSkill
from .support_models import SupportTicket, SupportMessage
from .platform_settings_models import PlatformSettings
class UserManager(BaseUserManager):
    """Gestion de la création des utilisateurs et administrateurs."""

    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("L'adresse email est obligatoire.")

        email = self.normalize_email(email)

        user = self.model(
            email=email,
            **extra_fields,
        )

        user.set_password(password)
        user.save(using=self._db)

        return user

    def create_superuser(self, email, password=None, **extra_fields):
        """Crée un superutilisateur Django."""

        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("is_active", True)
        extra_fields.setdefault("role", User.Role.ADMIN)

        if extra_fields.get("is_staff") is not True:
            raise ValueError(
                "Le superutilisateur doit avoir is_staff=True."
            )

        if extra_fields.get("is_superuser") is not True:
            raise ValueError(
                "Le superutilisateur doit avoir is_superuser=True."
            )

        return self.create_user(
            email=email,
            password=password,
            **extra_fields,
        )


class User(AbstractBaseUser, PermissionsMixin):

    class Role(models.TextChoices):
        CANDIDATE = "CANDIDATE", "Candidat"
        RECRUITER = "RECRUITER", "Recruteur"
        TRAINING_PROVIDER = (
            "TRAINING_PROVIDER",
            "Organisme de formation",
        )
        ADMIN = "ADMIN", "Administrateur"

    email = models.EmailField(
        unique=True,
        verbose_name="Adresse email",
    )

    first_name = models.CharField(
        max_length=100,
        verbose_name="Prénom",
    )

    last_name = models.CharField(
        max_length=100,
        verbose_name="Nom",
    )

    phone = models.CharField(
        max_length=20,
        blank=True,
        null=True,
        verbose_name="Téléphone",
    )

    role = models.CharField(
        max_length=30,
        choices=Role.choices,
        default=Role.CANDIDATE,
        verbose_name="Rôle",
    )

    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)

    date_joined = models.DateTimeField(auto_now_add=True)

    objects = UserManager()

    # Connexion par adresse email
    USERNAME_FIELD = "email"

    REQUIRED_FIELDS = [
        "first_name",
        "last_name",
    ]

    def __str__(self):
        return f"{self.first_name} {self.last_name} - {self.email}"

    class Meta:
        verbose_name = "Utilisateur"
        verbose_name_plural = "Utilisateurs"
        ordering = ["-date_joined"]
