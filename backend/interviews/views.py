
from django.db import transaction
from rest_framework import generics
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated

from interviews.models import Interview
from interviews.permissions import IsRecruiter, IsCandidate
from interviews.serializers import InterviewSerializer
from notifications.models import Notification
from notifications.services import create_notification


def notify_candidate(interview, title, message):
    """Crée une notification pour le candidat concerné."""
    create_notification(
        recipient=interview.application.candidate,
        title=title,
        message=message,
        notification_type=Notification.NotificationType.INTERVIEW,
        related_url="/candidate/interviews",
    )


def recruiter_interviews(user):
    """Retourne uniquement les entretiens du recruteur connecté."""
    return (
        Interview.objects
        .filter(
            recruiter=user,
            application__job__recruiter=user,
        )
        .select_related(
            "application",
            "application__candidate",
            "application__job",
            "application__job__company",
            "recruiter",
        )
        .order_by("scheduled_at")
    )


def candidate_interviews(user):
    """Retourne uniquement les entretiens du candidat connecté."""
    return (
        Interview.objects
        .filter(application__candidate=user)
        .select_related(
            "application",
            "application__candidate",
            "application__job",
            "application__job__company",
            "recruiter",
        )
        .order_by("scheduled_at")
    )


# ---------------------------------------------------------
# RECRUTEUR : LISTE ET CRÉATION DES ENTRETIENS
# ---------------------------------------------------------

class RecruiterInterviewListCreateView(generics.ListCreateAPIView):
    serializer_class = InterviewSerializer
    permission_classes = [IsAuthenticated, IsRecruiter]

    def get_queryset(self):
        return recruiter_interviews(self.request.user)

    @transaction.atomic
    def perform_create(self, serializer):
        application = serializer.validated_data.get("application")

        if application is None:
            raise ValidationError({
                "application": "Veuillez sélectionner une candidature."
            })

        # Vérification supplémentaire côté serveur.
        if application.job.recruiter_id != self.request.user.id:
            raise ValidationError({
                "application": (
                    "Cette candidature ne concerne pas l'une de vos offres."
                )
            })

        if application.status in ["REJECTED", "WITHDRAWN"]:
            raise ValidationError({
                "application": (
                    "Cette candidature ne peut pas faire l'objet d'un entretien."
                )
            })

        interview = serializer.save(recruiter=self.request.user)

        notify_candidate(
            interview,
            title="Nouvel entretien programmé",
            message=(
                f"Un entretien a été programmé pour le poste "
                f"« {interview.application.job.title} » le "
                f"{interview.scheduled_at:%d/%m/%Y à %H:%M}."
            ),
        )


# ---------------------------------------------------------
# RECRUTEUR : DÉTAIL, MODIFICATION ET SUPPRESSION
# ---------------------------------------------------------

class RecruiterInterviewDetailView(
    generics.RetrieveUpdateDestroyAPIView
):
    serializer_class = InterviewSerializer
    permission_classes = [IsAuthenticated, IsRecruiter]

    def get_queryset(self):
        return recruiter_interviews(self.request.user)

    @transaction.atomic
    def perform_update(self, serializer):
        interview = self.get_object()

        previous_status = interview.status
        previous_date = interview.scheduled_at
        previous_type = interview.interview_type
        previous_location = interview.location
        previous_link = interview.meeting_link
        previous_message = interview.message

        updated_interview = serializer.save()

        changed = (
            previous_status != updated_interview.status
            or previous_date != updated_interview.scheduled_at
            or previous_type != updated_interview.interview_type
            or previous_location != updated_interview.location
            or previous_link != updated_interview.meeting_link
            or previous_message != updated_interview.message
        )

        if not changed:
            return

        job_title = updated_interview.application.job.title

        if (
            updated_interview.status == Interview.Status.CANCELLED
            and previous_status != Interview.Status.CANCELLED
        ):
            title = "Entretien annulé"
            message = (
                f"L'entretien prévu pour le poste "
                f"« {job_title} » a été annulé."
            )
        else:
            title = "Entretien mis à jour"
            message = (
                f"Les informations de votre entretien pour le poste "
                f"« {job_title} » ont été modifiées. "
                f"Date prévue : "
                f"{updated_interview.scheduled_at:%d/%m/%Y à %H:%M}."
            )

        notify_candidate(updated_interview, title, message)


# ---------------------------------------------------------
# CANDIDAT : LISTE DE SES ENTRETIENS
# ---------------------------------------------------------

class CandidateInterviewListView(generics.ListAPIView):
    serializer_class = InterviewSerializer
    permission_classes = [IsAuthenticated, IsCandidate]

    def get_queryset(self):
        return candidate_interviews(self.request.user)


# ---------------------------------------------------------
# CANDIDAT : DÉTAIL D'UN ENTRETIEN
# ---------------------------------------------------------

class CandidateInterviewDetailView(generics.RetrieveAPIView):
    serializer_class = InterviewSerializer
    permission_classes = [IsAuthenticated, IsCandidate]

    def get_queryset(self):
        return candidate_interviews(self.request.user)
