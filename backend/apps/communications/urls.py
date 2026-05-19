from rest_framework.routers import DefaultRouter

from .views import (
    AnnouncementViewSet, MessageTemplateViewSet, AudienceViewSet,
    CampaignViewSet, MessageLogViewSet, OptOutViewSet,
)

router = DefaultRouter()
router.register("announcements",     AnnouncementViewSet,    basename="announcement")
router.register("message-templates", MessageTemplateViewSet, basename="message-template")
router.register("audiences",         AudienceViewSet,        basename="audience")
router.register("campaigns",         CampaignViewSet,        basename="campaign")
router.register("message-logs",      MessageLogViewSet,      basename="message-log")
router.register("opt-outs",          OptOutViewSet,          basename="opt-out")

urlpatterns = router.urls
