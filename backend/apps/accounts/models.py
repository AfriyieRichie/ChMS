from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models
from django.utils.translation import gettext_lazy as _


class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError(_("Email address is required."))
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("is_network_admin", True)
        return self.create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    email = models.EmailField(_("email address"), unique=True)
    phone = models.CharField(_("phone"), max_length=30, blank=True)
    full_name = models.CharField(_("full name"), max_length=255)
    is_active = models.BooleanField(_("active"), default=True)
    is_staff = models.BooleanField(_("staff status"), default=False)
    is_network_admin = models.BooleanField(
        _("network admin"),
        default=False,
        help_text=_("Grants access to all branches, bypassing branch-scope filtering."),
    )
    # last_login_branch added in migration 0003 after Branch model exists
    date_joined = models.DateTimeField(_("date joined"), auto_now_add=True)
    deleted_at = models.DateTimeField(null=True, blank=True)

    objects = UserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["full_name"]

    class Meta:
        verbose_name = _("user")
        verbose_name_plural = _("users")

    def __str__(self):
        return self.email

    def has_capability(self, capability: str, branch=None) -> bool:
        """Convenience method — delegates to the module-level helper."""
        from apps.accounts.permissions import has_capability
        return has_capability(self, capability, branch)


# ---------------------------------------------------------------------------
# RBAC
# ---------------------------------------------------------------------------

class Role(models.Model):
    name = models.CharField(_("name"), max_length=50, unique=True)
    description = models.TextField(_("description"), blank=True)

    class Meta:
        verbose_name = _("role")
        verbose_name_plural = _("roles")
        ordering = ["name"]

    def __str__(self):
        return self.name


class Capability(models.Model):
    codename = models.CharField(_("codename"), max_length=100, unique=True)
    description = models.TextField(_("description"), blank=True)

    class Meta:
        verbose_name = _("capability")
        verbose_name_plural = _("capabilities")
        ordering = ["codename"]

    def __str__(self):
        return self.codename


class RoleCapability(models.Model):
    role = models.ForeignKey(
        Role, on_delete=models.CASCADE, related_name="role_capabilities"
    )
    capability = models.ForeignKey(
        Capability, on_delete=models.CASCADE, related_name="role_capabilities"
    )

    class Meta:
        unique_together = [("role", "capability")]
        verbose_name = _("role capability")
        verbose_name_plural = _("role capabilities")

    def __str__(self):
        return f"{self.role} → {self.capability}"


class NotificationPreference(models.Model):
    user = models.OneToOneField(
        User, on_delete=models.CASCADE, related_name="notification_prefs"
    )
    email_attendance_reminders = models.BooleanField(default=True)
    email_event_invites = models.BooleanField(default=True)
    email_giving_receipts = models.BooleanField(default=True)
    email_announcements = models.BooleanField(default=True)
    email_pastoral_care = models.BooleanField(default=False)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("notification preference")
        verbose_name_plural = _("notification preferences")

    def __str__(self):
        return f"{self.user} prefs"


class UserRoleAssignment(models.Model):
    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="role_assignments"
    )
    role = models.ForeignKey(
        Role, on_delete=models.CASCADE, related_name="user_assignments"
    )
    # Null branch = network-level assignment (only valid for network_admin role)
    branch = models.ForeignKey(
        "branches.Branch",
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="role_assignments",
    )

    class Meta:
        unique_together = [("user", "role", "branch")]
        verbose_name = _("user role assignment")
        verbose_name_plural = _("user role assignments")

    def __str__(self):
        branch_label = str(self.branch) if self.branch_id else "network"
        return f"{self.user} — {self.role} @ {branch_label}"
