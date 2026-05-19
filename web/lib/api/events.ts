import api from "@/lib/api";

export interface Event {
  id: number;
  branch: number;
  name: string;
  description: string;
  event_type: "service" | "special" | "outreach" | "training" | "meeting";
  start_datetime: string;
  end_datetime: string | null;
  venue: string;
  capacity: number | null;
  is_published: boolean;
  registration_count: number;
  created_by: number | null;
  created_by_name: string;
  created_at: string;
}

export interface EventRegistration {
  id: number;
  event: number;
  event_name: string;
  member: number | null;
  member_name: string;
  status: "registered" | "attended" | "cancelled";
  notes: string;
  created_at: string;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

const headers = (branchId: number) => ({ "X-Branch-Id": String(branchId) });

export async function getEvents(
  branchId: number,
  params?: { event_type?: string; page?: number }
): Promise<PaginatedResponse<Event>> {
  const { data } = await api.get("/api/v1/events/", { headers: headers(branchId), params });
  return data;
}

export async function getUpcomingEvents(branchId: number): Promise<Event[]> {
  const { data } = await api.get("/api/v1/events/upcoming/", { headers: headers(branchId) });
  return data;
}

export async function createEvent(
  payload: Partial<Event>,
  branchId: number
): Promise<Event> {
  const { data } = await api.post("/api/v1/events/", payload, { headers: headers(branchId) });
  return data;
}

export async function getEventRegistrations(
  eventId: number,
  branchId: number
): Promise<EventRegistration[]> {
  const { data } = await api.get(`/api/v1/events/${eventId}/registrations/`, {
    headers: headers(branchId),
  });
  return data;
}

export async function registerForEvent(
  eventId: number,
  payload: { member?: number; notes?: string },
  branchId: number
): Promise<EventRegistration> {
  const { data } = await api.post(`/api/v1/events/${eventId}/registrations/`, payload, {
    headers: headers(branchId),
  });
  return data;
}
