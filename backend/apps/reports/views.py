from datetime import date, timedelta

from django.db.models import Count, Sum, Max, Q
from django.db.models.functions import TruncMonth

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.branches.models import Branch


def _branch(request):
    branch_id = request.headers.get("X-Branch-Id")
    if branch_id:
        try:
            return Branch.objects.get(pk=branch_id)
        except Branch.DoesNotExist:
            pass
    return None


# ── Membership Growth ─────────────────────────────────────────────────────────

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def membership_growth(request):
    branch = _branch(request)
    months = min(int(request.query_params.get("months", 6)), 24)
    start = date.today() - timedelta(days=months * 31)

    from apps.members.models import BranchMembership, Member

    new_by_month = list(
        BranchMembership.objects.filter(branch=branch, joined_at__gte=start)
        .annotate(month=TruncMonth("joined_at"))
        .values("month")
        .annotate(new=Count("id"))
        .order_by("month")
    )

    left_by_month = list(
        BranchMembership.objects.filter(branch=branch, left_at__gte=start)
        .annotate(month=TruncMonth("left_at"))
        .values("month")
        .annotate(left=Count("id"))
        .order_by("month")
    )

    status_breakdown = list(
        Member.objects.filter(
            branch_memberships__branch=branch,
            branch_memberships__left_at__isnull=True,
            deleted_at__isnull=True,
        )
        .values("membership_status")
        .annotate(count=Count("id", distinct=True))
    )

    return Response({
        "new_by_month": new_by_month,
        "left_by_month": left_by_month,
        "status_breakdown": status_breakdown,
    })


# ── Attendance Trends ─────────────────────────────────────────────────────────

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def attendance_trends(request):
    branch = _branch(request)
    months = min(int(request.query_params.get("months", 6)), 24)
    start = date.today() - timedelta(days=months * 31)

    from apps.attendance.models import AttendanceRecord, AttendanceEntry
    from apps.members.models import Member

    by_month = list(
        AttendanceRecord.objects.filter(branch=branch, date__gte=start)
        .annotate(month=TruncMonth("date"))
        .values("month")
        .annotate(total=Sum("total_count"), sessions=Count("id"))
        .order_by("month")
    )

    by_service = list(
        AttendanceRecord.objects.filter(branch=branch, date__gte=start)
        .values("service_type__name")
        .annotate(
            total=Sum("total_count"),
            sessions=Count("id"),
            avg=Sum("total_count") / Count("id"),
        )
        .order_by("-total")
    )

    # Gender breakdown — distinct members who attended in this period
    by_gender = list(
        Member.objects.filter(
            attendance_entries__attendance_record__branch=branch,
            attendance_entries__attendance_record__date__gte=start,
            deleted_at__isnull=True,
        )
        .exclude(gender="")
        .values("gender")
        .annotate(count=Count("id", distinct=True))
    )

    # Age-group breakdown — computed in Python to avoid complex SQL date arithmetic
    dobs = list(
        Member.objects.filter(
            attendance_entries__attendance_record__branch=branch,
            attendance_entries__attendance_record__date__gte=start,
            date_of_birth__isnull=False,
            deleted_at__isnull=True,
        )
        .distinct()
        .values_list("date_of_birth", flat=True)
    )

    today = date.today()
    age_groups = {"Under 18": 0, "18–30": 0, "31–45": 0, "46–60": 0, "Over 60": 0}
    for dob in dobs:
        age = (today - dob).days // 365
        if age < 18:
            age_groups["Under 18"] += 1
        elif age <= 30:
            age_groups["18–30"] += 1
        elif age <= 45:
            age_groups["31–45"] += 1
        elif age <= 60:
            age_groups["46–60"] += 1
        else:
            age_groups["Over 60"] += 1

    by_age_group = [{"group": k, "count": v} for k, v in age_groups.items() if v > 0]

    return Response({
        "by_month": by_month,
        "by_service": by_service,
        "by_gender": by_gender,
        "by_age_group": by_age_group,
    })


