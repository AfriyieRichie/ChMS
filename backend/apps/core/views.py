from rest_framework import serializers, viewsets
from rest_framework.permissions import IsAuthenticated

from .audit import AuditLog


class AuditLogSerializer(serializers.ModelSerializer):
    actor_name = serializers.CharField(source="actor.full_name", default="", read_only=True)

    class Meta:
        model = AuditLog
        fields = [
            "id", "actor", "actor_name", "action", "object_type", "object_id",
            "before_data", "after_data", "timestamp", "ip_address",
        ]
        read_only_fields = fields


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = AuditLogSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        if not self.request.user.is_network_admin:
            return AuditLog.objects.none()
        qs = AuditLog.objects.select_related("actor").order_by("-timestamp")
        if obj_type := self.request.query_params.get("object_type"):
            qs = qs.filter(object_type__icontains=obj_type)
        if actor_id := self.request.query_params.get("actor"):
            qs = qs.filter(actor_id=actor_id)
        if action := self.request.query_params.get("action"):
            qs = qs.filter(action=action)
        return qs
