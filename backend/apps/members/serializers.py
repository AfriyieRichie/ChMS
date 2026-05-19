from rest_framework import serializers

from .models import Household, Member, MemberTag, BranchMembership, DiscipleshipRecord


class HouseholdSerializer(serializers.ModelSerializer):
    member_count = serializers.IntegerField(read_only=True)
    head_name = serializers.CharField(source="head.full_name", read_only=True, default=None)

    class Meta:
        model = Household
        fields = [
            "id", "name", "address", "phone", "branch",
            "head", "head_name", "anniversary_date",
            "member_count", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "member_count", "head_name", "created_at", "updated_at"]


class HouseholdSummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = Household
        fields = ["id", "name"]


class MemberTagSerializer(serializers.ModelSerializer):
    member_count = serializers.SerializerMethodField()

    class Meta:
        model = MemberTag
        fields = ["id", "name", "color", "branch", "member_count", "created_at"]
        read_only_fields = ["id", "created_at"]

    def get_member_count(self, obj):
        return obj.members.filter(deleted_at__isnull=True).count()


class MemberTagSummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = MemberTag
        fields = ["id", "name", "color"]


class BranchMembershipSerializer(serializers.ModelSerializer):
    branch_name = serializers.CharField(source="branch.name", read_only=True)

    class Meta:
        model = BranchMembership
        fields = [
            "id", "branch", "branch_name", "joined_at", "left_at",
            "is_primary", "transfer_reason",
        ]
        read_only_fields = ["id"]


class MemberSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(read_only=True)
    branch_memberships = BranchMembershipSerializer(many=True, read_only=True)
    household_name = serializers.CharField(source="household.name", read_only=True)
    tags = MemberTagSummarySerializer(many=True, read_only=True)
    tag_ids = serializers.PrimaryKeyRelatedField(
        source="tags", many=True, queryset=MemberTag.objects.all(), write_only=True, required=False,
    )

    class Meta:
        model = Member
        fields = [
            "id", "full_name", "first_name", "middle_name", "last_name",
            "gender", "date_of_birth", "marital_status", "occupation",
            "phone", "email", "address", "photo",
            "membership_status", "date_joined",
            "baptism_status", "baptism_date",
            "household", "household_name",
            "notes",
            "tags", "tag_ids",
            "branch_memberships",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "full_name", "created_at", "updated_at"]

    def to_representation(self, instance):
        data = super().to_representation(instance)
        request = self.context.get("request")
        if request and request.user.has_perm("members.view_sensitive"):
            data["sensitive_notes"] = instance.sensitive_notes
        return data

    def update(self, instance, validated_data):
        tags = validated_data.pop("tags", None)
        instance = super().update(instance, validated_data)
        if tags is not None:
            instance.tags.set(tags)
        return instance


class DiscipleshipRecordSerializer(serializers.ModelSerializer):
    facilitator_name = serializers.CharField(source="facilitator.full_name", read_only=True)

    class Meta:
        model = DiscipleshipRecord
        fields = [
            "id", "member", "branch", "stage", "status",
            "started_at", "completed_at",
            "facilitator", "facilitator_name", "notes",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class MemberListSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(read_only=True)
    primary_branch = serializers.SerializerMethodField()
    tags = MemberTagSummarySerializer(many=True, read_only=True)

    class Meta:
        model = Member
        fields = [
            "id", "full_name", "gender", "phone", "email",
            "membership_status", "baptism_status", "date_of_birth",
            "date_joined", "primary_branch", "tags",
            "household", "household_name", "photo",
        ]

    def get_primary_branch(self, obj):
        branch = obj.primary_branch
        return {"id": branch.pk, "name": branch.name} if branch else None

    def to_representation(self, instance):
        data = super().to_representation(instance)
        request = self.context.get("request")
        if request and data.get("photo"):
            data["photo"] = request.build_absolute_uri(data["photo"])
        return data
