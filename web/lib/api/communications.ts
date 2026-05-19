import api from "@/lib/api";

const h = (branchId: number) => ({ "X-Branch-Id": String(branchId) });

export type Channel = "sms" | "email" | "whatsapp" | "push";
export type CampaignStatus = "draft" | "scheduled" | "sent" | "failed";
export type TemplateCategory = "welcome" | "birthday" | "follow_up" | "event_reminder" | "pastoral" | "custom";

// ── Announcements ─────────────────────────────────────────────────────────────

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

// ── Templates ─────────────────────────────────────────────────────────────────

export interface MessageTemplate {
  id: number;
  branch: number;
  name: string;
  category: TemplateCategory;
  channel: Channel;
  subject: string;
  body: string;
  is_active: boolean;
  created_by: number | null;
  created_by_name: string;
  created_at: string;
  updated_at: string;
}

// ── Audiences ─────────────────────────────────────────────────────────────────

export interface AudienceFilters {
  membership_status?: string[];
  gender?: string;
  attended_in_days?: number | null;
  not_attended_in_days?: number | null;
  tag_ids?: number[];
}

export interface Audience {
  id: number;
  branch: number;
  name: string;
  description: string;
  filters: AudienceFilters;
  created_by: number | null;
  created_by_name: string;
  created_at: string;
  updated_at: string;
}

export interface AudiencePreview {
  count: number;
  sample: string[];
}

// ── Campaigns ─────────────────────────────────────────────────────────────────

export interface Campaign {
  id: number;
  branch: number;
  name: string;
  template: number | null;
  template_name: string;
  audience: number | null;
  audience_name: string;
  channel: Channel;
  status: CampaignStatus;
  scheduled_at: string | null;
  sent_at: string | null;
  recipient_count: number;
  created_by: number | null;
  created_by_name: string;
  created_at: string;
  updated_at: string;
}

// ── Message Log ───────────────────────────────────────────────────────────────

export interface MessageLog {
  id: number;
  campaign: number;
  campaign_name: string;
  member: number | null;
  member_name: string;
  channel: Channel;
  recipient_address: string;
  status: "queued" | "sent" | "delivered" | "failed" | "opted_out";
  sent_at: string | null;
  error_message: string;
  created_at: string;
}

// ── Opt-outs ──────────────────────────────────────────────────────────────────

export interface CommunicationOptOut {
  id: number;
  member: number;
  member_name: string;
  channel: Channel | "all";
  reason: string;
  created_at: string;
}

// ── Pagination ────────────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// ── API functions ─────────────────────────────────────────────────────────────

export async function getAnnouncements(branchId: number, params?: { audience?: string; page?: number }): Promise<PaginatedResponse<Announcement>> {
  const { data } = await api.get("/api/v1/announcements/", { headers: h(branchId), params });
  return data;
}
export async function createAnnouncement(payload: Partial<Announcement>, branchId: number): Promise<Announcement> {
  const { data } = await api.post("/api/v1/announcements/", payload, { headers: h(branchId) });
  return data;
}
export async function deleteAnnouncement(id: number, branchId: number): Promise<void> {
  await api.delete(`/api/v1/announcements/${id}/`, { headers: h(branchId) });
}

export async function getTemplates(branchId: number, params?: { category?: string; channel?: string; active_only?: string }): Promise<PaginatedResponse<MessageTemplate>> {
  const { data } = await api.get("/api/v1/message-templates/", { headers: h(branchId), params });
  return data;
}
export async function createTemplate(payload: Partial<MessageTemplate>, branchId: number): Promise<MessageTemplate> {
  const { data } = await api.post("/api/v1/message-templates/", payload, { headers: h(branchId) });
  return data;
}
export async function updateTemplate(id: number, payload: Partial<MessageTemplate>, branchId: number): Promise<MessageTemplate> {
  const { data } = await api.patch(`/api/v1/message-templates/${id}/`, payload, { headers: h(branchId) });
  return data;
}
export async function deleteTemplate(id: number, branchId: number): Promise<void> {
  await api.delete(`/api/v1/message-templates/${id}/`, { headers: h(branchId) });
}

export async function getAudiences(branchId: number): Promise<PaginatedResponse<Audience>> {
  const { data } = await api.get("/api/v1/audiences/", { headers: h(branchId) });
  return data;
}
export async function createAudience(payload: Partial<Audience>, branchId: number): Promise<Audience> {
  const { data } = await api.post("/api/v1/audiences/", payload, { headers: h(branchId) });
  return data;
}
export async function updateAudience(id: number, payload: Partial<Audience>, branchId: number): Promise<Audience> {
  const { data } = await api.patch(`/api/v1/audiences/${id}/`, payload, { headers: h(branchId) });
  return data;
}
export async function deleteAudience(id: number, branchId: number): Promise<void> {
  await api.delete(`/api/v1/audiences/${id}/`, { headers: h(branchId) });
}
export async function previewAudience(id: number, branchId: number): Promise<AudiencePreview> {
  const { data } = await api.get(`/api/v1/audiences/${id}/preview/`, { headers: h(branchId) });
  return data;
}

export async function getCampaigns(branchId: number, params?: { status?: string; page?: number }): Promise<PaginatedResponse<Campaign>> {
  const { data } = await api.get("/api/v1/campaigns/", { headers: h(branchId), params });
  return data;
}
export async function createCampaign(payload: Partial<Campaign>, branchId: number): Promise<Campaign> {
  const { data } = await api.post("/api/v1/campaigns/", payload, { headers: h(branchId) });
  return data;
}
export async function updateCampaign(id: number, payload: Partial<Campaign>, branchId: number): Promise<Campaign> {
  const { data } = await api.patch(`/api/v1/campaigns/${id}/`, payload, { headers: h(branchId) });
  return data;
}
export async function sendCampaign(id: number, branchId: number): Promise<Campaign> {
  const { data } = await api.post(`/api/v1/campaigns/${id}/send/`, {}, { headers: h(branchId) });
  return data;
}
export async function scheduleCampaign(id: number, scheduled_at: string, branchId: number): Promise<Campaign> {
  const { data } = await api.post(`/api/v1/campaigns/${id}/schedule/`, { scheduled_at }, { headers: h(branchId) });
  return data;
}
export async function deleteCampaign(id: number, branchId: number): Promise<void> {
  await api.delete(`/api/v1/campaigns/${id}/`, { headers: h(branchId) });
}

export async function getMessageLogs(branchId: number, params?: { campaign?: number; member?: number; page?: number }): Promise<PaginatedResponse<MessageLog>> {
  const { data } = await api.get("/api/v1/message-logs/", { headers: h(branchId), params });
  return data;
}

export async function getOptOuts(branchId: number, params?: { member?: number }): Promise<PaginatedResponse<CommunicationOptOut>> {
  const { data } = await api.get("/api/v1/opt-outs/", { headers: h(branchId), params });
  return data;
}
export async function createOptOut(payload: { member: number; channel: string; reason?: string }, branchId: number): Promise<CommunicationOptOut> {
  const { data } = await api.post("/api/v1/opt-outs/", payload, { headers: h(branchId) });
  return data;
}
export async function deleteOptOut(id: number, branchId: number): Promise<void> {
  await api.delete(`/api/v1/opt-outs/${id}/`, { headers: h(branchId) });
}
