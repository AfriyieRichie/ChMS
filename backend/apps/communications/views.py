from datetime import timedelta

from django.db.models import Max, Q
from django.utils import timezone

from rest_framework import status
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.accounts.permissions import make_capability_permission
from apps.core.viewsets import BranchScopedViewSet

from .models import (
    Announcement, MessageTemplate, Audience, Campaign, MessageLog, CommunicationOptOut,
)
from .serializers import (
    AnnouncementSerializer, AnnouncementListSerializer,
    MessageTemplateSerializer, AudienceSerializer,
    CampaignSerializer, MessageLogSerializer, CommunicationOptOutSerializer,
)

CanViewComms = make_capability_permission("communications.view")
CanManageComms = make_capability_permission("communications.manage")


# ── Announcements ─────────────────────────────────────────────────────────────

class AnnouncementViewSet(BranchScopedViewSet):
    queryset = Announcement.objects.filter(deleted_at__isnull=True).select_related("created_by")
    serializer_class = AnnouncementSerializer

    def get_serializer_class(self):
        if self.action == "list":
            return AnnouncementListSerializer
        return AnnouncementSerializer

    def get_permissions(self):
        if self.action in ("list", "retrieve", "active"):
            return [CanViewComms()]
        return [CanManageComms()]

    def get_queryset(self):
        qs = super().get_queryset()
        audience = self.request.query_params.get("audience")
        if audience:
            qs = qs.filter(audience=audience)
        return qs

    def perform_create(self, serializer):
        branch = getattr(self.request, "branch", None)
        serializer.save(branch=branch, created_by=self.request.user)

    def perform_destroy(self, instance):
        instance.deleted_at = timezone.now()
        instance.save(update_fields=["deleted_at"])

    @action(detail=False, methods=["get"])
    def active(self, request):
        now = timezone.now()
        qs = self.get_queryset().filter(is_published=True).filter(
            Q(expires_at__isnull=True) | Q(expires_at__gt=now)
        ).order_by("-published_at")[:10]
        return Response(AnnouncementListSerializer(qs, many=True).data)


# ── Message Templates ─────────────────────────────────────────────────────────

class MessageTemplateViewSet(BranchScopedViewSet):
    queryset = MessageTemplate.objects.filter(deleted_at__isnull=True)
    serializer_class = MessageTemplateSerializer

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [CanViewComms()]
        return [CanManageComms()]

    def get_queryset(self):
        qs = super().get_queryset()
        p = self.request.query_params
        if p.get("category"):
            qs = qs.filter(category=p["category"])
        if p.get("channel"):
            qs = qs.filter(channel=p["channel"])
        if p.get("active_only") == "true":
            qs = qs.filter(is_active=True)
        return qs

    def perform_create(self, serializer):
        branch = getattr(self.request, "branch", None)
        serializer.save(branch=branch, created_by=self.request.user)


# ── Audiences ─────────────────────────────────────────────────────────────────

def _build_member_qs(branch, filters: dict):
    from apps.members.models import Member
    qs = Member.objects.filter(deleted_at__isnull=True)
    if branch:
        qs = qs.filter(
            branch_memberships__branch=branch,
            branch_memberships__left_at__isnull=True,
        )

    if filters.get("membership_status"):
        qs = qs.filter(membership_status__in=filters["membership_status"])
    if filters.get("gender"):
        qs = qs.filter(gender=filters["gender"])
    if filters.get("tag_ids"):
        qs = qs.filter(tags__id__in=filters["tag_ids"])

    qs = qs.annotate(last_attended=Max("attendance_entries__attendance_record__date"))

    if filters.get("attended_in_days"):
        cutoff = timezone.now().date() - timedelta(days=int(filters["attended_in_days"]))
        qs = qs.filter(last_attended__gte=cutoff)
    if filters.get("not_attended_in_days"):
        cutoff = timezone.now().date() - timedelta(days=int(filters["not_attended_in_days"]))
        qs = qs.filter(Q(last_attended__isnull=True) | Q(last_attended__lt=cutoff))

    # Exclude members opted out of "all" channel
    opted_out_all = CommunicationOptOut.objects.filter(channel="all").values_list("member_id", flat=True)
    qs = qs.exclude(id__in=opted_out_all)

    return qs.distinct()


