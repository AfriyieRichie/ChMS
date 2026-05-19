import api from "@/lib/api";

const h = (branchId: number) => ({ "X-Branch-Id": String(branchId) });

export interface Group {
  id: number;
  branch: number;
  name: string;
  group_type: "cell" | "ministry" | "choir" | "department" | "prayer" | "other";
  description: string;
  leader: number | null;
  leader_name: string;
  parent_group: number | null;
  parent_group_name: string;
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

export interface GroupMeeting {
  id: number;
  group: number;
  date: string;
  present_count: number;
  notes: string;
  recorded_by_name: string;
  created_at: string;
}

export interface GroupJoinRequest {
  id: number;
  group: number;
  group_name: string;
  member: number;
  member_name: string;
  status: "pending" | "approved" | "rejected";
  notes: string;
  created_at: string;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export async function getGroups(
  branchId: number,
  params?: { group_type?: string; active_only?: string; page?: number },
): Promise<PaginatedResponse<Group>> {
  const { data } = await api.get("/api/v1/groups/", { headers: h(branchId), params });
  return data;
}

export async function createGroup(payload: Partial<Group>, branchId: number): Promise<Group> {
  const { data } = await api.post("/api/v1/groups/", payload, { headers: h(branchId) });
  return data;
}

export async function updateGroup(id: number, payload: Partial<Group>, branchId: number): Promise<Group> {
  const { data } = await api.patch(`/api/v1/groups/${id}/`, payload, { headers: h(branchId) });
  return data;
}

export async function deleteGroup(id: number, branchId: number): Promise<void> {
  await api.delete(`/api/v1/groups/${id}/`, { headers: h(branchId) });
}

export async function getGroupMembers(groupId: number, branchId: number): Promise<GroupMembership[]> {
  const { data } = await api.get(`/api/v1/groups/${groupId}/members/`, { headers: h(branchId) });
  return Array.isArray(data) ? data : data.results ?? [];
}

export async function addGroupMember(
  groupId: number,
  payload: { member: number; role?: string },
  branchId: number,
): Promise<GroupMembership> {
  const { data } = await api.post(`/api/v1/groups/${groupId}/members/`, payload, { headers: h(branchId) });
  return data;
}

export async function removeGroupMember(
  groupId: number,
  membershipId: number,
  branchId: number,
): Promise<GroupMembership> {
  const { data } = await api.post(
    `/api/v1/groups/${groupId}/members/${membershipId}/remove/`,
    {},
    { headers: h(branchId) },
  );
  return data;
}

export async function getGroupMeetings(groupId: number, branchId: number): Promise<GroupMeeting[]> {
  const { data } = await api.get(`/api/v1/groups/${groupId}/meetings/`, { headers: h(branchId) });
  return Array.isArray(data) ? data : data.results ?? [];
}

export async function createGroupMeeting(
  groupId: number,
  payload: { date: string; present_count: number; notes?: string },
  branchId: number,
): Promise<GroupMeeting> {
  const { data } = await api.post(`/api/v1/groups/${groupId}/meetings/`, payload, { headers: h(branchId) });
  return data;
}

export async function getGroupJoinRequests(
  groupId: number,
  branchId: number,
  params?: { status?: string },
): Promise<GroupJoinRequest[]> {
  const { data } = await api.get(`/api/v1/groups/${groupId}/join-requests/`, { headers: h(branchId), params });
  return Array.isArray(data) ? data : data.results ?? [];
}

export async function requestToJoinGroup(
  groupId: number,
  payload: { member: number; notes?: string },
  branchId: number,
): Promise<GroupJoinRequest> {
  const { data } = await api.post(`/api/v1/groups/${groupId}/join-requests/`, payload, { headers: h(branchId) });
  return data;
}

export async function decideJoinRequest(
  groupId: number,
  requestId: number,
  decision: "approve" | "reject",
  branchId: number,
): Promise<GroupJoinRequest> {
  const { data } = await api.post(
    `/api/v1/groups/${groupId}/join-requests/${requestId}/${decision}/`,
    {},
    { headers: h(branchId) },
  );
  return data;
}
