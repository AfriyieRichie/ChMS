from rest_framework import serializers

from .models import Event, EventRegistration, VolunteerSlot


class VolunteerSlotSerializer(serializers.ModelSerializer):
    class Meta:
        model = VolunteerSlot
        fields = ["id", "event", "role_name", "slots_needed", "notes"]
        read_only_fields = ["id"]


class EventSerializer(serializers.ModelSerializer):
    registration_count = serializers.IntegerField(read_only=True)
    created_by_name = serializers.CharField(source="created_by.full_name", read_only=True)
    volunteer_slots = VolunteerSlotSerializer(many=True, read_only=True)

    class Meta:
        model = Event
        fields = [
            "id", "branch", "name", "description", "event_type",
            "start_datetime", "end_datetime", "venue", "capacity",
            "cost", "registration_required", "banner",
            "recurrence", "recurrence_end",
            "is_published", "registration_count",
            "volunteer_slots",
            "created_by", "created_by_name",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_by", "created_at", "updated_at"]


class EventListSerializer(serializers.ModelSerializer):
    registration_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Event
        fields = [
            "id", "name", "event_type", "start_datetime", "end_datetime",
            "venue", "capacity", "cost", "registration_required",
            "recurrence", "is_published", "registration_count",
        ]


class EventRegistrationSerializer(serializers.ModelSerializer):
    member_name = serializers.CharField(source="member.full_name", read_only=True)
    event_name = serializers.CharField(source="event.name", read_only=True)

    class Meta:
        model = EventRegistration
        fields = [
            "id", "event", "event_name", "member", "member_name",
            "status", "notes", "created_at",
        ]
        read_only_fields = ["id", "created_at"]
