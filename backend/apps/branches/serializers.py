from rest_framework import serializers
from .models import Branch


class BranchSerializer(serializers.ModelSerializer):
    member_count = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = Branch
        fields = [
            "id", "name", "slug", "code", "address", "city", "region",
            "country", "phone", "email", "timezone", "currency",
            "is_active", "parent_branch",
            "pastor", "service_times", "logo",
            "member_count", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "member_count", "created_at", "updated_at"]


class BranchSummarySerializer(serializers.ModelSerializer):
    """Minimal representation for use inside other serializers."""

    class Meta:
        model = Branch
        fields = ["id", "name", "code"]
