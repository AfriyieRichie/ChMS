from datetime import date, timedelta

from django.db.models import Sum, Count, Q, Max
from django.db.models.functions import TruncMonth
from django.utils import timezone

from rest_framework import status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied, ValidationError

from apps.accounts.permissions import make_capability_permission
from apps.core.audit import log_action, AuditLog
from apps.core.viewsets import BranchScopedViewSet

from .models import Fund, GivingCategory, FinancialPeriod, Pledge, Contribution, Receipt, ContributionBatch, BankDeposit
from .serializers import (
    FundSerializer,
    GivingCategorySerializer,
    FinancialPeriodSerializer,
    PledgeSerializer,
    ContributionSerializer,
    ContributionListSerializer,
    ReversalSerializer,
    ContributionBatchSerializer,
    BankDepositSerializer,
)

CanViewFinance = make_capability_permission("finance.view_giving")
CanRecordFinance = make_capability_permission("finance.record_giving")
CanManageFunds = make_capability_permission("finance.manage_funds")
CanLockPeriod = make_capability_permission("finance.lock_period")
CanViewReports = make_capability_permission("finance.view_reports")


class FundViewSet(BranchScopedViewSet):
    queryset = Fund.objects.filter(deleted_at__isnull=True)
    serializer_class = FundSerializer

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [CanViewFinance()]
        return [CanManageFunds()]

    def get_queryset(self):
        qs = super().get_queryset()
        if self.request.query_params.get("active_only") == "true":
            qs = qs.filter(is_active=True)
        return qs

    def perform_destroy(self, instance):
        instance.deleted_at = timezone.now()
        instance.save(update_fields=["deleted_at"])
        log_action(self.request.user, AuditLog.Action.DELETE, instance, request=self.request)


class GivingCategoryViewSet(BranchScopedViewSet):
    queryset = GivingCategory.objects.filter(deleted_at__isnull=True)
    serializer_class = GivingCategorySerializer

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [CanViewFinance()]
        return [CanManageFunds()]

    def perform_destroy(self, instance):
        instance.deleted_at = timezone.now()
        instance.save(update_fields=["deleted_at"])


class FinancialPeriodViewSet(BranchScopedViewSet):
    queryset = FinancialPeriod.objects.filter(deleted_at__isnull=True)
    serializer_class = FinancialPeriodSerializer

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [CanViewFinance()]
        if self.action in ("lock", "unlock"):
            return [CanLockPeriod()]
        return [CanManageFunds()]

    @action(detail=True, methods=["post"])
    def lock(self, request, pk=None):
        period = self.get_object()
        if period.is_locked:
            raise ValidationError("This period is already locked.")
        period.locked_at = timezone.now()
        period.locked_by = request.user
        period.save(update_fields=["locked_at", "locked_by"])
        log_action(request.user, AuditLog.Action.UPDATE, period, request=request)
        return Response(FinancialPeriodSerializer(period).data)

    @action(detail=True, methods=["post"])
    def unlock(self, request, pk=None):
        period = self.get_object()
        if not period.is_locked:
            raise ValidationError("This period is not locked.")
        period.locked_at = None
        period.locked_by = None
        period.save(update_fields=["locked_at", "locked_by"])
        log_action(request.user, AuditLog.Action.UPDATE, period, request=request)
        return Response(FinancialPeriodSerializer(period).data)


class PledgeViewSet(BranchScopedViewSet):
    queryset = Pledge.objects.filter(deleted_at__isnull=True).select_related("member", "fund", "category", "branch")
    serializer_class = PledgeSerializer

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [CanViewFinance()]
        return [CanRecordFinance()]

    def get_queryset(self):
        qs = super().get_queryset()
        status_filter = self.request.query_params.get("status")
        member = self.request.query_params.get("member")
        fund = self.request.query_params.get("fund")
        if status_filter:
            qs = qs.filter(status=status_filter)
        if member:
            qs = qs.filter(member_id=member)
        if fund:
            qs = qs.filter(fund_id=fund)
        return qs

    def perform_destroy(self, instance):
        instance.deleted_at = timezone.now()
        instance.save(update_fields=["deleted_at"])
        log_action(self.request.user, AuditLog.Action.DELETE, instance, request=self.request)


