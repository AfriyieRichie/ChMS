from rest_framework import serializers

from .models import Household, Member, BranchMembership, DiscipleshipRecord


class HouseholdSerializer(serializers.ModelSerializer):
    member_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Household
        fields = [
            "id", "name", "address", "phone", "branch",
            "member_count", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "member_count", "created_at", "updated_at"]


class HouseholdSummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = Household
        fields = ["id", "name"]


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

    class Meta:
        model = Member
        fields = [
            "id", "full_name", "gender", "phone", "email",
            "membership_status", "primary_branch",
        ]

    def get_primary_branch(self, obj):
        branch = obj.primary_branch
        return {"id": branch.pk, "name": branch.name} if branch else None
