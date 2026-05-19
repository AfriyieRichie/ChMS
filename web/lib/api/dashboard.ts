import api from "@/lib/api";

export interface TrendPoint {
  week_label: string;
  total: number;
  first_timers: number;
}

export interface FirstTimer {
  id: number;
  full_name: string;
  phone: string;
  service_date: string;
}

export interface UpcomingEvent {
  id: number;
  name: string;
  event_type: string;
  start_datetime: string;
  venue: string;
}

export interface BirthdayMember {
  id: number;
  full_name: string;
  date_of_birth: string;
  phone: string;
  days_away: number;
}

export interface BranchComparison {
  id: number;
  name: string;
  code: string;
  member_count: number;
  last_attendance: number;
  last_attendance_date: string | null;
}

export interface DashboardOverview {
  members: {
    branch_total: number;
    network_total: number | null;
  };
  attendance: {
    last_date: string | null;
    last_total: number;
    upcoming_events: number;
    active_groups: number;
  };
  attendance_trend: TrendPoint[];
  finance: {
    this_month: string;
    last_month: string;
    same_month_last_year: string;
    currency: string;
    month: number;
    year: number;
  };
  first_timers_week: FirstTimer[];
  upcoming_events: UpcomingEvent[];
  birthdays_week: BirthdayMember[];
  branch_comparison: BranchComparison[] | null;
  announcements: Array<{
    id: number;
    title: string;
    body: string;
    audience: string;
    published_at: string;
  }>;
}

export async function getDashboardOverview(branchId: number): Promise<DashboardOverview> {
  const { data } = await api.get("/api/v1/dashboard/overview/", {
    headers: { "X-Branch-Id": String(branchId) },
  });
  return data;
}

// Legacy — kept so old imports don't break during transition
export type DashboardSummary = DashboardOverview;
export const getDashboardSummary = getDashboardOverview;
