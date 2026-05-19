from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0001_initial_user"),
        ("branches", "0001_initial_branch"),
    ]

    operations = [
        migrations.CreateModel(
            name="Role",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(max_length=50, unique=True, verbose_name="name")),
                ("description", models.TextField(blank=True, verbose_name="description")),
            ],
            options={"verbose_name": "role", "verbose_name_plural": "roles", "ordering": ["name"]},
        ),
        migrations.CreateModel(
            name="Capability",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("codename", models.CharField(max_length=100, unique=True, verbose_name="codename")),
                ("description", models.TextField(blank=True, verbose_name="description")),
            ],
            options={"verbose_name": "capability", "verbose_name_plural": "capabilities", "ordering": ["codename"]},
        ),
        migrations.CreateModel(
            name="RoleCapability",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("role", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="role_capabilities", to="accounts.role")),
                ("capability", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="role_capabilities", to="accounts.capability")),
            ],
            options={"verbose_name": "role capability", "verbose_name_plural": "role capabilities", "unique_together": {("role", "capability")}},
        ),
        migrations.CreateModel(
            name="UserRoleAssignment",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("user", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="role_assignments", to=settings.AUTH_USER_MODEL)),
                ("role", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="user_assignments", to="accounts.role")),
                ("branch", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name="role_assignments", to="branches.branch")),
            ],
            options={"verbose_name": "user role assignment", "verbose_name_plural": "user role assignments", "unique_together": {("user", "role", "branch")}},
        ),
    ]
