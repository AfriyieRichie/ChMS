import api from "@/lib/api";

export interface ServiceTime {
  name: string;
  day: string;
  time: string;
}

export interface Branch {
  id: number;
  name: string;
  slug: string;
  code: string;
  address: string;
  city: string;
  region: string;
  country: string;
  phone: string;
  email: string;
  timezone: string;
  currency: string;
  is_active: boolean;
  parent_branch: number | null;
  pastor: string;
  service_times: ServiceTime[];
  logo: string | null;
  member_count: number;
}

export interface TransferRecord {
  id: number;
  member_id: number;
  member_name: string;
  joined_at: string;
  left_at: string | null;
  is_primary: boolean;
  transfer_reason: string;
  direction: "in" | "out";
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export async function getBranches(params?: { page?: number; search?: string }): Promise<PaginatedResponse<Branch>> {
  const { data } = await api.get("/api/v1/branches/", { params });
  return data;
}

export async function getBranch(id: number): Promise<Branch> {
  const { data } = await api.get(`/api/v1/branches/${id}/`);
  return data;
}

export async function createBranch(payload: Partial<Branch>): Promise<Branch> {
  const { data } = await api.post("/api/v1/branches/", payload);
  return data;
}

export async function updateBranch(id: number, payload: Partial<Branch>): Promise<Branch> {
  const { data } = await api.patch(`/api/v1/branches/${id}/`, payload);
  return data;
}

export async function getBranchTransfers(id: number): Promise<TransferRecord[]> {
  const { data } = await api.get(`/api/v1/branches/${id}/transfers/`);
  return data;
}
