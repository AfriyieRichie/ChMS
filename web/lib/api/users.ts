import api from "@/lib/api";

export interface UserRoleAssignment {
  id: number;
  role: number;
  role_name: string;
  branch: number | null;
  branch_name: string | null;
}

export interface User {
  id: number;
  email: string;
  full_name: string;
  phone: string;
  is_active: boolean;
  is_network_admin: boolean;
  date_joined: string;
  last_login: string | null;
  role_assignments: UserRoleAssignment[];
}

export interface Role {
  id: number;
  name: string;
  description: string;
  capabilities: string[];
}

export interface Me {
  id: number;
  email: string;
  full_name: string;
  is_network_admin: boolean;
  role_assignments: UserRoleAssignment[];
}

export interface UserCapability {
  codename: string;
  description: string;
}

export interface UserCapabilities {
  all_capabilities: UserCapability[];
  by_role: { role: string; branch: string | null; capabilities: string[] }[];
}

const h = (branchId: number) => ({ "X-Branch-Id": String(branchId) });

export async function getMe(): Promise<Me> {
  const { data } = await api.get("/api/v1/me/");
  return data;
}

export async function getUsers(branchId: number): Promise<User[]> {
  const { data } = await api.get("/api/v1/users/", { headers: h(branchId) });
  return Array.isArray(data) ? data : data.results ?? [];
}

export async function inviteUser(
  payload: { email: string; full_name: string; phone?: string },
  branchId: number
): Promise<User> {
  const { data } = await api.post("/api/v1/users/", payload, { headers: h(branchId) });
  return data;
}

export async function getRoles(): Promise<Role[]> {
  const { data } = await api.get("/api/v1/roles/");
  return Array.isArray(data) ? data : data.results ?? [];
}

export async function assignRole(
  userId: number,
  roleId: number,
  branchId: number,
  targetBranchId?: number | null
): Promise<UserRoleAssignment> {
  const { data } = await api.post(
    `/api/v1/users/${userId}/assign-role/`,
    { role: roleId, branch: targetBranchId ?? null },
    { headers: h(branchId) }
  );
  return data;
}

export async function removeRole(
  userId: number,
  assignmentId: number,
  branchId: number
): Promise<void> {
  await api.delete(`/api/v1/users/${userId}/roles/${assignmentId}/`, { headers: h(branchId) });
}

export async function deactivateUser(userId: number, branchId: number): Promise<void> {
  await api.delete(`/api/v1/users/${userId}/`, { headers: h(branchId) });
}

export async function sendPasswordReset(userId: number, branchId: number): Promise<void> {
  await api.post(`/api/v1/users/${userId}/send-reset/`, {}, { headers: h(branchId) });
}

export async function getUserCapabilities(
  userId: number,
  branchId: number
): Promise<UserCapabilities> {
  const { data } = await api.get(`/api/v1/users/${userId}/capabilities/`, {
    headers: h(branchId),
  });
  return data;
}

export async function updateMe(payload: { full_name?: string; phone?: string }): Promise<Me> {
  const { data } = await api.patch("/api/v1/me/", payload);
  return data;
}

export async function changePassword(oldPassword: string, newPassword: string): Promise<void> {
  await api.post("/api/v1/change-password/", {
    old_password: oldPassword,
    new_password: newPassword,
  });
}

// ── Notification preferences ──────────────────────────────────────────────────

export interface NotificationPreferences {
  email_attendance_reminders: boolean;
  email_event_invites: boolean;
  email_giving_receipts: boolean;
  email_announcements: boolean;
  email_pastoral_care: boolean;
  updated_at: string;
}

export async function getMyNotifications(): Promise<NotificationPreferences> {
  const { data } = await api.get("/api/v1/me/notifications/");
  return data;
}

export async function updateMyNotifications(
  payload: Partial<Omit<NotificationPreferences, "updated_at">>
): Promise<NotificationPreferences> {
  const { data } = await api.patch("/api/v1/me/notifications/update/", payload);
  return data;
}

// ── Profile data ──────────────────────────────────────────────────────────────

export interface MyGivingEntry {
  id: number;
  receipt_number: string;
  amount: string;
  currency: string;
  given_at: string;
  payment_method: string;
  "fund__name": string | null;
  "category__name": string | null;
}

export interface MyGiving {
  has_member_profile: boolean;
  grand_total: number;
  results: MyGivingEntry[];
}

export async function getMyGiving(year?: number): Promise<MyGiving> {
  const { data } = await api.get("/api/v1/me/giving/", { params: year ? { year } : {} });
  return data;
}

export async function downloadGivingStatement(year: number): Promise<Blob> {
  const { data } = await api.get("/api/v1/me/giving/statement/", {
    params: { year },
    responseType: "blob",
  });
  return data;
}

export interface MyAttendanceEntry {
  date: string;
  service: string | null;
  branch: string | null;
}

export interface MyAttendance {
  has_member_profile: boolean;
  results: MyAttendanceEntry[];
}

export async function getMyAttendance(): Promise<MyAttendance> {
  const { data } = await api.get("/api/v1/me/attendance/");
  return data;
}

export interface MyGroupEntry {
  group_id: number;
  group_name: string;
  group_type: string;
  joined_at: string;
  left_at: string | null;
  is_active: boolean;
}

export interface MyGroups {
  has_member_profile: boolean;
  results: MyGroupEntry[];
}

export async function getMyGroups(): Promise<MyGroups> {
  const { data } = await api.get("/api/v1/me/groups/");
  return data;
}
