import csv

from django.conf import settings
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import send_mail
from django.http import HttpResponse
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from apps.branches.models import Branch

from .models import User, Role, UserRoleAssignment, Capability, NotificationPreference
from .permissions import make_capability_permission
from .serializers import (
    UserSerializer,
    InviteUserSerializer,
    AssignRoleSerializer,
    RoleSerializer,
    MeSerializer,
    NotificationPreferenceSerializer,
)

CanManageUsers = make_capability_permission("users.manage")


@api_view(["POST"])
@permission_classes([AllowAny])
def password_reset_request(request):
    email = request.data.get("email", "").strip().lower()
    if not email:
        return Response({"detail": "Email is required."}, status=400)
    try:
        user = User.objects.get(email__iexact=email, is_active=True, deleted_at__isnull=True)
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = default_token_generator.make_token(user)
        frontend_url = getattr(settings, "FRONTEND_URL", "http://localhost:3000")
        reset_url = f"{frontend_url}/reset-password/confirm?uid={uid}&token={token}"
        send_mail(
            subject="Reset your ChMS password",
            message=(
                f"Hi {user.full_name},\n\n"
                f"Click the link below to reset your password:\n\n{reset_url}\n\n"
                "This link expires in 24 hours.\n\n"
                "If you didn't request this, you can safely ignore this email."
            ),
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=True,
        )
    except User.DoesNotExist:
        pass
    return Response({"detail": "If that email is registered, you'll receive a reset link shortly."})


@api_view(["POST"])
@permission_classes([AllowAny])
def password_reset_confirm(request):
    uid = request.data.get("uid", "")
    token = request.data.get("token", "")
    new_password = request.data.get("new_password", "")
    if not all([uid, token, new_password]):
        return Response({"detail": "uid, token, and new_password are required."}, status=400)
    if len(new_password) < 8:
        return Response({"detail": "Password must be at least 8 characters."}, status=400)
    try:
        pk = force_str(urlsafe_base64_decode(uid))
        user = User.objects.get(pk=pk)
    except (TypeError, ValueError, OverflowError, User.DoesNotExist):
        return Response({"detail": "Invalid reset link."}, status=400)
    if not default_token_generator.check_token(user, token):
        return Response({"detail": "Reset link is invalid or has expired."}, status=400)
    user.set_password(new_password)
    user.is_active = True
    user.save()
    return Response({"detail": "Password set successfully. You can now sign in."})


@api_view(["GET", "PATCH"])
@permission_classes([IsAuthenticated])
def me(request):
    if request.method == "GET":
        return Response(MeSerializer(request.user).data)
    updatable = {k: v for k, v in request.data.items() if k in ("full_name", "phone")}
    if not updatable:
        return Response({"detail": "No updatable fields provided."}, status=400)
    for field, val in updatable.items():
        setattr(request.user, field, val)
    request.user.save(update_fields=list(updatable.keys()))
    return Response(MeSerializer(request.user).data)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def change_password(request):
    old_password = request.data.get("old_password", "")
    new_password = request.data.get("new_password", "")
    if not old_password or not new_password:
        return Response({"detail": "old_password and new_password are required."}, status=400)
    if not request.user.check_password(old_password):
        return Response({"detail": "Current password is incorrect."}, status=400)
    if len(new_password) < 8:
        return Response({"detail": "Password must be at least 8 characters."}, status=400)
    request.user.set_password(new_password)
    request.user.save()
    return Response({"detail": "Password changed successfully."})


class RoleViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Role.objects.prefetch_related("role_capabilities__capability").order_by("name")
    serializer_class = RoleSerializer
    permission_classes = [IsAuthenticated]


