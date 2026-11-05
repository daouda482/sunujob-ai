
from .models import AuditLog


def get_client_ip(request):
    """
    Récupère l'adresse IP transmise par la requête.
    """
    if request is None:
        return None

    forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")

    if forwarded_for:
        ip = forwarded_for.split(",")[0].strip()
    else:
        ip = request.META.get("REMOTE_ADDR")

    return ip or None


def record_audit(
    *,
    action,
    description,
    actor=None,
    application=None,
    interview=None,
    old_value="",
    new_value="",
    metadata=None,
    request=None,
):
    """
    Enregistre une action dans le journal d'activité.
    """

    return AuditLog.objects.create(
        actor=actor,
        application=application,
        interview=interview,
        action=action,
        description=description,
        old_value=str(old_value) if old_value is not None else "",
        new_value=str(new_value) if new_value is not None else "",
        metadata=metadata or {},
        ip_address=get_client_ip(request),
    )
