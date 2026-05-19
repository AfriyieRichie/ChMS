import api from "@/lib/api";

export interface Household {
  id: number;
  name: string;
  address: string;
  phone: string;
  branch: number;
  member_count: number;
  head: number | null;
  head_name: string | null;
  anniversary_date: string | null;
}

export interface HouseholdGiving {
  grand_total: number;
  by_fund: { fund__name: string; currency: string; total: number; count: number }[];
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
  const { data } = await api.get("/api/v1/households/", { headers: h(branchId), params });
  return data;
}

export async function createHousehold(
  payload: Partial<Household> & { branch: number },
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

export async function getHouseholdGiving(
  id: number,
  branchId: number
): Promise<HouseholdGiving> {
  const { data } = await api.get(`/api/v1/households/${id}/giving/`, { headers: h(branchId) });
  return data;
}
