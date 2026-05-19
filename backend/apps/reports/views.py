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

    from apps.attendance.models import AttendanceRecord

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
        .annotate(total=Sum("total_count"), sessions=Count("id"), avg=Sum("total_count") / Count("id"))
        .order_by("-total")
    )

    return Response({"by_month": by_month, "by_service": by_service})


# ── Visitor Conversion ────────────────────────────────────────────────────────

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def visitor_conversion(request):
    branch = _branch(request)
    months = min(int(request.query_params.get("months", 3)), 12)
    start = date.today() - timedelta(days=months * 31)

    from apps.attendance.models import FirstTimeVisitor, AttendanceRecord
    from apps.members.models import Member

    first_visits = FirstTimeVisitor.objects.filter(
        attendance_record__branch=branch,
        attendance_record__date__gte=start,
    ).count()

    new_members = Member.objects.filter(
        branch_memberships__branch=branch,
        branch_memberships__joined_at__gte=start,
        membership_status__in=["active", "member"],
    ).distinct().count()

    total_active = Member.objects.filter(
        branch_memberships__branch=branch,
        branch_memberships__left_at__isnull=True,
        deleted_at__isnull=True,
    ).count()

    recent_visitors = Member.objects.filter(
        branch_memberships__branch=branch,
        branch_memberships__left_at__isnull=True,
        membership_status="visitor",
        deleted_at__isnull=True,
    ).count()

    return Response({
        "period_months": months,
        "first_time_visitors": first_visits,
        "new_members": new_members,
        "total_active_members": total_active,
        "current_visitors": recent_visitors,
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

    return Response({
        "stage_order": STAGE_ORDER,
        "in_progress": in_progress,
        "completed": completed,
    })


# ── Group Health ──────────────────────────────────────────────────────────────

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def group_health(request):
    branch = _branch(request)
    four_weeks_ago = date.today() - timedelta(weeks=4)

    from apps.groups.models import Group

    groups = list(
        Group.objects.filter(branch=branch, deleted_at__isnull=True)
        .annotate(
            member_count=Count(
                "memberships", filter=Q(memberships__left_at__isnull=True), distinct=True
            ),
            recent_meetings=Count(
                "meetings", filter=Q(meetings__date__gte=four_weeks_ago), distinct=True
            ),
        )
        .values("id", "name", "type", "member_count", "recent_meetings")
        .order_by("-member_count")
    )

    return Response({"groups": groups})


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
