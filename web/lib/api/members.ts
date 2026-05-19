import api from "@/lib/api";

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
  primary_branch: { id: number; name: string } | null;
}

export interface MemberDetail extends Member {
  date_of_birth: string | null;
  marital_status: string;
  occupation: string;
  address: string;
  baptism_status: string;
  baptism_date: string | null;
  date_joined: string | null;
  notes: string;
  household: number | null;
  household_name: string | null;
  branch_memberships: BranchMembership[];
}

export interface BranchMembership {
  id: number;
  branch: number;
  branch_name: string;
  joined_at: string;
  left_at: string | null;
  is_primary: boolean;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export async function getMembers(
  branchId: number,
  params?: { search?: string; status?: string; page?: number }
): Promise<PaginatedResponse<Member>> {
  const { data } = await api.get("/api/v1/members/", {
    headers: { "X-Branch-Id": String(branchId) },
    params,
  });
  return data;
}

export async function getMember(id: number, branchId: number): Promise<MemberDetail> {
  const { data } = await api.get(`/api/v1/members/${id}/`, {
    headers: { "X-Branch-Id": String(branchId) },
  });
  return data;
}

export async function createMember(
  payload: Partial<MemberDetail>,
  branchId: number
): Promise<MemberDetail> {
  const { data } = await api.post("/api/v1/members/", payload, {
    headers: { "X-Branch-Id": String(branchId) },
  });
  return data;
}

export async function updateMember(
  id: number,
  payload: Partial<MemberDetail>,
  branchId: number
): Promise<MemberDetail> {
  const { data } = await api.patch(`/api/v1/members/${id}/`, payload, {
    headers: { "X-Branch-Id": String(branchId) },
  });
  return data;
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

export async function getMemberDiscipleship(id: number, branchId: number): Promise<DiscipleshipRecord[]> {
  const { data } = await api.get(`/api/v1/members/${id}/discipleship/`, {
    headers: { "X-Branch-Id": String(branchId) },
  });
  return data;
}

export async function getMemberGroups(id: number, branchId: number) {
  const { data } = await api.get(`/api/v1/members/${id}/groups/`, {
    headers: { "X-Branch-Id": String(branchId) },
  });
  return data;
}

export interface MemberAttendanceEntry {
  id: number;
  date: string;
  service_type: string;
  attendance_type: string;
  is_first_visit: boolean;
}

export async function getMemberAttendance(id: number, branchId: number): Promise<MemberAttendanceEntry[]> {
  const { data } = await api.get(`/api/v1/members/${id}/attendance/`, {
    headers: { "X-Branch-Id": String(branchId) },
  });
  return data;
}
