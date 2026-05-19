from rest_framework.routers import DefaultRouter

from .views import ServiceTypeViewSet, AttendanceRecordViewSet, FirstTimeVisitorViewSet, ChildCheckInViewSet

router = DefaultRouter()
router.register("service-types", ServiceTypeViewSet, basename="service-type")
router.register("attendance", AttendanceRecordViewSet, basename="attendance")
router.register("visitors", FirstTimeVisitorViewSet, basename="visitor")
router.register("children", ChildCheckInViewSet, basename="child-checkin")

urlpatterns = router.urls
