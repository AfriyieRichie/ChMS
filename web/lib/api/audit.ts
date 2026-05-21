import api from "@/lib/api";

export interface AuditLogEntry {
  id: number;
  actor: number | null;
  actor_name: string;
  actor_email: string;
  branch: number | null;
  branch_name: string | null;
  action: "create" | "update" | "delete";
  object_type: string;
  object_id: number;
  before_data: Record<string, unknown> | null;
  after_data: Record<string, unknown> | null;
  timestamp: string;
  ip_address: string | null;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export async function getAuditLog(params?: {
  object_type?: string;
  action?: string;
  actor?: number;
  branch?: number;
  date_from?: string;
  date_to?: string;
  search?: string;
  page?: number;
}): Promise<PaginatedResponse<AuditLogEntry>> {
  const { data } = await api.get("/api/v1/audit-log/", { params });
  return data;
}

export async function exportAuditLog(params?: {
  object_type?: string;
  action?: string;
  actor?: number;
  branch?: number;
  date_from?: string;
  date_to?: string;
  search?: string;
}): Promise<Blob> {
  const { data } = await api.get("/api/v1/audit-log/export/", {
    params,
    responseType: "blob",
  });
  return data;
}
