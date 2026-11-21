
import os
from pathlib import Path
from datetime import timedelta

import dj_database_url

from dotenv import load_dotenv
from celery.schedules import crontab


# =====================================================
# CONFIGURATION GÉNÉRALE
# =====================================================

BASE_DIR = Path(__file__).resolve().parent.parent

load_dotenv(BASE_DIR / ".env")


def env_bool(name, default=False):
    """Convertit une variable d'environnement en booléen."""
    value = os.getenv(name)

    if value is None:
        return default

    return value.strip().lower() in ("true", "1", "yes", "on")


def env_list(name, default=None):
    """Lit une liste de valeurs séparées par des virgules."""
    value = os.getenv(name)

    if value is None:
        return default or []

    return [
        item.strip()
        for item in value.split(",")
        if item.strip()
    ]


def env_int(name, default, minimum=None):
    """Lit un entier depuis l'environnement avec une valeur de secours."""
    try:
        value = int(os.getenv(name, str(default)))
    except (TypeError, ValueError):
        value = default

    if minimum is not None:
        value = max(value, minimum)

    return value


DATABASE_URL = os.getenv("DATABASE_URL")
RENDER_EXTERNAL_HOSTNAME = os.getenv("RENDER_EXTERNAL_HOSTNAME")

# Détection de Render à partir de ses variables d'environnement.
IS_RENDER = (
    env_bool("RENDER", False)
    or bool(RENDER_EXTERNAL_HOSTNAME)
    or bool(os.getenv("RENDER_SERVICE_ID"))
)

DEBUG = env_bool(
    "DEBUG",
    default=not IS_RENDER,
)

# Un service Render est toujours considéré comme un environnement de production.
IS_PRODUCTION = IS_RENDER or not DEBUG

if IS_RENDER and DEBUG:
    raise RuntimeError(
        "DEBUG doit impérativement être False sur Render."
    )


# =====================================================
# SÉCURITÉ
# =====================================================

SECRET_KEY = os.getenv("DJANGO_SECRET_KEY", "").strip()

if not SECRET_KEY:
    if IS_PRODUCTION:
        raise RuntimeError(
            "DJANGO_SECRET_KEY doit être configurée en production."
        )

    # Clé de secours réservée au développement local.
    SECRET_KEY = (
        "django-insecure-local-development-only-"
        "sunujob-ai-change-before-production"
    )

if IS_PRODUCTION:
    if (
        len(SECRET_KEY) < 50
        or len(set(SECRET_KEY)) < 5
        or SECRET_KEY.startswith("django-insecure-")
    ):
        raise RuntimeError(
            "DJANGO_SECRET_KEY est trop faible. "
            "Configurez une clé aléatoire d'au moins 50 caractères."
        )


ALLOWED_HOSTS = env_list(
    "ALLOWED_HOSTS",
    default=["localhost", "127.0.0.1"] if DEBUG else [],
)

if RENDER_EXTERNAL_HOSTNAME:
    if RENDER_EXTERNAL_HOSTNAME not in ALLOWED_HOSTS:
        ALLOWED_HOSTS.append(RENDER_EXTERNAL_HOSTNAME)

if IS_PRODUCTION and not ALLOWED_HOSTS:
    raise RuntimeError(
        "ALLOWED_HOSTS doit être configuré en production."
    )


# =====================================================
# APPLICATIONS
# =====================================================

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",

    "corsheaders",
    "storages",
    "rest_framework",
    "rest_framework_simplejwt",
    "rest_framework_simplejwt.token_blacklist",

    "users",
    "candidates",
    "companies",
    "jobs",
    "applications",
    "interviews",
    "notifications.apps.NotificationsConfig",
    "matching",
    "ai_coach",
    "ai_engine",
    "job_alerts.apps.JobAlertsConfig",
    "favorites",
    "audit_logs",
    "evaluations",

    "django_celery_beat",
]


# =====================================================
# MIDDLEWARE
# =====================================================

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "corsheaders.middleware.CorsMiddleware",

    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",

    "users.audit_middleware.AdminAuditMiddleware",

    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]


ROOT_URLCONF = "config.urls"

WSGI_APPLICATION = "config.wsgi.application"


# =====================================================
# TEMPLATES
# =====================================================

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]


# =====================================================
# BASE DE DONNÉES
# SQLITE EN LOCAL / POSTGRESQL EN PRODUCTION
# =====================================================

