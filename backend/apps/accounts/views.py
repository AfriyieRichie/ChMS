from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.branches.models import Branch

from .models import User, Role, UserRoleAssignment
from .permissions import make_capability_permission
from .serializers import (
    UserSerializer,
    CreateUserSerializer,
    AssignRoleSerializer,
    RoleSerializer,
    MeSerializer,
)

CanManageUsers = make_capability_permission("users.manage")


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def me(request):
    return Response(MeSerializer(request.user).data)


class RoleViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Role.objects.all().order_by("name")
    serializer_class = RoleSerializer
    permission_classes = [IsAuthenticated]


class UserViewSet(viewsets.ModelViewSet):
    permission_classes = [CanManageUsers]

    def get_serializer_class(self):
        if self.action == "create":
            return CreateUserSerializer
        return UserSerializer

    def get_queryset(self):
        user = self.request.user
        branch_id = self.request.headers.get("X-Branch-Id")

        if user.is_network_admin:
            qs = User.objects.filter(deleted_at__isnull=True)
            if branch_id and branch_id != "all":
                qs = qs.filter(role_assignments__branch_id=branch_id).distinct()
            return qs.prefetch_related("role_assignments__role", "role_assignments__branch")

        if branch_id:
            return (
                User.objects.filter(
                    role_assignments__branch_id=branch_id,
                    deleted_at__isnull=True,
                )
                .distinct()
                .prefetch_related("role_assignments__role", "role_assignments__branch")
            )
        return User.objects.none()

    def destroy(self, request, *args, **kwargs):
        from django.utils import timezone
        instance = self.get_object()
        instance.deleted_at = timezone.now()
        instance.is_active = False
        instance.save(update_fields=["deleted_at", "is_active"])
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["post"], url_path="assign-role")
    def assign_role(self, request, pk=None):
        user = self.get_object()
        serializer = AssignRoleSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        role = serializer.validated_data["role"]
        branch_id = serializer.validated_data.get("branch")
        branch = None
        if branch_id:
            try:
                branch = Branch.objects.get(pk=branch_id, deleted_at__isnull=True)
            except Branch.DoesNotExist:
                return Response({"branch": "Branch not found."}, status=status.HTTP_400_BAD_REQUEST)

        assignment, created = UserRoleAssignment.objects.get_or_create(
            user=user, role=role, branch=branch
        )
        return Response(
            {"id": assignment.pk, "role": role.pk, "role_name": role.name,
             "branch": branch.pk if branch else None,
             "branch_name": branch.name if branch else None},
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )

    @action(detail=True, methods=["delete"], url_path=r"roles/(?P<assignment_pk>[^/.]+)")
    def remove_role(self, request, pk=None, assignment_pk=None):
        user = self.get_object()
        try:
            assignment = user.role_assignments.get(pk=assignment_pk)
        except UserRoleAssignment.DoesNotExist:
            return Response({"detail": "Assignment not found."}, status=status.HTTP_404_NOT_FOUND)
        assignment.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
