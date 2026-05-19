from django.utils import timezone

from rest_framework import status
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.accounts.permissions import make_capability_permission
from apps.core.viewsets import BranchScopedViewSet

from .models import Event, EventRegistration
from .serializers import EventSerializer, EventListSerializer, EventRegistrationSerializer

CanViewEvents = make_capability_permission("events.view")
CanManageEvents = make_capability_permission("events.manage")


class EventViewSet(BranchScopedViewSet):
    queryset = Event.objects.filter(deleted_at__isnull=True).select_related("created_by", "branch")
    serializer_class = EventSerializer

    def get_serializer_class(self):
        if self.action == "list":
            return EventListSerializer
        return EventSerializer

    def get_permissions(self):
        if self.action in ("list", "retrieve", "upcoming"):
            return [CanViewEvents()]
        return [CanManageEvents()]

    def get_queryset(self):
        qs = super().get_queryset()
        event_type = self.request.query_params.get("event_type")
        if event_type:
            qs = qs.filter(event_type=event_type)
        return qs

    def perform_create(self, serializer):
        branch = getattr(self.request, "branch", None)
        serializer.save(branch=branch, created_by=self.request.user)

    @action(detail=False, methods=["get"])
    def upcoming(self, request):
        qs = self.get_queryset().filter(
            start_datetime__gte=timezone.now(), is_published=True
        ).order_by("start_datetime")[:20]
        return Response(EventListSerializer(qs, many=True).data)

    @action(detail=True, methods=["get", "post"], url_path="registrations")
    def registrations(self, request, pk=None):
        event = self.get_object()
        if request.method == "GET":
            qs = event.registrations.select_related("member")
            return Response(EventRegistrationSerializer(qs, many=True).data)

        serializer = EventRegistrationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(event=event)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="registrations/(?P<reg_pk>[^/.]+)/check-in")
    def check_in(self, request, pk=None, reg_pk=None):
        event = self.get_object()
        try:
            reg = event.registrations.get(pk=reg_pk)
        except EventRegistration.DoesNotExist:
            return Response({"detail": "Registration not found."}, status=status.HTTP_404_NOT_FOUND)
        reg.status = EventRegistration.Status.ATTENDED
        reg.save(update_fields=["status"])
        return Response(EventRegistrationSerializer(reg).data)
