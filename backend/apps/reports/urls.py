from django.urls import path
from . import views

urlpatterns = [
    path("reports/membership-growth/",    views.membership_growth,     name="report-membership-growth"),
    path("reports/attendance-trends/",    views.attendance_trends,      name="report-attendance-trends"),
    path("reports/visitor-conversion/",   views.visitor_conversion,     name="report-visitor-conversion"),
    path("reports/discipleship-pipeline/",views.discipleship_pipeline,  name="report-discipleship-pipeline"),
    path("reports/group-health/",         views.group_health,           name="report-group-health"),
    path("reports/pastoral-care/",        views.pastoral_care_alerts,   name="report-pastoral-care"),
]
