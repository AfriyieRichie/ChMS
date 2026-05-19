from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        ("accounts", "0003_user_last_login_branch"),
        ("branches", "0001_initial_branch"),
        ("members", "0001_initial_members"),
    ]

    operations = [
        migrations.CreateModel(
            name="Event",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True, verbose_name="created at")),
                ("updated_at", models.DateTimeField(auto_now=True, verbose_name="updated at")),
                ("deleted_at", models.DateTimeField(blank=True, null=True, verbose_name="deleted at")),
                ("name", models.CharField(max_length=200, verbose_name="name")),
                ("description", models.TextField(blank=True, verbose_name="description")),
                ("event_type", models.CharField(choices=[("service", "Church Service"), ("special", "Special Event"), ("outreach", "Outreach"), ("training", "Training"), ("meeting", "Meeting")], default="service", max_length=20, verbose_name="event type")),
                ("start_datetime", models.DateTimeField(verbose_name="start")),
                ("end_datetime", models.DateTimeField(blank=True, null=True, verbose_name="end")),
                ("venue", models.CharField(blank=True, max_length=200, verbose_name="venue")),
                ("capacity", models.PositiveIntegerField(blank=True, null=True, verbose_name="capacity")),
                ("is_published", models.BooleanField(default=True, verbose_name="published")),
                ("branch", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="events", to="branches.branch", verbose_name="branch")),
                ("created_by", models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="created_events", to=settings.AUTH_USER_MODEL, verbose_name="created by")),
            ],
            options={"verbose_name": "event", "verbose_name_plural": "events", "ordering": ["-start_datetime"]},
        ),
        migrations.AddIndex(
            model_name="event",
            index=models.Index(fields=["branch", "start_datetime"], name="evt_br_start_idx"),
        ),
        migrations.CreateModel(
            name="EventRegistration",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True, verbose_name="created at")),
                ("updated_at", models.DateTimeField(auto_now=True, verbose_name="updated at")),
                ("deleted_at", models.DateTimeField(blank=True, null=True, verbose_name="deleted at")),
                ("status", models.CharField(choices=[("registered", "Registered"), ("attended", "Attended"), ("cancelled", "Cancelled")], default="registered", max_length=20, verbose_name="status")),
                ("notes", models.TextField(blank=True, verbose_name="notes")),
                ("event", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="registrations", to="events.event", verbose_name="event")),
                ("member", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="event_registrations", to="members.member", verbose_name="member")),
            ],
            options={"verbose_name": "event registration", "verbose_name_plural": "event registrations", "ordering": ["-created_at"]},
        ),
        migrations.AddConstraint(
            model_name="eventregistration",
            constraint=models.UniqueConstraint(fields=["event", "member"], name="unique_event_member_reg"),
        ),
    ]
