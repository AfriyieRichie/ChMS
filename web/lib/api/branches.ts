import api from "@/lib/api";

export interface Branch {
  id: number;
  name: string;
  slug: string;
  code: string;
  city: string;
  region: string;
  country: string;
  phone: string;
  email: string;
  is_active: boolean;
  timezone: string;
  currency: string;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export async function getBranches(
  params?: { page?: number }
): Promise<PaginatedResponse<Branch>> {
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
