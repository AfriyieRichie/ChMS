from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _

from apps.core.models import TimeStampedModel


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
