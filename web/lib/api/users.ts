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
  role_assignments: UserRoleAssignment[];
}

export interface Role {
  id: number;
  name: string;
  description: string;
}

export interface Me {
  id: number;
  email: string;
  full_name: string;
  is_network_admin: boolean;
  role_assignments: UserRoleAssignment[];
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

export async function createUser(
  payload: { email: string; full_name: string; phone?: string; password: string },
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
  branchId: number
): Promise<UserRoleAssignment> {
  const { data } = await api.post(
    `/api/v1/users/${userId}/assign-role/`,
    { role: roleId, branch: branchId },
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
