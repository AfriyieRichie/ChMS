from .base import *  # noqa: F401, F403

DEBUG = False

# Render terminates SSL at its edge — trust the X-Forwarded-Proto header.
# SECURE_SSL_REDIRECT must be False; Render enforces HTTPS externally.
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SECURE_SSL_REDIRECT = False
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True

STATIC_ROOT = BASE_DIR / "staticfiles"  # noqa: F405
