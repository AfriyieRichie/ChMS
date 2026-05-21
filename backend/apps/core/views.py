import csv
import json

from django.http import HttpResponse
from rest_framework import serializers, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated

from apps.accounts.permissions import has_capability
from .audit import AuditLog


class AuditLogSerializer(serializers.ModelSerializer):
    actor_name = serializers.CharField(source="actor.full_name", default="", read_only=True)
    actor_email = serializers.CharField(source="actor.email", default="", read_only=True)
    branch_name = serializers.CharField(source="branch.name", default=None, read_only=True)

    class Meta:
        model = AuditLog
        fields = [
            "id", "actor", "actor_name", "actor_email",
            "branch", "branch_name",
            "action", "object_type", "object_id",
            "before_data", "after_data", "timestamp", "ip_address",
        ]
        read_only_fields = fields


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = AuditLogSerializer
    permission_classes = [IsAuthenticated]

    def _base_queryset(self):
        user = self.request.user
        branch_id = self.request.headers.get("X-Branch-Id")

        if user.is_network_admin:
            qs = AuditLog.objects.select_related("actor", "branch")
            if branch_id and branch_id != "all":
                qs = qs.filter(branch_id=branch_id)
            return qs

        # Branch managers (with users.manage) see their branch's log only
        if branch_id and has_capability(user, "users.manage"):
            return AuditLog.objects.select_related("actor", "branch").filter(branch_id=branch_id)

        return AuditLog.objects.none()

    def get_queryset(self):
        qs = self._base_queryset()
        p = self.request.query_params

        if obj_type := p.get("object_type"):
            qs = qs.filter(object_type__icontains=obj_type)
        if actor_id := p.get("actor"):
            qs = qs.filter(actor_id=actor_id)
        if action_val := p.get("action"):
            qs = qs.filter(action=action_val)
        if date_from := p.get("date_from"):
            qs = qs.filter(timestamp__date__gte=date_from)
        if date_to := p.get("date_to"):
            qs = qs.filter(timestamp__date__lte=date_to)
        if search := p.get("search"):
            qs = qs.filter(actor__full_name__icontains=search)

        return qs.order_by("-timestamp")

    @action(detail=False, methods=["get"], url_path="export")
    def export(self, request):
        qs = self.get_queryset()[:5000]
        response = HttpResponse(content_type="text/csv")
        response["Content-Disposition"] = 'attachment; filename="audit-log.csv"'
        writer = csv.writer(response)
        writer.writerow([
            "ID", "Timestamp", "Actor", "Actor Email", "Branch",
            "Action", "Object Type", "Object ID", "IP Address",
            "Before", "After",
        ])
        for entry in qs:
            writer.writerow([
                entry.id,
                entry.timestamp.isoformat(),
                entry.actor.full_name if entry.actor else "",
                entry.actor.email if entry.actor else "",
                entry.branch.name if entry.branch else "",
                entry.action,
                entry.object_type,
                entry.object_id,
                entry.ip_address or "",
                json.dumps(entry.before_data) if entry.before_data else "",
                json.dumps(entry.after_data) if entry.after_data else "",
            ])
        return response
