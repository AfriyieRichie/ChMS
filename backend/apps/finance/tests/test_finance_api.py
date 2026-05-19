import pytest
from decimal import Decimal
from django.urls import reverse

from apps.accounts.models import User, Role, Capability, RoleCapability, UserRoleAssignment
from apps.branches.models import Branch
from apps.members.models import Member
from apps.finance.models import Fund, GivingCategory, FinancialPeriod, Pledge, Contribution


# ── Fixtures ────────────────────────────────────────────────────────────────

@pytest.fixture
def branch(db):
    return Branch.objects.create(name="Test Branch", slug="test", code="TST")


@pytest.fixture
def other_branch(db):
    return Branch.objects.create(name="Other Branch", slug="other", code="OTH")


@pytest.fixture
def fund(db, branch):
    return Fund.objects.create(branch=branch, name="General Fund", code="GEN")


@pytest.fixture
def category(db, branch):
    return GivingCategory.objects.create(branch=branch, name="Tithe")


@pytest.fixture
def member(db, branch):
    return Member.objects.create(first_name="Kwame", last_name="Asante")


@pytest.fixture
def finance_caps(db):
    caps = {}
    for codename in [
        "finance.view_giving", "finance.record_giving",
        "finance.manage_funds", "finance.lock_period", "finance.view_reports",
    ]:
        caps[codename] = Capability.objects.create(codename=codename)
    return caps


@pytest.fixture
def finance_officer_role(db, finance_caps):
    role = Role.objects.create(name="Finance Officer")
    for cap in finance_caps.values():
        RoleCapability.objects.create(role=role, capability=cap)
    return role


@pytest.fixture
def viewer_role(db, finance_caps):
    role = Role.objects.create(name="Finance Viewer")
    RoleCapability.objects.create(role=role, capability=finance_caps["finance.view_giving"])
    return role


@pytest.fixture
def finance_user(db, branch, finance_officer_role):
    user = User.objects.create_user(email="finance@test.com", password="pass", full_name="Finance User")
    UserRoleAssignment.objects.create(user=user, role=finance_officer_role, branch=branch)
    return user


@pytest.fixture
def viewer_user(db, branch, viewer_role):
    user = User.objects.create_user(email="viewer@test.com", password="pass", full_name="Viewer")
    UserRoleAssignment.objects.create(user=user, role=viewer_role, branch=branch)
    return user


def auth_header(client, user):
    resp = client.post(
        reverse("token-obtain"),
        {"email": user.email, "password": "pass"},
        content_type="application/json",
    )
    return {"HTTP_AUTHORIZATION": f"Bearer {resp.data['access']}"}


def branch_header(branch):
    return {"HTTP_X_BRANCH_ID": str(branch.pk)}


def headers(client, user, branch):
    return {**auth_header(client, user), **branch_header(branch)}


# ── Fund tests ───────────────────────────────────────────────────────────────

@pytest.mark.django_db
class TestFundAPI:
    def test_finance_user_can_list_funds(self, client, finance_user, branch, fund):
        resp = client.get(reverse("fund-list"), **headers(client, finance_user, branch))
        assert resp.status_code == 200

    def test_finance_user_can_create_fund(self, client, finance_user, branch):
        payload = {"name": "Building Fund", "branch": branch.pk, "is_designated": True}
        resp = client.post(reverse("fund-list"), payload, content_type="application/json",
                           **headers(client, finance_user, branch))
        assert resp.status_code == 201
        assert Fund.objects.filter(name="Building Fund").exists()

    def test_viewer_cannot_create_fund(self, client, viewer_user, branch):
        payload = {"name": "Welfare Fund", "branch": branch.pk}
        resp = client.post(reverse("fund-list"), payload, content_type="application/json",
                           **headers(client, viewer_user, branch))
        assert resp.status_code == 403

    def test_unauthenticated_denied(self, client, branch):
        resp = client.get(reverse("fund-list"), **branch_header(branch))
        assert resp.status_code == 401


# ── Contribution tests ───────────────────────────────────────────────────────

