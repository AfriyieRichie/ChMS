from django.contrib import admin
from .models import Announcement

@admin.register(Announcement)
class AnnouncementAdmin(admin.ModelAdmin):
    list_display = ["title", "audience", "is_published", "published_at", "branch", "created_by"]
    list_filter = ["is_published", "audience", "branch"]
    search_fields = ["title", "body"]
