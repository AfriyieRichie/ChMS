from django.db import models
from django.utils import timezone


class TimeStampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    deleted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        abstract = True

    def soft_delete(self):
        self.deleted_at = timezone.now()
        self.save(update_fields=["deleted_at"])


class ActiveManager(models.Manager):
    def get_queryset(self):
        return super().get_queryset().filter(deleted_at__isnull=True)


class BranchScopedModel(TimeStampedModel):
    """
    Abstract base for every branch-scoped model.
    Concrete subclasses get a `branch` FK added once the Branch model exists.
    Branch filtering is enforced at the view layer via BranchScopedViewSet.
    """

    objects = ActiveManager()
    all_objects = models.Manager()

    class Meta:
        abstract = True
