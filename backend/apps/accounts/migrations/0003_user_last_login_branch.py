from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0002_rbac"),
        ("branches", "0001_initial_branch"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="last_login_branch",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="+",
                to="branches.branch",
                verbose_name="last login branch",
            ),
        ),
    ]