# ── Visitor Conversion ────────────────────────────────────────────────────────

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def visitor_conversion(request):
    branch = _branch(request)
    months = min(int(request.query_params.get("months", 3)), 12)
    start = date.today() - timedelta(days=months * 31)

    from apps.attendance.models import FirstTimeVisitor

    # Monthly trend: first visits, follow-ups, conversions
    by_month = list(
        FirstTimeVisitor.objects.filter(
            attendance_record__branch=branch,
            attendance_record__date__gte=start,
        )
        .annotate(month=TruncMonth("attendance_record__date"))
        .values("month")
        .annotate(
            first_visits=Count("id"),
            followed_up=Count("id", filter=Q(followed_up=True)),
            converted=Count("id", filter=Q(converted_to_member__isnull=False)),
        )
        .order_by("month")
    )

    # Period totals for funnel
    base_qs = FirstTimeVisitor.objects.filter(
        attendance_record__branch=branch,
        attendance_record__date__gte=start,
    )
    total_first = base_qs.count()
    total_followed = base_qs.filter(followed_up=True).count()
    total_converted = base_qs.filter(converted_to_member__isnull=False).count()

    # How they heard breakdown
    how_heard = list(
        base_qs.exclude(how_heard="")
        .values("how_heard")
        .annotate(count=Count("id"))
        .order_by("-count")
    )

    return Response({
        "period_months": months,
        "funnel": [
            {"step": "First Visit", "count": total_first},
            {"step": "Followed Up", "count": total_followed},
            {"step": "Became Member", "count": total_converted},
        ],
        "by_month": by_month,
        "how_heard": how_heard,
    })


# ── Discipleship Pipeline ─────────────────────────────────────────────────────

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def discipleship_pipeline(request):
    branch = _branch(request)

    from apps.members.models import DiscipleshipRecord

    STAGE_ORDER = [
        "new_believer", "foundation", "water_baptism",
        "holy_spirit", "discipleship", "membership",
    ]

    in_progress = list(
        DiscipleshipRecord.objects.filter(branch=branch, status="in_progress")
        .values("stage")
        .annotate(count=Count("id"))
    )

    completed = list(
        DiscipleshipRecord.objects.filter(branch=branch, status="completed")
        .values("stage")
        .annotate(count=Count("id"))
    )

    dropped = list(
        DiscipleshipRecord.objects.filter(branch=branch, status="dropped")
        .values("stage")
        .annotate(count=Count("id"))
    )

    return Response({
        "stage_order": STAGE_ORDER,
        "in_progress": in_progress,
        "completed": completed,
        "dropped": dropped,
    })


# ── Group Health ──────────────────────────────────────────────────────────────

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def group_health(request):
    branch = _branch(request)
    four_weeks_ago = date.today() - timedelta(weeks=4)
    eight_weeks_ago = date.today() - timedelta(weeks=8)

    from apps.groups.models import Group

    groups_qs = list(
        Group.objects.filter(branch=branch, deleted_at__isnull=True)
        .annotate(
            member_count=Count(
                "memberships",
                filter=Q(memberships__left_at__isnull=True),
                distinct=True,
            ),
            # Members who were in the group 8 weeks ago
            count_8w_ago=Count(
                "memberships",
                filter=Q(memberships__joined_at__lte=eight_weeks_ago) & (
                    Q(memberships__left_at__isnull=True) | Q(memberships__left_at__gte=eight_weeks_ago)
                ),
                distinct=True,
            ),
            recent_meetings=Count(
                "meetings",
                filter=Q(meetings__date__gte=four_weeks_ago),
                distinct=True,
            ),
        )
        .values("id", "name", "type", "leader__full_name", "member_count", "count_8w_ago", "recent_meetings")
        .order_by("-member_count")
    )

    # Compute trend in Python
    for g in groups_qs:
        diff = g["member_count"] - g["count_8w_ago"]
        if diff > 0:
            g["trend"] = "growing"
        elif diff < 0:
            g["trend"] = "shrinking"
        else:
            g["trend"] = "stable"
        g["trend_delta"] = diff

    return Response({"groups": groups_qs})


# ── Pastoral Care Alerts ──────────────────────────────────────────────────────

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def pastoral_care_alerts(request):
    branch = _branch(request)
    weeks = min(int(request.query_params.get("weeks", 4)), 52)
    cutoff = date.today() - timedelta(weeks=weeks)

    from apps.members.models import Member

    members = list(
        Member.objects.filter(
            branch_memberships__branch=branch,
            branch_memberships__left_at__isnull=True,
            membership_status__in=["active", "inactive"],
            deleted_at__isnull=True,
        )
        .annotate(last_seen=Max("attendance_entries__attendance_record__date"))
        .filter(Q(last_seen__isnull=True) | Q(last_seen__lt=cutoff))
        .order_by("last_seen")
        .distinct()
        .values("id", "full_name", "phone", "membership_status", "last_seen")[:100]
    )

    return Response({"weeks": weeks, "members": members})
