from decimal import Decimal

from django.db import models
from django.utils.translation import gettext_lazy as _

from apps.core.models import TimeStampedModel


class Fund(TimeStampedModel):
    branch = models.ForeignKey(
        "branches.Branch",
        on_delete=models.CASCADE,
        related_name="funds",
        verbose_name=_("branch"),
    )
    name = models.CharField(_("name"), max_length=100)
    code = models.CharField(_("code"), max_length=20, blank=True)
    description = models.TextField(_("description"), blank=True)
    is_designated = models.BooleanField(
        _("designated fund"),
        default=False,
        help_text=_("Designated funds are earmarked for a specific purpose."),
    )
    is_active = models.BooleanField(_("active"), default=True)

    class Meta:
        verbose_name = _("fund")
        verbose_name_plural = _("funds")
        ordering = ["name"]
        unique_together = [("branch", "name")]

    def __str__(self):
        return f"{self.name} ({self.branch.code})"


class GivingCategory(TimeStampedModel):
    branch = models.ForeignKey(
        "branches.Branch",
        on_delete=models.CASCADE,
        related_name="giving_categories",
        verbose_name=_("branch"),
    )
    name = models.CharField(_("name"), max_length=100)
    description = models.TextField(_("description"), blank=True)
    is_active = models.BooleanField(_("active"), default=True)

    class Meta:
        verbose_name = _("giving category")
        verbose_name_plural = _("giving categories")
        ordering = ["name"]
        unique_together = [("branch", "name")]

    def __str__(self):
        return self.name


class FinancialPeriod(TimeStampedModel):
    branch = models.ForeignKey(
        "branches.Branch",
        on_delete=models.CASCADE,
        related_name="financial_periods",
        verbose_name=_("branch"),
    )
    year = models.PositiveSmallIntegerField(_("year"))
    month = models.PositiveSmallIntegerField(_("month"))
    locked_at = models.DateTimeField(_("locked at"), null=True, blank=True)
    locked_by = models.ForeignKey(
        "accounts.User",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="locked_periods",
        verbose_name=_("locked by"),
    )

    class Meta:
        verbose_name = _("financial period")
        verbose_name_plural = _("financial periods")
        ordering = ["-year", "-month"]
        unique_together = [("branch", "year", "month")]

    def __str__(self):
        return f"{self.year}-{self.month:02d} ({self.branch.code})"

    @property
    def is_locked(self):
        return self.locked_at is not None


class Pledge(TimeStampedModel):
    class Frequency(models.TextChoices):
        ONE_TIME = "one_time", _("One Time")
        WEEKLY = "weekly", _("Weekly")
        BIWEEKLY = "biweekly", _("Bi-weekly")
        MONTHLY = "monthly", _("Monthly")
        QUARTERLY = "quarterly", _("Quarterly")
        ANNUAL = "annual", _("Annual")

    class Status(models.TextChoices):
        ACTIVE = "active", _("Active")
        COMPLETED = "completed", _("Completed")
        CANCELLED = "cancelled", _("Cancelled")
        LAPSED = "lapsed", _("Lapsed")

    member = models.ForeignKey(
        "members.Member",
        on_delete=models.CASCADE,
        related_name="pledges",
        verbose_name=_("member"),
    )
    branch = models.ForeignKey(
        "branches.Branch",
        on_delete=models.CASCADE,
        related_name="pledges",
        verbose_name=_("branch"),
    )
    fund = models.ForeignKey(
        Fund,
        on_delete=models.PROTECT,
        related_name="pledges",
        verbose_name=_("fund"),
    )
    category = models.ForeignKey(
        GivingCategory,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="pledges",
        verbose_name=_("giving category"),
    )
    amount = models.DecimalField(_("pledged amount"), max_digits=12, decimal_places=2)
    currency = models.CharField(_("currency"), max_length=3, default="GHS")
    start_date = models.DateField(_("start date"))
    end_date = models.DateField(_("end date"), null=True, blank=True)
    frequency = models.CharField(
        _("frequency"), max_length=20, choices=Frequency.choices, default=Frequency.MONTHLY
    )
    status = models.CharField(
        _("status"), max_length=20, choices=Status.choices, default=Status.ACTIVE
    )
    notes = models.TextField(_("notes"), blank=True)

    class Meta:
        verbose_name = _("pledge")
        verbose_name_plural = _("pledges")
        ordering = ["-start_date"]

    def __str__(self):
        return f"{self.member} — {self.currency} {self.amount} ({self.fund})"

    @property
    def total_fulfilled(self):
        return self.contributions.filter(
            deleted_at__isnull=True, is_reversal=False
        ).aggregate(total=models.Sum("amount"))["total"] or Decimal("0.00")

    @property
    def balance(self):
        return self.amount - self.total_fulfilled