@pytest.mark.django_db
class TestContributionAPI:
    def test_create_contribution(self, client, finance_user, branch, fund, category, member):
        payload = {
            "branch": branch.pk,
            "fund": fund.pk,
            "category": category.pk,
            "member": member.pk,
            "amount": "500.00",
            "currency": "GHS",
            "given_at": "2024-06-02",
            "payment_method": "cash",
        }
        resp = client.post(reverse("contribution-list"), payload, content_type="application/json",
                           **headers(client, finance_user, branch))
        assert resp.status_code == 201
        assert resp.data["receipt_number"].startswith("TST-2024-")
        assert Contribution.objects.filter(fund=fund).exists()

    def test_amount_must_be_positive(self, client, finance_user, branch, fund):
        payload = {"branch": branch.pk, "fund": fund.pk, "amount": "-100",
                   "given_at": "2024-06-02", "payment_method": "cash"}
        resp = client.post(reverse("contribution-list"), payload, content_type="application/json",
                           **headers(client, finance_user, branch))
        assert resp.status_code == 400

    def test_contributions_are_append_only(self, client, finance_user, branch, fund):
        contrib = Contribution.objects.create(
            branch=branch, fund=fund, amount=Decimal("100.00"),
            given_at="2024-06-02", payment_method="cash",
            recorded_by=finance_user,
        )
        resp = client.patch(
            reverse("contribution-detail", args=[contrib.pk]),
            {"amount": "200.00"}, content_type="application/json",
            **headers(client, finance_user, branch),
        )
        assert resp.status_code == 403

    def test_contribution_delete_denied(self, client, finance_user, branch, fund):
        contrib = Contribution.objects.create(
            branch=branch, fund=fund, amount=Decimal("100.00"),
            given_at="2024-06-02", payment_method="cash",
            recorded_by=finance_user,
        )
        resp = client.delete(
            reverse("contribution-detail", args=[contrib.pk]),
            **headers(client, finance_user, branch),
        )
        assert resp.status_code == 403

    def test_reverse_contribution(self, client, finance_user, branch, fund):
        contrib = Contribution.objects.create(
            branch=branch, fund=fund, amount=Decimal("300.00"),
            given_at="2024-06-02", payment_method="cash",
            recorded_by=finance_user,
        )
        resp = client.post(
            reverse("contribution-reverse", args=[contrib.pk]),
            {"reason": "Entered wrong amount"},
            content_type="application/json",
            **headers(client, finance_user, branch),
        )
        assert resp.status_code == 201
        assert resp.data["is_reversal"] is True
        assert Decimal(resp.data["amount"]) == Decimal("-300.00")

    def test_cannot_double_reverse(self, client, finance_user, branch, fund):
        contrib = Contribution.objects.create(
            branch=branch, fund=fund, amount=Decimal("200.00"),
            given_at="2024-06-02", payment_method="cash",
            recorded_by=finance_user,
        )
        client.post(
            reverse("contribution-reverse", args=[contrib.pk]),
            {}, content_type="application/json",
            **headers(client, finance_user, branch),
        )
        resp = client.post(
            reverse("contribution-reverse", args=[contrib.pk]),
            {}, content_type="application/json",
            **headers(client, finance_user, branch),
        )
        assert resp.status_code == 400

    def test_viewer_cannot_create_contribution(self, client, viewer_user, branch, fund):
        payload = {"branch": branch.pk, "fund": fund.pk, "amount": "100",
                   "given_at": "2024-06-02", "payment_method": "cash"}
        resp = client.post(reverse("contribution-list"), payload, content_type="application/json",
                           **headers(client, viewer_user, branch))
        assert resp.status_code == 403

    def test_summary_endpoint(self, client, finance_user, branch, fund):
        Contribution.objects.create(
            branch=branch, fund=fund, amount=Decimal("500.00"),
            given_at="2024-06-02", payment_method="cash", recorded_by=finance_user,
        )
        resp = client.get(reverse("contribution-summary"), **headers(client, finance_user, branch))
        assert resp.status_code == 200
        assert "grand_total" in resp.data
        assert "by_fund" in resp.data


# ── Financial Period tests ────────────────────────────────────────────────────

@pytest.mark.django_db
class TestFinancialPeriod:
    def test_lock_period(self, client, finance_user, branch):
        period = FinancialPeriod.objects.create(branch=branch, year=2024, month=6)
        resp = client.post(
            reverse("financial-period-lock", args=[period.pk]),
            **headers(client, finance_user, branch),
        )
        assert resp.status_code == 200
        period.refresh_from_db()
        assert period.is_locked

    def test_locked_period_blocks_contributions(self, client, finance_user, branch, fund):
        period = FinancialPeriod.objects.create(branch=branch, year=2024, month=5)
        from django.utils import timezone
        period.locked_at = timezone.now()
        period.save()

        payload = {
            "branch": branch.pk, "fund": fund.pk, "amount": "100",
            "given_at": "2024-05-15", "payment_method": "cash",
            "financial_period": period.pk,
        }
        resp = client.post(reverse("contribution-list"), payload, content_type="application/json",
                           **headers(client, finance_user, branch))
        assert resp.status_code == 400
