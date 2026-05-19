from django.db import models
from django.utils.translation import gettext_lazy as _

from apps.core.models import TimeStampedModel


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
