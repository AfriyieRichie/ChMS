from rest_framework import serializers
from .models import Branch


class BranchSerializer(serializers.ModelSerializer):
    class Meta:
        model = Branch
        fields = [
            "id", "name", "slug", "code", "address", "city", "region",
            "country", "phone", "email", "timezone", "currency",
            "is_active", "parent_branch", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class BranchSummarySerializer(serializers.ModelSerializer):
    """Minimal representation for use inside other serializers."""

    class Meta:
        model = Branch
        fields = ["id", "name", "code"]
