from django.utils import timezone

from rest_framework import status
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.accounts.permissions import make_capability_permission
from apps.core.viewsets import BranchScopedViewSet

from .models import Group, GroupMembership, GroupMeeting, GroupJoinRequest
from .serializers import (
    GroupSerializer, GroupListSerializer, GroupMembershipSerializer,
    GroupMeetingSerializer, GroupJoinRequestSerializer,
)

CanViewGroups = make_capability_permission("groups.view")
CanManageGroups = make_capability_permission("groups.manage")


class GroupViewSet(BranchScopedViewSet):
    queryset = Group.objects.filter(deleted_at__isnull=True).select_related("leader", "branch", "parent_group")
    serializer_class = GroupSerializer

    def get_serializer_class(self):
        if self.action == "list":
            return GroupListSerializer
        return GroupSerializer

    def get_permissions(self):
        if self.action in ("list", "retrieve", "members", "meetings", "join_requests"):
            return [CanViewGroups()]
        return [CanManageGroups()]

    def get_queryset(self):
        qs = super().get_queryset()
        p = self.request.query_params
        if p.get("group_type"):
            qs = qs.filter(group_type=p["group_type"])
        if p.get("active_only") == "true":
            qs = qs.filter(is_active=True)
        return qs

    # ── Members ───────────────────────────────────────────────────────────────

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

    @action(detail=True, methods=["post"], url_path=r"members/(?P<membership_pk>[^/.]+)/remove")
    def remove_member(self, request, pk=None, membership_pk=None):
        group = self.get_object()
        try:
            membership = group.memberships.get(pk=membership_pk)
        except GroupMembership.DoesNotExist:
            return Response({"detail": "Membership not found."}, status=status.HTTP_404_NOT_FOUND)
        membership.left_at = timezone.now().date()
        membership.save(update_fields=["left_at"])
        return Response(GroupMembershipSerializer(membership).data)

    # ── Meetings ──────────────────────────────────────────────────────────────

    @action(detail=True, methods=["get", "post"])
    def meetings(self, request, pk=None):
        group = self.get_object()
        if request.method == "GET":
            qs = group.meetings.all()
            return Response(GroupMeetingSerializer(qs, many=True).data)

        serializer = GroupMeetingSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(group=group, recorded_by=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    # ── Join requests ─────────────────────────────────────────────────────────

    @action(detail=True, methods=["get", "post"], url_path="join-requests")
    def join_requests(self, request, pk=None):
        group = self.get_object()
        if request.method == "GET":
            qs = group.join_requests.select_related("member")
            status_filter = request.query_params.get("status")
            if status_filter:
                qs = qs.filter(status=status_filter)
            return Response(GroupJoinRequestSerializer(qs, many=True).data)

        serializer = GroupJoinRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(group=group)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(
        detail=True, methods=["post"],
        url_path=r"join-requests/(?P<req_pk>[^/.]+)/(?P<decision>approve|reject)",
    )
    def decide_join_request(self, request, pk=None, req_pk=None, decision=None):
        group = self.get_object()
        try:
            req = group.join_requests.get(pk=req_pk)
        except GroupJoinRequest.DoesNotExist:
            return Response({"detail": "Request not found."}, status=status.HTTP_404_NOT_FOUND)

        req.status = "approved" if decision == "approve" else "rejected"
        req.save(update_fields=["status"])

        if req.status == "approved":
            GroupMembership.objects.get_or_create(group=group, member=req.member)

        return Response(GroupJoinRequestSerializer(req).data)