if IS_PRODUCTION and not DATABASE_URL:
    raise RuntimeError(
        "DATABASE_URL doit être configurée en production. "
        "Configurez l'URL interne de votre PostgreSQL Render."
    )

if DATABASE_URL:
    DATABASES = {
        "default": dj_database_url.parse(
            DATABASE_URL,
            conn_max_age=600,
            conn_health_checks=True,
            ssl_require=IS_PRODUCTION,
        )
    }

    # Empêche une configuration SQLite accidentelle en production.
    if (
        IS_PRODUCTION
        and DATABASES["default"]["ENGINE"]
        != "django.db.backends.postgresql"
    ):
        raise RuntimeError(
            "La base de données de production doit être PostgreSQL. "
            "Vérifiez la variable DATABASE_URL."
        )

elif DEBUG:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / "db.sqlite3",
            "OPTIONS": {
                "timeout": 20,
            },
        }
    }

else:
    # Sécurité supplémentaire : ne jamais démarrer en production sur SQLite.
    raise RuntimeError(
        "Configuration de base de données invalide : PostgreSQL est requis."
    )


# =====================================================
# MODÈLE UTILISATEUR
# =====================================================

AUTH_USER_MODEL = "users.User"


# =====================================================
# VALIDATION DES MOTS DE PASSE
# =====================================================

AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": (
            "django.contrib.auth.password_validation."
            "UserAttributeSimilarityValidator"
        ),
    },
    {
        "NAME": (
            "django.contrib.auth.password_validation."
            "MinimumLengthValidator"
        ),
    },
    {
        "NAME": (
            "django.contrib.auth.password_validation."
            "CommonPasswordValidator"
        ),
    },
    {
        "NAME": (
            "django.contrib.auth.password_validation."
            "NumericPasswordValidator"
        ),
    },
]


# =====================================================
# LANGUE ET FUSEAU HORAIRE
# =====================================================

LANGUAGE_CODE = "fr-fr"

TIME_ZONE = "Africa/Dakar"

USE_I18N = True

USE_TZ = True


# =====================================================
# FICHIERS STATIQUES ET MÉDIAS
# =====================================================

STATIC_URL = "/static/"

STATIC_ROOT = BASE_DIR / "staticfiles"

MEDIA_URL = "/media/"

MEDIA_ROOT = BASE_DIR / "media"

# =====================================================
# STOCKAGE DES FICHIERS MÉDIAS
# LOCAL : FILESYSTEM
# PRODUCTION : SUPABASE STORAGE (S3)
# =====================================================

if IS_PRODUCTION:

    SUPABASE_S3_ACCESS_KEY_ID = os.getenv(
        "SUPABASE_S3_ACCESS_KEY_ID", ""
    ).strip()

    SUPABASE_S3_SECRET_ACCESS_KEY = os.getenv(
        "SUPABASE_S3_SECRET_ACCESS_KEY", ""
    ).strip()

    SUPABASE_S3_BUCKET_NAME = os.getenv(
        "SUPABASE_S3_BUCKET_NAME", ""
    ).strip()

    SUPABASE_S3_ENDPOINT_URL = os.getenv(
        "SUPABASE_S3_ENDPOINT_URL", ""
    ).strip().rstrip(";")

    SUPABASE_S3_REGION_NAME = os.getenv(
        "SUPABASE_S3_REGION_NAME", ""
    ).strip()

    required_supabase_variables = {
        "SUPABASE_S3_ACCESS_KEY_ID": SUPABASE_S3_ACCESS_KEY_ID,
        "SUPABASE_S3_SECRET_ACCESS_KEY": SUPABASE_S3_SECRET_ACCESS_KEY,
        "SUPABASE_S3_BUCKET_NAME": SUPABASE_S3_BUCKET_NAME,
        "SUPABASE_S3_ENDPOINT_URL": SUPABASE_S3_ENDPOINT_URL,
        "SUPABASE_S3_REGION_NAME": SUPABASE_S3_REGION_NAME,
    }

    missing_supabase_variables = [
        name
        for name, value in required_supabase_variables.items()
        if not value
    ]

    if missing_supabase_variables:
        raise RuntimeError(
            "Configuration Supabase S3 incomplète. "
            "Variables manquantes : "
            + ", ".join(missing_supabase_variables)
        )

    from botocore.config import Config

    SUPABASE_S3_CLIENT_CONFIG = Config(
        signature_version="s3v4",
        s3={
            "addressing_style": "path",
        },
        request_checksum_calculation="when_required",
        response_checksum_validation="when_required",
    )

    STORAGES = {
        "default": {
            "BACKEND": "storages.backends.s3.S3Storage",
            "OPTIONS": {
                "access_key": SUPABASE_S3_ACCESS_KEY_ID,
                "secret_key": SUPABASE_S3_SECRET_ACCESS_KEY,
                "bucket_name": SUPABASE_S3_BUCKET_NAME,
                "endpoint_url": SUPABASE_S3_ENDPOINT_URL,
                "region_name": SUPABASE_S3_REGION_NAME,
                "client_config": SUPABASE_S3_CLIENT_CONFIG,
                "querystring_auth": True,
                "querystring_expire": 300,
                "file_overwrite": False,
            },
        },
        "staticfiles": {
            "BACKEND": (
                "whitenoise.storage.CompressedManifestStaticFilesStorage"
            ),
        },
    }

