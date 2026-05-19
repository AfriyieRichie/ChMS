import api from "@/lib/api";

const h = (branchId: number) => ({ "X-Branch-Id": String(branchId) });

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ServiceType {
  id: number;
  name: string;
  description: string;
  is_active: boolean;
  branch: number;
}

export interface AttendanceEntry {
  id: number;
  member: number;
  member_name: string;
  is_first_visit: boolean;
  notes: string;
}

export interface AttendanceRecord {
  id: number;
  branch: number;
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
  entries?: AttendanceEntry[];
}

export interface FirstTimeVisitor {
  id: number;
  attendance_record: number;
  record_date: string;
  record_service: string;
  name: string;
  phone: string;
  email: string;
  how_heard: string;
  notes: string;
  followed_up: boolean;
  converted_to_member: number | null;
  created_at: string;
}

export interface ChildCheckIn {
  id: number;
  attendance_record: number;
  record_date: string;
  child_name: string;
  age: number | null;
  parent_name: string;
  parent_phone: string;
  allergy_notes: string;
  pickup_code: string;
  member: number | null;
  checked_out: boolean;
  created_at: string;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface AttendanceFilters {
  date_from?: string;
  date_to?: string;
  service_type?: number;
  page?: number;
}

// ── Service Types ─────────────────────────────────────────────────────────────

export async function getServiceTypes(branchId: number): Promise<ServiceType[]> {
  const { data } = await api.get("/api/v1/service-types/", {
    headers: h(branchId),
    params: { active_only: "true" },
  });
  return Array.isArray(data) ? data : data.results ?? [];
}

export async function getAllServiceTypes(branchId: number): Promise<ServiceType[]> {
  const { data } = await api.get("/api/v1/service-types/", { headers: h(branchId) });
  return Array.isArray(data) ? data : data.results ?? [];
}

export async function createServiceType(
  payload: { name: string; is_active: boolean },
  branchId: number,
): Promise<ServiceType> {
  const { data } = await api.post("/api/v1/service-types/", payload, { headers: h(branchId) });
  return data;
}

export async function updateServiceType(
  id: number,
  payload: Partial<ServiceType>,
  branchId: number,
): Promise<ServiceType> {
  const { data } = await api.patch(`/api/v1/service-types/${id}/`, payload, { headers: h(branchId) });
  return data;
}

// ── Attendance Records ────────────────────────────────────────────────────────

export async function getAttendanceRecords(
  branchId: number,
  params?: AttendanceFilters,
): Promise<PaginatedResponse<AttendanceRecord>> {
  const { data } = await api.get("/api/v1/attendance/", { headers: h(branchId), params });
  return data;
}

export async function getAttendanceRecord(id: number, branchId: number): Promise<AttendanceRecord> {
  const { data } = await api.get(`/api/v1/attendance/${id}/`, { headers: h(branchId) });
  return data;
}

export async function createAttendanceRecord(
  payload: Partial<AttendanceRecord>,
  branchId: number,
): Promise<AttendanceRecord> {
  const { data } = await api.post("/api/v1/attendance/", payload, { headers: h(branchId) });
  return data;
}

export async function updateAttendanceRecord(
  id: number,
  payload: Partial<AttendanceRecord>,
  branchId: number,
): Promise<AttendanceRecord> {
  const { data } = await api.patch(`/api/v1/attendance/${id}/`, payload, { headers: h(branchId) });
  return data;
}

export async function deleteAttendanceRecord(id: number, branchId: number): Promise<void> {
  await api.delete(`/api/v1/attendance/${id}/`, { headers: h(branchId) });
}

// ── Individual Entries ────────────────────────────────────────────────────────

export async function getAttendanceEntries(recordId: number, branchId: number): Promise<AttendanceEntry[]> {
  const { data } = await api.get(`/api/v1/attendance/${recordId}/entries/`, { headers: h(branchId) });
  return Array.isArray(data) ? data : data.results ?? [];
}

export async function addAttendanceEntry(
  recordId: number,
  branchId: number,
  payload: { member: number; is_first_visit?: boolean; notes?: string },
): Promise<AttendanceEntry> {
  const { data } = await api.post(`/api/v1/attendance/${recordId}/entries/`, payload, { headers: h(branchId) });
  return data;
}

export async function removeAttendanceEntry(recordId: number, entryId: number, branchId: number): Promise<void> {
  await api.delete(`/api/v1/attendance/${recordId}/entries/${entryId}/`, { headers: h(branchId) });
}

export async function bulkAddEntries(
  recordId: number,
  branchId: number,
  entries: Array<{ member: number; is_first_visit?: boolean }>,
): Promise<{ created: number }> {
  const { data } = await api.post(`/api/v1/attendance/${recordId}/bulk-entries/`, entries, { headers: h(branchId) });
  return data;
}

// ── First-time Visitors ───────────────────────────────────────────────────────

export async function getVisitors(recordId: number, branchId: number): Promise<FirstTimeVisitor[]> {
  const { data } = await api.get("/api/v1/visitors/", {
    headers: h(branchId),
    params: { record: recordId },
  });
  return Array.isArray(data) ? data : data.results ?? [];
}

export async function createVisitor(
  payload: Partial<FirstTimeVisitor>,
  branchId: number,
): Promise<FirstTimeVisitor> {
  const { data } = await api.post("/api/v1/visitors/", payload, { headers: h(branchId) });
  return data;
}

export async function updateVisitor(
  id: number,
  payload: Partial<FirstTimeVisitor>,
  branchId: number,
): Promise<FirstTimeVisitor> {
  const { data } = await api.patch(`/api/v1/visitors/${id}/`, payload, { headers: h(branchId) });
  return data;
}

// ── Children Check-in ─────────────────────────────────────────────────────────

export async function getChildCheckIns(recordId: number, branchId: number): Promise<ChildCheckIn[]> {
  const { data } = await api.get("/api/v1/children/", {
    headers: h(branchId),
    params: { record: recordId },
  });
  return Array.isArray(data) ? data : data.results ?? [];
}

export async function createChildCheckIn(
  payload: Partial<ChildCheckIn>,
  branchId: number,
): Promise<ChildCheckIn> {
  const { data } = await api.post("/api/v1/children/", payload, { headers: h(branchId) });
  return data;
}

export async function updateChildCheckIn(
  id: number,
  payload: Partial<ChildCheckIn>,
  branchId: number,
): Promise<ChildCheckIn> {
  const { data } = await api.patch(`/api/v1/children/${id}/`, payload, { headers: h(branchId) });
  return data;
}

// ── Self Check-in ─────────────────────────────────────────────────────────────

export async function selfCheckIn(
  recordId: number,
  phone: string,
): Promise<{ checked_in: boolean; member_name: string; created: boolean; already_checked_in: boolean }> {
  const { data } = await api.post(`/api/v1/attendance/${recordId}/self-checkin/`, { phone });
  return data;
}
