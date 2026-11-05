from .models import Notification


def create_notification(
    recipient,
    title,
    message,
    notification_type=Notification.NotificationType.SYSTEM,
    related_url="",
):
    """
    Crée une notification destinée à un utilisateur.

    Args:
        recipient: utilisateur destinataire.
        title: titre de la notification.
        message: contenu de la notification.
        notification_type: catégorie de notification.
        related_url: chemin frontend associé à la notification.

    Returns:
        Notification: notification créée.
        None: si aucun destinataire n'est fourni.
    """

    if recipient is None:
        return None

    if not title or not message:
        raise ValueError(
            "Le titre et le message de la notification sont obligatoires."
        )

    return Notification.objects.create(
        recipient=recipient,
        title=title,
        message=message,
        notification_type=notification_type,
        related_url=related_url or "",
    )