from datetime import timedelta
from decimal import Decimal

from django.db.models import Sum, Q
from django.db.models.functions import TruncWeek
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


def _days_until_birthday(dob, today):
    try:
        this_year = dob.replace(year=today.year)
    except ValueError:
        this_year = dob.replace(year=today.year, day=28)
    if this_year < today:
        try:
            return (dob.replace(year=today.year + 1) - today).days
        except ValueError:
            return (dob.replace(year=today.year + 1, day=28) - today).days
    return (this_year - today).days


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def dashboard_summary(request):
    """Legacy alias — proxies to dashboard_overview."""
    return dashboard_overview(request)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def dashboard_overview(request):
    branch = _resolve_branch(request)
    if not branch:
        return Response({"error": "Branch not found."}, status=400)

    today = timezone.now().date()
    now = timezone.now()
    week_start = today - timedelta(days=today.weekday())  # ISO Monday

    from apps.members.models import BranchMembership, Member
    from apps.attendance.models import AttendanceRecord, AttendanceEntry
    from apps.finance.models import Contribution
    from apps.events.models import Event
    from apps.communications.models import Announcement

    # ── Active members ────────────────────────────────────────────────────────
    member_count = BranchMembership.objects.filter(
        branch=branch, left_at__isnull=True, deleted_at__isnull=True
    ).count()

    network_total = None
    if request.user.is_network_admin:
        network_total = (
            BranchMembership.objects.filter(left_at__isnull=True, deleted_at__isnull=True)
            .values("member")
            .distinct()
            .count()
        )

    # ── Attendance trend (last 10 weeks, Mon-grouped) ─────────────────────────
    ten_weeks_ago = today - timedelta(weeks=10)
    trend_qs = (
        AttendanceRecord.objects.filter(
            branch=branch,
            deleted_at__isnull=True,
            date__gte=ten_weeks_ago,
        )
        .annotate(week=TruncWeek("date"))
        .values("week")
        .annotate(total=Sum("total_count"), ft=Sum("first_timers"))
        .order_by("week")
    )
    attendance_trend = [
        {
            "week_label": f"{row['week'].day} {row['week'].strftime('%b')}",
            "total": row["total"] or 0,
            "first_timers": row["ft"] or 0,
        }
        for row in trend_qs
    ]

    # ── Giving: this month / last month / same month last year ────────────────
    def _month_total(year, month):
        return (
            Contribution.objects.filter(
                branch=branch,
                deleted_at__isnull=True,
                is_reversal=False,
                given_at__year=year,
                given_at__month=month,
            ).aggregate(t=Sum("amount"))["t"]
            or Decimal("0")
        )

    this_month_total = _month_total(today.year, today.month)
    last_month = 12 if today.month == 1 else today.month - 1
    last_month_year = today.year - 1 if today.month == 1 else today.year
    last_month_total = _month_total(last_month_year, last_month)
    same_ly_total = _month_total(today.year - 1, today.month)

    # ── First-timers this week (individual follow-up) ─────────────────────────
    first_timer_entries = (
        AttendanceEntry.objects.filter(
            attendance_record__branch=branch,
            attendance_record__date__gte=week_start,
            attendance_record__deleted_at__isnull=True,
            is_first_visit=True,
            member__isnull=False,
        )
        .select_related("member", "attendance_record")
        .order_by("-attendance_record__date")
    )
    first_timers_week = [
        {
            "id": e.member.id,
            "full_name": e.member.full_name,
            "phone": e.member.phone,
            "service_date": e.attendance_record.date.isoformat(),
        }
        for e in first_timer_entries
    ]

    # ── Upcoming events (next 7 days) ─────────────────────────────────────────
    seven_days_on = now + timedelta(days=7)
    upcoming_qs = (
        Event.objects.filter(
            branch=branch,
            deleted_at__isnull=True,
            is_published=True,
            start_datetime__gte=now,
            start_datetime__lte=seven_days_on,
        )
        .order_by("start_datetime")
        .values("id", "name", "event_type", "start_datetime", "venue")[:10]
    )
    upcoming_events = [
        {**ev, "start_datetime": ev["start_datetime"].isoformat()}
        for ev in upcoming_qs
    ]

    # ── Birthdays this week ───────────────────────────────────────────────────
    day_conditions = Q()
    for i in range(7):
        d = week_start + timedelta(days=i)
        day_conditions |= Q(date_of_birth__month=d.month, date_of_birth__day=d.day)

    birthday_qs = (
        Member.objects.filter(
            branch_memberships__branch=branch,
            branch_memberships__left_at__isnull=True,
            branch_memberships__deleted_at__isnull=True,
            deleted_at__isnull=True,
            date_of_birth__isnull=False,
        )
        .filter(day_conditions)
        .distinct()
        .values("id", "first_name", "last_name", "date_of_birth", "phone")
    )
    birthdays_week = sorted(
        [
            {
                "id": m["id"],
                "full_name": f"{m['first_name']} {m['last_name']}",
                "date_of_birth": m["date_of_birth"].isoformat(),
                "phone": m["phone"],
                "days_away": _days_until_birthday(m["date_of_birth"], today),
            }
            for m in birthday_qs
        ],
        key=lambda x: x["days_away"],
    )

    # ── Branch comparison (network admin only) ────────────────────────────────
    branch_comparison = None
    if request.user.is_network_admin:
        all_branches = Branch.objects.filter(
            deleted_at__isnull=True, is_active=True
        ).order_by("name")
        branch_comparison = []
        for b in all_branches:
            mc = BranchMembership.objects.filter(
                branch=b, left_at__isnull=True, deleted_at__isnull=True
            ).count()
            last_att = (
                AttendanceRecord.objects.filter(branch=b, deleted_at__isnull=True)
                .order_by("-date")
                .values("date", "total_count")
                .first()
            )
            branch_comparison.append({
                "id": b.id,
                "name": b.name,
                "code": b.code,
                "member_count": mc,
                "last_attendance": last_att["total_count"] if last_att else 0,
                "last_attendance_date": last_att["date"].isoformat() if last_att else None,
            })

    # ── Announcements (up to 3 active) ────────────────────────────────────────
    announcements = list(
        Announcement.objects.filter(
            branch=branch,
            deleted_at__isnull=True,
            is_published=True,
        )
        .filter(Q(expires_at__isnull=True) | Q(expires_at__gt=now))
        .order_by("-published_at")
        .values("id", "title", "body", "audience", "published_at")[:3]
    )

    # ── Upcoming events count + active groups (for stat cards) ───────────────
    from apps.groups.models import Group
    group_count = Group.objects.filter(
        branch=branch, deleted_at__isnull=True, is_active=True
    ).count()
    upcoming_count = Event.objects.filter(
        branch=branch, deleted_at__isnull=True, is_published=True, start_datetime__gte=now
    ).count()
    last_att_record = (
        AttendanceRecord.objects.filter(branch=branch, deleted_at__isnull=True)
        .order_by("-date")
        .values("date", "total_count")
        .first()
    )

    return Response({
        "members": {
            "branch_total": member_count,
            "network_total": network_total,
        },
        "attendance": {
            "last_date": last_att_record["date"].isoformat() if last_att_record else None,
            "last_total": last_att_record["total_count"] if last_att_record else 0,
            "upcoming_events": upcoming_count,
            "active_groups": group_count,
        },
        "attendance_trend": attendance_trend,
        "finance": {
            "this_month": str(this_month_total),
            "last_month": str(last_month_total),
            "same_month_last_year": str(same_ly_total),
            "currency": "GHS",
            "month": today.month,
            "year": today.year,
        },
        "first_timers_week": first_timers_week,
        "upcoming_events": upcoming_events,
        "birthdays_week": birthdays_week,
        "branch_comparison": branch_comparison,
        "announcements": announcements,
    })
