from rest_framework.routers import DefaultRouter

from .views import HouseholdViewSet, MemberViewSet

router = DefaultRouter()
router.register("households", HouseholdViewSet, basename="household")
router.register("members", MemberViewSet, basename="member")

urlpatterns = router.urls
