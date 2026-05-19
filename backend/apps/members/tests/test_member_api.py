import pytest
from django.urls import reverse

from apps.accounts.models import User, Role, Capability, RoleCapability, UserRoleAssignment
from apps.branches.models import Branch
from apps.members.models import Member, Household, BranchMembership


@pytest.fixture
def branch(db):
    return Branch.objects.create(
        name="Main Branch", slug="main", code="MAIN",
        joined_at="2024-01-01" if False else None,
    )


@pytest.fixture
def branch(db):
    return Branch.objects.create(name="Main Branch", slug="main", code="MAIN")


@pytest.fixture
def capabilities(db):
    caps = {}
    for codename in ["members.view", "members.manage", "households.view", "households.manage"]:
        caps[codename] = Capability.objects.create(codename=codename)
    return caps


@pytest.fixture
def member_viewer_role(db, capabilities):
    role = Role.objects.create(name="Member Viewer")
    RoleCapability.objects.create(role=role, capability=capabilities["members.view"])
    RoleCapability.objects.create(role=role, capability=capabilities["households.view"])
    return role


@pytest.fixture
def member_manager_role(db, capabilities):
    role = Role.objects.create(name="Member Manager")
    for cap in capabilities.values():
        RoleCapability.objects.create(role=role, capability=cap)
    return role


@pytest.fixture
def viewer_user(db, branch, member_viewer_role):
    user = User.objects.create_user(email="viewer@test.com", password="pass", full_name="Viewer User")
    UserRoleAssignment.objects.create(user=user, role=member_viewer_role, branch=branch)
    return user


@pytest.fixture
def manager_user(db, branch, member_manager_role):
    user = User.objects.create_user(email="manager@test.com", password="pass", full_name="Manager User")
    UserRoleAssignment.objects.create(user=user, role=member_manager_role, branch=branch)
    return user


@pytest.fixture
def network_admin(db):
    return User.objects.create_user(
        email="admin@test.com", password="pass",
        full_name="Admin", is_network_admin=True,
    )


def auth_header(client, user):
    resp = client.post(
        reverse("token-obtain"),
        {"email": user.email, "password": "pass"},
        content_type="application/json",
    )
    return {"HTTP_AUTHORIZATION": f"Bearer {resp.data['access']}"}


def branch_header(branch):
    return {"HTTP_X_BRANCH_ID": str(branch.pk)}


@pytest.mark.django_db
class TestMemberList:
    def test_viewer_can_list(self, client, viewer_user, branch):
        headers = {**auth_header(client, viewer_user), **branch_header(branch)}
        resp = client.get(reverse("member-list"), **headers)
        assert resp.status_code == 200

    def test_unauthenticated_denied(self, client, branch):
        resp = client.get(reverse("member-list"), **branch_header(branch))
        assert resp.status_code == 401

    def test_manager_can_create(self, client, manager_user, branch):
        headers = {**auth_header(client, manager_user), **branch_header(branch)}
        payload = {
            "first_name": "John",
            "last_name": "Doe",
            "membership_status": "visitor",
        }
        resp = client.post(reverse("member-list"), payload, content_type="application/json", **headers)
        assert resp.status_code == 201
        assert resp.data["first_name"] == "John"

    def test_viewer_cannot_create(self, client, viewer_user, branch):
        headers = {**auth_header(client, viewer_user), **branch_header(branch)}
        payload = {"first_name": "Jane", "last_name": "Doe", "membership_status": "visitor"}
        resp = client.post(reverse("member-list"), payload, content_type="application/json", **headers)
        assert resp.status_code == 403

    def test_branch_scoping(self, client, network_admin, branch, db):
        other = Branch.objects.create(name="Other Branch", slug="other", code="OTH")
        Member.objects.create(first_name="A", last_name="B")
        headers = {**auth_header(client, network_admin), **branch_header(branch)}
        resp = client.get(reverse("member-list"), **headers)
        assert resp.status_code == 200


@pytest.mark.django_db
class TestHouseholdAPI:
    def test_viewer_can_list_households(self, client, viewer_user, branch):
        headers = {**auth_header(client, viewer_user), **branch_header(branch)}
        resp = client.get(reverse("household-list"), **headers)
        assert resp.status_code == 200

    def test_manager_can_create_household(self, client, manager_user, branch):
        headers = {**auth_header(client, manager_user), **branch_header(branch)}
        payload = {"name": "Smith Family", "branch": branch.pk}
        resp = client.post(reverse("household-list"), payload, content_type="application/json", **headers)
        assert resp.status_code == 201
        assert Household.objects.filter(name="Smith Family").exists()
