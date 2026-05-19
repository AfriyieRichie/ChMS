import attendance.models
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("attendance", "0001_initial_attendance"),
        ("members", "0004_household_head_anniversary"),
    ]

    operations = [
        migrations.CreateModel(
            name="FirstTimeVisitor",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True, verbose_name="created at")),
                ("updated_at", models.DateTimeField(auto_now=True, verbose_name="updated at")),
                ("deleted_at", models.DateTimeField(blank=True, null=True, verbose_name="deleted at")),
                ("name", models.CharField(max_length=200, verbose_name="name")),
                ("phone", models.CharField(blank=True, max_length=30, verbose_name="phone")),
                ("email", models.EmailField(blank=True, verbose_name="email")),
                ("how_heard", models.CharField(
                    blank=True, max_length=30,
                    choices=[
                        ("friend", "Friend / Family"), ("social_media", "Social Media"),
                        ("flyer", "Flyer / Poster"), ("walk_in", "Walked In"),
                        ("radio_tv", "Radio / TV"), ("website", "Website"), ("other", "Other"),
                    ],
                    verbose_name="how they heard",
                )),
                ("notes", models.TextField(blank=True, verbose_name="notes")),
                ("followed_up", models.BooleanField(default=False, verbose_name="followed up")),
                ("attendance_record", models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name="first_time_visitors",
                    to="attendance.attendancerecord",
                    verbose_name="attendance record",
                )),
                ("converted_to_member", models.ForeignKey(
                    blank=True, null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name="converted_from_visitor",
                    to="members.member",
                    verbose_name="converted to member",
                )),
            ],
            options={"verbose_name": "first-time visitor", "verbose_name_plural": "first-time visitors", "ordering": ["-created_at"]},
        ),
        migrations.CreateModel(
            name="ChildCheckIn",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True, verbose_name="created at")),
                ("updated_at", models.DateTimeField(auto_now=True, verbose_name="updated at")),
                ("deleted_at", models.DateTimeField(blank=True, null=True, verbose_name="deleted at")),
                ("child_name", models.CharField(max_length=200, verbose_name="child name")),
                ("age", models.PositiveSmallIntegerField(blank=True, null=True, verbose_name="age")),
                ("parent_name", models.CharField(blank=True, max_length=200, verbose_name="parent name")),
                ("parent_phone", models.CharField(blank=True, max_length=30, verbose_name="parent phone")),
                ("allergy_notes", models.TextField(blank=True, verbose_name="allergy notes")),
                ("pickup_code", models.CharField(
                    default=attendance.models._pickup_code,
                    max_length=8, verbose_name="pickup code",
                )),
                ("checked_out", models.BooleanField(default=False, verbose_name="checked out")),
                ("attendance_record", models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name="child_checkins",
                    to="attendance.attendancerecord",
                    verbose_name="attendance record",
                )),
                ("member", models.ForeignKey(
                    blank=True, null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name="child_checkins",
                    to="members.member",
                    verbose_name="member",
                )),
            ],
            options={"verbose_name": "child check-in", "verbose_name_plural": "child check-ins", "ordering": ["child_name"]},
        ),
    ]
