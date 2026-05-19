from django.db import migrations, models
import django.db.models.deletion
import django.utils.timezone


class Migration(migrations.Migration):

    dependencies = [
        ("members", "0002_discipleship_record"),
        ("branches", "0001_initial_branch"),
    ]

    operations = [
        # MemberTag table
        migrations.CreateModel(
            name="MemberTag",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("deleted_at", models.DateTimeField(blank=True, null=True)),
                ("name", models.CharField(max_length=50, verbose_name="name")),
                ("color", models.CharField(default="#6B7280", max_length=7, verbose_name="color")),
                (
                    "branch",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="member_tags",
                        to="branches.branch",
                        verbose_name="branch",
                    ),
                ),
            ],
            options={
                "verbose_name": "member tag",
                "verbose_name_plural": "member tags",
                "ordering": ["name"],
                "unique_together": {("branch", "name")},
            },
        ),
        # tags M2M on Member
        migrations.AddField(
            model_name="member",
            name="tags",
            field=models.ManyToManyField(
                blank=True,
                related_name="members",
                to="members.membertag",
                verbose_name="tags",
            ),
        ),
    ]
