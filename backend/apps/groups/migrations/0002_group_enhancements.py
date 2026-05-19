from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("groups", "0001_initial_groups"),
        ("members", "0001_initial_members"),
        ("accounts", "0001_initial_accounts"),
    ]

    operations = [
        # parent_group self-FK on Group
        migrations.AddField(
            model_name="group",
            name="parent_group",
            field=models.ForeignKey(
                blank=True, null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="child_groups",
                to="groups.group",
                verbose_name="parent group",
            ),
        ),
        # GroupMeeting model
        migrations.CreateModel(
            name="GroupMeeting",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True, verbose_name="created at")),
                ("updated_at", models.DateTimeField(auto_now=True, verbose_name="updated at")),
                ("deleted_at", models.DateTimeField(blank=True, null=True, verbose_name="deleted at")),
                ("date", models.DateField(verbose_name="date")),
                ("present_count", models.PositiveSmallIntegerField(default=0, verbose_name="present count")),
                ("notes", models.TextField(blank=True, verbose_name="notes")),
                ("group", models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name="meetings",
                    to="groups.group",
                    verbose_name="group",
                )),
                ("recorded_by", models.ForeignKey(
                    blank=True, null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name="recorded_meetings",
                    to=settings.AUTH_USER_MODEL,
                    verbose_name="recorded by",
                )),
            ],
            options={
                "verbose_name": "group meeting",
                "verbose_name_plural": "group meetings",
                "ordering": ["-date"],
                "unique_together": {("group", "date")},
            },
        ),
        # GroupJoinRequest model
        migrations.CreateModel(
            name="GroupJoinRequest",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True, verbose_name="created at")),
                ("updated_at", models.DateTimeField(auto_now=True, verbose_name="updated at")),
                ("deleted_at", models.DateTimeField(blank=True, null=True, verbose_name="deleted at")),
                ("status", models.CharField(
                    choices=[
                        ("pending", "Pending"), ("approved", "Approved"), ("rejected", "Rejected"),
                    ],
                    default="pending", max_length=20, verbose_name="status",
                )),
                ("notes", models.TextField(blank=True, verbose_name="notes")),
                ("group", models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name="join_requests",
                    to="groups.group",
                    verbose_name="group",
                )),
                ("member", models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name="group_join_requests",
                    to="members.member",
                    verbose_name="member",
                )),
            ],
            options={
                "verbose_name": "group join request",
                "verbose_name_plural": "group join requests",
                "ordering": ["-created_at"],
                "unique_together": {("group", "member")},
            },
        ),
    ]
