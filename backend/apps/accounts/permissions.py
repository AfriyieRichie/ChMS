from functools import lru_cache

from rest_framework.permissions import BasePermission


def has_capability(user, capability: str, branch=None) -> bool:
    """
    Return True if `user` holds `capability` within `branch`.

    Network admins bypass all capability checks.
    If `branch` is None the check applies to any branch assignment the user holds.
    """
    if not user or not user.is_active:
        return False
    if user.is_network_admin:
        return True

    qs = user.role_assignments.filter(
        role__role_capabilities__capability__codename=capability
    )
    if branch is not None:
        qs = qs.filter(branch=branch)

    return qs.exists()


class HasCapability(BasePermission):
    """
    DRF permission class.  Usage:

        permission_classes = [HasCapability("members.view")]
    """

    def __init__(self, capability: str):
        self.capability = capability

    # Called by DRF to build the permission instance from the class reference.
    def __call__(self):
        return self

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        branch = getattr(request, "branch", None)
        return has_capability(request.user, self.capability, branch)

    def has_object_permission(self, request, view, obj):
        branch = getattr(obj, "branch", None) or getattr(request, "branch", None)
        return has_capability(request.user, self.capability, branch)


def make_capability_permission(capability: str):
    """Factory that returns a ready-to-use DRF permission class for a capability."""

    class _Permission(BasePermission):
        _capability = capability

        def has_permission(self, request, view):
            if not request.user or not request.user.is_authenticated:
                return False
            branch = getattr(request, "branch", None)
            return has_capability(request.user, self._capability, branch)

        def has_object_permission(self, request, view, obj):
            branch = getattr(obj, "branch", None) or getattr(request, "branch", None)
            return has_capability(request.user, self._capability, branch)

    _Permission.__name__ = f"HasCapability_{capability.replace('.', '_')}"
    return _Permission
