from django.contrib import admin
from django.urls import path, include
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
    TokenVerifyView,
)

from apps.core.health import health_check

urlpatterns = [
    path("admin/", admin.site.urls),
    # Health check
    path("api/v1/health/", health_check, name="health-check"),
    # JWT auth
    path("api/v1/auth/token/", TokenObtainPairView.as_view(), name="token-obtain"),
    path("api/v1/auth/token/refresh/", TokenRefreshView.as_view(), name="token-refresh"),
    path("api/v1/auth/token/verify/", TokenVerifyView.as_view(), name="token-verify"),
    # App APIs
    path("api/v1/", include("apps.branches.urls")),
    path("api/v1/", include("apps.members.urls")),
    path("api/v1/", include("apps.attendance.urls")),
    # OpenAPI schema + docs
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
]
