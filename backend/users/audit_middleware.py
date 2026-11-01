import logging

from django.utils import timezone

logger = logging.getLogger(__name__)


class AdminAuditMiddleware:
    """
    Enregistre les opérations de modification exécutées
    sur les routes API administratives par un administrateur.

    Fonctionne avec les sessions Django et les jetons JWT.
    """

    METHODS_TO_LOG = {"POST", "PUT", "PATCH", "DELETE"}

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)

        try:
            self.record_activity(request, response.status_code)
        except Exception:
            # Une erreur du journal ne doit pas bloquer l'API.
            logger.exception(
                "Impossible d'enregistrer une activité administrative."
            )

        return response

    def get_authenticated_user(self, request):
        user = getattr(request, "user", None)

        if user is not None and getattr(user, "is_authenticated", False):
            return user

        # Django ne place pas nécessairement l'utilisateur JWT
        # sur l'objet HttpRequest. Nous essayons donc de valider
        # le jeton Bearer présent dans l'en-tête HTTP.
        authorization = request.META.get("HTTP_AUTHORIZATION", "")

        if not authorization.startswith("Bearer "):
            return None

        try:
            from rest_framework.request import Request
            from rest_framework_simplejwt.authentication import (
                JWTAuthentication,
            )

            result = JWTAuthentication().authenticate(Request(request))

            if result:
                return result[0]

        except Exception:
            logger.debug(
                "Authentification JWT indisponible pour le journal.",
                exc_info=True,
            )

        return None

    def record_activity(self, request, status_code):
        path = request.path
        method = request.method.upper()

        # Ne suivre que les opérations de modification
        # sur les routes de l'administration.
        if not path.startswith("/api/admin/"):
            return

        if method not in self.METHODS_TO_LOG:
            return

        user = self.get_authenticated_user(request)

        if not user or not getattr(user, "is_authenticated", False):
            return

        if getattr(user, "role", None) != "ADMIN":
            return

        from users.audit_log_models import AuditLog

        labels = {
            "POST": "Création ou action",
            "PUT": "Modification",
            "PATCH": "Modification",
            "DELETE": "Suppression",
        }

        email = getattr(user, "email", "") or ""
        succeeded = 200 <= status_code < 400

        action = f"{labels[method]} : {path}"[:180]

        ip_address = request.META.get("REMOTE_ADDR")

        # Ne pas faire confiance à X-Forwarded-For sans configuration
        # spécifique du proxy de confiance.
        if not ip_address:
            ip_address = None

        AuditLog.objects.create(
            actor=user,
            actor_email=email,
            action=action,
            method=method,
            path=path[:500],
            status_code=status_code,
            succeeded=succeeded,
            ip_address=ip_address,
            user_agent=request.META.get(
                "HTTP_USER_AGENT", ""
            )[:500],
        )