
import logging

from celery import shared_task
from django.conf import settings

from notifications.sms_service import (
    send_sms,
    SMSServiceError,
)


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

    En cas d'erreur, Celery effectue jusqu'à trois
    nouvelles tentatives, espacées de 60 secondes.

    Si Twilio est désactivé, aucun envoi n'est effectué.
    """

    # =====================================================
    # 1. VÉRIFICATION DE L'ACTIVATION DE TWILIO
    # =====================================================

    if not getattr(settings, "TWILIO_ENABLED", False):
        logger.info(
            "Tâche SMS ignorée : Twilio est désactivé."
        )

        return {
            "success": False,
            "status": "disabled",
            "sid": None,
            "error": "Le service SMS Twilio est désactivé.",
        }

    # =====================================================
    # 2. VÉRIFICATION DU NUMÉRO
    # =====================================================

    if not phone_number:
        logger.warning(
            "SMS non envoyé : numéro de téléphone absent."
        )

        return {
            "success": False,
            "status": "failed",
            "sid": None,
            "error": "Numéro de téléphone absent.",
        }

    # =====================================================
    # 3. VÉRIFICATION DU MESSAGE
    # =====================================================

    if not message or not str(message).strip():
        logger.warning(
            "SMS non envoyé : message vide."
        )

        return {
            "success": False,
            "status": "failed",
            "sid": None,
            "error": "Le contenu du SMS est vide.",
        }

    # =====================================================
    # 4. ENVOI DU SMS
    # =====================================================

    try:
        result = send_sms(
            phone_number=phone_number,
            message=message,
        )

        # Vérification du résultat retourné par le service.
        if not result.get("success"):
            logger.info(
                "SMS non envoyé : statut=%s, numéro=%s",
                result.get("status"),
                phone_number,
            )

            return result

        # =================================================
        # 5. CONFIRMATION DE L'ENVOI
        # =================================================

        logger.info(
            "SMS accepté par Twilio : numéro=%s, SID=%s, statut=%s",
            phone_number,
            result.get("sid"),
            result.get("status"),
        )

        return result

    # =====================================================
    # 6. GESTION DES ERREURS DU SERVICE SMS
    # =====================================================

    except SMSServiceError as exc:
        logger.exception(
            "Erreur du service SMS pour le numéro %s.",
            phone_number,
        )

        raise self.retry(exc=exc)

    # =====================================================
    # 7. GESTION DES ERREURS INATTENDUES
    # =====================================================

    except Exception as exc:
        logger.exception(
            "Erreur inattendue pendant l'envoi du SMS."
        )

        raise self.retry(exc=exc)
