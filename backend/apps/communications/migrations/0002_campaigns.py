from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("communications", "0001_initial_communications"),
        ("branches", "0001_initial_branch"),
        ("members", "0001_initial_members"),
        (settings.AUTH_USER_MODEL.split(".")[0], "0001_initial_user"),
    ]

    operations = [
        migrations.CreateModel(
            name="MessageTemplate",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True, verbose_name="created at")),
                ("updated_at", models.DateTimeField(auto_now=True, verbose_name="updated at")),
                ("deleted_at", models.DateTimeField(blank=True, null=True, verbose_name="deleted at")),
                ("name", models.CharField(max_length=100, verbose_name="name")),
                ("category", models.CharField(
                    choices=[
                        ("welcome", "Welcome"), ("birthday", "Birthday Wish"),
                        ("follow_up", "First Visit Follow-up"), ("event_reminder", "Event Reminder"),
                        ("pastoral", "Pastoral Care"), ("custom", "Custom"),
                    ],
                    default="custom", max_length=20, verbose_name="category",
                )),
                ("channel", models.CharField(
                    choices=[
                        ("sms", "SMS"), ("email", "Email"),
                        ("whatsapp", "WhatsApp"), ("push", "Push Notification"),
                    ],
                    max_length=20, verbose_name="channel",
                )),
                ("subject", models.CharField(blank=True, max_length=200, verbose_name="subject")),
                ("body", models.TextField(verbose_name="body")),
                ("is_active", models.BooleanField(default=True, verbose_name="active")),
                ("branch", models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name="message_templates",
                    to="branches.branch",
                    verbose_name="branch",
                )),
                ("created_by", models.ForeignKey(
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name="message_templates",
                    to=settings.AUTH_USER_MODEL,
                    verbose_name="created by",
                )),
            ],
            options={"verbose_name": "message template", "verbose_name_plural": "message templates", "ordering": ["category", "name"]},
        ),
        migrations.CreateModel(
            name="Audience",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True, verbose_name="created at")),
                ("updated_at", models.DateTimeField(auto_now=True, verbose_name="updated at")),
                ("deleted_at", models.DateTimeField(blank=True, null=True, verbose_name="deleted at")),
                ("name", models.CharField(max_length=100, verbose_name="name")),
                ("description", models.TextField(blank=True, verbose_name="description")),
                ("filters", models.JSONField(default=dict, verbose_name="filters")),
                ("branch", models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name="audiences",
                    to="branches.branch",
                    verbose_name="branch",
                )),
                ("created_by", models.ForeignKey(
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name="audiences",
                    to=settings.AUTH_USER_MODEL,
                    verbose_name="created by",
                )),
            ],
            options={"verbose_name": "audience", "verbose_name_plural": "audiences", "ordering": ["name"]},
        ),
        migrations.CreateModel(
            name="Campaign",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True, verbose_name="created at")),
                ("updated_at", models.DateTimeField(auto_now=True, verbose_name="updated at")),
                ("deleted_at", models.DateTimeField(blank=True, null=True, verbose_name="deleted at")),
                ("name", models.CharField(max_length=200, verbose_name="name")),
                ("channel", models.CharField(
                    choices=[
                        ("sms", "SMS"), ("email", "Email"),
                        ("whatsapp", "WhatsApp"), ("push", "Push Notification"),
                    ],
                    max_length=20, verbose_name="channel",
                )),
                ("status", models.CharField(
                    choices=[
                        ("draft", "Draft"), ("scheduled", "Scheduled"),
                        ("sent", "Sent"), ("failed", "Failed"),
                    ],
                    default="draft", max_length=20, verbose_name="status",
                )),
                ("scheduled_at", models.DateTimeField(blank=True, null=True, verbose_name="scheduled at")),
                ("sent_at", models.DateTimeField(blank=True, null=True, verbose_name="sent at")),
                ("recipient_count", models.PositiveIntegerField(default=0, verbose_name="recipient count")),
                ("audience", models.ForeignKey(
                    blank=True, null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name="campaigns",
                    to="communications.audience",
                    verbose_name="audience",
                )),
                ("branch", models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name="campaigns",
                    to="branches.branch",
                    verbose_name="branch",
                )),
                ("created_by", models.ForeignKey(
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name="campaigns",
                    to=settings.AUTH_USER_MODEL,
                    verbose_name="created by",
                )),
                ("template", models.ForeignKey(
                    blank=True, null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name="campaigns",
                    to="communications.messagetemplate",
                    verbose_name="template",
                )),
            ],
            options={"verbose_name": "campaign", "verbose_name_plural": "campaigns", "ordering": ["-created_at"]},
        ),
        migrations.CreateModel(
            name="MessageLog",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True, verbose_name="created at")),
                ("updated_at", models.DateTimeField(auto_now=True, verbose_name="updated at")),
                ("deleted_at", models.DateTimeField(blank=True, null=True, verbose_name="deleted at")),
                ("member_name", models.CharField(blank=True, max_length=200, verbose_name="member name")),
                ("channel", models.CharField(
                    choices=[("sms", "SMS"), ("email", "Email"), ("whatsapp", "WhatsApp"), ("push", "Push Notification")],
                    max_length=20, verbose_name="channel",
                )),
                ("recipient_address", models.CharField(blank=True, max_length=200, verbose_name="recipient address")),
                ("status", models.CharField(
                    choices=[
                        ("queued", "Queued"), ("sent", "Sent"),
                        ("delivered", "Delivered"), ("failed", "Failed"), ("opted_out", "Opted Out"),
                    ],
                    default="queued", max_length=20, verbose_name="status",
                )),
                ("sent_at", models.DateTimeField(blank=True, null=True, verbose_name="sent at")),
                ("error_message", models.CharField(blank=True, max_length=500, verbose_name="error message")),
                ("campaign", models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name="logs",
                    to="communications.campaign",
                    verbose_name="campaign",
                )),
                ("member", models.ForeignKey(
                    blank=True, null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name="message_logs",
                    to="members.member",
                    verbose_name="member",
                )),
            ],
            options={"verbose_name": "message log", "verbose_name_plural": "message logs", "ordering": ["-created_at"]},
        ),
        migrations.CreateModel(
            name="CommunicationOptOut",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True, verbose_name="created at")),
                ("updated_at", models.DateTimeField(auto_now=True, verbose_name="updated at")),
                ("deleted_at", models.DateTimeField(blank=True, null=True, verbose_name="deleted at")),
                ("channel", models.CharField(
                    choices=[
                        ("sms", "SMS"), ("email", "Email"),
                        ("whatsapp", "WhatsApp"), ("push", "Push Notification"), ("all", "All channels"),
                    ],
                    max_length=20, verbose_name="channel",
                )),
                ("reason", models.CharField(blank=True, max_length=200, verbose_name="reason")),
                ("member", models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name="opt_outs",
                    to="members.member",
                    verbose_name="member",
                )),
            ],
            options={
                "verbose_name": "communication opt-out",
                "verbose_name_plural": "communication opt-outs",
                "ordering": ["-created_at"],
                "unique_together": {("member", "channel")},
            },
        ),
    ]
