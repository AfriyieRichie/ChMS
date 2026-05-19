from django.db import models
from django.utils.translation import gettext_lazy as _


class AuditLog(models.Model):
    class Action(models.TextChoices):
        CREATE = "create", _("Create")
        UPDATE = "update", _("Update")
        DELETE = "delete", _("Delete")

    actor = models.ForeignKey(
        "accounts.User",
        null=True,
        on_delete=models.SET_NULL,
        related_name="audit_logs",
        verbose_name=_("actor"),
    )
    action = models.CharField(_("action"), max_length=10, choices=Action.choices)
    object_type = models.CharField(_("object type"), max_length=100)
    object_id = models.PositiveBigIntegerField(_("object id"))
    before_data = models.JSONField(_("before"), null=True, blank=True)
    after_data = models.JSONField(_("after"), null=True, blank=True)
    timestamp = models.DateTimeField(_("timestamp"), auto_now_add=True)
    ip_address = models.GenericIPAddressField(_("IP address"), null=True, blank=True)

    class Meta:
        verbose_name = _("audit log")
        verbose_name_plural = _("audit logs")
        ordering = ["-timestamp"]
        indexes = [
            models.Index(fields=["object_type", "object_id"]),
            models.Index(fields=["actor"]),
        ]

    def __str__(self):
        return f"{self.actor} {self.action} {self.object_type}:{self.object_id}"


def log_action(actor, action, obj, before=None, after=None, request=None):
    ip = None
    if request:
        x_forwarded = request.META.get("HTTP_X_FORWARDED_FOR")
        ip = x_forwarded.split(",")[0].strip() if x_forwarded else request.META.get("REMOTE_ADDR")
    AuditLog.objects.create(
        actor=actor,
        action=action,
        object_type=obj.__class__.__name__,
        object_id=obj.pk,
        before_data=before,
        after_data=after,
        ip_address=ip,
    )
