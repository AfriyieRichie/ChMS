from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        ("branches", "0001_initial_branch"),
        ("members", "0001_initial_members"),
        ("accounts", "0003_user_last_login_branch"),
    ]

    operations = [
        migrations.CreateModel(
            name="Fund",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True, verbose_name="created at")),
                ("updated_at", models.DateTimeField(auto_now=True, verbose_name="updated at")),
                ("deleted_at", models.DateTimeField(blank=True, null=True, verbose_name="deleted at")),
                ("name", models.CharField(max_length=100, verbose_name="name")),
                ("code", models.CharField(blank=True, max_length=20, verbose_name="code")),
                ("description", models.TextField(blank=True, verbose_name="description")),
                ("is_designated", models.BooleanField(default=False, verbose_name="designated fund")),
                ("is_active", models.BooleanField(default=True, verbose_name="active")),
                ("branch", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="funds", to="branches.branch", verbose_name="branch")),
            ],
            options={"verbose_name": "fund", "verbose_name_plural": "funds", "ordering": ["name"]},
        ),
        migrations.AddConstraint(
            model_name="fund",
            constraint=models.UniqueConstraint(fields=["branch", "name"], name="unique_branch_fund"),
        ),
        migrations.CreateModel(
            name="GivingCategory",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True, verbose_name="created at")),
                ("updated_at", models.DateTimeField(auto_now=True, verbose_name="updated at")),
                ("deleted_at", models.DateTimeField(blank=True, null=True, verbose_name="deleted at")),
                ("name", models.CharField(max_length=100, verbose_name="name")),
                ("description", models.TextField(blank=True, verbose_name="description")),
                ("is_active", models.BooleanField(default=True, verbose_name="active")),
                ("branch", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="giving_categories", to="branches.branch", verbose_name="branch")),
            ],
            options={"verbose_name": "giving category", "verbose_name_plural": "giving categories", "ordering": ["name"]},
        ),
        migrations.AddConstraint(
            model_name="givingcategory",
            constraint=models.UniqueConstraint(fields=["branch", "name"], name="unique_branch_giving_category"),
        ),
        migrations.CreateModel(
            name="FinancialPeriod",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True, verbose_name="created at")),
                ("updated_at", models.DateTimeField(auto_now=True, verbose_name="updated at")),
                ("deleted_at", models.DateTimeField(blank=True, null=True, verbose_name="deleted at")),
                ("year", models.PositiveSmallIntegerField(verbose_name="year")),
                ("month", models.PositiveSmallIntegerField(verbose_name="month")),
                ("locked_at", models.DateTimeField(blank=True, null=True, verbose_name="locked at")),
                ("branch", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="financial_periods", to="branches.branch", verbose_name="branch")),
                ("locked_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="locked_periods", to=settings.AUTH_USER_MODEL, verbose_name="locked by")),
            ],
            options={"verbose_name": "financial period", "verbose_name_plural": "financial periods", "ordering": ["-year", "-month"]},
        ),
        migrations.AddConstraint(
            model_name="financialperiod",
            constraint=models.UniqueConstraint(fields=["branch", "year", "month"], name="unique_branch_period"),
        ),
        migrations.CreateModel(
            name="Pledge",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True, verbose_name="created at")),
                ("updated_at", models.DateTimeField(auto_now=True, verbose_name="updated at")),
                ("deleted_at", models.DateTimeField(blank=True, null=True, verbose_name="deleted at")),
                ("amount", models.DecimalField(decimal_places=2, max_digits=12, verbose_name="pledged amount")),
                ("currency", models.CharField(default="GHS", max_length=3, verbose_name="currency")),
                ("start_date", models.DateField(verbose_name="start date")),
                ("end_date", models.DateField(blank=True, null=True, verbose_name="end date")),
                ("frequency", models.CharField(choices=[("one_time", "One Time"), ("weekly", "Weekly"), ("biweekly", "Bi-weekly"), ("monthly", "Monthly"), ("quarterly", "Quarterly"), ("annual", "Annual")], default="monthly", max_length=20, verbose_name="frequency")),
                ("status", models.CharField(choices=[("active", "Active"), ("completed", "Completed"), ("cancelled", "Cancelled"), ("lapsed", "Lapsed")], default="active", max_length=20, verbose_name="status")),
                ("notes", models.TextField(blank=True, verbose_name="notes")),
                ("branch", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="pledges", to="branches.branch", verbose_name="branch")),
                ("category", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="pledges", to="finance.givingcategory", verbose_name="giving category")),
                ("fund", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="pledges", to="finance.fund", verbose_name="fund")),
                ("member", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="pledges", to="members.member", verbose_name="member")),
            ],
            options={"verbose_name": "pledge", "verbose_name_plural": "pledges", "ordering": ["-start_date"]},
        ),
        migrations.CreateModel(
            name="Contribution",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True, verbose_name="created at")),
                ("updated_at", models.DateTimeField(auto_now=True, verbose_name="updated at")),
                ("deleted_at", models.DateTimeField(blank=True, null=True, verbose_name="deleted at")),
                ("amount", models.DecimalField(decimal_places=2, max_digits=12, verbose_name="amount")),
                ("currency", models.CharField(default="GHS", max_length=3, verbose_name="currency")),
                ("given_at", models.DateField(verbose_name="given at")),
                ("payment_method", models.CharField(choices=[("cash", "Cash"), ("cheque", "Cheque"), ("bank_transfer", "Bank Transfer"), ("mobile_money", "Mobile Money"), ("card", "Card")], default="cash", max_length=20, verbose_name="payment method")),
                ("reference", models.CharField(blank=True, max_length=100, verbose_name="reference")),
                ("receipt_number", models.CharField(blank=True, max_length=50, unique=True, verbose_name="receipt number")),
                ("notes", models.TextField(blank=True, verbose_name="notes")),
                ("is_reversal", models.BooleanField(default=False, verbose_name="is reversal")),
                ("branch", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="contributions", to="branches.branch", verbose_name="branch")),
                ("category", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="contributions", to="finance.givingcategory", verbose_name="giving category")),
                ("financial_period", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, related_name="contributions", to="finance.financialperiod", verbose_name="financial period")),
                ("fund", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="contributions", to="finance.fund", verbose_name="fund")),
                ("member", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="contributions", to="members.member", verbose_name="member")),
                ("pledge", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="contributions", to="finance.pledge", verbose_name="pledge")),
                ("recorded_by", models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="recorded_contributions", to=settings.AUTH_USER_MODEL, verbose_name="recorded by")),
                ("reversal_of", models.OneToOneField(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="reversal", to="finance.contribution", verbose_name="reversal of")),
            ],
            options={"verbose_name": "contribution", "verbose_name_plural": "contributions", "ordering": ["-given_at", "-created_at"]},
        ),
        migrations.AddIndex(
            model_name="contribution",
            index=models.Index(fields=["branch", "given_at"], name="finance_contrib_branch_date_idx"),
        ),
        migrations.AddIndex(
            model_name="contribution",
            index=models.Index(fields=["member"], name="finance_contrib_member_idx"),
        ),
        migrations.AddIndex(
            model_name="contribution",
            index=models.Index(fields=["financial_period"], name="finance_contrib_period_idx"),
        ),
        migrations.CreateModel(
            name="Receipt",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True, verbose_name="created at")),
                ("updated_at", models.DateTimeField(auto_now=True, verbose_name="updated at")),
                ("deleted_at", models.DateTimeField(blank=True, null=True, verbose_name="deleted at")),
                ("number", models.CharField(max_length=50, verbose_name="receipt number")),
                ("generated_at", models.DateTimeField(auto_now_add=True, verbose_name="generated at")),
                ("pdf_url", models.URLField(blank=True, verbose_name="PDF URL")),
                ("contribution", models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name="receipt", to="finance.contribution", verbose_name="contribution")),
            ],
            options={"verbose_name": "receipt", "verbose_name_plural": "receipts", "ordering": ["-generated_at"]},
        ),
    ]
