from django.utils import timezone

from rest_framework import status
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.accounts.permissions import make_capability_permission
from apps.core.viewsets import BranchScopedViewSet

from .models import Event, EventRegistration, VolunteerSlot
from .serializers import (
    EventSerializer, EventListSerializer,
    EventRegistrationSerializer, VolunteerSlotSerializer,
)

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
        p = self.request.query_params
        if p.get("event_type"):
            qs = qs.filter(event_type=p["event_type"])
        if p.get("date_from"):
            qs = qs.filter(start_datetime__date__gte=p["date_from"])
        if p.get("date_to"):
            qs = qs.filter(start_datetime__date__lte=p["date_to"])
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

        # Capacity check → auto-waitlist
        reg_status = EventRegistration.Status.REGISTERED
        if event.capacity:
            active_count = event.registrations.exclude(
                status__in=["cancelled", "waitlisted"]
            ).count()
            if active_count >= event.capacity:
                reg_status = EventRegistration.Status.WAITLISTED

        serializer.save(event=event, status=reg_status)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path=r"registrations/(?P<reg_pk>[^/.]+)/check-in")
    def check_in(self, request, pk=None, reg_pk=None):
        event = self.get_object()
        try:
            reg = event.registrations.get(pk=reg_pk)
        except EventRegistration.DoesNotExist:
            return Response({"detail": "Registration not found."}, status=status.HTTP_404_NOT_FOUND)
        reg.status = EventRegistration.Status.ATTENDED
        reg.save(update_fields=["status"])
        return Response(EventRegistrationSerializer(reg).data)

    @action(detail=True, methods=["get", "post"], url_path="volunteer-slots")
    def volunteer_slots(self, request, pk=None):
        event = self.get_object()
        if request.method == "GET":
            slots = event.volunteer_slots.all()
            return Response(VolunteerSlotSerializer(slots, many=True).data)
        serializer = VolunteerSlotSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(event=event)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["delete"], url_path=r"volunteer-slots/(?P<slot_pk>[^/.]+)")
    def delete_volunteer_slot(self, request, pk=None, slot_pk=None):
        event = self.get_object()
        try:
            slot = event.volunteer_slots.get(pk=slot_pk)
        except VolunteerSlot.DoesNotExist:
            return Response({"detail": "Slot not found."}, status=status.HTTP_404_NOT_FOUND)
        slot.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