class AudienceViewSet(BranchScopedViewSet):
    queryset = Audience.objects.filter(deleted_at__isnull=True)
    serializer_class = AudienceSerializer

    def get_permissions(self):
        if self.action in ("list", "retrieve", "preview"):
            return [CanViewComms()]
        return [CanManageComms()]

    def perform_create(self, serializer):
        branch = getattr(self.request, "branch", None)
        serializer.save(branch=branch, created_by=self.request.user)

    @action(detail=True, methods=["get"])
    def preview(self, request, pk=None):
        audience = self.get_object()
        branch = getattr(request, "branch", None)
        qs = _build_member_qs(branch, audience.filters)
        count = qs.count()
        sample = list(qs.values_list("full_name", flat=True)[:5])
        return Response({"count": count, "sample": sample})


# ── Campaigns ─────────────────────────────────────────────────────────────────

class CampaignViewSet(BranchScopedViewSet):
    queryset = Campaign.objects.filter(deleted_at__isnull=True).select_related(
        "template", "audience", "created_by",
    )
    serializer_class = CampaignSerializer

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [CanViewComms()]
        return [CanManageComms()]

    def get_queryset(self):
        qs = super().get_queryset()
        s = self.request.query_params.get("status")
        if s:
            qs = qs.filter(status=s)
        return qs

    def perform_create(self, serializer):
        branch = getattr(self.request, "branch", None)
        serializer.save(branch=branch, created_by=self.request.user)

    @action(detail=True, methods=["post"])
    def send(self, request, pk=None):
        campaign = self.get_object()
        if campaign.status not in ("draft", "scheduled"):
            return Response({"detail": "Campaign has already been sent."}, status=status.HTTP_400_BAD_REQUEST)

        branch = getattr(request, "branch", None)
        filters = campaign.audience.filters if campaign.audience else {}

        # Build recipient list, exclude opted-out for this channel
        members_qs = _build_member_qs(branch, filters)
        opted_out = CommunicationOptOut.objects.filter(
            channel=campaign.channel
        ).values_list("member_id", flat=True)
        members_qs = members_qs.exclude(id__in=opted_out)

        now = timezone.now()
        logs = []
        for member in members_qs.only("id", "full_name", "phone", "email"):
            addr = member.phone if campaign.channel in ("sms", "whatsapp") else member.email
            logs.append(MessageLog(
                campaign=campaign,
                member=member,
                member_name=member.full_name,
                channel=campaign.channel,
                recipient_address=addr or "",
                status=MessageLog.Status.QUEUED,
            ))
        MessageLog.objects.bulk_create(logs)

        campaign.status = Campaign.Status.SENT
        campaign.sent_at = now
        campaign.recipient_count = len(logs)
        campaign.save(update_fields=["status", "sent_at", "recipient_count"])

        return Response(CampaignSerializer(campaign).data)

    @action(detail=True, methods=["post"])
    def schedule(self, request, pk=None):
        campaign = self.get_object()
        scheduled_at = request.data.get("scheduled_at")
        if not scheduled_at:
            return Response({"detail": "scheduled_at is required."}, status=status.HTTP_400_BAD_REQUEST)
        campaign.status = Campaign.Status.SCHEDULED
        campaign.scheduled_at = scheduled_at
        campaign.save(update_fields=["status", "scheduled_at"])
        return Response(CampaignSerializer(campaign).data)


# ── Message Logs ──────────────────────────────────────────────────────────────

class MessageLogViewSet(BranchScopedViewSet):
    queryset = MessageLog.objects.select_related("campaign", "member")
    serializer_class = MessageLogSerializer
    http_method_names = ["get", "head", "options"]

    def get_permissions(self):
        return [CanViewComms()]

    def get_queryset(self):
        qs = MessageLog.objects.filter(campaign__branch=getattr(self.request, "branch", None))
        campaign_id = self.request.query_params.get("campaign")
        if campaign_id:
            qs = qs.filter(campaign_id=campaign_id)
        member_id = self.request.query_params.get("member")
        if member_id:
            qs = qs.filter(member_id=member_id)
        return qs.select_related("campaign", "member").order_by("-created_at")


# ── Opt-outs ──────────────────────────────────────────────────────────────────

class OptOutViewSet(BranchScopedViewSet):
    queryset = CommunicationOptOut.objects.select_related("member")
    serializer_class = CommunicationOptOutSerializer

    def get_permissions(self):
        return [CanManageComms()]

    def get_queryset(self):
        branch = getattr(self.request, "branch", None)
        qs = CommunicationOptOut.objects.filter(
            member__branch_memberships__branch=branch,
            member__branch_memberships__left_at__isnull=True,
            deleted_at__isnull=True,
        ).select_related("member").distinct()
        member_id = self.request.query_params.get("member")
        if member_id:
            qs = qs.filter(member_id=member_id)
        return qs

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            serializer.save()
        except Exception:
            return Response({"detail": "Member is already opted out of this channel."}, status=status.HTTP_400_BAD_REQUEST)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
