
import os

from celery import Celery

# Définir le fichier de configuration Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

# Initialiser l'application Celery
app = Celery("sunujob_ai")

# Charger les paramètres CELERY_* depuis Django settings.py
app.config_from_object(
    "django.conf:settings",
    namespace="CELERY",
)

# Détecter automatiquement les tâches des applications Django
app.autodiscover_tasks()


@app.task(bind=True, ignore_result=True)
def debug_task(self):
    print(f"Celery task request: {self.request!r}")
