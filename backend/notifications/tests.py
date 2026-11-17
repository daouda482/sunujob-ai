
from types import SimpleNamespace
from unittest.mock import Mock, patch

from django.conf import settings
from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from django.utils import timezone

from twilio.base.exceptions import TwilioRestException

from notifications.models import Notification
from notifications.sms_service import (
    SMSServiceError,
    normalize_phone_number,
    send_sms,
)
from notifications.tasks import send_sms_task


User = get_user_model()


# =========================================================
# 1. TESTS DU MODÈLE NOTIFICATION
# =========================================================

class NotificationModelTests(TestCase):
    """Tests du modèle Notification."""

    def setUp(self):
        self.user = User.objects.create_user(
            email="candidate@example.com",
            password="TestPassword123!",
        )

    def test_create_notification(self):
        notification = Notification.objects.create(
            recipient=self.user,
            title="Nouvelle candidature",
            message="Votre candidature a été enregistrée.",
            notification_type=Notification.NotificationType.APPLICATION,
        )

        self.assertEqual(notification.recipient, self.user)
        self.assertEqual(notification.title, "Nouvelle candidature")
        self.assertFalse(notification.is_read)

    def test_notification_default_type_is_system(self):
        notification = Notification.objects.create(
            recipient=self.user,
            title="Information système",
            message="Bienvenue sur SunuJob AI.",
        )

        self.assertEqual(
            notification.notification_type,
            Notification.NotificationType.SYSTEM,
        )

    def test_notification_default_is_unread(self):
        notification = Notification.objects.create(
            recipient=self.user,
            title="Test",
            message="Notification de test.",
        )

        self.assertFalse(notification.is_read)

    def test_notification_related_url_can_be_empty(self):
        notification = Notification.objects.create(
            recipient=self.user,
            title="Test",
            message="Notification sans lien.",
        )

        self.assertEqual(notification.related_url, "")

    def test_notification_can_be_marked_as_read(self):
        notification = Notification.objects.create(
            recipient=self.user,
            title="Test",
            message="Notification de test.",
        )

        notification.is_read = True
        notification.save(update_fields=["is_read"])

        notification.refresh_from_db()

        self.assertTrue(notification.is_read)

    def test_notification_string_representation(self):
        notification = Notification.objects.create(
            recipient=self.user,
            title="Nouvel entretien",
            message="Votre entretien est confirmé.",
        )

        self.assertEqual(
            str(notification),
            f"Nouvel entretien - {self.user.email}",
        )

    def test_notification_ordering_is_newest_first(self):
        first = Notification.objects.create(
            recipient=self.user,
            title="Première notification",
            message="Premier message.",
        )

        second = Notification.objects.create(
            recipient=self.user,
            title="Deuxième notification",
            message="Deuxième message.",
        )

        notifications = list(
            Notification.objects.filter(
                recipient=self.user
            )
        )

        self.assertEqual(notifications[0], second)
        self.assertEqual(notifications[1], first)

    def test_notification_types_are_available(self):
        expected_types = [
            "APPLICATION",
            "APPLICATION_STATUS",
            "INTERVIEW",
            "JOB_ALERT",
            "SYSTEM",
        ]

        actual_types = [
            choice[0]
            for choice in Notification.NotificationType.choices
        ]

        self.assertEqual(actual_types, expected_types)


# =========================================================
# 2. TESTS DE NORMALISATION DES NUMÉROS
# =========================================================

