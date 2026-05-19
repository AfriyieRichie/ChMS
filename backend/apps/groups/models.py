from django.db import models
from django.utils.translation import gettext_lazy as _

from apps.core.models import TimeStampedModel


class Group(TimeStampedModel):
    class GroupType(models.TextChoices):
        CELL = "cell", _("Cell Group")
        MINISTRY = "ministry", _("Ministry")
        CHOIR = "choir", _("Choir")
        DEPARTMENT = "department", _("Department")
        PRAYER = "prayer", _("Prayer Group")
        OTHER = "other", _("Other")

    branch = models.ForeignKey(
        "branches.Branch",
        on_delete=models.CASCADE,
        related_name="groups",
        verbose_name=_("branch"),
    )
    name = models.CharField(_("name"), max_length=100)
    group_type = models.CharField(
        _("type"), max_length=20, choices=GroupType.choices, default=GroupType.CELL
    )
    description = models.TextField(_("description"), blank=True)
    leader = models.ForeignKey(
        "members.Member",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="led_groups",
        verbose_name=_("leader"),
    )
    meeting_day = models.CharField(_("meeting day"), max_length=20, blank=True)
    meeting_time = models.TimeField(_("meeting time"), null=True, blank=True)
    meeting_location = models.CharField(_("meeting location"), max_length=200, blank=True)
    is_active = models.BooleanField(_("active"), default=True)

    class Meta:
        verbose_name = _("group")
        verbose_name_plural = _("groups")
        ordering = ["name"]
        unique_together = [("branch", "name")]

    def __str__(self):
        return f"{self.name} ({self.get_group_type_display()})"

    @property
    def member_count(self):
        return self.memberships.filter(left_at__isnull=True).count()


class GroupMembership(TimeStampedModel):
    class Role(models.TextChoices):
        MEMBER = "member", _("Member")
        LEADER = "leader", _("Leader")
        CO_LEADER = "co_leader", _("Co-Leader")

    group = models.ForeignKey(
        Group,
        on_delete=models.CASCADE,
        related_name="memberships",
        verbose_name=_("group"),
    )
    member = models.ForeignKey(
        "members.Member",
        on_delete=models.CASCADE,
        related_name="group_memberships",
        verbose_name=_("member"),
    )
    role = models.CharField(
        _("role"), max_length=20, choices=Role.choices, default=Role.MEMBER
    )
    joined_at = models.DateField(_("joined at"), auto_now_add=True)
    left_at = models.DateField(_("left at"), null=True, blank=True)

    class Meta:
        verbose_name = _("group membership")
        verbose_name_plural = _("group memberships")
        ordering = ["group", "member"]
        unique_together = [("group", "member")]

    def __str__(self):
        return f"{self.member} in {self.group}"

    @property
    def is_active(self):
        return self.left_at is None