class ContributionViewSet(BranchScopedViewSet):
    queryset = Contribution.objects.filter(deleted_at__isnull=True).select_related(
        "member", "fund", "category", "recorded_by", "financial_period", "branch"
    )
    serializer_class = ContributionSerializer

    def get_serializer_class(self):
        if self.action == "list":
            return ContributionListSerializer
        return ContributionSerializer

    def get_permissions(self):
        if self.action in ("list", "retrieve", "summary", "monthly"):
            return [CanViewFinance()]
        if self.action == "reverse":
            return [CanRecordFinance()]
        return [CanRecordFinance()]

    # Contributions are append-only — no updates or deletes
    def update(self, request, *args, **kwargs):
        raise PermissionDenied("Contributions cannot be edited. Use the reverse action to correct an entry.")

    def partial_update(self, request, *args, **kwargs):
        raise PermissionDenied("Contributions cannot be edited. Use the reverse action to correct an entry.")

    def destroy(self, request, *args, **kwargs):
        raise PermissionDenied("Contributions cannot be deleted. Use the reverse action to correct an entry.")

    def get_queryset(self):
        qs = super().get_queryset()
        params = self.request.query_params
        if params.get("fund"):
            qs = qs.filter(fund_id=params["fund"])
        if params.get("category"):
            qs = qs.filter(category_id=params["category"])
        if params.get("member"):
            qs = qs.filter(member_id=params["member"])
        if params.get("payment_method"):
            qs = qs.filter(payment_method=params["payment_method"])
        if params.get("date_from"):
            qs = qs.filter(given_at__gte=params["date_from"])
        if params.get("date_to"):
            qs = qs.filter(given_at__lte=params["date_to"])
        if params.get("period"):
            qs = qs.filter(financial_period_id=params["period"])
        if params.get("exclude_reversals") == "true":
            qs = qs.filter(is_reversal=False)
        return qs

    def perform_create(self, serializer):
        branch = getattr(self.request, "branch", None)
        contribution = serializer.save(
            recorded_by=self.request.user,
            branch=branch or serializer.validated_data.get("branch"),
        )
        # Auto-create the Receipt record
        Receipt.objects.create(contribution=contribution, number=contribution.receipt_number)
        log_action(
            self.request.user, AuditLog.Action.CREATE, contribution,
            after={"receipt_number": contribution.receipt_number, "amount": str(contribution.amount)},
            request=self.request,
        )

    @action(detail=True, methods=["post"])
    def reverse(self, request, pk=None):
        original = self.get_object()
        if original.is_reversal:
            raise ValidationError("Cannot reverse a reversal entry.")
        if hasattr(original, "reversal"):
            raise ValidationError("This contribution has already been reversed.")

        serializer = ReversalSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        reason = serializer.validated_data.get("reason", "")

        reversal = Contribution.objects.create(
            member=original.member,
            branch=original.branch,
            fund=original.fund,
            category=original.category,
            financial_period=original.financial_period,
            amount=-original.amount,
            currency=original.currency,
            given_at=original.given_at,
            payment_method=original.payment_method,
            reference=original.reference,
            notes=f"Reversal of {original.receipt_number}. {reason}".strip(),
            recorded_by=request.user,
            is_reversal=True,
            reversal_of=original,
        )
        Receipt.objects.create(contribution=reversal, number=reversal.receipt_number)
        log_action(
            request.user, AuditLog.Action.CREATE, reversal,
            after={"reversal_of": original.receipt_number, "amount": str(reversal.amount)},
            request=request,
        )
        return Response(ContributionSerializer(reversal, context={"request": request}).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=["get"])
    def monthly(self, request):
        """Total giving per month for the last N months (default 6)."""
        months = max(1, min(24, int(request.query_params.get("months", 6))))
        today = date.today()
        start_month = today.month - months + 1
        start_year = today.year
        while start_month <= 0:
            start_month += 12
            start_year -= 1
        start = date(start_year, start_month, 1)

        qs = self.get_queryset().filter(is_reversal=False, given_at__gte=start)
        by_month = (
            qs.annotate(month=TruncMonth("given_at"))
            .values("month")
            .annotate(total=Sum("amount"), count=Count("id"))
            .order_by("month")
        )
        return Response(list(by_month))

    @action(detail=False, methods=["get"])
    def summary(self, request):
        """Total contributions grouped by fund for the requested branch/period."""
        qs = self.get_queryset().filter(is_reversal=False)
        by_fund = (
            qs.values("fund__id", "fund__name", "currency")
            .annotate(total=Sum("amount"), count=Count("id"))
            .order_by("fund__name")
        )
        grand_total = qs.aggregate(total=Sum("amount"))["total"] or 0
        return Response({
            "grand_total": grand_total,
            "by_fund": list(by_fund),
        })

    @action(detail=False, methods=["get"])
    def by_member(self, request):
        """Giving totals per member for a given year — annual statement data."""
        year_param = request.query_params.get("year", date.today().year)
        try:
            year = int(year_param)
        except (ValueError, TypeError):
            raise ValidationError({"year": "Must be a valid 4-digit year."})
        qs = (
            self.get_queryset()
            .filter(is_reversal=False, given_at__year=year, member__isnull=False)
            .values("member", "member__full_name", "currency")
            .annotate(total=Sum("amount"), count=Count("id"))
            .order_by("-total")
        )
        return Response(list(qs))

    @action(detail=False, methods=["get"])
    def top_givers(self, request):
        """Top N givers by total contribution in a date range. Requires view_reports permission."""
        if not CanViewReports().has_permission(request, self):
            raise PermissionDenied("You do not have permission to view top givers.")
        limit = min(int(request.query_params.get("limit", 20)), 100)
        qs = self.get_queryset().filter(is_reversal=False, member__isnull=False)
        date_from = request.query_params.get("date_from")
        date_to = request.query_params.get("date_to")
        if date_from:
            qs = qs.filter(given_at__gte=date_from)
        if date_to:
            qs = qs.filter(given_at__lte=date_to)
        data = (
            qs.values("member", "member__full_name", "currency")
            .annotate(total=Sum("amount"), count=Count("id"))
            .order_by("-total")[:limit]
        )
        return Response(list(data))

    @action(detail=False, methods=["get"])
    def lapsed(self, request):
        """Members who last gave more than N days ago. Default: 90 days."""
        days = int(request.query_params.get("days", 90))
        cutoff = date.today() - timedelta(days=days)
        branch = getattr(request, "branch", None)
        from apps.members.models import Member as MemberModel
        qs = (
            MemberModel.objects.filter(
                branch_memberships__branch=branch,
                branch_memberships__left_at__isnull=True,
                contributions__branch=branch,
                contributions__is_reversal=False,
                contributions__deleted_at__isnull=True,
            )
            .annotate(
                last_given=Max("contributions__given_at"),
                total_given=Sum("contributions__amount"),
            )
            .filter(last_given__lt=cutoff)
            .order_by("last_given")
            .distinct()
        )
        return Response([
            {
                "member_id": m.id,
                "member_name": m.full_name,
                "last_given": m.last_given,
                "total_given": str(m.total_given or 0),
            }
            for m in qs
        ])


