import api from "@/lib/api";

export interface ServiceType {
  id: number;
  name: string;
  description: string;
  is_active: boolean;
  branch: number;
}

export interface AttendanceRecord {
  id: number;
  date: string;
  service_type: number;
  service_type_name: string;
  attendance_type: "physical" | "online";
  total_count: number;
  male_count: number;
  female_count: number;
  children_count: number;
  first_timers: number;
  notes: string;
  recorded_by_name: string;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export async function getServiceTypes(branchId: number): Promise<ServiceType[]> {
  const { data } = await api.get("/api/v1/service-types/", {
    headers: { "X-Branch-Id": String(branchId) },
    params: { active_only: "true" },
  });
  return Array.isArray(data) ? data : data.results ?? [];
}

export async function getAttendanceRecords(
  branchId: number,
  params?: { date_from?: string; date_to?: string; service_type?: number; page?: number }
): Promise<PaginatedResponse<AttendanceRecord>> {
  const { data } = await api.get("/api/v1/attendance/", {
    headers: { "X-Branch-Id": String(branchId) },
    params,
  });
  return data;
}

export async function createAttendanceRecord(
  payload: Partial<AttendanceRecord>,
  branchId: number
): Promise<AttendanceRecord> {
  const { data } = await api.post("/api/v1/attendance/", payload, {
    headers: { "X-Branch-Id": String(branchId) },
  });
  return data;
}
