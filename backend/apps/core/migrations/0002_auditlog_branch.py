from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("branches", "0001_initial_branch"),
        ("core", "0001_initial_auditlog"),
    ]

    operations = [
        migrations.AddField(
            model_name="auditlog",
            name="branch",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="audit_logs",
                to="branches.branch",
                verbose_name="branch",
            ),
        ),
        migrations.AddIndex(
            model_name="auditlog",
            index=models.Index(fields=["branch"], name="core_audito_branch__idx"),
        ),
        migrations.AddIndex(
            model_name="auditlog",
            index=models.Index(fields=["timestamp"], name="core_audito_timesta_idx"),
        ),
    ]
