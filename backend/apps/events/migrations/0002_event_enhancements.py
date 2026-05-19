from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("events", "0001_initial_events"),
    ]

    operations = [
        # New Event fields
        migrations.AddField(
            model_name="event",
            name="cost",
            field=models.DecimalField(
                blank=True, decimal_places=2, max_digits=10,
                null=True, verbose_name="cost",
            ),
        ),
        migrations.AddField(
            model_name="event",
            name="registration_required",
            field=models.BooleanField(default=False, verbose_name="registration required"),
        ),
        migrations.AddField(
            model_name="event",
            name="banner",
            field=models.ImageField(
                blank=True, null=True, upload_to="events/banners/", verbose_name="banner",
            ),
        ),
        migrations.AddField(
            model_name="event",
            name="recurrence",
            field=models.CharField(
                blank=True, default="", max_length=20,
                choices=[
                    ("", "No recurrence"), ("daily", "Daily"),
                    ("weekly", "Weekly"), ("biweekly", "Every 2 weeks"),
                    ("monthly", "Monthly"),
                ],
                verbose_name="recurrence",
            ),
        ),
        migrations.AddField(
            model_name="event",
            name="recurrence_end",
            field=models.DateField(blank=True, null=True, verbose_name="recurrence end"),
        ),
        # New EventType choices (alter field to add conference/class/social)
        migrations.AlterField(
            model_name="event",
            name="event_type",
            field=models.CharField(
                choices=[
                    ("service", "Church Service"), ("conference", "Conference"),
                    ("class", "Class"), ("social", "Social"),
                    ("outreach", "Outreach"), ("training", "Training"),
                    ("meeting", "Meeting"),
                ],
                default="service", max_length=20, verbose_name="event type",
            ),
        ),
        # Waitlisted status on EventRegistration
        migrations.AlterField(
            model_name="eventregistration",
            name="status",
            field=models.CharField(
                choices=[
                    ("registered", "Registered"), ("waitlisted", "Waitlisted"),
                    ("attended", "Attended"), ("cancelled", "Cancelled"),
                ],
                default="registered", max_length=20, verbose_name="status",
            ),
        ),
        # VolunteerSlot model
        migrations.CreateModel(
            name="VolunteerSlot",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True, verbose_name="created at")),
                ("updated_at", models.DateTimeField(auto_now=True, verbose_name="updated at")),
                ("deleted_at", models.DateTimeField(blank=True, null=True, verbose_name="deleted at")),
                ("role_name", models.CharField(max_length=100, verbose_name="role")),
                ("slots_needed", models.PositiveSmallIntegerField(default=1, verbose_name="slots needed")),
                ("notes", models.CharField(blank=True, max_length=200, verbose_name="notes")),
                ("event", models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name="volunteer_slots",
                    to="events.event",
                    verbose_name="event",
                )),
            ],
            options={
                "verbose_name": "volunteer slot",
                "verbose_name_plural": "volunteer slots",
                "ordering": ["role_name"],
            },
        ),
    ]
