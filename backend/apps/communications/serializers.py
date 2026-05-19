from rest_framework import serializers
from .models import Announcement


class AnnouncementSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source="created_by.full_name", read_only=True)
    is_active = serializers.BooleanField(read_only=True)

    class Meta:
        model = Announcement
        fields = [
            "id", "branch", "title", "body", "audience",
            "is_published", "published_at", "expires_at",
            "is_active", "created_by", "created_by_name",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "published_at", "created_by", "created_at", "updated_at"]


class AnnouncementListSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source="created_by.full_name", read_only=True)
    is_active = serializers.BooleanField(read_only=True)

    class Meta:
        model = Announcement
        fields = [
            "id", "title", "audience", "is_published", "is_active",
            "published_at", "expires_at", "created_by_name",
        ]
