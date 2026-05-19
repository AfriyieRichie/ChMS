from rest_framework import serializers

from .models import ServiceType, AttendanceRecord, AttendanceEntry, FirstTimeVisitor, ChildCheckIn


class ServiceTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = ServiceType
        fields = ["id", "name", "description", "is_active", "branch", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]


class AttendanceEntrySerializer(serializers.ModelSerializer):
    member_name = serializers.CharField(source="member.full_name", read_only=True)

    class Meta:
        model = AttendanceEntry
        fields = ["id", "member", "member_name", "is_first_visit", "notes"]
        read_only_fields = ["id"]


class AttendanceRecordSerializer(serializers.ModelSerializer):
    entries = AttendanceEntrySerializer(many=True, read_only=True)
    service_type_name = serializers.CharField(source="service_type.name", read_only=True)
    recorded_by_name = serializers.CharField(source="recorded_by.full_name", read_only=True)

    class Meta:
        model = AttendanceRecord
        fields = [
            "id", "branch", "service_type", "service_type_name", "date",
            "attendance_type", "total_count", "male_count", "female_count",
            "children_count", "first_timers", "notes",
            "recorded_by", "recorded_by_name",
            "entries",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "recorded_by", "created_at", "updated_at"]


class AttendanceRecordListSerializer(serializers.ModelSerializer):
    service_type_name = serializers.CharField(source="service_type.name", read_only=True)

    class Meta:
        model = AttendanceRecord
        fields = [
            "id", "date", "service_type", "service_type_name",
            "attendance_type", "total_count", "first_timers",
        ]


class FirstTimeVisitorSerializer(serializers.ModelSerializer):
    record_date = serializers.DateField(source="attendance_record.date", read_only=True)
    record_service = serializers.CharField(source="attendance_record.service_type.name", read_only=True)

    class Meta:
        model = FirstTimeVisitor
        fields = [
            "id", "attendance_record", "record_date", "record_service",
            "name", "phone", "email", "how_heard", "notes",
            "followed_up", "converted_to_member",
            "created_at",
        ]
        read_only_fields = ["id", "record_date", "record_service", "created_at"]


class ChildCheckInSerializer(serializers.ModelSerializer):
    record_date = serializers.DateField(source="attendance_record.date", read_only=True)

    class Meta:
        model = ChildCheckIn
        fields = [
            "id", "attendance_record", "record_date",
            "child_name", "age", "parent_name", "parent_phone",
            "allergy_notes", "pickup_code", "member", "checked_out",
            "created_at",
        ]
        read_only_fields = ["id", "pickup_code", "record_date", "created_at"]
