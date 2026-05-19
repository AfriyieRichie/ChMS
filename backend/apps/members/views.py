import csv
import io

from django.db import models
from django.db.models import Count, Q, Max
from django.utils import timezone

from rest_framework import status
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.accounts.permissions import make_capability_permission
from apps.core.audit import log_action, AuditLog
from apps.core.viewsets import BranchScopedViewSet

from .models import Household, Member, MemberTag, BranchMembership, DiscipleshipRecord
from .serializers import (
    HouseholdSerializer,
    MemberSerializer,
    MemberListSerializer,
    MemberTagSerializer,
    BranchMembershipSerializer,
    DiscipleshipRecordSerializer,
)

CanViewMembers = make_capability_permission("members.view")
CanManageMembers = make_capability_permission("members.manage")
CanViewHouseholds = make_capability_permission("households.view")
CanManageHouseholds = make_capability_permission("households.manage")


class HouseholdViewSet(BranchScopedViewSet):
    serializer_class = HouseholdSerializer

    def get_queryset(self):
        return (
            Household.objects.filter(deleted_at__isnull=True)
            .annotate(member_count=Count("members", filter=Q(members__deleted_at__isnull=True)))
        )

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [CanViewHouseholds()]
        return [CanManageHouseholds()]

    def perform_destroy(self, instance):
        instance.deleted_at = timezone.now()
        instance.save(update_fields=["deleted_at"])
        log_action(self.request.user, AuditLog.Action.DELETE, instance, request=self.request)


class MemberTagViewSet(BranchScopedViewSet):
    serializer_class = MemberTagSerializer

    def get_queryset(self):
        return MemberTag.objects.filter(deleted_at__isnull=True)

    def get_permissions(self):
        if self.action == "list":
            return [CanViewMembers()]
        return [CanManageMembers()]

    def perform_destroy(self, instance):
        instance.deleted_at = timezone.now()
        instance.save(update_fields=["deleted_at"])


