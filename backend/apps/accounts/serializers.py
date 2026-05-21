from rest_framework import serializers
from .models import User, Role, Capability, UserRoleAssignment, NotificationPreference


class CapabilitySerializer(serializers.ModelSerializer):
    class Meta:
        model = Capability
        fields = ["codename", "description"]


class RoleSerializer(serializers.ModelSerializer):
    capabilities = serializers.SerializerMethodField()

    class Meta:
        model = Role
        fields = ["id", "name", "description", "capabilities"]

    def get_capabilities(self, obj):
        return list(obj.role_capabilities.values_list("capability__codename", flat=True))


class UserRoleAssignmentSerializer(serializers.ModelSerializer):
    role_name = serializers.CharField(source="role.name", read_only=True)
    branch_name = serializers.CharField(source="branch.name", read_only=True, default=None)

    class Meta:
        model = UserRoleAssignment
        fields = ["id", "role", "role_name", "branch", "branch_name"]
        read_only_fields = ["id"]


class UserSerializer(serializers.ModelSerializer):
    role_assignments = UserRoleAssignmentSerializer(many=True, read_only=True)

    class Meta:
        model = User
        fields = [
            "id", "email", "full_name", "phone",
            "is_active", "is_network_admin", "date_joined", "last_login",
            "role_assignments",
        ]
        read_only_fields = ["id", "date_joined", "last_login", "is_network_admin", "role_assignments"]


class InviteUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["email", "full_name", "phone"]

    def create(self, validated_data):
        user = User(**validated_data)
        user.set_unusable_password()
        user.save()
        return user


class AssignRoleSerializer(serializers.Serializer):
    role = serializers.PrimaryKeyRelatedField(queryset=Role.objects.all())
    branch = serializers.IntegerField(required=False, allow_null=True)


class NotificationPreferenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = NotificationPreference
        fields = [
            "email_attendance_reminders",
            "email_event_invites",
            "email_giving_receipts",
            "email_announcements",
            "email_pastoral_care",
            "updated_at",
        ]
        read_only_fields = ["updated_at"]


class MeSerializer(serializers.ModelSerializer):
    role_assignments = UserRoleAssignmentSerializer(many=True, read_only=True)

    class Meta:
        model = User
        fields = [
            "id", "email", "full_name", "phone",
            "is_active", "is_network_admin",
            "role_assignments",
        ]
