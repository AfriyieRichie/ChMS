from rest_framework import viewsets, filters
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
        qs = Branch.objects.filter(deleted_at__isnull=True)
        if user.is_network_admin:
            return qs
        # Return only branches the user has a role assignment in
        branch_ids = user.role_assignments.values_list("branch_id", flat=True)
        return qs.filter(id__in=branch_ids)

    def get_permissions(self):
        if self.action in ("create", "update", "partial_update", "destroy"):
            return [make_capability_permission("branches.manage")()]
        return super().get_permissions()
