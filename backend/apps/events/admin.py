from django.contrib import admin
from .models import Event, EventRegistration

@admin.register(Event)
class EventAdmin(admin.ModelAdmin):
    list_display = ["name", "event_type", "start_datetime", "venue", "branch", "is_published"]
    list_filter = ["event_type", "is_published", "branch"]
    search_fields = ["name", "venue"]

@admin.register(EventRegistration)
class EventRegistrationAdmin(admin.ModelAdmin):
    list_display = ["event", "member", "status", "created_at"]
    list_filter = ["status"]
