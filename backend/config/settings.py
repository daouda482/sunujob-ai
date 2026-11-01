
"""
Django settings for SunuJob AI.
"""

import os
from pathlib import Path
from datetime import timedelta

from dotenv import load_dotenv


# =====================================================
# CONFIGURATION DU PROJET
# =====================================================

BASE_DIR = Path(__file__).resolve().parent.parent

# Charger les variables d'environnement avant leur utilisation.
load_dotenv(BASE_DIR / ".env")


# =====================================================
# SÉCURITÉ
# =====================================================

SECRET_KEY = os.getenv(
    "DJANGO_SECRET_KEY",
    "django-insecure-7a59jpo0%^swb0@0lo)_&$+=_g90@049a=b$30@ah!r1ogni*_"
)

DEBUG = True

ALLOWED_HOSTS = [
    "localhost",
    "127.0.0.1",
]


# =====================================================
# APPLICATIONS DJANGO ET SUNUJOB AI
# =====================================================

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",

    "corsheaders",
    "rest_framework",
    "rest_framework_simplejwt",

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
]


# =====================================================
# MIDDLEWARE
# =====================================================

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
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


WSGI_APPLICATION = "config.wsgi.application"


# =====================================================
# BASE DE DONNÉES
# SQLITE
# =====================================================

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "db.sqlite3",
    }
}


# =====================================================
# MODÈLE UTILISATEUR PERSONNALISÉ
# =====================================================

AUTH_USER_MODEL = "users.User"


# =====================================================
# VALIDATION DES MOTS DE PASSE
# =====================================================

AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.CommonPasswordValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.NumericPasswordValidator",
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

STATIC_URL = "static/"

MEDIA_URL = "/media/"

MEDIA_ROOT = BASE_DIR / "media"


# =====================================================
# CORS - FRONTEND REACT/VITE
# =====================================================

CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]


# =====================================================
# CSRF
# =====================================================

CSRF_TRUSTED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]


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
# CONFIGURATION DES FICHIERS CV
# =====================================================

CV_MAX_FILE_SIZE_MB = 8


# =====================================================
# CONFIGURATION CENTRALE OLLAMA
# =====================================================

# Adresse du serveur Ollama.
OLLAMA_BASE_URL = os.getenv(
    "OLLAMA_BASE_URL",
    "http://127.0.0.1:11434"
).rstrip("/")


# Modèle réellement installé sur la machine.
OLLAMA_MODEL = os.getenv(
    "OLLAMA_MODEL",
    "qwen2.5:3b"
)


# Délai maximal d'attente.
try:
    OLLAMA_TIMEOUT = int(
        os.getenv("OLLAMA_TIMEOUT", "180")
    )
except (TypeError, ValueError):
    OLLAMA_TIMEOUT = 180

if OLLAMA_TIMEOUT <= 0:
    OLLAMA_TIMEOUT = 180


# =====================================================
# CONFIGURATION DE L'ANALYSE IA DES CV
# =====================================================

CV_AI_OLLAMA_ENABLED = (
    os.getenv(
        "CV_AI_OLLAMA_ENABLED",
        "false"
    ).strip().lower() == "true"
)


CV_AI_OLLAMA_URL = os.getenv(
    "CV_AI_OLLAMA_URL",
    f"{OLLAMA_BASE_URL}/api/generate"
)


CV_AI_OLLAMA_MODEL = os.getenv(
    "CV_AI_OLLAMA_MODEL",
    OLLAMA_MODEL
)


try:
    CV_AI_OLLAMA_TIMEOUT = int(
        os.getenv(
            "CV_AI_OLLAMA_TIMEOUT",
            str(OLLAMA_TIMEOUT)
        )
    )
except (TypeError, ValueError):
    CV_AI_OLLAMA_TIMEOUT = OLLAMA_TIMEOUT

if CV_AI_OLLAMA_TIMEOUT <= 0:
    CV_AI_OLLAMA_TIMEOUT = 180


# =====================================================
# CONFIGURATION DU COACH IA
# =====================================================

# Le Coach IA réutilise exactement la configuration
# Ollama de l'analyseur de CV.

AI_COACH_OLLAMA_URL = CV_AI_OLLAMA_URL

AI_COACH_OLLAMA_MODEL = CV_AI_OLLAMA_MODEL

AI_COACH_OLLAMA_TIMEOUT = CV_AI_OLLAMA_TIMEOUT


# =====================================================
# EMAIL DE DÉVELOPPEMENT
# =====================================================

EMAIL_BACKEND = (
    "django.core.mail.backends.console.EmailBackend"
)


# =====================================================
# CONFIGURATION DJANGO
# =====================================================

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
