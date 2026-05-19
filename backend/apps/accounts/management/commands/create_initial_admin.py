import os
from django.core.management.base import BaseCommand
from apps.accounts.models import User


class Command(BaseCommand):
    help = "Create the initial network-admin user from env vars (idempotent)"

    def handle(self, *args, **options):
        email = os.environ.get("ADMIN_EMAIL")
        password = os.environ.get("ADMIN_PASSWORD")

        if not email or not password:
            self.stdout.write("ADMIN_EMAIL or ADMIN_PASSWORD not set — skipping.")
            return

        if User.objects.filter(email=email).exists():
            self.stdout.write(f"Admin {email} already exists — skipping.")
            return

        User.objects.create_superuser(
            email=email,
            password=password,
            full_name=os.environ.get("ADMIN_NAME", "System Admin"),
            is_network_admin=True,
        )
        self.stdout.write(self.style.SUCCESS(f"Created admin: {email}"))
