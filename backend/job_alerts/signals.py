from django.db.models.signals import pre_save, post_save
from django.dispatch import receiver

from jobs.models import Job

from .services import schedule_job_alerts


@receiver(pre_save, sender=Job)
def remember_previous_job_status(sender, instance, **kwargs):
    if not instance.pk:
        instance._previous_status = None
        return

    instance._previous_status = (
        sender.objects.filter(pk=instance.pk)
        .values_list("status", flat=True)
        .first()
    )


@receiver(post_save, sender=Job)
def trigger_job_alerts(sender, instance, created, **kwargs):
    previous_status = getattr(instance, "_previous_status", None)

    newly_published = (
        instance.status == Job.Status.PUBLISHED
        and (
            created
            or previous_status != Job.Status.PUBLISHED
        )
    )

    if newly_published:
        schedule_job_alerts(instance.pk)