class MemberViewSet(BranchScopedViewSet):
    serializer_class = MemberSerializer

    def get_queryset(self):
        qs = (
            Member.objects.filter(deleted_at__isnull=True)
            .select_related("household", "user")
            .prefetch_related("branch_memberships__branch", "tags")
        )

        branch = getattr(self.request, "branch", None)
        if branch is not None:
            qs = qs.filter(branch_memberships__branch=branch)

        p = self.request.query_params

        if p.get("status"):
            qs = qs.filter(membership_status=p["status"])

        if p.get("gender"):
            qs = qs.filter(gender=p["gender"])

        if p.get("baptism_status"):
            qs = qs.filter(baptism_status=p["baptism_status"])

        if p.get("search"):
            s = p["search"]
            qs = qs.filter(
                Q(first_name__icontains=s)
                | Q(last_name__icontains=s)
                | Q(phone__icontains=s)
                | Q(email__icontains=s)
            )

        if p.get("household"):
            qs = qs.filter(household_id=p["household"])

        # Age range (approximate — within a year)
        today = timezone.now().date()
        if p.get("age_min"):
            try:
                cutoff = today.replace(year=today.year - int(p["age_min"]))
            except ValueError:
                cutoff = today.replace(year=today.year - int(p["age_min"]), day=28)
            qs = qs.filter(date_of_birth__lte=cutoff)

        if p.get("age_max"):
            try:
                cutoff = today.replace(year=today.year - int(p["age_max"]) - 1)
            except ValueError:
                cutoff = today.replace(year=today.year - int(p["age_max"]) - 1, day=28)
            qs = qs.filter(date_of_birth__gte=cutoff)

        if p.get("group"):
            qs = qs.filter(
                group_memberships__group_id=p["group"],
                group_memberships__left_at__isnull=True,
            )

        # Last attendance date range — annotate then filter
        if p.get("last_attended_from") or p.get("last_attended_to"):
            qs = qs.annotate(last_attended=Max("attendance_entries__attendance_record__date"))
            if p.get("last_attended_from"):
                qs = qs.filter(last_attended__gte=p["last_attended_from"])
            if p.get("last_attended_to"):
                qs = qs.filter(last_attended__lte=p["last_attended_to"])

        tag_ids = p.getlist("tags")
        for tag_id in tag_ids:
            qs = qs.filter(tags__id=tag_id)

        return qs.distinct()

    def get_serializer_class(self):
        if self.action == "list":
            return MemberListSerializer
        return MemberSerializer

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [CanViewMembers()]
        return [CanManageMembers()]

    def perform_create(self, serializer):
        member = serializer.save()
        branch = getattr(self.request, "branch", None)
        if branch:
            BranchMembership.objects.get_or_create(
                member=member,
                branch=branch,
                defaults={
                    "joined_at": member.date_joined or member.created_at.date(),
                    "is_primary": True,
                },
            )
        log_action(self.request.user, AuditLog.Action.CREATE, member, after=serializer.data, request=self.request)

    def perform_update(self, serializer):
        before = MemberSerializer(self.get_object(), context=self.get_serializer_context()).data
        member = serializer.save()
        log_action(self.request.user, AuditLog.Action.UPDATE, member, before=before, after=serializer.data, request=self.request)

    def perform_destroy(self, instance):
        instance.deleted_at = timezone.now()
        instance.save(update_fields=["deleted_at"])
        log_action(self.request.user, AuditLog.Action.DELETE, instance, request=self.request)

    # ── Custom actions ────────────────────────────────────────────────────────

    @action(detail=False, methods=["post"], url_path="check-duplicate")
    def check_duplicate(self, request):
        phone = request.data.get("phone", "").strip()
        email = request.data.get("email", "").strip()
        first_name = request.data.get("first_name", "").strip()
        last_name = request.data.get("last_name", "").strip()
        dob = request.data.get("date_of_birth")

        branch = getattr(request, "branch", None)
        qs = Member.objects.filter(deleted_at__isnull=True)
        if branch:
            qs = qs.filter(branch_memberships__branch=branch)

        seen_ids = set()
        duplicates = []

        def _add(member, reason):
            if member.id not in seen_ids:
                seen_ids.add(member.id)
                duplicates.append({
                    "id": member.id,
                    "full_name": member.full_name,
                    "phone": member.phone,
                    "email": member.email,
                    "reason": reason,
                })

        if phone:
            for m in qs.filter(phone=phone):
                _add(m, "Same phone number")
        if email:
            for m in qs.filter(email__iexact=email):
                _add(m, "Same email address")
        if first_name and last_name and dob:
            for m in qs.filter(
                first_name__iexact=first_name,
                last_name__iexact=last_name,
                date_of_birth=dob,
            ):
                _add(m, "Same name and date of birth")

        return Response({"duplicates": duplicates})

    @action(detail=True, methods=["post"], url_path="transfer")
    def transfer(self, request, pk=None):
        member = self.get_object()
        target_branch_id = request.data.get("branch_id")
        reason = request.data.get("reason", "").strip()

        if not target_branch_id:
            return Response({"error": "branch_id is required."}, status=status.HTTP_400_BAD_REQUEST)

        from apps.branches.models import Branch
        try:
            target_branch = Branch.objects.get(pk=target_branch_id, deleted_at__isnull=True, is_active=True)
        except Branch.DoesNotExist:
            return Response({"error": "Branch not found."}, status=status.HTTP_404_NOT_FOUND)

        current_branch = getattr(request, "branch", None)
        today = timezone.now().date()

        if current_branch:
            BranchMembership.objects.filter(
                member=member, branch=current_branch, left_at__isnull=True
            ).update(left_at=today, transfer_reason=reason)

        membership, created = BranchMembership.objects.get_or_create(
            member=member,
            branch=target_branch,
            defaults={"joined_at": today, "is_primary": True, "transfer_reason": reason},
        )
        if not created:
            membership.left_at = None
            membership.joined_at = today
            membership.transfer_reason = reason
            membership.save(update_fields=["left_at", "joined_at", "transfer_reason"])

        member.membership_status = Member.MembershipStatus.TRANSFERRED
        member.save(update_fields=["membership_status"])
        log_action(request.user, AuditLog.Action.UPDATE, member, request=request)

        return Response({"message": f"Transferred to {target_branch.name}."})

    @action(detail=False, methods=["post"], url_path="bulk-action")
    def bulk_action(self, request):
        action_type = request.data.get("action")
        ids = request.data.get("ids", [])

        if not ids:
            return Response({"error": "No members selected."}, status=status.HTTP_400_BAD_REQUEST)

        branch = getattr(request, "branch", None)
        qs = Member.objects.filter(id__in=ids, deleted_at__isnull=True)
        if branch:
            qs = qs.filter(branch_memberships__branch=branch).distinct()

        if action_type == "change_status":
            new_status = request.data.get("status")
            valid = [c[0] for c in Member.MembershipStatus.choices]
            if new_status not in valid:
                return Response({"error": "Invalid status."}, status=status.HTTP_400_BAD_REQUEST)
            updated = qs.update(membership_status=new_status)
            return Response({"updated": updated})

        if action_type == "add_tag":
            tag_id = request.data.get("tag_id")
            try:
                tag = MemberTag.objects.get(pk=tag_id, branch=branch)
            except MemberTag.DoesNotExist:
                return Response({"error": "Tag not found."}, status=status.HTTP_404_NOT_FOUND)
            for m in qs:
                m.tags.add(tag)
            return Response({"updated": qs.count()})

        if action_type == "remove_tag":
            tag_id = request.data.get("tag_id")
            try:
                tag = MemberTag.objects.get(pk=tag_id, branch=branch)
            except MemberTag.DoesNotExist:
                return Response({"error": "Tag not found."}, status=status.HTTP_404_NOT_FOUND)
            for m in qs:
                m.tags.remove(tag)
            return Response({"updated": qs.count()})

        if action_type == "add_to_group":
            group_id = request.data.get("group_id")
            from apps.groups.models import Group, GroupMembership
            try:
                group = Group.objects.get(pk=group_id, branch=branch, deleted_at__isnull=True)
            except Group.DoesNotExist:
                return Response({"error": "Group not found."}, status=status.HTTP_404_NOT_FOUND)
            today = timezone.now().date()
            added = 0
            for m in qs:
                _, created = GroupMembership.objects.get_or_create(
                    group=group, member=m,
                    defaults={"joined_at": today, "role": "member"},
                )
                if created:
                    added += 1
            return Response({"added": added})

        return Response({"error": "Unknown action."}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=["post"], url_path="csv-import")
    def csv_import(self, request):
        file = request.FILES.get("file")
        if not file:
            return Response({"error": "No file uploaded."}, status=status.HTTP_400_BAD_REQUEST)

        branch = getattr(request, "branch", None)
        if not branch:
            return Response({"error": "Branch required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            content = file.read().decode("utf-8-sig")
        except UnicodeDecodeError:
            return Response({"error": "File must be UTF-8 encoded."}, status=status.HTTP_400_BAD_REQUEST)

        reader = csv.DictReader(io.StringIO(content))
        results = {"created": 0, "skipped": 0, "errors": []}
        today = timezone.now().date()

        valid_statuses = [c[0] for c in Member.MembershipStatus.choices]
        valid_baptism = [c[0] for c in Member.BaptismStatus.choices]

        for row_num, raw_row in enumerate(reader, start=2):
            row = {k.strip().lower().replace(" ", "_"): (v or "").strip() for k, v in raw_row.items()}

            first_name = row.get("first_name", "")
            last_name = row.get("last_name", "")
            if not first_name or not last_name:
                results["errors"].append({"row": row_num, "error": "first_name and last_name are required"})
                continue

            phone = row.get("phone", "")
            email = row.get("email", "")

            # Skip duplicates
            if phone and Member.objects.filter(phone=phone, deleted_at__isnull=True,
                                               branch_memberships__branch=branch).exists():
                results["skipped"] += 1
                continue
            if email and Member.objects.filter(email__iexact=email, deleted_at__isnull=True,
                                               branch_memberships__branch=branch).exists():
                results["skipped"] += 1
                continue

            gender = row.get("gender", "male").lower()
            if gender not in ("male", "female", "other"):
                gender = "male"

            ms = row.get("membership_status", "visitor").lower()
            if ms not in valid_statuses:
                ms = "visitor"

            bs = row.get("baptism_status", "not_baptised").lower()
            if bs not in valid_baptism:
                bs = "not_baptised"

            def _parse_date(s):
                if not s:
                    return None
                from datetime import date as date_class
                for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%m/%d/%Y", "%d-%m-%Y"):
                    try:
                        return date_class.strptime(s, fmt)
                    except ValueError:
                        pass
                return None

            dob = _parse_date(row.get("date_of_birth", ""))
            date_joined = _parse_date(row.get("date_joined", "")) or today

            try:
                member = Member.objects.create(
                    first_name=first_name,
                    last_name=last_name,
                    middle_name=row.get("middle_name", ""),
                    gender=gender,
                    date_of_birth=dob,
                    phone=phone,
                    email=email,
                    membership_status=ms,
                    baptism_status=bs,
                    address=row.get("address", ""),
                    occupation=row.get("occupation", ""),
                    notes=row.get("notes", ""),
                    date_joined=date_joined,
                )
                BranchMembership.objects.create(
                    member=member,
                    branch=branch,
                    joined_at=date_joined,
                    is_primary=True,
                )
                results["created"] += 1
            except Exception as exc:
                results["errors"].append({"row": row_num, "error": str(exc)})

        return Response(results)

    # ── Existing sub-resource actions ─────────────────────────────────────────

    @action(detail=True, methods=["get", "post"], url_path="discipleship")
    def discipleship(self, request, pk=None):
        member = self.get_object()
        if request.method == "GET":
            qs = member.discipleship_records.order_by("stage")
            return Response(DiscipleshipRecordSerializer(qs, many=True).data)
        serializer = DiscipleshipRecordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        branch = getattr(request, "branch", None)
        serializer.save(member=member, branch=branch)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["get"], url_path="attendance")
    def attendance(self, request, pk=None):
        member = self.get_object()
        from apps.attendance.models import AttendanceEntry
        entries = (
            AttendanceEntry.objects
            .filter(member=member)
            .select_related("attendance_record", "attendance_record__service_type")
            .order_by("-attendance_record__date")[:100]
        )
        return Response([
            {
                "id": e.id,
                "date": str(e.attendance_record.date),
                "service_type": e.attendance_record.service_type.name,
                "attendance_type": e.attendance_record.attendance_type,
                "is_first_visit": e.is_first_visit,
            }
            for e in entries
        ])

    @action(detail=True, methods=["get"], url_path="groups")
    def groups(self, request, pk=None):
        member = self.get_object()
        from apps.groups.models import GroupMembership
        from apps.groups.serializers import GroupMembershipSerializer
        qs = GroupMembership.objects.filter(member=member, left_at__isnull=True).select_related("group")
        return Response(GroupMembershipSerializer(qs, many=True).data)

    @action(detail=True, methods=["get", "post"], url_path="branch-memberships")
    def branch_memberships(self, request, pk=None):
        member = self.get_object()
        if request.method == "GET":
            qs = member.branch_memberships.select_related("branch")
            return Response(BranchMembershipSerializer(qs, many=True).data)
        serializer = BranchMembershipSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(member=member)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
