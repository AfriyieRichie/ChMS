from rest_framework.routers import DefaultRouter
from django.urls import path

from .views import UserViewSet, RoleViewSet, me

router = DefaultRouter()
router.register("users", UserViewSet, basename="user")
router.register("roles", RoleViewSet, basename="role")

urlpatterns = [
    path("me/", me, name="me"),
    *router.urls,
]
