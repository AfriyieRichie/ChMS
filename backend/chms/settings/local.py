from .base import *  # noqa: F401, F403

DEBUG = True

# Relax host validation in local dev
ALLOWED_HOSTS = ["*"]

# Show emails in the terminal
EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"

# Django Debug Toolbar (optional — install separately if needed)
INTERNAL_IPS = ["127.0.0.1"]
