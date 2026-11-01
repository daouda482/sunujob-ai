from django.conf import settings
from django.db import models


class SupportTicket(models.Model):
    class Category(models.TextChoices):
        ACCOUNT = "ACCOUNT", "Compte et connexion"
        COMPANY = "COMPANY", "Entreprise"
        JOB = "JOB", "Offre d'emploi"
        APPLICATION = "APPLICATION", "Candidature"
        TECHNICAL = "TECHNICAL", "Problème technique"
        OTHER = "OTHER", "Autre demande"

    class Status(models.TextChoices):
        OPEN = "OPEN", "Ouvert"
        IN_PROGRESS = "IN_PROGRESS", "En cours"
        WAITING_USER = "WAITING_USER", "En attente du demandeur"
        RESOLVED = "RESOLVED", "Résolu"
        CLOSED = "CLOSED", "Fermé"

    class Priority(models.TextChoices):
        LOW = "LOW", "Faible"
        NORMAL = "NORMAL", "Normale"
        HIGH = "HIGH", "Élevée"
        URGENT = "URGENT", "Urgente"

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="support_tickets",
    )
    subject = models.CharField(max_length=180)
    category = models.CharField(max_length=20, choices=Category.choices, default=Category.OTHER, db_index=True)
    description = models.TextField()
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.OPEN, db_index=True)
    priority = models.CharField(max_length=10, choices=Priority.choices, default=Priority.NORMAL, db_index=True)
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_support_tickets",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at", "-created_at"]
        indexes = [
            models.Index(fields=["status", "priority"], name="support_status_priority_idx"),
        ]

    def __str__(self):
        return f"#{self.pk} — {self.subject}"


class SupportMessage(models.Model):
    ticket = models.ForeignKey(SupportTicket, on_delete=models.CASCADE, related_name="messages")
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="support_messages")
    message = models.TextField()
    is_internal = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at", "pk"]

    def __str__(self):
        return f"Message #{self.pk} — ticket #{self.ticket_id}"
