from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        ("accounts", "0003_user_last_login_branch"),
        ("branches", "0001_initial_branch"),
    ]

    operations = [
        migrations.CreateModel(
            name="Household",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True, verbose_name="created at")),
                ("updated_at", models.DateTimeField(auto_now=True, verbose_name="updated at")),
                ("deleted_at", models.DateTimeField(blank=True, null=True, verbose_name="deleted at")),
                ("name", models.CharField(max_length=255, verbose_name="household name")),
                ("address", models.TextField(blank=True, verbose_name="address")),
                ("phone", models.CharField(blank=True, max_length=30, verbose_name="phone")),
                ("branch", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="households", to="branches.branch", verbose_name="branch")),
            ],
            options={"verbose_name": "household", "verbose_name_plural": "households", "ordering": ["name"]},
        ),
        migrations.CreateModel(
            name="Member",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True, verbose_name="created at")),
                ("updated_at", models.DateTimeField(auto_now=True, verbose_name="updated at")),
                ("deleted_at", models.DateTimeField(blank=True, null=True, verbose_name="deleted at")),
                ("first_name", models.CharField(max_length=100, verbose_name="first name")),
                ("middle_name", models.CharField(blank=True, max_length=100, verbose_name="middle name")),
                ("last_name", models.CharField(max_length=100, verbose_name="last name")),
                ("gender", models.CharField(blank=True, choices=[("male", "Male"), ("female", "Female"), ("other", "Other")], max_length=10, verbose_name="gender")),
                ("date_of_birth", models.DateField(blank=True, null=True, verbose_name="date of birth")),
                ("marital_status", models.CharField(blank=True, choices=[("single", "Single"), ("married", "Married"), ("divorced", "Divorced"), ("widowed", "Widowed")], max_length=20, verbose_name="marital status")),
                ("occupation", models.CharField(blank=True, max_length=100, verbose_name="occupation")),
                ("phone", models.CharField(blank=True, max_length=30, verbose_name="phone")),
                ("email", models.EmailField(blank=True, verbose_name="email")),
                ("address", models.TextField(blank=True, verbose_name="address")),
                ("photo", models.ImageField(blank=True, null=True, upload_to="members/photos/", verbose_name="photo")),
                ("membership_status", models.CharField(choices=[("visitor", "Visitor"), ("regular", "Regular Attendee"), ("member", "Member"), ("inactive", "Inactive")], default="visitor", max_length=20, verbose_name="membership status")),
                ("date_joined", models.DateField(blank=True, null=True, verbose_name="date joined")),
                ("baptism_status", models.CharField(choices=[("not_baptised", "Not Baptised"), ("baptised", "Baptised"), ("pending", "Pending")], default="not_baptised", max_length=20, verbose_name="baptism status")),
                ("baptism_date", models.DateField(blank=True, null=True, verbose_name="baptism date")),
                ("notes", models.TextField(blank=True, verbose_name="notes")),
                ("sensitive_notes", models.TextField(blank=True, verbose_name="sensitive notes")),
                ("household", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="members", to="members.household", verbose_name="household")),
                ("user", models.OneToOneField(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="member_profile", to="accounts.user", verbose_name="user account")),
            ],
            options={"verbose_name": "member", "verbose_name_plural": "members", "ordering": ["last_name", "first_name"]},
        ),
        migrations.CreateModel(
            name="BranchMembership",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True, verbose_name="created at")),
                ("updated_at", models.DateTimeField(auto_now=True, verbose_name="updated at")),
                ("deleted_at", models.DateTimeField(blank=True, null=True, verbose_name="deleted at")),
                ("joined_at", models.DateField(verbose_name="joined at")),
                ("left_at", models.DateField(blank=True, null=True, verbose_name="left at")),
                ("is_primary", models.BooleanField(default=True, verbose_name="primary branch")),
                ("transfer_reason", models.TextField(blank=True, verbose_name="transfer reason")),
                ("branch", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="member_memberships", to="branches.branch", verbose_name="branch")),
                ("member", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="branch_memberships", to="members.member", verbose_name="member")),
            ],
            options={"verbose_name": "branch membership", "verbose_name_plural": "branch memberships", "ordering": ["-joined_at"]},
        ),
        migrations.AddConstraint(
            model_name="branchmembership",
            constraint=models.UniqueConstraint(fields=["member", "branch"], name="unique_member_branch"),
        ),
        migrations.AddIndex(
            model_name="member",
            index=models.Index(fields=["last_name", "first_name"], name="members_name_idx"),
        ),
        migrations.AddIndex(
            model_name="member",
            index=models.Index(fields=["membership_status"], name="members_status_idx"),
        ),
    ]
