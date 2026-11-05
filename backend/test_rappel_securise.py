
import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from unittest.mock import patch
from datetime import timedelta

from django.db import transaction
from django.db.models import F
from django.test import override_settings
from django.utils import timezone

from interviews.models import Interview, InterviewReminder
from interviews.tasks import process_one_reminder


def run_test():
    reminder = (
        InterviewReminder.objects
        .filter(
            sent_at__isnull=True,
            is_invalidated=False,
            interview__status__in=[
                Interview.Status.SCHEDULED,
                Interview.Status.RESCHEDULED,
            ],
            interview__scheduled_at=F("scheduled_at"),
            interview__scheduled_at__gt=timezone.now(),
            interview__application__candidate__email__gt="",
        )
        .order_by("remind_at")
        .first()
    )

    if reminder is None:
        print("Aucun rappel valide disponible.")
        return

    reminder_id = reminder.pk

    print("Rappel sélectionné :", reminder_id)
    print("Poste :", reminder.interview.application.job.title)

    try:
        with transaction.atomic():

            reminder.remind_at = timezone.now() - timedelta(minutes=1)
            reminder.save(update_fields=["remind_at"])

            with override_settings(TWILIO_ENABLED=False):

                with patch(
                    "interviews.tasks.send_mail",
                    side_effect=[
                        RuntimeError("SMTP temporairement indisponible"),
                        1,
                    ],
                ) as mock_email:

                    with patch(
                        "interviews.tasks.create_notification",
                        return_value=object(),
                    ) as mock_notification:

                        # PREMIER PASSAGE : échec SMTP.
                        print("\n===== PREMIÈRE TENTATIVE =====")

                        first_result = process_one_reminder(reminder_id)

                        reminder.refresh_from_db()

                        first_notification_created = (
                            reminder.notification_created_at is not None
                        )

                        print("Traitement terminé :", first_result)
                        print("Email enregistré :", bool(reminder.email_sent_at))
                        print(
                            "Notification créée :",
                            first_notification_created,
                        )
                        print("Rappel terminé :", bool(reminder.sent_at))

                        assert first_result is False
                        assert reminder.email_sent_at is None
                        assert first_notification_created
                        assert reminder.sent_at is None

                        # DEUXIÈME PASSAGE : SMTP rétabli.
                        print("\n===== DEUXIÈME TENTATIVE =====")

                        second_result = process_one_reminder(reminder_id)

                        reminder.refresh_from_db()

                        print("Traitement terminé :", second_result)
                        print("Tentatives :", reminder.attempts)
                        print("Email enregistré :", bool(reminder.email_sent_at))
                        print(
                            "Notification toujours présente :",
                            bool(reminder.notification_created_at),
                        )
                        print("Rappel terminé :", bool(reminder.sent_at))
                        print("Nombre d'envois email :", mock_email.call_count)
                        print(
                            "Nombre de notifications créées :",
                            mock_notification.call_count,
                        )

                        assert second_result is True
                        assert reminder.email_sent_at is not None
                        assert reminder.notification_created_at is not None
                        assert reminder.sent_at is not None
                        assert mock_email.call_count == 2
                        assert mock_notification.call_count == 1

                        print(
                            "\nSUCCÈS : la nouvelle tentative fonctionne "
                            "sans doublon de notification."
                        )

            # Annulation de toutes les modifications du test.
            transaction.set_rollback(True)

    except Exception as exc:
        print("\nÉCHEC DU TEST :", str(exc))
        raise


run_test()
