from django.db.models import Count, Q
from rest_framework import viewsets, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from drf_spectacular.utils import extend_schema_view, extend_schema

from apps.core.viewsets import BranchScopedViewSet
from apps.accounts.permissions import make_capability_permission
from .models import Branch
from .serializers import BranchSerializer


@extend_schema_view(
    list=extend_schema(summary="List branches"),
    retrieve=extend_schema(summary="Get branch"),
    create=extend_schema(summary="Create branch"),
    update=extend_schema(summary="Update branch"),
    destroy=extend_schema(summary="Delete branch"),
)
class BranchViewSet(viewsets.ModelViewSet):
    """
    Network admins see all branches.
    Branch-scoped users see only their own branch.
    """
    serializer_class = BranchSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["is_active", "country", "parent_branch"]
    search_fields = ["name", "code", "city"]
    ordering_fields = ["name", "code", "created_at"]
    ordering = ["name"]

    def get_queryset(self):
        user = self.request.user
        qs = Branch.objects.filter(deleted_at__isnull=True).annotate(
            member_count=Count(
                "member_memberships",
                filter=Q(member_memberships__left_at__isnull=True, member_memberships__member__deleted_at__isnull=True),
                distinct=True,
            )
        )
        if user.is_network_admin:
            return qs
        branch_ids = user.role_assignments.values_list("branch_id", flat=True)
        return qs.filter(id__in=branch_ids)

    def get_permissions(self):
        if self.action in ("create", "update", "partial_update", "destroy"):
            return [make_capability_permission("branches.manage")()]
        return super().get_permissions()

    @action(detail=True, methods=["get"])
    def transfers(self, request, pk=None):
        branch = self.get_object()
        from apps.members.models import BranchMembership
        qs = (
            BranchMembership.objects
            .filter(branch=branch)
            .filter(Q(transfer_reason__gt="") | Q(left_at__isnull=False))
            .select_related("member")
            .order_by("-joined_at")[:100]
        )
        return Response([
            {
                "id": m.id,
                "member_id": m.member_id,
                "member_name": m.member.full_name,
                "joined_at": str(m.joined_at),
                "left_at": str(m.left_at) if m.left_at else None,
                "is_primary": m.is_primary,
                "transfer_reason": m.transfer_reason,
                "direction": "out" if m.left_at else "in",
            }
            for m in qs
        ])