else:

    STORAGES = {
        "default": {
            "BACKEND": "django.core.files.storage.FileSystemStorage",
        },
        "staticfiles": {
            "BACKEND": (
                "whitenoise.storage.CompressedManifestStaticFilesStorage"
            ),
        },
    }


# =====================================================
# CORS - FRONTEND REACT / VITE
# =====================================================

FRONTEND_PRODUCTION_ORIGIN = (
    "https://sunujob-ai-frontend.onrender.com"
)

CORS_ALLOWED_ORIGINS = list(dict.fromkeys(
    env_list(
        "CORS_ALLOWED_ORIGINS",
        default=[
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:4173",
            "http://127.0.0.1:4173",
        ] if DEBUG else [],
    )
    + [FRONTEND_PRODUCTION_ORIGIN]
))


# =====================================================
# CSRF
# =====================================================

CSRF_TRUSTED_ORIGINS = list(dict.fromkeys(
    env_list(
        "CSRF_TRUSTED_ORIGINS",
        default=[
            "http://localhost:5173",
            "http://127.0.0.1:5173",
        ] if DEBUG else [],
    )
    + [FRONTEND_PRODUCTION_ORIGIN]
))


# =====================================================
# SÉCURITÉ HTTPS - PRODUCTION
# =====================================================

SECURE_PROXY_SSL_HEADER = (
    "HTTP_X_FORWARDED_PROTO",
    "https",
)

# Render termine le TLS en amont et transmet le protocole via
# X-Forwarded-Proto. Django reconnaît ainsi les requêtes HTTPS.
SECURE_SSL_REDIRECT = (
    IS_PRODUCTION
    or env_bool("SECURE_SSL_REDIRECT", False)
)

SESSION_COOKIE_SECURE = IS_PRODUCTION

CSRF_COOKIE_SECURE = IS_PRODUCTION

SECURE_CONTENT_TYPE_NOSNIFF = True

X_FRAME_OPTIONS = "DENY"

SECURE_REFERRER_POLICY = "same-origin"

_hsts_default = 3600 if IS_PRODUCTION else 0
_hsts_seconds = env_int(
    "SECURE_HSTS_SECONDS",
    _hsts_default,
    minimum=0,
)

# Activation prudente d'HSTS pendant au moins une heure en production.
SECURE_HSTS_SECONDS = (
    max(_hsts_seconds, 3600)
    if IS_PRODUCTION
    else _hsts_seconds
)

SECURE_HSTS_INCLUDE_SUBDOMAINS = env_bool(
    "SECURE_HSTS_INCLUDE_SUBDOMAINS",
    False,
)

SECURE_HSTS_PRELOAD = env_bool(
    "SECURE_HSTS_PRELOAD",
    False,
)


# =====================================================
# AUTHENTIFICATION REST FRAMEWORK
# =====================================================

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ],

    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
}


# =====================================================
# JWT
# =====================================================

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=30),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=1),
    "AUTH_HEADER_TYPES": ("Bearer",),
}


# =====================================================
# CONFIGURATION DES CV
# =====================================================

CV_MAX_FILE_SIZE_MB = env_int(
    "CV_MAX_FILE_SIZE_MB",
    8,
    minimum=1,
)


# =====================================================
# CONFIGURATION CENTRALE OLLAMA
# =====================================================

OLLAMA_BASE_URL = os.getenv(
    "OLLAMA_BASE_URL",
    "http://127.0.0.1:11434",
).rstrip("/")

OLLAMA_MODEL = os.getenv(
    "OLLAMA_MODEL",
    "qwen2.5:3b",
)

OLLAMA_TIMEOUT = env_int(
    "OLLAMA_TIMEOUT",
    180,
    minimum=1,
)


