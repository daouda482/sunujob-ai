
import logging
import re

from django.conf import settings

from twilio.rest import Client
from twilio.base.exceptions import TwilioRestException

logger = logging.getLogger(__name__)

class SMSServiceError(Exception):
    """Erreur lors de l'envoi d'un SMS."""

# =========================================================
# 1. NORMALISATION ET VALIDATION DU NUMÉRO
# =========================================================

def normalize_phone_number(phone_number):
    """
    Vérifie le format international E.164.

    Exemple Sénégal :
    +221XXXXXXXXX
    """

    if not phone_number:
        raise SMSServiceError(
            "Le numéro de téléphone du candidat est absent."
        )

    phone = re.sub(
        r"[\s().-]",
        "",
        str(phone_number),
    )

    if not re.fullmatch(
        r"\+[1-9]\d{7,14}",
        phone,
    ):
        raise SMSServiceError(
            "Le numéro doit être au format international, "
            "par exemple +221XXXXXXXXX."
        )

    return phone

# =========================================================
# 2. SERVICE PRINCIPAL D'ENVOI SMS
# =========================================================

def send_sms(phone_number, message):
    """
    Envoie un SMS avec Twilio.

    Retourne le SID et le statut du message lorsque
    Twilio accepte la demande.

    Si Twilio est désactivé, aucun SMS n'est envoyé.
    """

    # -----------------------------------------------------
    # A. VÉRIFICATION DE L'ACTIVATION
    # -----------------------------------------------------

    if not getattr(settings, "TWILIO_ENABLED", False):
        logger.info(
            "Envoi SMS désactivé. Aucun SMS envoyé."
        )

        return {
            "success": False,
            "status": "disabled",
            "sid": None,
            "error": "Le service SMS Twilio est désactivé.",
        }

    # -----------------------------------------------------
    # B. RÉCUPÉRATION DE LA CONFIGURATION TWILIO
    # -----------------------------------------------------

    account_sid = getattr(
        settings,
        "TWILIO_ACCOUNT_SID",
        "",
    )

    auth_token = getattr(
        settings,
        "TWILIO_AUTH_TOKEN",
        "",
    )

    from_number = getattr(
        settings,
        "TWILIO_FROM_NUMBER",
        "",
    )

    if not all([
        account_sid,
        auth_token,
        from_number,
    ]):
        raise SMSServiceError(
            "Configuration Twilio incomplète. "
            "Vérifiez les variables .env."
        )

    # -----------------------------------------------------
    # C. VALIDATION DU DESTINATAIRE ET DU MESSAGE
    # -----------------------------------------------------

    recipient = normalize_phone_number(
        phone_number
    )

    if not message or not str(message).strip():
        raise SMSServiceError(
            "Le contenu du SMS est vide."
        )

    # -----------------------------------------------------
    # D. CONNEXION À TWILIO ET ENVOI
    # -----------------------------------------------------

    try:
        client = Client(
            account_sid,
            auth_token,
        )

        twilio_message = client.messages.create(
            body=str(message).strip(),
            from_=from_number,
            to=recipient,
        )

        logger.info(
            "SMS accepté par Twilio. SID=%s, statut=%s",
            twilio_message.sid,
            twilio_message.status,
        )

        return {
            "success": True,
            "status": twilio_message.status,
            "sid": twilio_message.sid,
            "error": None,
        }

    # -----------------------------------------------------
    # E. GESTION DES ERREURS TWILIO
    # -----------------------------------------------------

    except TwilioRestException as exc:
        logger.exception(
            "Erreur Twilio lors de l'envoi du SMS."
        )

        raise SMSServiceError(
            f"Twilio a refusé l'envoi du SMS : {exc.msg}"
        ) from exc

    # -----------------------------------------------------
    # F. GESTION DES AUTRES ERREURS
    # -----------------------------------------------------

    except Exception as exc:
        logger.exception(
            "Erreur inattendue lors de l'envoi du SMS."
        )

        raise SMSServiceError(
            "Une erreur est survenue pendant l'envoi du SMS."
        ) from exc