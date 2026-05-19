from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name="Branch",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("deleted_at", models.DateTimeField(blank=True, null=True)),
                ("name", models.CharField(max_length=255, verbose_name="name")),
                ("slug", models.SlugField(max_length=255, unique=True, verbose_name="slug")),
                ("code", models.CharField(help_text="Short campus code, e.g. ACC01", max_length=20, unique=True, verbose_name="code")),
                ("address", models.TextField(blank=True, verbose_name="address")),
                ("city", models.CharField(blank=True, max_length=100, verbose_name="city")),
                ("region", models.CharField(blank=True, max_length=100, verbose_name="region")),
                ("country", models.CharField(default="Ghana", max_length=100, verbose_name="country")),
                ("phone", models.CharField(blank=True, max_length=30, verbose_name="phone")),
                ("email", models.EmailField(blank=True, verbose_name="email")),
                ("timezone", models.CharField(default="Africa/Accra", max_length=50, verbose_name="timezone")),
                ("currency", models.CharField(default="GHS", max_length=3, verbose_name="currency")),
                ("is_active", models.BooleanField(default=True, verbose_name="active")),
                ("parent_branch", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="sub_branches", to="branches.branch", verbose_name="parent branch")),
            ],
            options={"verbose_name": "branch", "verbose_name_plural": "branches", "ordering": ["name"]},
        ),
    ]
