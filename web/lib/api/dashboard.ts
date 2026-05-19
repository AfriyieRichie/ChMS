import api from "@/lib/api";

export interface DashboardSummary {
  members: { total: number };
  attendance: { last_date: string | null; last_total: number };
  finance: { this_month: string; currency: string; month: number; year: number };
  events: { upcoming: number };
  groups: { active: number };
  announcements: Array<{
    id: number;
    title: string;
    body: string;
    audience: string;
    published_at: string;
  }>;
}

export async function getDashboardSummary(branchId: number): Promise<DashboardSummary> {
  const { data } = await api.get("/api/v1/dashboard/summary/", {
    headers: { "X-Branch-Id": String(branchId) },
  });
  return data;
}
