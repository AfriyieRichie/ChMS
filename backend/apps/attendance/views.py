from rest_framework import status
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from apps.accounts.permissions import make_capability_permission
from apps.core.audit import log_action, AuditLog
from apps.core.viewsets import BranchScopedViewSet

from .models import ServiceType, AttendanceRecord, AttendanceEntry, FirstTimeVisitor, ChildCheckIn
from .serializers import (
    ServiceTypeSerializer,
    AttendanceRecordSerializer,
    AttendanceRecordListSerializer,
    AttendanceEntrySerializer,
    FirstTimeVisitorSerializer,
    ChildCheckInSerializer,
)

CanViewAttendance = make_capability_permission("attendance.view")
CanManageAttendance = make_capability_permission("attendance.manage")


class ServiceTypeViewSet(BranchScopedViewSet):
    queryset = ServiceType.objects.filter(deleted_at__isnull=True)
    serializer_class = ServiceTypeSerializer

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [CanViewAttendance()]
        return [CanManageAttendance()]

    def get_queryset(self):
        qs = super().get_queryset()
        if self.request.query_params.get("active_only") == "true":
            qs = qs.filter(is_active=True)
        return qs


class AttendanceRecordViewSet(BranchScopedViewSet):
    queryset = AttendanceRecord.objects.filter(deleted_at__isnull=True).select_related(
        "service_type", "recorded_by", "branch"
    )
    serializer_class = AttendanceRecordSerializer

    def get_serializer_class(self):
        if self.action == "list":
            return AttendanceRecordListSerializer
        return AttendanceRecordSerializer

    def get_permissions(self):
        if self.action == "self_checkin":
            return [AllowAny()]
        if self.action in ("list", "retrieve"):
            return [CanViewAttendance()]
        return [CanManageAttendance()]

    def get_queryset(self):
        qs = super().get_queryset()

        date_from = self.request.query_params.get("date_from")
        date_to = self.request.query_params.get("date_to")
        service_type = self.request.query_params.get("service_type")

        if date_from:
            qs = qs.filter(date__gte=date_from)
        if date_to:
            qs = qs.filter(date__lte=date_to)
        if service_type:
            qs = qs.filter(service_type_id=service_type)

        return qs

    def perform_create(self, serializer):
        record = serializer.save(recorded_by=self.request.user)
        log_action(self.request.user, AuditLog.Action.CREATE, record, after=serializer.data, request=self.request)

    def perform_update(self, serializer):
        before = AttendanceRecordSerializer(self.get_object(), context=self.get_serializer_context()).data
        record = serializer.save()
        log_action(self.request.user, AuditLog.Action.UPDATE, record, before=before, after=serializer.data, request=self.request)

    def perform_destroy(self, instance):
        from django.utils import timezone
        instance.deleted_at = timezone.now()
        instance.save(update_fields=["deleted_at"])
        log_action(self.request.user, AuditLog.Action.DELETE, instance, request=self.request)

    @action(detail=True, methods=["get", "post"], url_path="entries")
    def entries(self, request, pk=None):
        record = self.get_object()
        if request.method == "GET":
            qs = record.entries.select_related("member")
            return Response(AttendanceEntrySerializer(qs, many=True).data)

        serializer = AttendanceEntrySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(attendance_record=record)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["delete"], url_path=r"entries/(?P<entry_id>[^/.]+)")
    def remove_entry(self, request, pk=None, entry_id=None):
        record = self.get_object()
        try:
            entry = record.entries.get(pk=entry_id)
        except AttendanceEntry.DoesNotExist:
            return Response({"error": "Entry not found"}, status=status.HTTP_404_NOT_FOUND)
        entry.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["post"], url_path="bulk-entries")
    def bulk_entries(self, request, pk=None):
        record = self.get_object()
        serializer = AttendanceEntrySerializer(data=request.data, many=True)
        serializer.is_valid(raise_exception=True)
        entries = [AttendanceEntry(attendance_record=record, **item) for item in serializer.validated_data]
        AttendanceEntry.objects.bulk_create(entries, ignore_conflicts=True)
        return Response({"created": len(entries)}, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="self-checkin", permission_classes=[AllowAny])
    def self_checkin(self, request, pk=None):
        try:
            record = AttendanceRecord.objects.get(pk=pk, deleted_at__isnull=True)
        except AttendanceRecord.DoesNotExist:
            return Response({"error": "Session not found."}, status=status.HTTP_404_NOT_FOUND)

        phone = (request.data.get("phone") or "").strip()
        if not phone:
            return Response({"error": "Phone number is required."}, status=status.HTTP_400_BAD_REQUEST)

        from apps.members.models import Member
        try:
            member = Member.objects.get(phone=phone, deleted_at__isnull=True)
        except Member.DoesNotExist:
            return Response({"error": "No member found with that phone number."}, status=status.HTTP_404_NOT_FOUND)
        except Member.MultipleObjectsReturned:
            member = Member.objects.filter(phone=phone, deleted_at__isnull=True).first()

        entry, created = AttendanceEntry.objects.get_or_create(
            attendance_record=record,
            member=member,
            defaults={"is_first_visit": False},
        )
        return Response({
            "checked_in": True,
            "created": created,
            "member_name": member.full_name,
            "already_checked_in": not created,
        })


class FirstTimeVisitorViewSet(BranchScopedViewSet):
    serializer_class = FirstTimeVisitorSerializer

    def get_queryset(self):
        qs = FirstTimeVisitor.objects.filter(
            deleted_at__isnull=True
        ).select_related("attendance_record", "attendance_record__service_type")
        record_id = self.request.query_params.get("record")
        if record_id:
            qs = qs.filter(attendance_record_id=record_id)
        return qs

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [CanViewAttendance()]
        return [CanManageAttendance()]


class ChildCheckInViewSet(BranchScopedViewSet):
    serializer_class = ChildCheckInSerializer

    def get_queryset(self):
        qs = ChildCheckIn.objects.filter(
            deleted_at__isnull=True
        ).select_related("attendance_record")
        record_id = self.request.query_params.get("record")
        if record_id:
            qs = qs.filter(attendance_record_id=record_id)
        return qs

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [CanViewAttendance()]
        return [CanManageAttendance()]
