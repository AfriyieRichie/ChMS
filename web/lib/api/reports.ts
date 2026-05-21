import api from "@/lib/api";

const h = (branchId: number) => ({ "X-Branch-Id": String(branchId) });

// ── Membership Growth ─────────────────────────────────────────────────────────

export interface MembershipGrowth {
  new_by_month: { month: string; new: number }[];
  left_by_month: { month: string; left: number }[];
  status_breakdown: { membership_status: string; count: number }[];
}

export async function getMembershipGrowth(branchId: number, months = 6): Promise<MembershipGrowth> {
  const { data } = await api.get("/api/v1/reports/membership-growth/", {
    headers: h(branchId),
    params: { months },
  });
  return data;
}

// ── Attendance Trends ─────────────────────────────────────────────────────────

export interface AttendanceTrends {
  by_month: { month: string; total: number; sessions: number }[];
  by_service: { service_type__name: string; total: number; sessions: number; avg: number }[];
  by_gender: { gender: string; count: number }[];
  by_age_group: { group: string; count: number }[];
}

export async function getAttendanceTrends(branchId: number, months = 6): Promise<AttendanceTrends> {
  const { data } = await api.get("/api/v1/reports/attendance-trends/", {
    headers: h(branchId),
    params: { months },
  });
  return data;
}

// ── Visitor Conversion ────────────────────────────────────────────────────────

export interface VisitorConversionMonth {
  month: string;
  first_visits: number;
  followed_up: number;
  converted: number;
}

export interface VisitorConversion {
  period_months: number;
  funnel: { step: string; count: number }[];
  by_month: VisitorConversionMonth[];
  how_heard: { how_heard: string; count: number }[];
}

export async function getVisitorConversion(branchId: number, months = 3): Promise<VisitorConversion> {
  const { data } = await api.get("/api/v1/reports/visitor-conversion/", {
    headers: h(branchId),
    params: { months },
  });
  return data;
}

// ── Discipleship Pipeline ─────────────────────────────────────────────────────

export interface DiscipleshipPipeline {
  stage_order: string[];
  in_progress: { stage: string; count: number }[];
  completed: { stage: string; count: number }[];
  dropped: { stage: string; count: number }[];
}

export async function getDiscipleshipPipeline(branchId: number): Promise<DiscipleshipPipeline> {
  const { data } = await api.get("/api/v1/reports/discipleship-pipeline/", { headers: h(branchId) });
  return data;
}

// ── Group Health ──────────────────────────────────────────────────────────────

export interface GroupHealthItem {
  id: number;
  name: string;
  type: string;
  leader__full_name: string | null;
  member_count: number;
  recent_meetings: number;
  trend: "growing" | "stable" | "shrinking";
  trend_delta: number;
}

export interface GroupHealth {
  groups: GroupHealthItem[];
}

export async function getGroupHealth(branchId: number): Promise<GroupHealth> {
  const { data } = await api.get("/api/v1/reports/group-health/", { headers: h(branchId) });
  return data;
}

// ── Pastoral Care Alerts ──────────────────────────────────────────────────────

export interface PastoralCareAlerts {
  weeks: number;
  members: { id: number; full_name: string; phone: string; membership_status: string; last_seen: string | null }[];
}

export async function getPastoralCareAlerts(branchId: number, weeks = 4): Promise<PastoralCareAlerts> {
  const { data } = await api.get("/api/v1/reports/pastoral-care/", {
    headers: h(branchId),
    params: { weeks },
  });
  return data;
}
