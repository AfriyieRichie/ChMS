import api from "@/lib/api";

const h = (branchId: number) => ({ "X-Branch-Id": String(branchId) });

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

export async function getEvents(
  branchId: number,
  params?: { event_type?: string; page?: number },
): Promise<PaginatedResponse<Event>> {
  const { data } = await api.get("/api/v1/events/", { headers: h(branchId), params });
  return data;
}

export async function getUpcomingEvents(branchId: number): Promise<Event[]> {
  const { data } = await api.get("/api/v1/events/upcoming/", { headers: h(branchId) });
  return data;
}

export async function createEvent(payload: Partial<Event>, branchId: number): Promise<Event> {
  const { data } = await api.post("/api/v1/events/", payload, { headers: h(branchId) });
  return data;
}

export async function updateEvent(id: number, payload: Partial<Event>, branchId: number): Promise<Event> {
  const { data } = await api.patch(`/api/v1/events/${id}/`, payload, { headers: h(branchId) });
  return data;
}

export async function deleteEvent(id: number, branchId: number): Promise<void> {
  await api.delete(`/api/v1/events/${id}/`, { headers: h(branchId) });
}

export async function getEventRegistrations(eventId: number, branchId: number): Promise<EventRegistration[]> {
  const { data } = await api.get(`/api/v1/events/${eventId}/registrations/`, { headers: h(branchId) });
  return Array.isArray(data) ? data : data.results ?? [];
}

export async function registerForEvent(
  eventId: number,
  payload: { member?: number; notes?: string },
  branchId: number,
): Promise<EventRegistration> {
  const { data } = await api.post(`/api/v1/events/${eventId}/registrations/`, payload, { headers: h(branchId) });
  return data;
}

export async function checkInRegistration(
  eventId: number,
  regId: number,
  branchId: number,
): Promise<EventRegistration> {
  const { data } = await api.post(
    `/api/v1/events/${eventId}/registrations/${regId}/check-in/`,
    {},
    { headers: h(branchId) },
  );
  return data;
}
