from django.db import models

from rest_framework import status
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.accounts.permissions import make_capability_permission
from apps.core.audit import log_action, AuditLog
from apps.core.viewsets import BranchScopedViewSet

from .models import Household, Member, BranchMembership, DiscipleshipRecord
from .serializers import (
    HouseholdSerializer,
    MemberSerializer,
    MemberListSerializer,
    BranchMembershipSerializer,
    DiscipleshipRecordSerializer,
)

CanViewMembers = make_capability_permission("members.view")
CanManageMembers = make_capability_permission("members.manage")
CanViewHouseholds = make_capability_permission("households.view")
CanManageHouseholds = make_capability_permission("households.manage")


class HouseholdViewSet(BranchScopedViewSet):
    queryset = Household.objects.filter(deleted_at__isnull=True)
    serializer_class = HouseholdSerializer

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [CanViewHouseholds()]
        return [CanManageHouseholds()]

    def perform_destroy(self, instance):
        from django.utils import timezone
        instance.deleted_at = timezone.now()
        instance.save(update_fields=["deleted_at"])
        log_action(self.request.user, AuditLog.Action.DELETE, instance, request=self.request)


class MemberViewSet(BranchScopedViewSet):
    serializer_class = MemberSerializer

    def get_queryset(self):
        qs = Member.objects.filter(deleted_at__isnull=True).select_related(
            "household", "user"
        ).prefetch_related("branch_memberships__branch")

        branch = getattr(self.request, "branch", None)
        if branch is not None:
            qs = qs.filter(branch_memberships__branch=branch)

        status_filter = self.request.query_params.get("status")
        if status_filter:
            qs = qs.filter(membership_status=status_filter)

        search = self.request.query_params.get("search")
        if search:
            qs = qs.filter(
                models.Q(first_name__icontains=search)
                | models.Q(last_name__icontains=search)
                | models.Q(phone__icontains=search)
                | models.Q(email__icontains=search)
            )

        return qs.distinct()

    def get_serializer_class(self):
        if self.action == "list":
            return MemberListSerializer
        return MemberSerializer

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [CanViewMembers()]
        return [CanManageMembers()]

    def perform_create(self, serializer):
        member = serializer.save()
        branch = getattr(self.request, "branch", None)
        if branch:
            BranchMembership.objects.get_or_create(
                member=member,
                branch=branch,
                defaults={"joined_at": member.date_joined or member.created_at.date(), "is_primary": True},
            )
        log_action(self.request.user, AuditLog.Action.CREATE, member, after=serializer.data, request=self.request)

    def perform_update(self, serializer):
        before = MemberSerializer(self.get_object(), context=self.get_serializer_context()).data
        member = serializer.save()
        log_action(self.request.user, AuditLog.Action.UPDATE, member, before=before, after=serializer.data, request=self.request)

    def perform_destroy(self, instance):
        from django.utils import timezone
        instance.deleted_at = timezone.now()
        instance.save(update_fields=["deleted_at"])
        log_action(self.request.user, AuditLog.Action.DELETE, instance, request=self.request)

    @action(detail=True, methods=["get", "post"], url_path="discipleship")
    def discipleship(self, request, pk=None):
        member = self.get_object()
        if request.method == "GET":
            qs = member.discipleship_records.order_by("stage")
            return Response(DiscipleshipRecordSerializer(qs, many=True).data)

        serializer = DiscipleshipRecordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        branch = getattr(request, "branch", None)
        serializer.save(member=member, branch=branch)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["get"], url_path="groups")
    def groups(self, request, pk=None):
        member = self.get_object()
        from apps.groups.models import GroupMembership
        from apps.groups.serializers import GroupMembershipSerializer
        qs = GroupMembership.objects.filter(member=member, left_at__isnull=True).select_related("group")
        return Response(GroupMembershipSerializer(qs, many=True).data)

    @action(detail=True, methods=["get", "post"], url_path="branch-memberships")
    def branch_memberships(self, request, pk=None):
        member = self.get_object()
        if request.method == "GET":
            qs = member.branch_memberships.select_related("branch")
            return Response(BranchMembershipSerializer(qs, many=True).data)

        serializer = BranchMembershipSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(member=member)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
