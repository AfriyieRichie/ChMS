from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        ("branches", "0001_initial_branch"),
        ("members", "0001_initial_members"),
    ]

    operations = [
        migrations.CreateModel(
            name="Group",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True, verbose_name="created at")),
                ("updated_at", models.DateTimeField(auto_now=True, verbose_name="updated at")),
                ("deleted_at", models.DateTimeField(blank=True, null=True, verbose_name="deleted at")),
                ("name", models.CharField(max_length=100, verbose_name="name")),
                ("group_type", models.CharField(choices=[("cell", "Cell Group"), ("ministry", "Ministry"), ("choir", "Choir"), ("department", "Department"), ("prayer", "Prayer Group"), ("other", "Other")], default="cell", max_length=20, verbose_name="type")),
                ("description", models.TextField(blank=True, verbose_name="description")),
                ("meeting_day", models.CharField(blank=True, max_length=20, verbose_name="meeting day")),
                ("meeting_time", models.TimeField(blank=True, null=True, verbose_name="meeting time")),
                ("meeting_location", models.CharField(blank=True, max_length=200, verbose_name="meeting location")),
                ("is_active", models.BooleanField(default=True, verbose_name="active")),
                ("branch", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="groups", to="branches.branch", verbose_name="branch")),
                ("leader", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="led_groups", to="members.member", verbose_name="leader")),
            ],
            options={"verbose_name": "group", "verbose_name_plural": "groups", "ordering": ["name"]},
        ),
        migrations.AddConstraint(
            model_name="group",
            constraint=models.UniqueConstraint(fields=["branch", "name"], name="unique_branch_group"),
        ),
        migrations.CreateModel(
            name="GroupMembership",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True, verbose_name="created at")),
                ("updated_at", models.DateTimeField(auto_now=True, verbose_name="updated at")),
                ("deleted_at", models.DateTimeField(blank=True, null=True, verbose_name="deleted at")),
                ("role", models.CharField(choices=[("member", "Member"), ("leader", "Leader"), ("co_leader", "Co-Leader")], default="member", max_length=20, verbose_name="role")),
                ("joined_at", models.DateField(auto_now_add=True, verbose_name="joined at")),
                ("left_at", models.DateField(blank=True, null=True, verbose_name="left at")),
                ("group", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="memberships", to="groups.group", verbose_name="group")),
                ("member", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="group_memberships", to="members.member", verbose_name="member")),
            ],
            options={"verbose_name": "group membership", "verbose_name_plural": "group memberships", "ordering": ["group", "member"]},
        ),
        migrations.AddConstraint(
            model_name="groupmembership",
            constraint=models.UniqueConstraint(fields=["group", "member"], name="unique_group_member"),
        ),
    ]
