from django.contrib import admin

from .models import ServiceType, AttendanceRecord, AttendanceEntry


class AttendanceEntryInline(admin.TabularInline):
    model = AttendanceEntry
    extra = 0
    autocomplete_fields = ["member"]


@admin.register(ServiceType)
class ServiceTypeAdmin(admin.ModelAdmin):
    list_display = ("name", "branch", "is_active")
    list_filter = ("branch", "is_active")
    search_fields = ("name",)


@admin.register(AttendanceRecord)
class AttendanceRecordAdmin(admin.ModelAdmin):
    list_display = ("branch", "service_type", "date", "attendance_type", "total_count", "first_timers")
    list_filter = ("branch", "service_type", "attendance_type", "date")
    search_fields = ("notes",)
    readonly_fields = ("created_at", "updated_at")
    inlines = [AttendanceEntryInline]


@admin.register(AttendanceEntry)
class AttendanceEntryAdmin(admin.ModelAdmin):
    list_display = ("member", "attendance_record", "is_first_visit")
    list_filter = ("is_first_visit",)
    search_fields = ("member__first_name", "member__last_name")