class UserViewSet(viewsets.ModelViewSet):
    permission_classes = [CanManageUsers]

    def get_serializer_class(self):
        if self.action in ("create", "invite"):
            return InviteUserSerializer
        return UserSerializer

    def get_queryset(self):
        user = self.request.user
        branch_id = self.request.headers.get("X-Branch-Id")

        if user.is_network_admin:
            qs = User.objects.filter(deleted_at__isnull=True)
            if branch_id and branch_id != "all":
                qs = qs.filter(role_assignments__branch_id=branch_id).distinct()
            return qs.prefetch_related("role_assignments__role", "role_assignments__branch")

        if branch_id:
            return (
                User.objects.filter(
                    role_assignments__branch_id=branch_id,
                    deleted_at__isnull=True,
                )
                .distinct()
                .prefetch_related("role_assignments__role", "role_assignments__branch")
            )
        return User.objects.none()

    def create(self, request, *args, **kwargs):
        serializer = InviteUserSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        self._send_invite_email(user)
        return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)

    def destroy(self, request, *args, **kwargs):
        from django.utils import timezone
        instance = self.get_object()
        instance.deleted_at = timezone.now()
        instance.is_active = False
        instance.save(update_fields=["deleted_at", "is_active"])
        return Response(status=status.HTTP_204_NO_CONTENT)

    def _send_invite_email(self, user):
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = default_token_generator.make_token(user)
        frontend_url = getattr(settings, "FRONTEND_URL", "http://localhost:3000")
        invite_url = f"{frontend_url}/set-password?uid={uid}&token={token}"
        send_mail(
            subject="You've been invited to ChMS",
            message=(
                f"Hi {user.full_name},\n\n"
                f"You have been added to ChMS. Click the link below to set your password "
                f"and activate your account:\n\n{invite_url}\n\n"
                "This link expires in 24 hours. If you have any questions, "
                "contact your branch administrator."
            ),
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=True,
        )

    @action(detail=True, methods=["post"], url_path="send-reset")
    def send_reset(self, request, pk=None):
        user = self.get_object()
        if not user.is_active:
            return Response({"detail": "Cannot reset password for an inactive user."}, status=400)
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = default_token_generator.make_token(user)
        frontend_url = getattr(settings, "FRONTEND_URL", "http://localhost:3000")
        reset_url = f"{frontend_url}/reset-password/confirm?uid={uid}&token={token}"
        send_mail(
            subject="Reset your ChMS password",
            message=(
                f"Hi {user.full_name},\n\n"
                f"An administrator has requested a password reset for your account.\n\n"
                f"Click the link below to set a new password:\n\n{reset_url}\n\n"
                "This link expires in 24 hours."
            ),
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=True,
        )
        return Response({"detail": f"Password reset email sent to {user.email}."})

    @action(detail=True, methods=["get"], url_path="capabilities")
    def capabilities(self, request, pk=None):
        user = self.get_object()
        all_caps = list(
            Capability.objects.filter(
                role_capabilities__role__user_assignments__user=user
            )
            .distinct()
            .order_by("codename")
            .values("codename", "description")
        )
        by_role = []
        for ra in (
            user.role_assignments
            .select_related("role", "branch")
            .prefetch_related("role__role_capabilities__capability")
        ):
            by_role.append({
                "role": ra.role.name,
                "branch": ra.branch.name if ra.branch else None,
                "capabilities": list(
                    ra.role.role_capabilities.values_list("capability__codename", flat=True)
                ),
            })
        return Response({"all_capabilities": all_caps, "by_role": by_role})

    @action(detail=True, methods=["post"], url_path="assign-role")
    def assign_role(self, request, pk=None):
        user = self.get_object()
        serializer = AssignRoleSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        role = serializer.validated_data["role"]
        branch_id = serializer.validated_data.get("branch")
        branch = None
        if branch_id:
            try:
                branch = Branch.objects.get(pk=branch_id, deleted_at__isnull=True)
            except Branch.DoesNotExist:
                return Response({"branch": "Branch not found."}, status=status.HTTP_400_BAD_REQUEST)

        assignment, created = UserRoleAssignment.objects.get_or_create(
            user=user, role=role, branch=branch
        )
        return Response(
            {"id": assignment.pk, "role": role.pk, "role_name": role.name,
             "branch": branch.pk if branch else None,
             "branch_name": branch.name if branch else None},
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )

    @action(detail=True, methods=["delete"], url_path=r"roles/(?P<assignment_pk>[^/.]+)")
    def remove_role(self, request, pk=None, assignment_pk=None):
        user = self.get_object()
        try:
            assignment = user.role_assignments.get(pk=assignment_pk)
        except UserRoleAssignment.DoesNotExist:
            return Response({"detail": "Assignment not found."}, status=status.HTTP_404_NOT_FOUND)
        assignment.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ── Me – giving, attendance, groups, notifications ────────────────────────────

