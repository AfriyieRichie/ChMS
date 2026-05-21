from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0003_user_last_login_branch"),
    ]

    operations = [
        migrations.CreateModel(
            name="NotificationPreference",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("email_attendance_reminders", models.BooleanField(default=True)),
                ("email_event_invites", models.BooleanField(default=True)),
                ("email_giving_receipts", models.BooleanField(default=True)),
                ("email_announcements", models.BooleanField(default=True)),
                ("email_pastoral_care", models.BooleanField(default=False)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "user",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="notification_prefs",
                        to=settings.AUTH_USER_MODEL,
                        verbose_name="user",
                    ),
                ),
            ],
            options={
                "verbose_name": "notification preference",
                "verbose_name_plural": "notification preferences",
            },
        ),
    ]
