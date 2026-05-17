import pytest
from django.contrib.auth import get_user_model

User = get_user_model()


@pytest.mark.django_db
class TestUserModel:
    def test_create_user(self):
        user = User.objects.create_user(
            email="member@example.com",
            password="securepassword123",
            full_name="Ama Owusu",
        )
        assert user.email == "member@example.com"
        assert user.full_name == "Ama Owusu"
        assert user.check_password("securepassword123")
        assert user.is_active is True
        assert user.is_staff is False
        assert user.is_superuser is False
        assert user.is_network_admin is False

    def test_create_user_email_normalised(self):
        user = User.objects.create_user(email="ADMIN@Example.COM", full_name="Test")
        assert user.email == "ADMIN@example.com"

    def test_create_user_requires_email(self):
        with pytest.raises(ValueError, match="Email address is required"):
            User.objects.create_user(email="", full_name="No Email")

    def test_create_superuser(self):
        superuser = User.objects.create_superuser(
            email="super@example.com",
            password="superpassword",
            full_name="Super Admin",
        )
        assert superuser.is_staff is True
        assert superuser.is_superuser is True
        assert superuser.is_network_admin is True

    def test_str_returns_email(self):
        user = User.objects.create_user(email="str@example.com", full_name="Test User")
        assert str(user) == "str@example.com"

    def test_email_is_login_field(self):
        assert User.USERNAME_FIELD == "email"

    def test_soft_delete_field_exists(self):
        user = User.objects.create_user(email="soft@example.com", full_name="Soft Del")
        assert user.deleted_at is None


@pytest.mark.django_db
class TestHealthEndpoint:
    def test_health_check_returns_ok(self, client):
        response = client.get("/api/v1/health/")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert "version" in data

    def test_health_check_unauthenticated(self, client):
        """Health check must be accessible without auth."""
        response = client.get("/api/v1/health/")
        assert response.status_code == 200
