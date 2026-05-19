from rest_framework.routers import DefaultRouter
from django.urls import path

from .views import UserViewSet, RoleViewSet, me, change_password, password_reset_request, password_reset_confirm

router = DefaultRouter()
router.register("users", UserViewSet, basename="user")
router.register("roles", RoleViewSet, basename="role")

urlpatterns = [
    path("me/", me, name="me"),
    path("change-password/", change_password, name="change-password"),
    path("auth/password-reset/", password_reset_request, name="password-reset-request"),
    path("auth/password-reset/confirm/", password_reset_confirm, name="password-reset-confirm"),
    *router.urls,
]
