from django.utils import timezone

from django.db import models

from rest_framework.decorators import action
from rest_framework.response import Response

from apps.accounts.permissions import make_capability_permission
from apps.core.viewsets import BranchScopedViewSet

from .models import Announcement
from .serializers import AnnouncementSerializer, AnnouncementListSerializer

CanViewComms = make_capability_permission("communications.view")
CanManageComms = make_capability_permission("communications.manage")


class AnnouncementViewSet(BranchScopedViewSet):
    queryset = Announcement.objects.filter(deleted_at__isnull=True).select_related("created_by")
    serializer_class = AnnouncementSerializer

    def get_serializer_class(self):
        if self.action == "list":
            return AnnouncementListSerializer
        return AnnouncementSerializer

    def get_permissions(self):
        if self.action in ("list", "retrieve", "active"):
            return [CanViewComms()]
        return [CanManageComms()]

    def get_queryset(self):
        qs = super().get_queryset()
        audience = self.request.query_params.get("audience")
        if audience:
            qs = qs.filter(audience=audience)
        return qs

    def perform_create(self, serializer):
        branch = getattr(self.request, "branch", None)
        serializer.save(branch=branch, created_by=self.request.user)

    def perform_destroy(self, instance):
        instance.deleted_at = timezone.now()
        instance.save(update_fields=["deleted_at"])

    @action(detail=False, methods=["get"])
    def active(self, request):
        now = timezone.now()
        qs = self.get_queryset().filter(is_published=True).filter(
            models.Q(expires_at__isnull=True) | models.Q(expires_at__gt=now)
        ).order_by("-published_at")[:10]
        return Response(AnnouncementListSerializer(qs, many=True).data)