class ContributionBatch(TimeStampedModel):
    """Groups contributions from a single service collection for batch entry."""

    branch = models.ForeignKey(
        "branches.Branch", on_delete=models.CASCADE,
        related_name="contribution_batches", verbose_name=_("branch"),
    )
    name = models.CharField(_("name"), max_length=200)
    service_date = models.DateField(_("service date"))
    notes = models.TextField(_("notes"), blank=True)
    is_posted = models.BooleanField(_("posted"), default=False)
    posted_at = models.DateTimeField(_("posted at"), null=True, blank=True)
    posted_by = models.ForeignKey(
        "accounts.User", null=True, blank=True, on_delete=models.SET_NULL,
        related_name="+", verbose_name=_("posted by"),
    )
    created_by = models.ForeignKey(
        "accounts.User", null=True, blank=True, on_delete=models.SET_NULL,
        related_name="+", verbose_name=_("created by"),
    )
    deleted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = _("contribution batch")
        verbose_name_plural = _("contribution batches")
        ordering = ["-service_date", "-created_at"]

    def __str__(self):
        return f"{self.name} ({self.service_date})"

    @property
    def total_amount(self):
        return (
            self.contributions.filter(deleted_at__isnull=True, is_reversal=False)
            .aggregate(total=models.Sum("amount"))["total"]
            or Decimal("0.00")
        )

    @property
    def contribution_count(self):
        return self.contributions.filter(deleted_at__isnull=True, is_reversal=False).count()


class BankDeposit(TimeStampedModel):
    """Bank deposit record for reconciliation against contribution batches."""

    branch = models.ForeignKey(
        "branches.Branch", on_delete=models.CASCADE,
        related_name="bank_deposits", verbose_name=_("branch"),
    )
    date = models.DateField(_("deposit date"))
    amount = models.DecimalField(_("amount"), max_digits=12, decimal_places=2)
    reference = models.CharField(_("reference"), max_length=200)
    notes = models.TextField(_("notes"), blank=True)
    is_reconciled = models.BooleanField(_("reconciled"), default=False)
    created_by = models.ForeignKey(
        "accounts.User", null=True, blank=True, on_delete=models.SET_NULL,
        related_name="+", verbose_name=_("created by"),
    )
    deleted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = _("bank deposit")
        verbose_name_plural = _("bank deposits")
        ordering = ["-date"]

    def __str__(self):
        return f"{self.date} — {self.amount} ({self.reference})"


