from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        ("branches", "0001_initial_branch"),
        ("members", "0001_initial_members"),
        ("accounts", "0003_user_last_login_branch"),
    ]

    operations = [
        migrations.CreateModel(
            name="ServiceType",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True, verbose_name="created at")),
                ("updated_at", models.DateTimeField(auto_now=True, verbose_name="updated at")),
                ("deleted_at", models.DateTimeField(blank=True, null=True, verbose_name="deleted at")),
                ("name", models.CharField(max_length=100, verbose_name="name")),
                ("description", models.TextField(blank=True, verbose_name="description")),
                ("is_active", models.BooleanField(default=True, verbose_name="active")),
                ("branch", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="service_types", to="branches.branch", verbose_name="branch")),
            ],
            options={"verbose_name": "service type", "verbose_name_plural": "service types", "ordering": ["name"]},
        ),
        migrations.AddConstraint(
            model_name="servicetype",
            constraint=models.UniqueConstraint(fields=["branch", "name"], name="unique_branch_service_type"),
        ),
        migrations.CreateModel(
            name="AttendanceRecord",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True, verbose_name="created at")),
                ("updated_at", models.DateTimeField(auto_now=True, verbose_name="updated at")),
                ("deleted_at", models.DateTimeField(blank=True, null=True, verbose_name="deleted at")),
                ("date", models.DateField(verbose_name="date")),
                ("attendance_type", models.CharField(choices=[("physical", "Physical"), ("online", "Online")], default="physical", max_length=20, verbose_name="attendance type")),
                ("total_count", models.PositiveIntegerField(default=0, verbose_name="total count")),
                ("male_count", models.PositiveIntegerField(default=0, verbose_name="male count")),
                ("female_count", models.PositiveIntegerField(default=0, verbose_name="female count")),
                ("children_count", models.PositiveIntegerField(default=0, verbose_name="children count")),
                ("first_timers", models.PositiveIntegerField(default=0, verbose_name="first timers")),
                ("notes", models.TextField(blank=True, verbose_name="notes")),
                ("branch", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="attendance_records", to="branches.branch", verbose_name="branch")),
                ("recorded_by", models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="recorded_attendance", to=settings.AUTH_USER_MODEL, verbose_name="recorded by")),
                ("service_type", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="attendance_records", to="attendance.servicetype", verbose_name="service type")),
            ],
            options={"verbose_name": "attendance record", "verbose_name_plural": "attendance records", "ordering": ["-date"]},
        ),
        migrations.AddConstraint(
            model_name="attendancerecord",
            constraint=models.UniqueConstraint(fields=["branch", "service_type", "date", "attendance_type"], name="unique_attendance_record"),
        ),
        migrations.AddIndex(
            model_name="attendancerecord",
            index=models.Index(fields=["branch", "date"], name="attendance_branch_date_idx"),
        ),
        migrations.CreateModel(
            name="AttendanceEntry",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True, verbose_name="created at")),
                ("updated_at", models.DateTimeField(auto_now=True, verbose_name="updated at")),
                ("deleted_at", models.DateTimeField(blank=True, null=True, verbose_name="deleted at")),
                ("is_first_visit", models.BooleanField(default=False, verbose_name="first visit")),
                ("notes", models.CharField(blank=True, max_length=255, verbose_name="notes")),
                ("attendance_record", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="entries", to="attendance.attendancerecord", verbose_name="attendance record")),
                ("member", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="attendance_entries", to="members.member", verbose_name="member")),
            ],
            options={"verbose_name": "attendance entry", "verbose_name_plural": "attendance entries"},
        ),
        migrations.AddConstraint(
            model_name="attendanceentry",
            constraint=models.UniqueConstraint(fields=["attendance_record", "member"], name="unique_attendance_entry"),
        ),
    ]
