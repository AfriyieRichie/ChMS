from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _

from apps.core.models import TimeStampedModel

CHANNEL_CHOICES = [
    ("sms",      _("SMS")),
    ("email",    _("Email")),
    ("whatsapp", _("WhatsApp")),
    ("push",     _("Push Notification")),
]


class Announcement(TimeStampedModel):
    class Audience(models.TextChoices):
        ALL = "all", _("Everyone")
        MEMBERS = "members", _("Members Only")
        LEADERS = "leaders", _("Group Leaders Only")

    branch = models.ForeignKey(
        "branches.Branch",
        on_delete=models.CASCADE,
        related_name="announcements",
        verbose_name=_("branch"),
    )
    title = models.CharField(_("title"), max_length=200)
    body = models.TextField(_("body"))
    audience = models.CharField(
        _("audience"), max_length=20, choices=Audience.choices, default=Audience.ALL
    )
    is_published = models.BooleanField(_("published"), default=True)
    published_at = models.DateTimeField(_("published at"), null=True, blank=True)
    expires_at = models.DateTimeField(_("expires at"), null=True, blank=True)
    created_by = models.ForeignKey(
        "accounts.User",
        null=True,
        on_delete=models.SET_NULL,
        related_name="announcements",
        verbose_name=_("created by"),
    )

    class Meta:
        verbose_name = _("announcement")
        verbose_name_plural = _("announcements")
        ordering = ["-published_at", "-created_at"]

    def __str__(self):
        return self.title

    def save(self, *args, **kwargs):
        if self.is_published and not self.published_at:
            self.published_at = timezone.now()
        super().save(*args, **kwargs)

    @property
    def is_active(self):
        if not self.is_published:
            return False
        if self.expires_at and timezone.now() > self.expires_at:
            return False
        return True


class MessageTemplate(TimeStampedModel):
    class Category(models.TextChoices):
        WELCOME       = "welcome",        _("Welcome")
        BIRTHDAY      = "birthday",       _("Birthday Wish")
        FOLLOW_UP     = "follow_up",      _("First Visit Follow-up")
        EVENT_REMINDER= "event_reminder", _("Event Reminder")
        PASTORAL      = "pastoral",       _("Pastoral Care")
        CUSTOM        = "custom",         _("Custom")

    branch = models.ForeignKey(
        "branches.Branch", on_delete=models.CASCADE,
        related_name="message_templates", verbose_name=_("branch"),
    )
    name = models.CharField(_("name"), max_length=100)
    category = models.CharField(
        _("category"), max_length=20, choices=Category.choices, default=Category.CUSTOM,
    )
    channel = models.CharField(_("channel"), max_length=20, choices=CHANNEL_CHOICES)
    subject = models.CharField(_("subject"), max_length=200, blank=True)
    body = models.TextField(_("body"))
    is_active = models.BooleanField(_("active"), default=True)
    created_by = models.ForeignKey(
        "accounts.User", null=True, on_delete=models.SET_NULL,
        related_name="message_templates", verbose_name=_("created by"),
    )

    class Meta:
        verbose_name = _("message template")
        verbose_name_plural = _("message templates")
        ordering = ["category", "name"]

    def __str__(self):
        return f"{self.name} ({self.get_channel_display()})"


class Audience(TimeStampedModel):
    branch = models.ForeignKey(
        "branches.Branch", on_delete=models.CASCADE,
        related_name="audiences", verbose_name=_("branch"),
    )
    name = models.CharField(_("name"), max_length=100)
    description = models.TextField(_("description"), blank=True)
    filters = models.JSONField(_("filters"), default=dict)
    created_by = models.ForeignKey(
        "accounts.User", null=True, on_delete=models.SET_NULL,
        related_name="audiences", verbose_name=_("created by"),
    )

    class Meta:
        verbose_name = _("audience")
        verbose_name_plural = _("audiences")
        ordering = ["name"]

    def __str__(self):
        return self.name


class Campaign(TimeStampedModel):
    class Status(models.TextChoices):
        DRAFT     = "draft",     _("Draft")
        SCHEDULED = "scheduled", _("Scheduled")
        SENT      = "sent",      _("Sent")
        FAILED    = "failed",    _("Failed")

    branch = models.ForeignKey(
        "branches.Branch", on_delete=models.CASCADE,
        related_name="campaigns", verbose_name=_("branch"),
    )
    name = models.CharField(_("name"), max_length=200)
    template = models.ForeignKey(
        MessageTemplate, null=True, blank=True, on_delete=models.SET_NULL,
        related_name="campaigns", verbose_name=_("template"),
    )
    audience = models.ForeignKey(
        Audience, null=True, blank=True, on_delete=models.SET_NULL,
        related_name="campaigns", verbose_name=_("audience"),
    )
    channel = models.CharField(_("channel"), max_length=20, choices=CHANNEL_CHOICES)
    status = models.CharField(
        _("status"), max_length=20, choices=Status.choices, default=Status.DRAFT,
    )
    scheduled_at = models.DateTimeField(_("scheduled at"), null=True, blank=True)
    sent_at = models.DateTimeField(_("sent at"), null=True, blank=True)
    recipient_count = models.PositiveIntegerField(_("recipient count"), default=0)
    created_by = models.ForeignKey(
        "accounts.User", null=True, on_delete=models.SET_NULL,
        related_name="campaigns", verbose_name=_("created by"),
    )

    class Meta:
        verbose_name = _("campaign")
        verbose_name_plural = _("campaigns")
        ordering = ["-created_at"]

    def __str__(self):
        return self.name


class MessageLog(TimeStampedModel):
    class Status(models.TextChoices):
        QUEUED    = "queued",    _("Queued")
        SENT      = "sent",      _("Sent")
        DELIVERED = "delivered", _("Delivered")
        FAILED    = "failed",    _("Failed")
        OPTED_OUT = "opted_out", _("Opted Out")

    campaign = models.ForeignKey(
        Campaign, on_delete=models.CASCADE,
        related_name="logs", verbose_name=_("campaign"),
    )
    member = models.ForeignKey(
        "members.Member", null=True, blank=True, on_delete=models.SET_NULL,
        related_name="message_logs", verbose_name=_("member"),
    )
    member_name = models.CharField(_("member name"), max_length=200, blank=True)
    channel = models.CharField(_("channel"), max_length=20, choices=CHANNEL_CHOICES)
    recipient_address = models.CharField(_("recipient address"), max_length=200, blank=True)
    status = models.CharField(
        _("status"), max_length=20, choices=Status.choices, default=Status.QUEUED,
    )
    sent_at = models.DateTimeField(_("sent at"), null=True, blank=True)
    error_message = models.CharField(_("error message"), max_length=500, blank=True)

    class Meta:
        verbose_name = _("message log")
        verbose_name_plural = _("message logs")
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.member_name} via {self.channel} ({self.status})"


class CommunicationOptOut(TimeStampedModel):
    OPT_OUT_CHOICES = CHANNEL_CHOICES + [("all", _("All channels"))]

    member = models.ForeignKey(
        "members.Member", on_delete=models.CASCADE,
        related_name="opt_outs", verbose_name=_("member"),
    )
    channel = models.CharField(_("channel"), max_length=20, choices=OPT_OUT_CHOICES)
    reason = models.CharField(_("reason"), max_length=200, blank=True)

    class Meta:
        verbose_name = _("communication opt-out")
        verbose_name_plural = _("communication opt-outs")
        unique_together = [("member", "channel")]
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.member} opted out of {self.channel}"
