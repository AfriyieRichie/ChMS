from django.contrib import admin
from .models import Branch


@admin.register(Branch)
class BranchAdmin(admin.ModelAdmin):
    list_display = ["name", "code", "city", "country", "is_active", "parent_branch"]
    list_filter = ["is_active", "country"]
    search_fields = ["name", "code", "city"]
    prepopulated_fields = {"slug": ("name",)}
    readonly_fields = ["created_at", "updated_at"]
