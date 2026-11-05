
import logging

from celery import shared_task

from notifications.sms_service import send_sms, SMSServiceError


logger = logging.getLogger(__name__)


@shared_task(
    bind=True,
    max_retries=3,
    default_retry_delay=60,
    name="notifications.tasks.send_sms_task",
)
def send_sms_task(self, phone_number, message):
    """
    Tâche Celery chargée d'envoyer un SMS avec Twilio.

    En cas d'erreur temporaire, Celery effectue jusqu'à
    trois nouvelles tentatives, espacées de 60 secondes.
    """

    if not phone_number:
        logger.warning(
            "SMS non envoyé : numéro de téléphone absent."
        )
        return {
            "success": False,
            "status": "failed",
            "error": "Numéro de téléphone absent.",
        }

    if not message or not str(message).strip():
        logger.warning(
            "SMS non envoyé : message vide."
        )
        return {
            "success": False,
            "status": "failed",
            "error": "Le contenu du SMS est vide.",
        }

    try:
        result = send_sms(
            phone_number=phone_number,
            message=message,
        )

        if not result.get("success"):
            logger.info(
                "SMS non envoyé : statut=%s, numéro=%s",
                result.get("status"),
                phone_number,
            )
            return result

        logger.info(
            "SMS envoyé avec succès : numéro=%s, SID=%s, statut=%s",
            phone_number,
            result.get("sid"),
            result.get("status"),
        )

        return result

    except SMSServiceError as exc:
        logger.exception(
            "Erreur du service SMS pour le numéro %s.",
            phone_number,
        )
        raise self.retry(exc=exc)

    except Exception as exc:
        logger.exception(
            "Erreur inattendue pendant l'envoi du SMS."
        )
        raise self.retry(exc=exc)
