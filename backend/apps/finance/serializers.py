from decimal import Decimal

from rest_framework import serializers

from .models import Fund, GivingCategory, FinancialPeriod, Pledge, Contribution, Receipt, ContributionBatch, BankDeposit


class FundSerializer(serializers.ModelSerializer):
    class Meta:
        model = Fund
        fields = ["id", "name", "code", "description", "is_designated", "is_active", "branch", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]


class FundSummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = Fund
        fields = ["id", "name", "code", "is_designated"]


class GivingCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = GivingCategory
        fields = ["id", "name", "description", "is_active", "branch", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]


class FinancialPeriodSerializer(serializers.ModelSerializer):
    is_locked = serializers.BooleanField(read_only=True)
    locked_by_name = serializers.CharField(source="locked_by.full_name", read_only=True)

    class Meta:
        model = FinancialPeriod
        fields = ["id", "branch", "year", "month", "is_locked", "locked_at", "locked_by", "locked_by_name"]
        read_only_fields = ["id", "is_locked", "locked_at", "locked_by"]


class PledgeSerializer(serializers.ModelSerializer):
    total_fulfilled = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    balance = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    member_name = serializers.CharField(source="member.full_name", read_only=True)
    fund_name = serializers.CharField(source="fund.name", read_only=True)

    class Meta:
        model = Pledge
        fields = [
            "id", "member", "member_name", "branch", "fund", "fund_name",
            "category", "amount", "currency", "start_date", "end_date",
            "frequency", "status", "notes",
            "total_fulfilled", "balance",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class ContributionSerializer(serializers.ModelSerializer):
    member_name = serializers.SerializerMethodField()
    fund_name = serializers.CharField(source="fund.name", read_only=True)
    category_name = serializers.CharField(source="category.name", read_only=True)
    recorded_by_name = serializers.CharField(source="recorded_by.full_name", read_only=True)

    class Meta:
        model = Contribution
        fields = [
            "id", "receipt_number",
            "member", "member_name",
            "branch", "fund", "fund_name",
            "category", "category_name",
            "financial_period", "pledge",
            "amount", "currency", "given_at",
            "payment_method", "reference", "notes",
            "recorded_by", "recorded_by_name",
            "is_reversal", "reversal_of",
            "created_at",
        ]
        read_only_fields = [
            "id", "receipt_number", "recorded_by", "is_reversal", "reversal_of", "created_at"
        ]

    def get_member_name(self, obj):
        return str(obj.member) if obj.member else "Anonymous"

    def validate_amount(self, value):
        if value <= Decimal("0"):
            raise serializers.ValidationError("Amount must be greater than zero.")
        return value

    def validate(self, data):
        branch = data.get("branch") or getattr(self.context.get("request"), "branch", None)
        period = data.get("financial_period")
        if period and period.is_locked:
            raise serializers.ValidationError(
                {"financial_period": "This financial period is locked. No new contributions can be recorded."}
            )
        fund = data.get("fund")
        if fund and branch and fund.branch_id != branch.pk:
            raise serializers.ValidationError({"fund": "Fund does not belong to this branch."})
        return data


class ContributionListSerializer(serializers.ModelSerializer):
    member_name = serializers.SerializerMethodField()
    fund_name = serializers.CharField(source="fund.name", read_only=True)

    class Meta:
        model = Contribution
        fields = [
            "id", "receipt_number", "member_name", "fund_name",
            "amount", "currency", "given_at", "payment_method", "is_reversal",
        ]

    def get_member_name(self, obj):
        return str(obj.member) if obj.member else "Anonymous"


class ReversalSerializer(serializers.Serializer):
    reason = serializers.CharField(max_length=255, required=False, allow_blank=True)


class ContributionBatchSerializer(serializers.ModelSerializer):
    total_amount = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    contribution_count = serializers.IntegerField(read_only=True)
    posted_by_name = serializers.CharField(source="posted_by.full_name", read_only=True)
    created_by_name = serializers.CharField(source="created_by.full_name", read_only=True)

    class Meta:
        model = ContributionBatch
        fields = [
            "id", "branch", "name", "service_date", "notes",
            "is_posted", "posted_at", "posted_by", "posted_by_name",
            "created_by", "created_by_name",
            "total_amount", "contribution_count",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "is_posted", "posted_at", "posted_by", "created_by", "created_at", "updated_at"]


class BankDepositSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source="created_by.full_name", read_only=True)

    class Meta:
        model = BankDeposit
        fields = [
            "id", "branch", "date", "amount", "reference", "notes",
            "is_reconciled", "created_by", "created_by_name",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_by", "created_at", "updated_at"]
