from django.contrib import admin
from django.urls import path, include
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
    TokenVerifyView,
)

from apps.core.health import health_check
from apps.core.dashboard import dashboard_summary, dashboard_overview

urlpatterns = [
    path("admin/", admin.site.urls),
    # Health check
    path("api/v1/health/", health_check, name="health-check"),
    # JWT auth
    path("api/v1/auth/token/", TokenObtainPairView.as_view(), name="token-obtain"),
    path("api/v1/auth/token/refresh/", TokenRefreshView.as_view(), name="token-refresh"),
    path("api/v1/auth/token/verify/", TokenVerifyView.as_view(), name="token-verify"),
    # App APIs
    path("api/v1/", include("apps.accounts.urls")),
    path("api/v1/", include("apps.branches.urls")),
    path("api/v1/", include("apps.members.urls")),
    path("api/v1/", include("apps.attendance.urls")),
    path("api/v1/", include("apps.finance.urls")),
    path("api/v1/", include("apps.events.urls")),
    path("api/v1/", include("apps.groups.urls")),
    path("api/v1/", include("apps.communications.urls")),
    path("api/v1/", include("apps.reports.urls")),
    path("api/v1/dashboard/summary/", dashboard_summary, name="dashboard-summary"),
    path("api/v1/dashboard/overview/", dashboard_overview, name="dashboard-overview"),
    path("api/v1/", include("apps.core.urls")),
    # OpenAPI schema + docs
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
]
