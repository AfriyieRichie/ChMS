from django.db import models
from django.utils.translation import gettext_lazy as _

from apps.core.models import TimeStampedModel, BranchScopedModel


class Household(TimeStampedModel):
    name = models.CharField(_("household name"), max_length=255)
    address = models.TextField(_("address"), blank=True)
    phone = models.CharField(_("phone"), max_length=30, blank=True)
    branch = models.ForeignKey(
        "branches.Branch",
        on_delete=models.PROTECT,
        related_name="households",
        verbose_name=_("branch"),
    )

    class Meta:
        verbose_name = _("household")
        verbose_name_plural = _("households")
        ordering = ["name"]

    def __str__(self):
        return self.name


class MemberTag(TimeStampedModel):
    branch = models.ForeignKey(
        "branches.Branch",
        on_delete=models.CASCADE,
        related_name="member_tags",
        verbose_name=_("branch"),
    )
    name = models.CharField(_("name"), max_length=50)
    color = models.CharField(_("color"), max_length=7, default="#6B7280")

    class Meta:
        verbose_name = _("member tag")
        verbose_name_plural = _("member tags")
        unique_together = [("branch", "name")]
        ordering = ["name"]

    def __str__(self):
        return self.name


class Member(TimeStampedModel):
    class Gender(models.TextChoices):
        MALE = "male", _("Male")
        FEMALE = "female", _("Female")
        OTHER = "other", _("Other")

    class MaritalStatus(models.TextChoices):
        SINGLE = "single", _("Single")
        MARRIED = "married", _("Married")
        DIVORCED = "divorced", _("Divorced")
        WIDOWED = "widowed", _("Widowed")

    class MembershipStatus(models.TextChoices):
        VISITOR = "visitor", _("Visitor")
        REGULAR = "regular", _("Regular Attendee")
        MEMBER = "member", _("Member")
        INACTIVE = "inactive", _("Inactive")
        TRANSFERRED = "transferred", _("Transferred")
        DECEASED = "deceased", _("Deceased")

    class BaptismStatus(models.TextChoices):
        NOT_BAPTISED = "not_baptised", _("Not Baptised")
        BAPTISED = "baptised", _("Baptised")
        PENDING = "pending", _("Pending")

    user = models.OneToOneField(
        "accounts.User",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="member_profile",
        verbose_name=_("user account"),
    )
    household = models.ForeignKey(
        Household,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="members",
        verbose_name=_("household"),
    )
    tags = models.ManyToManyField(
        MemberTag,
        blank=True,
        related_name="members",
        verbose_name=_("tags"),
    )

    first_name = models.CharField(_("first name"), max_length=100)
    middle_name = models.CharField(_("middle name"), max_length=100, blank=True)
    last_name = models.CharField(_("last name"), max_length=100)
    gender = models.CharField(_("gender"), max_length=10, choices=Gender.choices, blank=True)
    date_of_birth = models.DateField(_("date of birth"), null=True, blank=True)
    marital_status = models.CharField(_("marital status"), max_length=20, choices=MaritalStatus.choices, blank=True)
    occupation = models.CharField(_("occupation"), max_length=100, blank=True)
    phone = models.CharField(_("phone"), max_length=30, blank=True)
    email = models.EmailField(_("email"), blank=True)
    address = models.TextField(_("address"), blank=True)
    photo = models.ImageField(_("photo"), upload_to="members/photos/", null=True, blank=True)

    membership_status = models.CharField(
        _("membership status"),
        max_length=20,
        choices=MembershipStatus.choices,
        default=MembershipStatus.VISITOR,
    )
    date_joined = models.DateField(_("date joined"), null=True, blank=True)
    baptism_status = models.CharField(
        _("baptism status"),
        max_length=20,
        choices=BaptismStatus.choices,
        default=BaptismStatus.NOT_BAPTISED,
    )
    baptism_date = models.DateField(_("baptism date"), null=True, blank=True)

    notes = models.TextField(_("notes"), blank=True)
    sensitive_notes = models.TextField(_("sensitive notes"), blank=True)

    class Meta:
        verbose_name = _("member")
        verbose_name_plural = _("members")
        ordering = ["last_name", "first_name"]

    def __str__(self):
        return f"{self.first_name} {self.last_name}"

    @property
    def full_name(self):
        parts = [self.first_name, self.middle_name, self.last_name]
        return " ".join(p for p in parts if p)

    @property
    def primary_branch(self):
        membership = self.branch_memberships.filter(is_primary=True).select_related("branch").first()
        return membership.branch if membership else None


class DiscipleshipRecord(TimeStampedModel):
    class Stage(models.TextChoices):
        NEW_BELIEVER = "new_believer", _("New Believer")
        FOUNDATION = "foundation", _("Foundation Class")
        WATER_BAPTISM = "water_baptism", _("Water Baptism")
        HOLY_SPIRIT = "holy_spirit", _("Holy Spirit Baptism")
        DISCIPLESHIP = "discipleship", _("Discipleship Class")
        MEMBERSHIP = "membership", _("Membership Class")

    class Status(models.TextChoices):
        IN_PROGRESS = "in_progress", _("In Progress")
        COMPLETED = "completed", _("Completed")
        DROPPED = "dropped", _("Dropped")

    member = models.ForeignKey(
        Member,
        on_delete=models.CASCADE,
        related_name="discipleship_records",
        verbose_name=_("member"),
    )
    branch = models.ForeignKey(
        "branches.Branch",
        on_delete=models.CASCADE,
        related_name="discipleship_records",
        verbose_name=_("branch"),
    )
    stage = models.CharField(_("stage"), max_length=20, choices=Stage.choices)
    status = models.CharField(
        _("status"), max_length=20, choices=Status.choices, default=Status.IN_PROGRESS
    )
    started_at = models.DateField(_("started at"))
    completed_at = models.DateField(_("completed at"), null=True, blank=True)
    facilitator = models.ForeignKey(
        Member,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="facilitated_records",
        verbose_name=_("facilitator"),
    )
    notes = models.TextField(_("notes"), blank=True)

    class Meta:
        verbose_name = _("discipleship record")
        verbose_name_plural = _("discipleship records")
        ordering = ["member", "stage"]
        unique_together = [("member", "stage")]

    def __str__(self):
        return f"{self.member} — {self.get_stage_display()} ({self.get_status_display()})"


class BranchMembership(TimeStampedModel):
    member = models.ForeignKey(
        Member,
        on_delete=models.CASCADE,
        related_name="branch_memberships",
        verbose_name=_("member"),
    )
    branch = models.ForeignKey(
        "branches.Branch",
        on_delete=models.CASCADE,
        related_name="member_memberships",
        verbose_name=_("branch"),
    )
    joined_at = models.DateField(_("joined at"))
    left_at = models.DateField(_("left at"), null=True, blank=True)
    is_primary = models.BooleanField(_("primary branch"), default=True)
    transfer_reason = models.TextField(_("transfer reason"), blank=True)

    class Meta:
        verbose_name = _("branch membership")
        verbose_name_plural = _("branch memberships")
        unique_together = [("member", "branch")]
        ordering = ["-joined_at"]

    def __str__(self):
        return f"{self.member} @ {self.branch}"
