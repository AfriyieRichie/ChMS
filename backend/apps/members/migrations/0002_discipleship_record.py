from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("branches", "0001_initial_branch"),
        ("members", "0001_initial_members"),
    ]

    operations = [
        migrations.CreateModel(
            name="DiscipleshipRecord",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True, verbose_name="created at")),
                ("updated_at", models.DateTimeField(auto_now=True, verbose_name="updated at")),
                ("deleted_at", models.DateTimeField(blank=True, null=True, verbose_name="deleted at")),
                ("stage", models.CharField(choices=[("new_believer", "New Believer"), ("foundation", "Foundation Class"), ("water_baptism", "Water Baptism"), ("holy_spirit", "Holy Spirit Baptism"), ("discipleship", "Discipleship Class"), ("membership", "Membership Class")], max_length=20, verbose_name="stage")),
                ("status", models.CharField(choices=[("in_progress", "In Progress"), ("completed", "Completed"), ("dropped", "Dropped")], default="in_progress", max_length=20, verbose_name="status")),
                ("started_at", models.DateField(verbose_name="started at")),
                ("completed_at", models.DateField(blank=True, null=True, verbose_name="completed at")),
                ("notes", models.TextField(blank=True, verbose_name="notes")),
                ("branch", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="discipleship_records", to="branches.branch", verbose_name="branch")),
                ("facilitator", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="facilitated_records", to="members.member", verbose_name="facilitator")),
                ("member", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="discipleship_records", to="members.member", verbose_name="member")),
            ],
            options={"verbose_name": "discipleship record", "verbose_name_plural": "discipleship records", "ordering": ["member", "stage"]},
        ),
        migrations.AddConstraint(
            model_name="discipleshiprecord",
            constraint=models.UniqueConstraint(fields=["member", "stage"], name="unique_member_stage"),
        ),
    ]
