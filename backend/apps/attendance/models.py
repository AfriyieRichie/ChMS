import random
import string

from django.db import models
from django.utils.translation import gettext_lazy as _

from apps.core.models import TimeStampedModel


def _pickup_code():
    return "".join(random.choices(string.digits, k=4))


class ServiceType(TimeStampedModel):
    branch = models.ForeignKey(
        "branches.Branch",
        on_delete=models.CASCADE,
        related_name="service_types",
        verbose_name=_("branch"),
    )
    name = models.CharField(_("name"), max_length=100)
    description = models.TextField(_("description"), blank=True)
    is_active = models.BooleanField(_("active"), default=True)

    class Meta:
        verbose_name = _("service type")
        verbose_name_plural = _("service types")
        ordering = ["name"]
        unique_together = [("branch", "name")]

    def __str__(self):
        return f"{self.name} ({self.branch})"


class AttendanceRecord(TimeStampedModel):
    class AttendanceType(models.TextChoices):
        PHYSICAL = "physical", _("Physical")
        ONLINE = "online", _("Online")

    branch = models.ForeignKey(
        "branches.Branch",
        on_delete=models.CASCADE,
        related_name="attendance_records",
        verbose_name=_("branch"),
    )
    service_type = models.ForeignKey(
        ServiceType,
        on_delete=models.PROTECT,
        related_name="attendance_records",
        verbose_name=_("service type"),
    )
    date = models.DateField(_("date"))
    attendance_type = models.CharField(
        _("attendance type"),
        max_length=20,
        choices=AttendanceType.choices,
        default=AttendanceType.PHYSICAL,
    )

    # Aggregate counts (for quick reporting)
    total_count = models.PositiveIntegerField(_("total count"), default=0)
    male_count = models.PositiveIntegerField(_("male count"), default=0)
    female_count = models.PositiveIntegerField(_("female count"), default=0)
    children_count = models.PositiveIntegerField(_("children count"), default=0)
    first_timers = models.PositiveIntegerField(_("first timers"), default=0)

    notes = models.TextField(_("notes"), blank=True)
    recorded_by = models.ForeignKey(
        "accounts.User",
        null=True,
        on_delete=models.SET_NULL,
        related_name="recorded_attendance",
        verbose_name=_("recorded by"),
    )

    class Meta:
        verbose_name = _("attendance record")
        verbose_name_plural = _("attendance records")
        ordering = ["-date"]
        unique_together = [("branch", "service_type", "date", "attendance_type")]

    def __str__(self):
        return f"{self.branch} | {self.service_type} | {self.date} ({self.total_count})"


class AttendanceEntry(TimeStampedModel):
    attendance_record = models.ForeignKey(
        AttendanceRecord,
        on_delete=models.CASCADE,
        related_name="entries",
        verbose_name=_("attendance record"),
    )
    member = models.ForeignKey(
        "members.Member",
        on_delete=models.CASCADE,
        related_name="attendance_entries",
        verbose_name=_("member"),
    )
    is_first_visit = models.BooleanField(_("first visit"), default=False)
    notes = models.CharField(_("notes"), max_length=255, blank=True)

    class Meta:
        verbose_name = _("attendance entry")
        verbose_name_plural = _("attendance entries")
        unique_together = [("attendance_record", "member")]

    def __str__(self):
        return f"{self.member} @ {self.attendance_record}"


HOW_HEARD_CHOICES = [
    ("friend", "Friend / Family"),
    ("social_media", "Social Media"),
    ("flyer", "Flyer / Poster"),
    ("walk_in", "Walked In"),
    ("radio_tv", "Radio / TV"),
    ("website", "Website"),
    ("other", "Other"),
]


class FirstTimeVisitor(TimeStampedModel):
    attendance_record = models.ForeignKey(
        AttendanceRecord,
        on_delete=models.CASCADE,
        related_name="first_time_visitors",
        verbose_name=_("attendance record"),
    )
    name = models.CharField(_("name"), max_length=200)
    phone = models.CharField(_("phone"), max_length=30, blank=True)
    email = models.EmailField(_("email"), blank=True)
    how_heard = models.CharField(
        _("how they heard"), max_length=30, blank=True, choices=HOW_HEARD_CHOICES
    )
    notes = models.TextField(_("notes"), blank=True)
    followed_up = models.BooleanField(_("followed up"), default=False)
    converted_to_member = models.ForeignKey(
        "members.Member",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="converted_from_visitor",
        verbose_name=_("converted to member"),
    )

    class Meta:
        verbose_name = _("first-time visitor")
        verbose_name_plural = _("first-time visitors")
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.name} @ {self.attendance_record.date}"


class ChildCheckIn(TimeStampedModel):
    attendance_record = models.ForeignKey(
        AttendanceRecord,
        on_delete=models.CASCADE,
        related_name="child_checkins",
        verbose_name=_("attendance record"),
    )
    child_name = models.CharField(_("child name"), max_length=200)
    age = models.PositiveSmallIntegerField(_("age"), null=True, blank=True)
    parent_name = models.CharField(_("parent name"), max_length=200, blank=True)
    parent_phone = models.CharField(_("parent phone"), max_length=30, blank=True)
    allergy_notes = models.TextField(_("allergy notes"), blank=True)
    pickup_code = models.CharField(_("pickup code"), max_length=8, default=_pickup_code)
    member = models.ForeignKey(
        "members.Member",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="child_checkins",
        verbose_name=_("member"),
    )
    checked_out = models.BooleanField(_("checked out"), default=False)

    class Meta:
        verbose_name = _("child check-in")
        verbose_name_plural = _("child check-ins")
        ordering = ["child_name"]

    def __str__(self):
        return f"{self.child_name} @ {self.attendance_record.date}"
