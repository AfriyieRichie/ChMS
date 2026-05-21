from rest_framework.routers import DefaultRouter
from django.urls import path

from .views import (
    UserViewSet, RoleViewSet,
    me, change_password, password_reset_request, password_reset_confirm,
    me_notifications, me_notifications_update,
    me_giving, me_giving_statement, me_attendance, me_groups,
)

router = DefaultRouter()
router.register("users", UserViewSet, basename="user")
router.register("roles", RoleViewSet, basename="role")

urlpatterns = [
    path("me/", me, name="me"),
    path("me/notifications/", me_notifications, name="me-notifications"),
    path("me/notifications/update/", me_notifications_update, name="me-notifications-update"),
    path("me/giving/", me_giving, name="me-giving"),
    path("me/giving/statement/", me_giving_statement, name="me-giving-statement"),
    path("me/attendance/", me_attendance, name="me-attendance"),
    path("me/groups/", me_groups, name="me-groups"),
    path("change-password/", change_password, name="change-password"),
    path("auth/password-reset/", password_reset_request, name="password-reset-request"),
    path("auth/password-reset/confirm/", password_reset_confirm, name="password-reset-confirm"),
    *router.urls,
]
