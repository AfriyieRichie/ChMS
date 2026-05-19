from rest_framework.routers import DefaultRouter

from .views import HouseholdViewSet, MemberViewSet, MemberTagViewSet

router = DefaultRouter()
router.register("households", HouseholdViewSet, basename="household")
router.register("members", MemberViewSet, basename="member")
router.register("member-tags", MemberTagViewSet, basename="member-tag")

urlpatterns = router.urls
