from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("finance", "0001_initial_finance"),
    ]

    operations = [
        migrations.CreateModel(
            name="ContributionBatch",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True, verbose_name="created at")),
                ("updated_at", models.DateTimeField(auto_now=True, verbose_name="updated at")),
                ("deleted_at", models.DateTimeField(blank=True, null=True)),
                ("name", models.CharField(max_length=200, verbose_name="name")),
                ("service_date", models.DateField(verbose_name="service date")),
                ("notes", models.TextField(blank=True, verbose_name="notes")),
                ("is_posted", models.BooleanField(default=False, verbose_name="posted")),
                ("posted_at", models.DateTimeField(blank=True, null=True, verbose_name="posted at")),
                ("branch", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="contribution_batches", to="branches.branch", verbose_name="branch")),
                ("posted_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="+", to=settings.AUTH_USER_MODEL, verbose_name="posted by")),
                ("created_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="+", to=settings.AUTH_USER_MODEL, verbose_name="created by")),
            ],
            options={"verbose_name": "contribution batch", "verbose_name_plural": "contribution batches", "ordering": ["-service_date", "-created_at"]},
        ),
        migrations.AddField(
            model_name="contribution",
            name="batch",
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="contributions", to="finance.contributionbatch", verbose_name="batch"),
        ),
        migrations.CreateModel(
            name="BankDeposit",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True, verbose_name="created at")),
                ("updated_at", models.DateTimeField(auto_now=True, verbose_name="updated at")),
                ("deleted_at", models.DateTimeField(blank=True, null=True)),
                ("date", models.DateField(verbose_name="deposit date")),
                ("amount", models.DecimalField(decimal_places=2, max_digits=12, verbose_name="amount")),
                ("reference", models.CharField(max_length=200, verbose_name="reference")),
                ("notes", models.TextField(blank=True, verbose_name="notes")),
                ("is_reconciled", models.BooleanField(default=False, verbose_name="reconciled")),
                ("branch", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="bank_deposits", to="branches.branch", verbose_name="branch")),
                ("created_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="+", to=settings.AUTH_USER_MODEL, verbose_name="created by")),
            ],
            options={"verbose_name": "bank deposit", "verbose_name_plural": "bank deposits", "ordering": ["-date"]},
        ),
    ]
