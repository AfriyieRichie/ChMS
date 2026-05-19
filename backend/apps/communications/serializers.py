from rest_framework import serializers

from .models import (
    Announcement, MessageTemplate, Audience, Campaign, MessageLog, CommunicationOptOut,
)


class AnnouncementSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source="created_by.full_name", read_only=True)
    is_active = serializers.BooleanField(read_only=True)

    class Meta:
        model = Announcement
        fields = [
            "id", "branch", "title", "body", "audience",
            "is_published", "is_active", "published_at", "expires_at",
            "created_by", "created_by_name", "created_at",
        ]
        read_only_fields = ["id", "created_by", "published_at", "created_at"]


class AnnouncementListSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source="created_by.full_name", read_only=True)
    is_active = serializers.BooleanField(read_only=True)

    class Meta:
        model = Announcement
        fields = [
            "id", "title", "body", "audience",
            "is_published", "is_active", "published_at", "expires_at",
            "created_by_name", "created_at",
        ]


class MessageTemplateSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source="created_by.full_name", read_only=True)

    class Meta:
        model = MessageTemplate
        fields = [
            "id", "branch", "name", "category", "channel",
            "subject", "body", "is_active",
            "created_by", "created_by_name", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_by", "created_at", "updated_at"]


class AudienceSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source="created_by.full_name", read_only=True)

    class Meta:
        model = Audience
        fields = [
            "id", "branch", "name", "description", "filters",
            "created_by", "created_by_name", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_by", "created_at", "updated_at"]


class CampaignSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source="created_by.full_name", read_only=True)
    template_name = serializers.CharField(source="template.name", read_only=True)
    audience_name = serializers.CharField(source="audience.name", read_only=True)

    class Meta:
        model = Campaign
        fields = [
            "id", "branch", "name",
            "template", "template_name",
            "audience", "audience_name",
            "channel", "status", "scheduled_at", "sent_at", "recipient_count",
            "created_by", "created_by_name", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_by", "sent_at", "recipient_count", "created_at", "updated_at"]


class MessageLogSerializer(serializers.ModelSerializer):
    campaign_name = serializers.CharField(source="campaign.name", read_only=True)

    class Meta:
        model = MessageLog
        fields = [
            "id", "campaign", "campaign_name",
            "member", "member_name", "channel",
            "recipient_address", "status", "sent_at", "error_message",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class CommunicationOptOutSerializer(serializers.ModelSerializer):
    member_name = serializers.CharField(source="member.full_name", read_only=True)

    class Meta:
        model = CommunicationOptOut
        fields = ["id", "member", "member_name", "channel", "reason", "created_at"]
        read_only_fields = ["id", "created_at"]
