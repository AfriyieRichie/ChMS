from django.contrib import admin

from .models import Fund, GivingCategory, FinancialPeriod, Pledge, Contribution, Receipt


@admin.register(Fund)
class FundAdmin(admin.ModelAdmin):
    list_display = ("name", "code", "branch", "is_designated", "is_active")
    list_filter = ("branch", "is_designated", "is_active")
    search_fields = ("name", "code")


@admin.register(GivingCategory)
class GivingCategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "branch", "is_active")
    list_filter = ("branch", "is_active")
    search_fields = ("name",)


@admin.register(FinancialPeriod)
class FinancialPeriodAdmin(admin.ModelAdmin):
    list_display = ("branch", "year", "month", "is_locked", "locked_by")
    list_filter = ("branch", "year")
    readonly_fields = ("locked_at", "locked_by")

    def is_locked(self, obj):
        return obj.is_locked
    is_locked.boolean = True


@admin.register(Pledge)
class PledgeAdmin(admin.ModelAdmin):
    list_display = ("member", "fund", "amount", "currency", "frequency", "status", "branch")
    list_filter = ("branch", "status", "frequency", "fund")
    search_fields = ("member__first_name", "member__last_name")
    readonly_fields = ("created_at", "updated_at")


@admin.register(Contribution)
class ContributionAdmin(admin.ModelAdmin):
    list_display = ("receipt_number", "member", "fund", "amount", "currency", "given_at", "payment_method", "is_reversal")
    list_filter = ("branch", "fund", "category", "payment_method", "is_reversal", "given_at")
    search_fields = ("receipt_number", "member__first_name", "member__last_name", "reference")
    readonly_fields = ("receipt_number", "created_at", "updated_at", "recorded_by", "reversal_of")

    def has_change_permission(self, request, obj=None):
        # Contributions are append-only — no edits via admin either
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(Receipt)
class ReceiptAdmin(admin.ModelAdmin):
    list_display = ("number", "contribution", "generated_at")
    readonly_fields = ("number", "generated_at", "contribution")
