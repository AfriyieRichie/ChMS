import api from "@/lib/api";

export interface Group {
  id: number;
  branch: number;
  name: string;
  group_type: "cell" | "ministry" | "choir" | "department" | "prayer" | "other";
  description: string;
  leader: number | null;
  leader_name: string;
  meeting_day: string;
  meeting_time: string | null;
  meeting_location: string;
  is_active: boolean;
  member_count: number;
}

export interface GroupMembership {
  id: number;
  group: number;
  group_name: string;
  member: number;
  member_name: string;
  role: "member" | "leader" | "co_leader";
  joined_at: string;
  left_at: string | null;
  is_active: boolean;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

const headers = (branchId: number) => ({ "X-Branch-Id": String(branchId) });

export async function getGroups(
  branchId: number,
  params?: { group_type?: string; active_only?: string; page?: number }
): Promise<PaginatedResponse<Group>> {
  const { data } = await api.get("/api/v1/groups/", { headers: headers(branchId), params });
  return data;
}

export async function createGroup(
  payload: Partial<Group>,
  branchId: number
): Promise<Group> {
  const { data } = await api.post("/api/v1/groups/", payload, { headers: headers(branchId) });
  return data;
}

export async function getGroupMembers(
  groupId: number,
  branchId: number
): Promise<GroupMembership[]> {
  const { data } = await api.get(`/api/v1/groups/${groupId}/members/`, {
    headers: headers(branchId),
  });
  return data;
}

export async function addGroupMember(
  groupId: number,
  payload: { member: number; role?: string },
  branchId: number
): Promise<GroupMembership> {
  const { data } = await api.post(`/api/v1/groups/${groupId}/members/`, payload, {
    headers: headers(branchId),
  });
  return data;
}

export async function removeGroupMember(
  groupId: number,
  membershipId: number,
  branchId: number
): Promise<GroupMembership> {
  const { data } = await api.post(
    `/api/v1/groups/${groupId}/members/${membershipId}/remove/`,
    {},
    { headers: headers(branchId) }
  );
  return data;
}
