import api from "@/lib/api";

export interface Household {
  id: number;
  name: string;
  address: string;
  phone: string;
  branch: number;
  member_count: number;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

const h = (branchId: number) => ({ "X-Branch-Id": String(branchId) });

export async function getHouseholds(
  branchId: number,
  params?: { page?: number; search?: string }
): Promise<PaginatedResponse<Household>> {
  const { data } = await api.get("/api/v1/households/", {
    headers: h(branchId),
    params,
  });
  return data;
}

export async function createHousehold(
  payload: { name: string; address?: string; phone?: string; branch: number },
  branchId: number
): Promise<Household> {
  const { data } = await api.post("/api/v1/households/", payload, { headers: h(branchId) });
  return data;
}

export async function updateHousehold(
  id: number,
  payload: Partial<Household>,
  branchId: number
): Promise<Household> {
  const { data } = await api.patch(`/api/v1/households/${id}/`, payload, { headers: h(branchId) });
  return data;
}

export async function getHouseholdMembers(id: number, branchId: number) {
  const { data } = await api.get(`/api/v1/households/${id}/`, { headers: h(branchId) });
  return data;
}
