import api from "@/lib/api";

const h = (branchId: number) => ({ "X-Branch-Id": String(branchId) });

export type EventType = "service" | "conference" | "class" | "social" | "outreach" | "training" | "meeting";
export type Recurrence = "" | "daily" | "weekly" | "biweekly" | "monthly";

export interface VolunteerSlot {
  id: number;
  event: number;
  role_name: string;
  slots_needed: number;
  notes: string;
}

export interface Event {
  id: number;
  branch: number;
  name: string;
  description: string;
  event_type: EventType;
  start_datetime: string;
  end_datetime: string | null;
  venue: string;
  capacity: number | null;
  cost: number | null;
  registration_required: boolean;
  banner: string | null;
  recurrence: Recurrence;
  recurrence_end: string | null;
  is_published: boolean;
  registration_count: number;
  volunteer_slots?: VolunteerSlot[];
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
  status: "registered" | "waitlisted" | "attended" | "cancelled";
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
  params?: { event_type?: string; date_from?: string; date_to?: string; page?: number },
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

export async function getVolunteerSlots(eventId: number, branchId: number): Promise<VolunteerSlot[]> {
  const { data } = await api.get(`/api/v1/events/${eventId}/volunteer-slots/`, { headers: h(branchId) });
  return Array.isArray(data) ? data : data.results ?? [];
}

export async function createVolunteerSlot(
  eventId: number,
  payload: { role_name: string; slots_needed: number; notes?: string },
  branchId: number,
): Promise<VolunteerSlot> {
  const { data } = await api.post(`/api/v1/events/${eventId}/volunteer-slots/`, payload, { headers: h(branchId) });
  return data;
}

export async function deleteVolunteerSlot(eventId: number, slotId: number, branchId: number): Promise<void> {
  await api.delete(`/api/v1/events/${eventId}/volunteer-slots/${slotId}/`, { headers: h(branchId) });
}
