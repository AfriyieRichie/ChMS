from django.db import models
from django.utils.translation import gettext_lazy as _

from apps.core.models import TimeStampedModel


class Event(TimeStampedModel):
    class EventType(models.TextChoices):
        SERVICE = "service", _("Church Service")
        SPECIAL = "special", _("Special Event")
        OUTREACH = "outreach", _("Outreach")
        TRAINING = "training", _("Training")
        MEETING = "meeting", _("Meeting")

    branch = models.ForeignKey(
        "branches.Branch",
        on_delete=models.CASCADE,
        related_name="events",
        verbose_name=_("branch"),
    )
    name = models.CharField(_("name"), max_length=200)
    description = models.TextField(_("description"), blank=True)
    event_type = models.CharField(
        _("event type"), max_length=20, choices=EventType.choices, default=EventType.SERVICE
    )
    start_datetime = models.DateTimeField(_("start"))
    end_datetime = models.DateTimeField(_("end"), null=True, blank=True)
    venue = models.CharField(_("venue"), max_length=200, blank=True)
    capacity = models.PositiveIntegerField(_("capacity"), null=True, blank=True)
    is_published = models.BooleanField(_("published"), default=True)
    created_by = models.ForeignKey(
        "accounts.User",
        null=True,
        on_delete=models.SET_NULL,
        related_name="created_events",
        verbose_name=_("created by"),
    )

    class Meta:
        verbose_name = _("event")
        verbose_name_plural = _("events")
        ordering = ["-start_datetime"]
        indexes = [
            models.Index(fields=["branch", "start_datetime"], name="evt_br_start_idx"),
        ]

    def __str__(self):
        return f"{self.name} ({self.start_datetime.date()})"

    @property
    def registration_count(self):
        return self.registrations.exclude(status="cancelled").count()


class EventRegistration(TimeStampedModel):
    class Status(models.TextChoices):
        REGISTERED = "registered", _("Registered")
        ATTENDED = "attended", _("Attended")
        CANCELLED = "cancelled", _("Cancelled")

    event = models.ForeignKey(
        Event,
        on_delete=models.CASCADE,
        related_name="registrations",
        verbose_name=_("event"),
    )
    member = models.ForeignKey(
        "members.Member",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="event_registrations",
        verbose_name=_("member"),
    )
    status = models.CharField(
        _("status"), max_length=20, choices=Status.choices, default=Status.REGISTERED
    )
    notes = models.TextField(_("notes"), blank=True)

    class Meta:
        verbose_name = _("event registration")
        verbose_name_plural = _("event registrations")
        ordering = ["-created_at"]
        unique_together = [("event", "member")]

    def __str__(self):
        who = str(self.member) if self.member else "Walk-in"
        return f"{who} → {self.event.name}"