class NormalizePhoneNumberTests(TestCase):
    """Tests de validation des numéros internationaux."""

    def test_valid_senegalese_phone_number(self):
        result = normalize_phone_number("+221771234567")

        self.assertEqual(result, "+221771234567")

    def test_phone_number_with_spaces(self):
        result = normalize_phone_number("+221 77 123 45 67")

        self.assertEqual(result, "+221771234567")

    def test_phone_number_with_parentheses(self):
        result = normalize_phone_number("+221 (77) 123 45 67")

        self.assertEqual(result, "+221771234567")

    def test_phone_number_with_hyphens(self):
        result = normalize_phone_number("+221-77-123-45-67")

        self.assertEqual(result, "+221771234567")

    def test_missing_phone_number(self):
        with self.assertRaises(SMSServiceError):
            normalize_phone_number("")

    def test_invalid_phone_number_without_plus(self):
        with self.assertRaises(SMSServiceError):
            normalize_phone_number("221771234567")

    def test_invalid_phone_number_with_letters(self):
        with self.assertRaises(SMSServiceError):
            normalize_phone_number("+221ABC123456")

    def test_invalid_phone_number_with_too_many_digits(self):
        with self.assertRaises(SMSServiceError):
            normalize_phone_number("+221771234567890123")

    def test_invalid_phone_number_with_zero_after_plus(self):
        with self.assertRaises(SMSServiceError):
            normalize_phone_number("+0221771234567")


# =========================================================
# 3. TESTS DU SERVICE SMS
# =========================================================

class SMSServiceTests(TestCase):
    """Tests du service d'envoi SMS."""

    @override_settings(TWILIO_ENABLED=False)
    @patch("notifications.sms_service.Client")
    def test_sms_disabled_does_not_call_twilio(self, mock_client):
        result = send_sms(
            phone_number="+221771234567",
            message="Test SunuJob AI.",
        )

        self.assertFalse(result["success"])
        self.assertEqual(result["status"], "disabled")
        self.assertIsNone(result["sid"])

        mock_client.assert_not_called()

    @override_settings(
        TWILIO_ENABLED=True,
        TWILIO_ACCOUNT_SID="AC_TEST_ACCOUNT",
        TWILIO_AUTH_TOKEN="TEST_AUTH_TOKEN",
        TWILIO_FROM_NUMBER="+15005550006",
    )
    def test_incomplete_twilio_configuration(self):
        with override_settings(TWILIO_AUTH_TOKEN=""):
            with self.assertRaises(SMSServiceError):
                send_sms(
                    phone_number="+221771234567",
                    message="Test SunuJob AI.",
                )

    @override_settings(
        TWILIO_ENABLED=True,
        TWILIO_ACCOUNT_SID="AC_TEST_ACCOUNT",
        TWILIO_AUTH_TOKEN="TEST_AUTH_TOKEN",
        TWILIO_FROM_NUMBER="+15005550006",
    )
    @patch("notifications.sms_service.Client")
    def test_sms_sent_successfully(self, mock_client_class):
        mock_message = SimpleNamespace(
            sid="SM_TEST_123456",
            status="queued",
        )

        mock_client = Mock()
        mock_client.messages.create.return_value = mock_message

        mock_client_class.return_value = mock_client

        result = send_sms(
            phone_number="+221771234567",
            message="Votre entretien est confirmé.",
        )

        self.assertTrue(result["success"])
        self.assertEqual(result["status"], "queued")
        self.assertEqual(result["sid"], "SM_TEST_123456")

        mock_client_class.assert_called_once_with(
            "AC_TEST_ACCOUNT",
            "TEST_AUTH_TOKEN",
        )

        mock_client.messages.create.assert_called_once_with(
            body="Votre entretien est confirmé.",
            from_="+15005550006",
            to="+221771234567",
        )

    @override_settings(
        TWILIO_ENABLED=True,
        TWILIO_ACCOUNT_SID="AC_TEST_ACCOUNT",
        TWILIO_AUTH_TOKEN="TEST_AUTH_TOKEN",
        TWILIO_FROM_NUMBER="+15005550006",
    )
    @patch("notifications.sms_service.Client")
    def test_sms_rejects_invalid_phone_number(self, mock_client_class):
        with self.assertRaises(SMSServiceError):
            send_sms(
                phone_number="numero_invalide",
                message="Test.",
            )

        mock_client_class.assert_not_called()

    @override_settings(
        TWILIO_ENABLED=True,
        TWILIO_ACCOUNT_SID="AC_TEST_ACCOUNT",
        TWILIO_AUTH_TOKEN="TEST_AUTH_TOKEN",
        TWILIO_FROM_NUMBER="+15005550006",
    )
    @patch("notifications.sms_service.Client")
    def test_sms_rejects_empty_message(self, mock_client_class):
        with self.assertRaises(SMSServiceError):
            send_sms(
                phone_number="+221771234567",
                message="   ",
            )

        mock_client_class.assert_not_called()

    @override_settings(
        TWILIO_ENABLED=True,
        TWILIO_ACCOUNT_SID="AC_TEST_ACCOUNT",
        TWILIO_AUTH_TOKEN="TEST_AUTH_TOKEN",
        TWILIO_FROM_NUMBER="+15005550006",
    )
    @patch("notifications.sms_service.Client")
    def test_twilio_error_is_converted_to_sms_service_error(
        self,
        mock_client_class,
    ):
        mock_client = Mock()

        mock_client.messages.create.side_effect = (
            TwilioRestException(
                status=400,
                uri="/Messages",
                msg="Numéro de destination invalide.",
            )
        )

        mock_client_class.return_value = mock_client

        with self.assertRaises(SMSServiceError):
            send_sms(
                phone_number="+221771234567",
                message="Test.",
            )