# =====================================================
# ANALYSE IA DES CV
# =====================================================

CV_AI_OLLAMA_ENABLED = env_bool(
    "CV_AI_OLLAMA_ENABLED",
    False,
)

CV_AI_OLLAMA_URL = os.getenv(
    "CV_AI_OLLAMA_URL",
    f"{OLLAMA_BASE_URL}/api/generate",
)

CV_AI_OLLAMA_MODEL = os.getenv(
    "CV_AI_OLLAMA_MODEL",
    OLLAMA_MODEL,
)

CV_AI_OLLAMA_TIMEOUT = env_int(
    "CV_AI_OLLAMA_TIMEOUT",
    OLLAMA_TIMEOUT,
    minimum=1,
)


# =====================================================
# COACH IA
# =====================================================

AI_COACH_OLLAMA_URL = CV_AI_OLLAMA_URL

AI_COACH_OLLAMA_MODEL = CV_AI_OLLAMA_MODEL

AI_COACH_OLLAMA_TIMEOUT = CV_AI_OLLAMA_TIMEOUT


# =====================================================
# EMAIL SMTP
# =====================================================

EMAIL_BACKEND = os.getenv(
    "EMAIL_BACKEND",
    "django.core.mail.backends.smtp.EmailBackend",
)

EMAIL_HOST = os.getenv(
    "EMAIL_HOST",
    "smtp.gmail.com",
)

EMAIL_PORT = env_int(
    "EMAIL_PORT",
    587,
    minimum=1,
)

EMAIL_USE_TLS = env_bool(
    "EMAIL_USE_TLS",
    True,
)

EMAIL_USE_SSL = env_bool(
    "EMAIL_USE_SSL",
    False,
)

EMAIL_HOST_USER = os.getenv(
    "EMAIL_HOST_USER",
    "",
)

EMAIL_HOST_PASSWORD = os.getenv(
    "EMAIL_HOST_PASSWORD",
    "",
)

DEFAULT_FROM_EMAIL = os.getenv(
    "DEFAULT_FROM_EMAIL",
    EMAIL_HOST_USER,
)

EMAIL_TIMEOUT = env_int(
    "EMAIL_TIMEOUT",
    20,
    minimum=1,
)


# =====================================================
# CELERY ET REDIS
# =====================================================

CELERY_BROKER_URL = os.getenv(
    "CELERY_BROKER_URL",
    "redis://127.0.0.1:6379/0",
)

CELERY_RESULT_BACKEND = os.getenv(
    "CELERY_RESULT_BACKEND",
    "redis://127.0.0.1:6379/1",
)


# Sérialisation

CELERY_ACCEPT_CONTENT = ["json"]

CELERY_TASK_SERIALIZER = "json"

CELERY_RESULT_SERIALIZER = "json"


# Fuseau horaire

CELERY_TIMEZONE = "Africa/Dakar"

CELERY_ENABLE_UTC = True


# Découverte des tâches

CELERY_IMPORTS = (
    "interviews.tasks",
    "notifications.tasks",
)


# Connexion Redis

CELERY_BROKER_CONNECTION_RETRY_ON_STARTUP = True


# Planificateur Celery Beat

CELERY_BEAT_SCHEDULER = (
    "django_celery_beat.schedulers:DatabaseScheduler"
)


# Rappels automatiques des entretiens

CELERY_BEAT_SCHEDULE = {
    "process-interview-reminders-every-minute": {
        "task": "interviews.tasks.process_due_interview_reminders",
        "schedule": crontab(minute="*"),
    },
}


# Gestion des tâches

CELERY_TASK_TRACK_STARTED = True

CELERY_TASK_TIME_LIMIT = 300

CELERY_TASK_SOFT_TIME_LIMIT = 240


# Résultats

CELERY_TASK_IGNORE_RESULT = False

CELERY_RESULT_EXPIRES = 3600


# =====================================================
# CONFIGURATION GÉNÉRALE DJANGO
# =====================================================

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"


# =====================================================
# TWILIO SMS
# =====================================================

TWILIO_ACCOUNT_SID = os.getenv(
    "TWILIO_ACCOUNT_SID",
    "",
)

TWILIO_AUTH_TOKEN = os.getenv(
    "TWILIO_AUTH_TOKEN",
    "",
)

TWILIO_FROM_NUMBER = os.getenv(
    "TWILIO_FROM_NUMBER",
    "",
)

TWILIO_ENABLED = env_bool(
    "TWILIO_ENABLED",
    False,
)