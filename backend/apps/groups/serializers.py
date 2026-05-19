from rest_framework import serializers

from .models import Group, GroupMembership


class GroupSerializer(serializers.ModelSerializer):
    member_count = serializers.IntegerField(read_only=True)
    leader_name = serializers.CharField(source="leader.full_name", read_only=True)

    class Meta:
        model = Group
        fields = [
            "id", "branch", "name", "group_type", "description",
            "leader", "leader_name",
            "meeting_day", "meeting_time", "meeting_location",
            "is_active", "member_count",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class GroupListSerializer(serializers.ModelSerializer):
    member_count = serializers.IntegerField(read_only=True)
    leader_name = serializers.CharField(source="leader.full_name", read_only=True)

    class Meta:
        model = Group
        fields = [
            "id", "name", "group_type", "leader_name",
            "meeting_day", "meeting_location", "is_active", "member_count",
        ]


class GroupMembershipSerializer(serializers.ModelSerializer):
    member_name = serializers.CharField(source="member.full_name", read_only=True)
    group_name = serializers.CharField(source="group.name", read_only=True)
    is_active = serializers.BooleanField(read_only=True)

    class Meta:
        model = GroupMembership
        fields = [
            "id", "group", "group_name", "member", "member_name",
            "role", "joined_at", "left_at", "is_active",
        ]
        read_only_fields = ["id", "joined_at"]
