from django.contrib import admin
from .models import Group, GroupMembership

@admin.register(Group)
class GroupAdmin(admin.ModelAdmin):
    list_display = ["name", "group_type", "leader", "branch", "is_active", "member_count"]
    list_filter = ["group_type", "is_active", "branch"]
    search_fields = ["name"]

@admin.register(GroupMembership)
class GroupMembershipAdmin(admin.ModelAdmin):
    list_display = ["group", "member", "role", "joined_at", "left_at"]
    list_filter = ["role", "group"]
