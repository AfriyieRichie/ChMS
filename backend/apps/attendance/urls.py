from rest_framework.routers import DefaultRouter

from .views import ServiceTypeViewSet, AttendanceRecordViewSet

router = DefaultRouter()
router.register("service-types", ServiceTypeViewSet, basename="service-type")
router.register("attendance", AttendanceRecordViewSet, basename="attendance")

urlpatterns = router.urls