# =========================================================
# 4. TESTS DE LA TÂCHE CELERY SMS
# =========================================================

class SendSMSTaskTests(TestCase):
    """Tests de la tâche Celery d'envoi SMS."""

    @override_settings(TWILIO_ENABLED=False)
    @patch("notifications.tasks.send_sms")
    def test_task_does_not_send_sms_when_disabled(
        self,
        mock_send_sms,
    ):
        result = send_sms_task.run(
            phone_number="+221771234567",
            message="Test SunuJob AI.",
        )

        self.assertFalse(result["success"])
        self.assertEqual(result["status"], "disabled")

        mock_send_sms.assert_not_called()

    @override_settings(TWILIO_ENABLED=True)
    @patch("notifications.tasks.send_sms")
    def test_task_returns_sms_service_result(
        self,
        mock_send_sms,
    ):
        mock_send_sms.return_value = {
            "success": True,
            "status": "queued",
            "sid": "SM_TEST_123456",
            "error": None,
        }

        result = send_sms_task.run(
            phone_number="+221771234567",
            message="Votre entretien est confirmé.",
        )

        self.assertTrue(result["success"])
        self.assertEqual(result["status"], "queued")
        self.assertEqual(result["sid"], "SM_TEST_123456")

        mock_send_sms.assert_called_once_with(
            phone_number="+221771234567",
            message="Votre entretien est confirmé.",
        )

    @override_settings(TWILIO_ENABLED=True)
    @patch("notifications.tasks.send_sms")
    def test_task_rejects_missing_phone_number(
        self,
        mock_send_sms,
    ):
        result = send_sms_task.run(
            phone_number="",
            message="Test.",
        )

        self.assertFalse(result["success"])
        self.assertEqual(result["status"], "failed")

        mock_send_sms.assert_not_called()

    @override_settings(TWILIO_ENABLED=True)
    @patch("notifications.tasks.send_sms")
    def test_task_rejects_empty_message(
        self,
        mock_send_sms,
    ):
        result = send_sms_task.run(
            phone_number="+221771234567",
            message="   ",
        )

        self.assertFalse(result["success"])
        self.assertEqual(result["status"], "failed")

        mock_send_sms.assert_not_called()

    @override_settings(TWILIO_ENABLED=True)
    @patch("notifications.tasks.send_sms")
    def test_task_retries_after_sms_service_error(
        self,
        mock_send_sms,
    ):
        mock_send_sms.side_effect = SMSServiceError(
            "Erreur temporaire."
        )

        with patch.object(
            send_sms_task,
            "retry",
            side_effect=RuntimeError("Retry déclenché."),
        ) as mock_retry:

            with self.assertRaisesRegex(
                RuntimeError,
                "Retry déclenché.",
            ):
                send_sms_task.run(
                    phone_number="+221771234567",
                    message="Test.",
                )

        mock_retry.assert_called_once()