# ── Contribution Batches ──────────────────────────────────────────────────────

class ContributionBatchViewSet(BranchScopedViewSet):
    queryset = ContributionBatch.objects.filter(deleted_at__isnull=True).select_related("created_by", "posted_by")
    serializer_class = ContributionBatchSerializer

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [CanViewFinance()]
        return [CanRecordFinance()]

    def perform_create(self, serializer):
        branch = getattr(self.request, "branch", None)
        serializer.save(branch=branch, created_by=self.request.user)

    def perform_destroy(self, instance):
        if instance.is_posted:
            raise PermissionDenied("Cannot delete a posted batch.")
        instance.deleted_at = timezone.now()
        instance.save(update_fields=["deleted_at"])

    @action(detail=True, methods=["post"])
    def post_batch(self, request, pk=None):
        batch = self.get_object()
        if batch.is_posted:
            raise ValidationError("Batch is already posted.")
        if batch.contributions.filter(deleted_at__isnull=True).count() == 0:
            raise ValidationError("Cannot post an empty batch.")
        batch.is_posted = True
        batch.posted_at = timezone.now()
        batch.posted_by = request.user
        batch.save(update_fields=["is_posted", "posted_at", "posted_by"])
        log_action(request.user, AuditLog.Action.UPDATE, batch, request=request)
        return Response(ContributionBatchSerializer(batch).data)


# ── Bank Deposits ─────────────────────────────────────────────────────────────

class BankDepositViewSet(BranchScopedViewSet):
    queryset = BankDeposit.objects.filter(deleted_at__isnull=True).select_related("created_by")
    serializer_class = BankDepositSerializer

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [CanViewFinance()]
        return [CanManageFunds()]

    def perform_create(self, serializer):
        branch = getattr(self.request, "branch", None)
        serializer.save(branch=branch, created_by=self.request.user)

    def perform_destroy(self, instance):
        instance.deleted_at = timezone.now()
        instance.save(update_fields=["deleted_at"])

    @action(detail=True, methods=["post"])
    def toggle_reconciled(self, request, pk=None):
        deposit = self.get_object()
        deposit.is_reconciled = not deposit.is_reconciled
        deposit.save(update_fields=["is_reconciled"])
        return Response(BankDepositSerializer(deposit).data)
