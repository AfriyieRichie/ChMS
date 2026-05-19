from rest_framework import viewsets
from rest_framework.exceptions import ValidationError, PermissionDenied

from apps.branches.models import Branch


class BranchScopedViewSet(viewsets.ModelViewSet):
    """
    Base viewset that automatically scopes querysets to the request branch.

    Clients send X-Branch-Id header.  Network admins may also pass ?branch=<id>
    or ?branch=all to override scoping on report endpoints.
    """

    def _get_request_branch(self):
        user = self.request.user

        # Network admin: honour explicit header/query param, or return None (all)
        if user.is_network_admin:
            branch_id = (
                self.request.headers.get("X-Branch-Id")
                or self.request.query_params.get("branch")
            )
            if branch_id and branch_id != "all":
                try:
                    return Branch.objects.get(pk=branch_id, deleted_at__isnull=True)
                except Branch.DoesNotExist:
                    raise ValidationError({"branch": "Branch not found."})
            return None  # all branches

        # Regular user: branch from header
        branch_id = self.request.headers.get("X-Branch-Id")
        if not branch_id:
            # Fall back to their first active assignment
            assignment = user.role_assignments.select_related("branch").filter(
                branch__isnull=False
            ).first()
            if not assignment:
                raise PermissionDenied("No branch access found for this user.")
            return assignment.branch

        try:
            branch = Branch.objects.get(pk=branch_id, deleted_at__isnull=True)
        except Branch.DoesNotExist:
            raise ValidationError({"branch": "Branch not found."})

        # Verify user has an assignment in this branch
        if not user.role_assignments.filter(branch=branch).exists():
            raise PermissionDenied("You do not have access to this branch.")

        return branch

    def initial(self, request, *args, **kwargs):
        super().initial(request, *args, **kwargs)
        # Attach branch to request so permission classes can read it
        request.branch = self._get_request_branch()

    def get_queryset(self):
        qs = super().get_queryset()
        branch = getattr(self.request, "branch", None)
        if branch is not None:
            qs = qs.filter(branch=branch)
        return qs

    def perform_create(self, serializer):
        branch = getattr(self.request, "branch", None)
        if branch:
            serializer.save(branch=branch)
        else:
            serializer.save()
