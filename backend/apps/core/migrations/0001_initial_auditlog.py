from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        ("accounts", "0002_rbac"),
    ]

    operations = [
        migrations.CreateModel(
            name="AuditLog",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("action", models.CharField(choices=[("create", "Create"), ("update", "Update"), ("delete", "Delete")], max_length=10, verbose_name="action")),
                ("object_type", models.CharField(max_length=100, verbose_name="object type")),
                ("object_id", models.PositiveBigIntegerField(verbose_name="object id")),
                ("before_data", models.JSONField(blank=True, null=True, verbose_name="before")),
                ("after_data", models.JSONField(blank=True, null=True, verbose_name="after")),
                ("timestamp", models.DateTimeField(auto_now_add=True, verbose_name="timestamp")),
                ("ip_address", models.GenericIPAddressField(blank=True, null=True, verbose_name="IP address")),
                ("actor", models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="audit_logs", to=settings.AUTH_USER_MODEL, verbose_name="actor")),
            ],
            options={"verbose_name": "audit log", "verbose_name_plural": "audit logs", "ordering": ["-timestamp"]},
        ),
        migrations.AddIndex(
            model_name="auditlog",
            index=models.Index(fields=["object_type", "object_id"], name="core_audit_obj_idx"),
        ),
        migrations.AddIndex(
            model_name="auditlog",
            index=models.Index(fields=["actor"], name="core_audit_actor_idx"),
        ),
    ]
