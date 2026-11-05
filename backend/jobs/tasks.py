
from django.utils import timezone

from celery import shared_task

from .models import Job


@shared_task(
    bind=True,
    name="jobs.tasks.expire_published_jobs",
    max_retries=3,
    default_retry_delay=60,
)
def expire_published_jobs(self):
    """
    Expire automatiquement les offres dont la date limite
    est dépassée.

    Conditions :
    - statut actuel PUBLISHED ;
    - date limite renseignée ;
    - date limite antérieure à aujourd'hui.

    Les candidatures et les entretiens ne sont pas supprimés.
    """

    today = timezone.localdate()

    try:
        expired_jobs = Job.objects.filter(
            status=Job.Status.PUBLISHED,
            deadline__isnull=False,
            deadline__lt=today,
        )

        expired_count = expired_jobs.count()

        if expired_count == 0:
            return {
                "success": True,
                "message": "Aucune offre à expirer.",
                "expired_count": 0,
                "date": str(today),
            }

        # Mise à jour en masse.
        # updated_at est actualisé explicitement car update()
        # ne déclenche pas automatiquement auto_now.
        expired_jobs.update(
            status=Job.Status.EXPIRED,
            updated_at=timezone.now(),
        )

        return {
            "success": True,
            "message": "Expiration automatique terminée.",
            "expired_count": expired_count,
            "date": str(today),
        }

    except Exception as exc:
        raise self.retry(exc=exc)
