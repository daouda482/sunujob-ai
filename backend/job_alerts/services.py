from django.db import transaction

from jobs.models import Job
from notifications.models import Notification

from .models import JobAlert


def alert_matches_job(alert, job):
    """
    Vérifie si une offre correspond aux critères d'une alerte.
    Les critères renseignés doivent tous correspondre.
    """

    if not alert.is_active:
        return False

    if alert.sector and alert.sector.strip().lower() not in (
        job.sector or ""
    ).lower():
        return False

    if alert.location and alert.location.strip().lower() not in (
        job.location or ""
    ).lower():
        return False

    if alert.contract_type and alert.contract_type != job.contract_type:
        return False

    if alert.education_level and alert.education_level.strip().lower() not in (
        job.education_level or ""
    ).lower():
        return False

    if alert.keywords.strip():
        searchable_text = " ".join([
            job.title or "",
            job.description or "",
            job.skills_required or "",
            job.sector or "",
        ]).lower()

        keywords = [
            keyword.strip().lower()
            for keyword in alert.keywords.split(",")
            if keyword.strip()
        ]

        # Au moins un mot-clé doit être retrouvé.
        if keywords and not any(
            keyword in searchable_text for keyword in keywords
        ):
            return False

    return True


def notify_matching_candidates(job):
    """
    Envoie une notification aux candidats dont une alerte
    correspond à l'offre publiée.
    """

    if job.status != Job.Status.PUBLISHED:
        return

    alerts = JobAlert.objects.filter(
        is_active=True
    ).select_related("candidate")

    for alert in alerts:
        if not alert_matches_job(alert, job):
            continue

        related_url = f"/jobs/{job.pk}"

        # Évite les doublons si plusieurs alertes du même candidat
        # correspondent à la même offre.
        already_notified = Notification.objects.filter(
            recipient=alert.candidate,
            notification_type="JOB_ALERT",
            related_url=related_url,
        ).exists()

        if already_notified:
            continue

        Notification.objects.create(
            recipient=alert.candidate,
            title="Nouvelle offre correspondant à votre alerte",
            message=(
                f"L'offre « {job.title} » publiée par "
                f"{job.company.name} correspond à vos critères."
            ),
            notification_type="JOB_ALERT",
            related_url=related_url,
        )


def schedule_job_alerts(job_id):
    """
    Programme le traitement après validation de la transaction.
    """
    transaction.on_commit(
        lambda: process_job_alerts(job_id)
    )


def process_job_alerts(job_id):
    try:
        job = Job.objects.select_related("company").get(pk=job_id)
    except Job.DoesNotExist:
        return

    notify_matching_candidates(job)