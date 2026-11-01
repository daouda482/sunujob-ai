from django.apps import AppConfig


class JobAlertsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "job_alerts"
    verbose_name = "Alertes emploi"

    def ready(self):
        import job_alerts.signals