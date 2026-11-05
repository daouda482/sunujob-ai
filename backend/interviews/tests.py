
from datetime import timedelta
from unittest.mock import patch

from django.test import TestCase, override_settings
from django.utils import timezone
from django.urls import reverse

from rest_framework.test import APIClient

from users.models import User
from companies.models import Company
from jobs.models import Job
from applications.models import Application
from interviews.models import Interview, InterviewReminder

from interviews.tasks import (
    ensure_interview_reminders,
    process_one_reminder,
)


class InterviewWorkflowTests(TestCase):
    """
    Tests du processus de programmation et de suivi des entretiens.
    """

    def setUp(self):
        self.client = APIClient()

        self.recruiter = User.objects.create_user(
            email="recruteur@test.com",
            password="TestPassword123!",
            first_name="Moussa",
            last_name="Diallo",
            role=User.Role.RECRUITER,
        )

        self.other_recruiter = User.objects.create_user(
            email="autre.recruteur@test.com",
            password="TestPassword123!",
            first_name="Amadou",
            last_name="Fall",
            role=User.Role.RECRUITER,
        )

        self.candidate = User.objects.create_user(
            email="candidat@test.com",
            password="TestPassword123!",
            first_name="Fatou",
            last_name="Ndiaye",
            role=User.Role.CANDIDATE,
        )

        self.other_candidate = User.objects.create_user(
            email="autre.candidat@test.com",
            password="TestPassword123!",
            first_name="Awa",
            last_name="Sow",
            role=User.Role.CANDIDATE,
        )

        self.company = Company.objects.create(
            recruiter=self.recruiter,
            name="Entreprise Test",
            sector="Informatique",
        )

        self.job = Job.objects.create(
            recruiter=self.recruiter,
            company=self.company,
            title="Développeur Django",
            description="Poste de développeur backend.",
            sector="Informatique",
            location="Dakar",
            contract_type=Job.ContractType.CDI,
            status=Job.Status.PUBLISHED,
        )

        self.application = Application.objects.create(
            candidate=self.candidate,
            job=self.job,
            status=Application.Status.PENDING,
        )

        self.interview_url = reverse("recruiter-interviews")

        self.interview_date = timezone.now() + timedelta(days=5)

    def create_interview(self, application=None):
        """
        Crée un entretien directement pour les tests.
        """
        return Interview.objects.create(
            application=application or self.application,
            recruiter=self.recruiter,
            interview_type=Interview.InterviewType.ONLINE,
            scheduled_at=self.interview_date,
            meeting_link="https://example.com/meeting",
        )

    def create_reminder(
        self,
        interview=None,
        reminder_type=None,
        remind_at=None,
        **kwargs,
    ):
        """
        Crée un rappel directement pour les tests.
        """

        interview = interview or self.create_interview()

        return InterviewReminder.objects.create(
            interview=interview,
            reminder_type=(
                reminder_type
                or InterviewReminder.ReminderType.BEFORE_24_HOURS
            ),
            scheduled_at=interview.scheduled_at,
            remind_at=remind_at or (
                interview.scheduled_at - timedelta(hours=24)
            ),
            **kwargs,
        )

    # =====================================================
    # 1. TESTS DU WORKFLOW DES ENTRETIENS
    # =====================================================

    def test_recruiter_can_schedule_interview(self):
        """
        Un recruteur peut programmer un entretien
        pour une candidature qui lui appartient.
        """

        self.client.force_authenticate(user=self.recruiter)

        response = self.client.post(
            self.interview_url,
            {
                "application": self.application.pk,
                "interview_type": "ONLINE",
                "scheduled_at": self.interview_date.isoformat(),
                "meeting_link": "https://example.com/meeting",
                "message": "Merci de préparer votre entretien.",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)

        self.assertTrue(
            Interview.objects.filter(
                application=self.application
            ).exists()
        )

        self.application.refresh_from_db()

        self.assertEqual(
            self.application.status,
            Application.Status.INTERVIEW,
        )

    def test_completed_interview_does_not_change_application_status(self):
        """
        La fin d'un entretien ne clôture pas la candidature.
        """

        self.application.status = Application.Status.INTERVIEW
        self.application.save()

        interview = self.create_interview()

        self.client.force_authenticate(user=self.recruiter)

        url = reverse(
            "recruiter-interview-detail",
            kwargs={"pk": interview.pk},
        )

        response = self.client.patch(
            url,
            {"status": Interview.Status.COMPLETED},
            format="json",
        )

        self.assertEqual(response.status_code, 200)

        interview.refresh_from_db()
        self.application.refresh_from_db()

        self.assertEqual(
            interview.status,
            Interview.Status.COMPLETED,
        )

        self.assertEqual(
            self.application.status,
            Application.Status.INTERVIEW,
        )

    def test_closed_application_cannot_receive_interview(self):
        """
        Une candidature acceptée, rejetée ou retirée
        ne peut plus recevoir de nouvel entretien.
        """

        closed_statuses = [
            Application.Status.ACCEPTED,
            Application.Status.REJECTED,
            Application.Status.WITHDRAWN,
        ]

        self.client.force_authenticate(user=self.recruiter)

        for status in closed_statuses:
            with self.subTest(status=status):
                self.application.status = status
                self.application.save()

                response = self.client.post(
                    self.interview_url,
                    {
                        "application": self.application.pk,
                        "interview_type": "ONLINE",
                        "scheduled_at": self.interview_date.isoformat(),
                        "meeting_link": "https://example.com/meeting",
                    },
                    format="json",
                )

                self.assertEqual(response.status_code, 400)

        self.assertEqual(
            Interview.objects.filter(
                application=self.application
            ).count(),
            0,
        )

    def test_other_recruiter_cannot_schedule_interview(self):
        """
        Un recruteur ne peut pas programmer un entretien
        sur une candidature appartenant à un autre recruteur.
        """

        self.client.force_authenticate(user=self.other_recruiter)

        response = self.client.post(
            self.interview_url,
            {
                "application": self.application.pk,
                "interview_type": "ONLINE",
                "scheduled_at": self.interview_date.isoformat(),
                "meeting_link": "https://example.com/meeting",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(Interview.objects.count(), 0)

    def test_candidate_only_sees_own_interviews(self):
        """
        Un candidat ne doit voir que ses propres entretiens.
        """

        self.create_interview()

        other_application = Application.objects.create(
            candidate=self.other_candidate,
            job=self.job,
            status=Application.Status.INTERVIEW,
        )

        self.create_interview(application=other_application)

        self.client.force_authenticate(user=self.candidate)

        response = self.client.get(
            reverse("candidate-interviews")
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)

        self.assertEqual(
            response.data[0]["application"],
            self.application.pk,
        )

    def test_recruiter_only_sees_own_interviews(self):
        """
        Un recruteur ne doit voir que ses propres entretiens.
        """

        self.create_interview()

        other_company = Company.objects.create(
            recruiter=self.other_recruiter,
            name="Autre entreprise",
            sector="Technologie",
        )

        other_job = Job.objects.create(
            recruiter=self.other_recruiter,
            company=other_company,
            title="Développeur Python",
            description="Poste backend.",
            sector="Informatique",
            location="Dakar",
            contract_type=Job.ContractType.CDI,
            status=Job.Status.PUBLISHED,
        )

        other_application = Application.objects.create(
            candidate=self.other_candidate,
            job=other_job,
            status=Application.Status.INTERVIEW,
        )

        Interview.objects.create(
            application=other_application,
            recruiter=self.other_recruiter,
            interview_type=Interview.InterviewType.ONLINE,
            scheduled_at=self.interview_date,
            meeting_link="https://example.com/other-meeting",
        )

        self.client.force_authenticate(user=self.recruiter)

        response = self.client.get(self.interview_url)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)

    def test_past_interview_date_is_rejected(self):
        """
        La programmation d'un entretien dans le passé est refusée.
        """

        self.client.force_authenticate(user=self.recruiter)

        past_date = timezone.now() - timedelta(days=2)

        response = self.client.post(
            self.interview_url,
            {
                "application": self.application.pk,
                "interview_type": "ONLINE",
                "scheduled_at": past_date.isoformat(),
                "meeting_link": "https://example.com/meeting",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(Interview.objects.count(), 0)

    # =====================================================
    # 2. TESTS DE CRÉATION DES RAPPELS
    # =====================================================

    def test_ensure_creates_24h_and_2h_reminders(self):
        """
        Deux rappels doivent être créés pour un entretien
        suffisamment éloigné dans le futur.
        """

        interview = self.create_interview()

        result = ensure_interview_reminders()

        self.assertEqual(result, 2)

        reminders = InterviewReminder.objects.filter(
            interview=interview
        )

        self.assertEqual(reminders.count(), 2)

        reminder_types = set(
            reminders.values_list("reminder_type", flat=True)
        )

        self.assertEqual(
            reminder_types,
            {
                InterviewReminder.ReminderType.BEFORE_24_HOURS,
                InterviewReminder.ReminderType.BEFORE_2_HOURS,
            },
        )

    def test_ensure_does_not_duplicate_existing_reminders(self):
        """
        Une deuxième exécution ne doit pas créer de doublons.
        """

        interview = self.create_interview()

        ensure_interview_reminders()
        ensure_interview_reminders()

        self.assertEqual(
            InterviewReminder.objects.filter(
                interview=interview
            ).count(),
            2,
        )

    def test_invalidated_reminder_is_reactivated(self):
        """
        Un ancien rappel invalidé peut être réactivé
        pour la même date d'entretien.

        Les canaux déjà traités doivent être conservés.
        """

        interview = self.create_interview()

        email_date = timezone.now()
        notification_date = timezone.now()

        reminder = self.create_reminder(
            interview=interview,
            is_invalidated=True,
            email_sent_at=email_date,
            notification_created_at=notification_date,
            email_error="Ancienne erreur",
            notification_error="Ancienne erreur",
            last_error="Anciennes erreurs",
        )

        ensure_interview_reminders()

        reminder.refresh_from_db()

        self.assertFalse(reminder.is_invalidated)

        self.assertEqual(
            reminder.email_sent_at,
            email_date,
        )

        self.assertEqual(
            reminder.notification_created_at,
            notification_date,
        )

        self.assertEqual(reminder.email_error, "")
        self.assertEqual(reminder.notification_error, "")
        self.assertEqual(reminder.last_error, "")

    def test_completed_reminder_is_not_reactivated(self):
        """
        Un rappel déjà terminé ne doit jamais être réactivé.
        """

        interview = self.create_interview()

        completed_date = timezone.now()

        reminder = self.create_reminder(
            interview=interview,
            is_invalidated=True,
            sent_at=completed_date,
        )

        ensure_interview_reminders()

        reminder.refresh_from_db()

        self.assertTrue(reminder.is_invalidated)

        self.assertEqual(
            reminder.sent_at,
            completed_date,
        )

    # =====================================================
    # 3. TESTS DE TRAITEMENT DES RAPPELS
    # =====================================================

    @override_settings(TWILIO_ENABLED=False)
    @patch("interviews.tasks.create_notification")
    @patch("interviews.tasks.send_mail")
    def test_due_reminder_sends_email_and_notification(
        self,
        mock_send_mail,
        mock_create_notification,
    ):
        """
        Un rappel arrivé à échéance doit traiter
        l'email et la notification du tableau de bord.
        """

        mock_send_mail.return_value = 1
        mock_create_notification.return_value = object()

        interview = self.create_interview()

        reminder = self.create_reminder(
            interview=interview,
            reminder_type=(
                InterviewReminder.ReminderType.BEFORE_2_HOURS
            ),
            remind_at=timezone.now() - timedelta(minutes=5),
        )

        result = process_one_reminder(reminder.pk)

        reminder.refresh_from_db()

        self.assertTrue(result)

        self.assertIsNotNone(reminder.email_sent_at)
        self.assertIsNotNone(reminder.notification_created_at)
        self.assertIsNotNone(reminder.sent_at)

        self.assertEqual(reminder.attempts, 1)

        mock_send_mail.assert_called_once()
        mock_create_notification.assert_called_once()

    @override_settings(TWILIO_ENABLED=False)
    @patch("interviews.tasks.create_notification")
    @patch("interviews.tasks.send_mail")
    def test_email_failure_can_be_retried_without_duplicate_notification(
        self,
        mock_send_mail,
        mock_create_notification,
    ):
        """
        Si l'email échoue mais que la notification réussit,
        une nouvelle tentative ne doit pas recréer la notification.
        """

        mock_send_mail.side_effect = [
            RuntimeError("Erreur SMTP simulée"),
            1,
        ]

        mock_create_notification.return_value = object()

        interview = self.create_interview()

        reminder = self.create_reminder(
            interview=interview,
            reminder_type=(
                InterviewReminder.ReminderType.BEFORE_2_HOURS
            ),
            remind_at=timezone.now() - timedelta(minutes=5),
        )

        # Première tentative : email en échec.
        first_result = process_one_reminder(reminder.pk)

        reminder.refresh_from_db()

        self.assertFalse(first_result)

        self.assertIsNone(reminder.email_sent_at)
        self.assertIsNotNone(reminder.notification_created_at)
        self.assertIsNone(reminder.sent_at)

        self.assertTrue(reminder.email_error)

        # Deuxième tentative : l'email réussit.
        second_result = process_one_reminder(reminder.pk)

        reminder.refresh_from_db()

        self.assertTrue(second_result)

        self.assertIsNotNone(reminder.email_sent_at)
        self.assertIsNotNone(reminder.notification_created_at)
        self.assertIsNotNone(reminder.sent_at)

        self.assertEqual(reminder.attempts, 2)

        self.assertEqual(mock_send_mail.call_count, 2)

        # La notification n'est créée qu'une seule fois.
        mock_create_notification.assert_called_once()

    @override_settings(TWILIO_ENABLED=False)
    @patch("interviews.tasks.create_notification")
    @patch("interviews.tasks.send_mail")
    def test_cancelled_interview_does_not_send_reminder(
        self,
        mock_send_mail,
        mock_create_notification,
    ):
        """
        Aucun rappel ne doit être envoyé pour un entretien annulé.
        """

        interview = self.create_interview()

        interview.status = Interview.Status.CANCELLED
        interview.save(update_fields=["status"])

        reminder = self.create_reminder(
            interview=interview,
            remind_at=timezone.now() - timedelta(minutes=5),
        )

        result = process_one_reminder(reminder.pk)

        reminder.refresh_from_db()

        self.assertFalse(result)

        self.assertIsNone(reminder.email_sent_at)
        self.assertIsNone(reminder.notification_created_at)
        self.assertIsNone(reminder.sent_at)

        mock_send_mail.assert_not_called()
        mock_create_notification.assert_not_called()

    @override_settings(TWILIO_ENABLED=False)
    @patch("interviews.tasks.create_notification")
    @patch("interviews.tasks.send_mail")
    def test_already_completed_reminder_is_not_sent_again(
        self,
        mock_send_mail,
        mock_create_notification,
    ):
        """
        Un rappel déjà terminé ne doit pas être envoyé à nouveau.
        """

        interview = self.create_interview()

        reminder = self.create_reminder(
            interview=interview,
            sent_at=timezone.now(),
        )

        result = process_one_reminder(reminder.pk)

        self.assertFalse(result)

        mock_send_mail.assert_not_called()
        mock_create_notification.assert_not_called()

    def test_invalidated_reminder_is_not_processed(self):
        """
        Un rappel invalidé ne doit pas être traité.
        """

        interview = self.create_interview()

        reminder = self.create_reminder(
            interview=interview,
            is_invalidated=True,
            remind_at=timezone.now() - timedelta(minutes=5),
        )

        result = process_one_reminder(reminder.pk)

        self.assertFalse(result)

    def test_future_reminder_is_not_processed(self):
        """
        Un rappel dont l'heure n'est pas encore arrivée
        ne doit pas être traité.
        """

        interview = self.create_interview()

        reminder = self.create_reminder(
            interview=interview,
            remind_at=timezone.now() + timedelta(hours=1),
        )

        result = process_one_reminder(reminder.pk)

        self.assertFalse(result)

    def test_reminder_with_changed_interview_date_is_not_processed(self):
        """
        Un ancien rappel ne doit pas être envoyé si la date
        de l'entretien ne correspond plus à sa date enregistrée.
        """

        interview = self.create_interview()

        reminder = self.create_reminder(
            interview=interview,
            remind_at=timezone.now() - timedelta(minutes=5),
        )

        interview.scheduled_at += timedelta(days=2)
        interview.save(update_fields=["scheduled_at"])

        result = process_one_reminder(reminder.pk)

        self.assertFalse(result)
