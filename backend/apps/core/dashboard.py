from decimal import Decimal

from django.db.models import Sum, Q
from django.utils import timezone

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.branches.models import Branch


def _resolve_branch(request):
    branch_id = request.headers.get("X-Branch-Id")
    if not branch_id:
        return None
    try:
        return Branch.objects.get(pk=branch_id, deleted_at__isnull=True)
    except Branch.DoesNotExist:
        return None


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def dashboard_summary(request):
    branch = _resolve_branch(request)
    if not branch:
        return Response({"error": "Branch not found."}, status=400)

    today = timezone.now().date()
    now = timezone.now()

    # Active members (current branch memberships)
    from apps.members.models import BranchMembership
    member_count = BranchMembership.objects.filter(
        branch=branch, left_at__isnull=True, deleted_at__isnull=True
    ).count()

    # Most recent attendance record
    from apps.attendance.models import AttendanceRecord
    last_att = (
        AttendanceRecord.objects.filter(branch=branch, deleted_at__isnull=True)
        .order_by("-date")
        .values("date", "total_count")
        .first()
    )

    # This month's giving (non-reversal contributions)
    from apps.finance.models import Contribution
    month_total = (
        Contribution.objects.filter(
            branch=branch,
            deleted_at__isnull=True,
            is_reversal=False,
            given_at__year=today.year,
            given_at__month=today.month,
        ).aggregate(total=Sum("amount"))["total"]
        or Decimal("0")
    )

    # Upcoming published events
    from apps.events.models import Event
    upcoming_events = Event.objects.filter(
        branch=branch, deleted_at__isnull=True, is_published=True, start_datetime__gte=now
    ).count()

    # Active groups
    from apps.groups.models import Group
    group_count = Group.objects.filter(
        branch=branch, deleted_at__isnull=True, is_active=True
    ).count()

    # Recent active announcements (up to 3)
    from apps.communications.models import Announcement
    announcements = list(
        Announcement.objects.filter(
            branch=branch,
            deleted_at__isnull=True,
            is_published=True,
        ).filter(
            Q(expires_at__isnull=True) | Q(expires_at__gt=now)
        ).order_by("-published_at")
        .values("id", "title", "body", "audience", "published_at")[:3]
    )

    return Response({
        "members": {"total": member_count},
        "attendance": {
            "last_date": last_att["date"] if last_att else None,
            "last_total": last_att["total_count"] if last_att else 0,
        },
        "finance": {
            "this_month": str(month_total),
            "currency": "GHS",
            "month": today.month,
            "year": today.year,
        },
        "events": {"upcoming": upcoming_events},
        "groups": {"active": group_count},
        "announcements": announcements,
    })
