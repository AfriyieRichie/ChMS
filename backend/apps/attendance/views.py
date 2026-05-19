from rest_framework import status
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.accounts.permissions import make_capability_permission
from apps.core.audit import log_action, AuditLog
from apps.core.viewsets import BranchScopedViewSet

from .models import ServiceType, AttendanceRecord, AttendanceEntry
from .serializers import (
    ServiceTypeSerializer,
    AttendanceRecordSerializer,
    AttendanceRecordListSerializer,
    AttendanceEntrySerializer,
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

    @action(detail=True, methods=["post"], url_path="bulk-entries")
    def bulk_entries(self, request, pk=None):
        record = self.get_object()
        serializer = AttendanceEntrySerializer(data=request.data, many=True)
        serializer.is_valid(raise_exception=True)
        entries = [AttendanceEntry(attendance_record=record, **item) for item in serializer.validated_data]
        AttendanceEntry.objects.bulk_create(entries, ignore_conflicts=True)
        return Response({"created": len(entries)}, status=status.HTTP_201_CREATED)
