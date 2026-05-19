import api from "@/lib/api";

const h = (branchId: number) => ({ "X-Branch-Id": String(branchId) });

// ── Types ────────────────────────────────────────────────────────────────────

export interface MemberTag {
  id: number;
  name: string;
  color: string;
}

export interface Member {
  id: number;
  full_name: string;
  first_name: string;
  middle_name: string;
  last_name: string;
  gender: string;
  phone: string;
  email: string;
  membership_status: string;
  baptism_status: string;
  date_of_birth: string | null;
  date_joined: string | null;
  primary_branch: { id: number; name: string } | null;
  tags: MemberTag[];
}

export interface MemberDetail extends Member {
  marital_status: string;
  occupation: string;
  address: string;
  baptism_date: string | null;
  notes: string;
  sensitive_notes?: string;
  household: number | null;
  household_name: string | null;
  photo: string | null;
  branch_memberships: BranchMembership[];
}

export interface BranchMembership {
  id: number;
  branch: number;
  branch_name: string;
  joined_at: string;
  left_at: string | null;
  is_primary: boolean;
  transfer_reason: string;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface DuplicateMatch {
  id: number;
  full_name: string;
  phone: string;
  email: string;
  reason: string;
}

export interface ImportResult {
  created: number;
  skipped: number;
  errors: Array<{ row: number; error: string }>;
}

export interface DiscipleshipRecord {
  id: number;
  member: number;
  branch: number;
  stage: string;
  status: "in_progress" | "completed" | "dropped";
  started_at: string;
  completed_at: string | null;
  facilitator: number | null;
  facilitator_name: string;
  notes: string;
}

export interface MemberAttendanceEntry {
  id: number;
  date: string;
  service_type: string;
  attendance_type: string;
  is_first_visit: boolean;
}

// ── Filter params ─────────────────────────────────────────────────────────────

export interface MemberFilters {
  search?: string;
  status?: string;
  gender?: string;
  baptism_status?: string;
  age_min?: number;
  age_max?: number;
  group?: number;
  last_attended_from?: string;
  last_attended_to?: string;
  tags?: number[];
  household?: number;
  page?: number;
}

// ── API functions ─────────────────────────────────────────────────────────────

export async function getMembers(
  branchId: number,
  filters?: MemberFilters,
): Promise<PaginatedResponse<Member>> {
  const { tags, ...rest } = filters ?? {};
  const params: Record<string, unknown> = { ...rest };
  if (tags?.length) params["tags"] = tags;
  const { data } = await api.get("/api/v1/members/", { headers: h(branchId), params });
  return data;
}

export async function getMember(id: number, branchId: number): Promise<MemberDetail> {
  const { data } = await api.get(`/api/v1/members/${id}/`, { headers: h(branchId) });
  return data;
}

export async function createMember(
  payload: Partial<MemberDetail>,
  branchId: number,
): Promise<MemberDetail> {
  const { data } = await api.post("/api/v1/members/", payload, { headers: h(branchId) });
  return data;
}

export async function updateMember(
  id: number,
  payload: Partial<MemberDetail & { tag_ids: number[] }>,
  branchId: number,
): Promise<MemberDetail> {
  const { data } = await api.patch(`/api/v1/members/${id}/`, payload, { headers: h(branchId) });
  return data;
}

export async function checkDuplicate(
  branchId: number,
  payload: { phone?: string; email?: string; first_name?: string; last_name?: string; date_of_birth?: string },
): Promise<{ duplicates: DuplicateMatch[] }> {
  const { data } = await api.post("/api/v1/members/check-duplicate/", payload, { headers: h(branchId) });
  return data;
}

export async function transferMember(
  id: number,
  branchId: number,
  payload: { branch_id: number; reason?: string },
): Promise<{ message: string }> {
  const { data } = await api.post(`/api/v1/members/${id}/transfer/`, payload, { headers: h(branchId) });
  return data;
}

export async function bulkAction(
  branchId: number,
  payload:
    | { action: "change_status"; ids: number[]; status: string }
    | { action: "add_tag" | "remove_tag"; ids: number[]; tag_id: number }
    | { action: "add_to_group"; ids: number[]; group_id: number },
): Promise<{ updated?: number; added?: number }> {
  const { data } = await api.post("/api/v1/members/bulk-action/", payload, { headers: h(branchId) });
  return data;
}

export async function importMembersCSV(
  branchId: number,
  file: File,
): Promise<ImportResult> {
  const form = new FormData();
  form.append("file", file);
  const { data } = await api.post("/api/v1/members/csv-import/", form, {
    headers: { ...h(branchId), "Content-Type": "multipart/form-data" },
  });
  return data;
}

// ── Tags ──────────────────────────────────────────────────────────────────────

export async function getMemberTags(branchId: number): Promise<MemberTag[]> {
  const { data } = await api.get("/api/v1/member-tags/", { headers: h(branchId) });
  return Array.isArray(data) ? data : data.results ?? [];
}

export async function createMemberTag(
  branchId: number,
  payload: { name: string; color: string },
): Promise<MemberTag> {
  const { data } = await api.post("/api/v1/member-tags/", { ...payload, branch: branchId }, { headers: h(branchId) });
  return data;
}

export async function deleteMemberTag(id: number, branchId: number): Promise<void> {
  await api.delete(`/api/v1/member-tags/${id}/`, { headers: h(branchId) });
}

// ── Sub-resources ─────────────────────────────────────────────────────────────

export async function getMemberDiscipleship(id: number, branchId: number): Promise<DiscipleshipRecord[]> {
  const { data } = await api.get(`/api/v1/members/${id}/discipleship/`, { headers: h(branchId) });
  return data;
}

export async function getMemberGroups(id: number, branchId: number) {
  const { data } = await api.get(`/api/v1/members/${id}/groups/`, { headers: h(branchId) });
  return data;
}

export async function getMemberAttendance(id: number, branchId: number): Promise<MemberAttendanceEntry[]> {
  const { data } = await api.get(`/api/v1/members/${id}/attendance/`, { headers: h(branchId) });
  return data;
}
