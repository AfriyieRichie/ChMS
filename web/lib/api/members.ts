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
