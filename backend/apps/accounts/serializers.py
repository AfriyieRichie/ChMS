from rest_framework import serializers
from .models import User, Role, UserRoleAssignment


class RoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Role
        fields = ["id", "name", "description"]


class UserRoleAssignmentSerializer(serializers.ModelSerializer):
    role_name = serializers.CharField(source="role.name", read_only=True)
    branch_name = serializers.CharField(source="branch.name", read_only=True)

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
            "is_active", "is_network_admin", "date_joined",
            "role_assignments",
        ]
        read_only_fields = ["id", "date_joined", "is_network_admin", "role_assignments"]


class CreateUserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ["email", "full_name", "phone", "password"]

    def create(self, validated_data):
        password = validated_data.pop("password")
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


class AssignRoleSerializer(serializers.Serializer):
    role = serializers.PrimaryKeyRelatedField(queryset=Role.objects.all())
    branch = serializers.IntegerField(required=False, allow_null=True)


class MeSerializer(serializers.ModelSerializer):
    role_assignments = UserRoleAssignmentSerializer(many=True, read_only=True)

    class Meta:
        model = User
        fields = [
            "id", "email", "full_name", "phone",
            "is_active", "is_network_admin",
            "role_assignments",
        ]
