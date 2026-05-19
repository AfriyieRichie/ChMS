import pytest
from django.urls import reverse

from apps.accounts.models import User, Role, Capability, RoleCapability, UserRoleAssignment
from apps.branches.models import Branch
from apps.attendance.models import ServiceType, AttendanceRecord


@pytest.fixture
def branch(db):
    return Branch.objects.create(name="Main Branch", slug="main", code="MAIN")


@pytest.fixture
def attendance_caps(db):
    view = Capability.objects.create(codename="attendance.view")
    manage = Capability.objects.create(codename="attendance.manage")
    return {"attendance.view": view, "attendance.manage": manage}


@pytest.fixture
def clerk_role(db, attendance_caps):
    role = Role.objects.create(name="Clerk")
    RoleCapability.objects.create(role=role, capability=attendance_caps["attendance.view"])
    RoleCapability.objects.create(role=role, capability=attendance_caps["attendance.manage"])
    return role


@pytest.fixture
def clerk_user(db, branch, clerk_role):
    user = User.objects.create_user(email="clerk@test.com", password="pass", full_name="Clerk")
    UserRoleAssignment.objects.create(user=user, role=clerk_role, branch=branch)
    return user


@pytest.fixture
def service_type(db, branch):
    return ServiceType.objects.create(name="Sunday Service", branch=branch)


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
class TestAttendanceRecord:
    def test_clerk_can_create_record(self, client, clerk_user, branch, service_type):
        headers = {**auth_header(client, clerk_user), **branch_header(branch)}
        payload = {
            "branch": branch.pk,
            "service_type": service_type.pk,
            "date": "2024-06-02",
            "attendance_type": "physical",
            "total_count": 120,
            "male_count": 55,
            "female_count": 65,
            "first_timers": 5,
        }
        resp = client.post(reverse("attendance-list"), payload, content_type="application/json", **headers)
        assert resp.status_code == 201
        assert AttendanceRecord.objects.filter(date="2024-06-02").exists()

    def test_clerk_can_list(self, client, clerk_user, branch, service_type):
        AttendanceRecord.objects.create(
            branch=branch, service_type=service_type,
            date="2024-06-02", total_count=100,
        )
        headers = {**auth_header(client, clerk_user), **branch_header(branch)}
        resp = client.get(reverse("attendance-list"), **headers)
        assert resp.status_code == 200
        assert len(resp.data["results"]) == 1

    def test_unauthenticated_denied(self, client, branch):
        resp = client.get(reverse("attendance-list"), **branch_header(branch))
        assert resp.status_code == 401

    def test_service_type_list(self, client, clerk_user, branch, service_type):
        headers = {**auth_header(client, clerk_user), **branch_header(branch)}
        resp = client.get(reverse("service-type-list"), **headers)
        assert resp.status_code == 200
