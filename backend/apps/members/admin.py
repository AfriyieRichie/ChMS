from django.contrib import admin

from .models import Household, Member, BranchMembership


class BranchMembershipInline(admin.TabularInline):
    model = BranchMembership
    extra = 0
    readonly_fields = ("created_at", "updated_at")


@admin.register(Household)
class HouseholdAdmin(admin.ModelAdmin):
    list_display = ("name", "branch", "phone")
    list_filter = ("branch",)
    search_fields = ("name", "phone")


@admin.register(Member)
class MemberAdmin(admin.ModelAdmin):
    list_display = ("full_name", "membership_status", "phone", "email")
    list_filter = ("membership_status", "gender", "baptism_status")
    search_fields = ("first_name", "last_name", "phone", "email")
    readonly_fields = ("created_at", "updated_at")
    inlines = [BranchMembershipInline]

    def get_fields(self, request, obj=None):
        fields = super().get_fields(request, obj)
        if not request.user.has_perm("members.view_sensitive"):
            fields = [f for f in fields if f != "sensitive_notes"]
        return fields


@admin.register(BranchMembership)
class BranchMembershipAdmin(admin.ModelAdmin):
    list_display = ("member", "branch", "joined_at", "left_at", "is_primary")
    list_filter = ("branch", "is_primary")
    search_fields = ("member__first_name", "member__last_name")