class Contribution(TimeStampedModel):
    class PaymentMethod(models.TextChoices):
        CASH = "cash", _("Cash")
        CHEQUE = "cheque", _("Cheque")
        BANK_TRANSFER = "bank_transfer", _("Bank Transfer")
        MOBILE_MONEY = "mobile_money", _("Mobile Money")
        CARD = "card", _("Card")

    # Nullable — allows anonymous cash contributions
    member = models.ForeignKey(
        "members.Member",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="contributions",
        verbose_name=_("member"),
    )
    branch = models.ForeignKey(
        "branches.Branch",
        on_delete=models.CASCADE,
        related_name="contributions",
        verbose_name=_("branch"),
    )
    fund = models.ForeignKey(
        Fund,
        on_delete=models.PROTECT,
        related_name="contributions",
        verbose_name=_("fund"),
    )
    category = models.ForeignKey(
        GivingCategory,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="contributions",
        verbose_name=_("giving category"),
    )
    financial_period = models.ForeignKey(
        FinancialPeriod,
        null=True,
        blank=True,
        on_delete=models.PROTECT,
        related_name="contributions",
        verbose_name=_("financial period"),
    )
    pledge = models.ForeignKey(
        Pledge,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="contributions",
        verbose_name=_("pledge"),
    )
    batch = models.ForeignKey(
        ContributionBatch,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="contributions",
        verbose_name=_("batch"),
    )
    # Negative amount for reversal entries
    amount = models.DecimalField(_("amount"), max_digits=12, decimal_places=2)
    currency = models.CharField(_("currency"), max_length=3, default="GHS")
    given_at = models.DateField(_("given at"))
    payment_method = models.CharField(
        _("payment method"),
        max_length=20,
        choices=PaymentMethod.choices,
        default=PaymentMethod.CASH,
    )
    reference = models.CharField(_("reference"), max_length=100, blank=True)
    receipt_number = models.CharField(_("receipt number"), max_length=50, blank=True, unique=True)
    notes = models.TextField(_("notes"), blank=True)
    recorded_by = models.ForeignKey(
        "accounts.User",
        null=True,
        on_delete=models.SET_NULL,
        related_name="recorded_contributions",
        verbose_name=_("recorded by"),
    )
    is_reversal = models.BooleanField(_("is reversal"), default=False)
    reversal_of = models.OneToOneField(
        "self",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="reversal",
        verbose_name=_("reversal of"),
    )

    class Meta:
        verbose_name = _("contribution")
        verbose_name_plural = _("contributions")
        ordering = ["-given_at", "-created_at"]
        indexes = [
            models.Index(fields=["branch", "given_at"], name="fin_contrib_br_date_idx"),
            models.Index(fields=["member"], name="fin_contrib_member_idx"),
            models.Index(fields=["financial_period"], name="fin_contrib_period_idx"),
        ]

    def __str__(self):
        prefix = "REVERSAL " if self.is_reversal else ""
        who = str(self.member) if self.member else "Anonymous"
        return f"{prefix}{who} — {self.currency} {self.amount} on {self.given_at}"

    def save(self, *args, **kwargs):
        if not self.receipt_number:
            self.receipt_number = self._generate_receipt_number()
        super().save(*args, **kwargs)

    def _generate_receipt_number(self):
        from django.db import transaction
        with transaction.atomic():
            last = (
                Contribution.objects.select_for_update()
                .filter(branch=self.branch, given_at__year=self.given_at.year)
                .exclude(receipt_number="")
                .order_by("-receipt_number")
                .values_list("receipt_number", flat=True)
                .first()
            )
            if last:
                try:
                    seq = int(last.split("-")[-1]) + 1
                except (ValueError, IndexError):
                    seq = 1
            else:
                seq = 1
            branch_code = self.branch.code if self.branch_id else "UNK"
            return f"{branch_code}-{self.given_at.year}-{seq:05d}"


class Receipt(TimeStampedModel):
    contribution = models.OneToOneField(
        Contribution,
        on_delete=models.CASCADE,
        related_name="receipt",
        verbose_name=_("contribution"),
    )
    number = models.CharField(_("receipt number"), max_length=50)
    generated_at = models.DateTimeField(_("generated at"), auto_now_add=True)
    # PDF generation deferred — stub field for future integration
    pdf_url = models.URLField(_("PDF URL"), blank=True)

    class Meta:
        verbose_name = _("receipt")
        verbose_name_plural = _("receipts")
        ordering = ["-generated_at"]

    def __str__(self):
        return self.number
