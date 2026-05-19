from django.utils import timezone

from rest_framework import status
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.accounts.permissions import make_capability_permission
from apps.core.viewsets import BranchScopedViewSet

from .models import Group, GroupMembership
from .serializers import GroupSerializer, GroupListSerializer, GroupMembershipSerializer

CanViewGroups = make_capability_permission("groups.view")
CanManageGroups = make_capability_permission("groups.manage")


class GroupViewSet(BranchScopedViewSet):
    queryset = Group.objects.filter(deleted_at__isnull=True).select_related("leader", "branch")
    serializer_class = GroupSerializer

    def get_serializer_class(self):
        if self.action == "list":
            return GroupListSerializer
        return GroupSerializer

    def get_permissions(self):
        if self.action in ("list", "retrieve", "members"):
            return [CanViewGroups()]
        return [CanManageGroups()]

    def get_queryset(self):
        qs = super().get_queryset()
        group_type = self.request.query_params.get("group_type")
        active_only = self.request.query_params.get("active_only")
        if group_type:
            qs = qs.filter(group_type=group_type)
        if active_only == "true":
            qs = qs.filter(is_active=True)
        return qs

    @action(detail=True, methods=["get", "post"])
    def members(self, request, pk=None):
        group = self.get_object()
        if request.method == "GET":
            qs = group.memberships.filter(left_at__isnull=True).select_related("member")
            return Response(GroupMembershipSerializer(qs, many=True).data)

        serializer = GroupMembershipSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(group=group)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="members/(?P<membership_pk>[^/.]+)/remove")
    def remove_member(self, request, pk=None, membership_pk=None):
        group = self.get_object()
        try:
            membership = group.memberships.get(pk=membership_pk)
        except GroupMembership.DoesNotExist:
            return Response({"detail": "Membership not found."}, status=status.HTTP_404_NOT_FOUND)
        membership.left_at = timezone.now().date()
        membership.save(update_fields=["left_at"])
        return Response(GroupMembershipSerializer(membership).data)
