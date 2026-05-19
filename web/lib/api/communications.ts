import api from "@/lib/api";

export interface Announcement {
  id: number;
  branch: number;
  title: string;
  body: string;
  audience: "all" | "members" | "leaders";
  is_published: boolean;
  is_active: boolean;
  published_at: string | null;
  expires_at: string | null;
  created_by: number | null;
  created_by_name: string;
  created_at: string;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

const headers = (branchId: number) => ({ "X-Branch-Id": String(branchId) });

export async function getAnnouncements(
  branchId: number,
  params?: { audience?: string; page?: number }
): Promise<PaginatedResponse<Announcement>> {
  const { data } = await api.get("/api/v1/announcements/", { headers: headers(branchId), params });
  return data;
}

export async function createAnnouncement(
  payload: Partial<Announcement>,
  branchId: number
): Promise<Announcement> {
  const { data } = await api.post("/api/v1/announcements/", payload, { headers: headers(branchId) });
  return data;
}

export async function updateAnnouncement(
  id: number,
  payload: Partial<Announcement>,
  branchId: number
): Promise<Announcement> {
  const { data } = await api.patch(`/api/v1/announcements/${id}/`, payload, { headers: headers(branchId) });
  return data;
}

export async function deleteAnnouncement(id: number, branchId: number): Promise<void> {
  await api.delete(`/api/v1/announcements/${id}/`, { headers: headers(branchId) });
}
