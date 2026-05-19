from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        ("accounts", "0003_user_last_login_branch"),
        ("branches", "0001_initial_branch"),
    ]

    operations = [
        migrations.CreateModel(
            name="Announcement",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True, verbose_name="created at")),
                ("updated_at", models.DateTimeField(auto_now=True, verbose_name="updated at")),
                ("deleted_at", models.DateTimeField(blank=True, null=True, verbose_name="deleted at")),
                ("title", models.CharField(max_length=200, verbose_name="title")),
                ("body", models.TextField(verbose_name="body")),
                ("audience", models.CharField(choices=[("all", "Everyone"), ("members", "Members Only"), ("leaders", "Group Leaders Only")], default="all", max_length=20, verbose_name="audience")),
                ("is_published", models.BooleanField(default=True, verbose_name="published")),
                ("published_at", models.DateTimeField(blank=True, null=True, verbose_name="published at")),
                ("expires_at", models.DateTimeField(blank=True, null=True, verbose_name="expires at")),
                ("branch", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="announcements", to="branches.branch", verbose_name="branch")),
                ("created_by", models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="announcements", to=settings.AUTH_USER_MODEL, verbose_name="created by")),
            ],
            options={"verbose_name": "announcement", "verbose_name_plural": "announcements", "ordering": ["-published_at", "-created_at"]},
        ),
    ]
