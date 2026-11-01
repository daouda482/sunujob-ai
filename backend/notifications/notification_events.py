"""Helpers to create platform notifications from business events.

This module reuses the existing notifications.services.create_notification()
service rather than introducing a second Notification model or API.
"""
from __future__ import annotations

import inspect
import logging
from typing import Any

from django.db import transaction

from notifications.services import create_notification

logger = logging.getLogger(__name__)


def _status_label(application: Any, status_value: str) -> str:
    """Return the translated label when the Application model exposes choices."""
    try:
        return application.get_status_display_for(status_value)  # type: ignore[attr-defined]
    except (AttributeError, TypeError):
        pass

    try:
        field = application._meta.get_field("status")
        return dict(field.flatchoices).get(status_value, str(status_value).replace("_", " ").title())
    except Exception:
        return str(status_value).replace("_", " ").title()


def _create_compatibly(*, user: Any, title: str, message: str,
                       notification_type: str, related_url: str) -> None:
    """Call create_notification using the parameter names supported by this project.

    Project implementations often use ``user`` or ``recipient`` for the same
    argument, and ``url`` or ``related_url`` for the destination. This adapter
    maps common aliases based on the actual callable signature.
    """
    values = {
        "user": user,
        "recipient": user,
        "recipient_user": user,
        "target_user": user,
        "to_user": user,
        "owner": user,
        "title": title,
        "subject": title,
        "heading": title,
        "message": message,
        "body": message,
        "content": message,
        "description": message,
        "text": message,
        "notification_type": notification_type,
        "type": notification_type,
        "kind": notification_type,
        "category": notification_type,
        "related_url": related_url,
        "url": related_url,
        "action_url": related_url,
        "target_url": related_url,
        "link": related_url,
    }

    try:
        signature = inspect.signature(create_notification)
    except (TypeError, ValueError):
        # Most common signature used by this application family.
        create_notification(
            user=user,
            title=title,
            message=message,
            notification_type=notification_type,
            related_url=related_url,
        )
        return

    positional_args = []
    keyword_args = {}
    accepts_arbitrary_keywords = False
    missing_required = []

    for parameter in signature.parameters.values():
        if parameter.kind == inspect.Parameter.VAR_POSITIONAL:
            continue
        if parameter.kind == inspect.Parameter.VAR_KEYWORD:
            accepts_arbitrary_keywords = True
            continue
        if parameter.name in values:
            if parameter.kind == inspect.Parameter.POSITIONAL_ONLY:
                positional_args.append(values[parameter.name])
            else:
                keyword_args[parameter.name] = values[parameter.name]
        elif parameter.default is inspect.Parameter.empty:
            missing_required.append(parameter.name)

    if missing_required:
        if accepts_arbitrary_keywords:
            keyword_args.update({
                "user": user,
                "title": title,
                "message": message,
                "notification_type": notification_type,
                "related_url": related_url,
            })
        else:
            raise TypeError(
                "Paramètres obligatoires non reconnus dans create_notification: "
                + ", ".join(missing_required)
            )
    elif accepts_arbitrary_keywords and not keyword_args and not positional_args:
        keyword_args.update({
            "user": user,
            "title": title,
            "message": message,
            "notification_type": notification_type,
            "related_url": related_url,
        })

    create_notification(*positional_args, **keyword_args)


def _schedule_notification(*, user: Any, title: str, message: str,
                           notification_type: str, related_url: str) -> None:
    """Create the notification after the surrounding DB transaction commits.

    Notification failure is logged but does not make an already completed
    application/support operation fail.
    """
    if user is None:
        logger.warning("Notification non créée : destinataire absent (%s).", title)
        return

    def create_after_commit() -> None:
        try:
            _create_compatibly(
                user=user,
                title=title,
                message=message,
                notification_type=notification_type,
                related_url=related_url,
            )
        except Exception:
            logger.exception(
                "Échec de création d'une notification pour user_id=%s, titre=%r",
                getattr(user, "pk", None), title,
            )

    transaction.on_commit(create_after_commit)


def notify_new_application(application: Any) -> None:
    """Notify the recruiter after a candidate submits an application."""
    job = getattr(application, "job", None)
    recruiter = getattr(job, "recruiter", None) if job is not None else None
    job_title = getattr(job, "title", None) or "une offre d'emploi"
    candidate = getattr(application, "candidate", None)
    candidate_name = (
        getattr(candidate, "get_full_name", lambda: "")() if candidate else ""
    ) or getattr(candidate, "email", None) or "Un candidat"
    _schedule_notification(
        user=recruiter,
        title="Nouvelle candidature reçue",
        message=f"{candidate_name} a candidaté à l'offre « {job_title} ».",
        notification_type="APPLICATION",
        related_url="/recruiter/applications",
    )


def notify_application_status(application: Any, previous_status: str,
                              new_status: str) -> None:
    """Notify a candidate when the status of their application changes."""
    if previous_status == new_status:
        return
    candidate = getattr(application, "candidate", None)
    job = getattr(application, "job", None)
    job_title = getattr(job, "title", None) or "votre candidature"
    old_label = _status_label(application, previous_status)
    new_label = _status_label(application, new_status)
    _schedule_notification(
        user=candidate,
        title="Mise à jour de votre candidature",
        message=(
            f"Le statut de votre candidature pour « {job_title} » "
            f"est passé de « {old_label} » à « {new_label} »."
        ),
        notification_type="APPLICATION",
        related_url="/candidate/applications",
    )


def notify_support_reply(ticket: Any, support_message: Any) -> None:
    """Notify the ticket owner after a public support response, never an internal note."""
    if getattr(support_message, "is_internal", False):
        return
    recipient = getattr(ticket, "created_by", None)
    subject = getattr(ticket, "subject", None) or f"demande #{getattr(ticket, 'pk', '')}"
    _schedule_notification(
        user=recipient,
        title=f"Réponse du support — demande #{getattr(ticket, 'pk', '')}",
        message=f"Le support a répondu à votre demande « {subject} ».",
        notification_type="SYSTEM",
        related_url="/support",
    )