def _member_or_none(user):
    try:
        return user.member_profile
    except Exception:
        return None


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def me_notifications(request):
    prefs, _ = NotificationPreference.objects.get_or_create(user=request.user)
    return Response(NotificationPreferenceSerializer(prefs).data)


@api_view(["PATCH"])
@permission_classes([IsAuthenticated])
def me_notifications_update(request):
    prefs, _ = NotificationPreference.objects.get_or_create(user=request.user)
    serializer = NotificationPreferenceSerializer(prefs, data=request.data, partial=True)
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return Response(serializer.data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def me_giving(request):
    member = _member_or_none(request.user)
    if not member:
        return Response({"has_member_profile": False, "results": []})

    from apps.finance.models import Contribution
    year = request.query_params.get("year")
    qs = Contribution.objects.filter(
        member=member, is_reversal=False
    ).order_by("-given_at")
    if year:
        qs = qs.filter(given_at__year=year)

    results = list(
        qs.values(
            "id", "receipt_number", "amount", "currency",
            "given_at", "payment_method",
            "fund__name", "category__name",
        )
    )
    grand_total = sum(float(r["amount"]) for r in results)
    return Response({
        "has_member_profile": True,
        "grand_total": grand_total,
        "results": results,
    })


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def me_giving_statement(request):
    member = _member_or_none(request.user)
    if not member:
        return Response({"detail": "No member profile linked to your account."}, status=404)

    from apps.finance.models import Contribution
    from datetime import date
    year = request.query_params.get("year", str(date.today().year))

    qs = Contribution.objects.filter(
        member=member, is_reversal=False, given_at__year=year
    ).order_by("given_at").values(
        "receipt_number", "given_at", "fund__name", "category__name",
        "amount", "currency", "payment_method",
    )

    response = HttpResponse(content_type="text/csv")
    response["Content-Disposition"] = f'attachment; filename="giving-statement-{year}.csv"'
    writer = csv.writer(response)
    writer.writerow(["Receipt", "Date", "Fund", "Category", "Amount", "Currency", "Method"])
    for c in qs:
        writer.writerow([
            c["receipt_number"], c["given_at"], c["fund__name"] or "",
            c["category__name"] or "", c["amount"], c["currency"],
            c["payment_method"],
        ])
    return response


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def me_attendance(request):
    member = _member_or_none(request.user)
    if not member:
        return Response({"has_member_profile": False, "results": []})

    from apps.attendance.models import AttendanceEntry
    entries = (
        AttendanceEntry.objects.filter(member=member)
        .select_related("attendance_record", "attendance_record__service_type", "attendance_record__branch")
        .order_by("-attendance_record__date")[:200]
    )
    results = [
        {
            "date": e.attendance_record.date,
            "service": e.attendance_record.service_type.name if e.attendance_record.service_type else None,
            "branch": e.attendance_record.branch.name if e.attendance_record.branch else None,
        }
        for e in entries
    ]
    return Response({"has_member_profile": True, "results": results})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def me_groups(request):
    member = _member_or_none(request.user)
    if not member:
        return Response({"has_member_profile": False, "results": []})

    from apps.groups.models import GroupMembership
    memberships = (
        GroupMembership.objects.filter(member=member)
        .select_related("group")
        .order_by("left_at", "-joined_at")
    )
    results = [
        {
            "group_id": m.group.id,
            "group_name": m.group.name,
            "group_type": m.group.type,
            "joined_at": m.joined_at,
            "left_at": m.left_at,
            "is_active": m.left_at is None,
        }
        for m in memberships
    ]
    return Response({"has_member_profile": True, "results": results})
