from django.db import models
from django.utils.translation import gettext_lazy as _

from apps.core.models import TimeStampedModel


class Branch(TimeStampedModel):
    name = models.CharField(_("name"), max_length=255)
    slug = models.SlugField(_("slug"), max_length=255, unique=True)
    code = models.CharField(_("code"), max_length=20, unique=True, help_text=_("Short campus code, e.g. ACC01"))
    address = models.TextField(_("address"), blank=True)
    city = models.CharField(_("city"), max_length=100, blank=True)
    region = models.CharField(_("region"), max_length=100, blank=True)
    country = models.CharField(_("country"), max_length=100, default="Ghana")
    phone = models.CharField(_("phone"), max_length=30, blank=True)
    email = models.EmailField(_("email"), blank=True)
    timezone = models.CharField(_("timezone"), max_length=50, default="Africa/Accra")
    currency = models.CharField(_("currency"), max_length=3, default="GHS")
    is_active = models.BooleanField(_("active"), default=True)
    parent_branch = models.ForeignKey(
        "self",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="sub_branches",
        verbose_name=_("parent branch"),
    )

    class Meta:
        verbose_name = _("branch")
        verbose_name_plural = _("branches")
        ordering = ["name"]

    def __str__(self):
        return f"{self.name} ({self.code})"
