"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Plus, X, Pencil, Trash2, Users, MapPin, Clock,
  CheckCircle, UserPlus,
} from "lucide-react";
import {
  getEvents, getUpcomingEvents, createEvent, updateEvent, deleteEvent,
  getEventRegistrations, registerForEvent, checkInRegistration,
  type Event, type EventRegistration,
} from "@/lib/api/events";
import { getMembers } from "@/lib/api/members";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/dashboard/page-header";
import { cn } from "@/lib/utils";

const BRANCH_ID = 1;
const FIELD = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 bg-white disabled:bg-gray-50";

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DAY_NAMES = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

const EVENT_TYPES = [
  { value: "service",  label: "Church Service" },
  { value: "special",  label: "Special Event" },
  { value: "outreach", label: "Outreach" },
  { value: "training", label: "Training" },
  { value: "meeting",  label: "Meeting" },
];

type EventTypeBadge = "info" | "purple" | "success" | "orange" | "default";
const TYPE_BADGE: Record<string, EventTypeBadge> = {
  service: "info", special: "purple", outreach: "success", training: "orange", meeting: "default",
};

function fmtDate(s: string) {
  const d = new Date(s);
  return `${d.getDate()} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
}
function fmtTime(s: string) {
  const d = new Date(s);
  return d.toLocaleTimeString("en-GH", { hour: "2-digit", minute: "2-digit" });
}
function fmtDateTime(s: string) {
  const d = new Date(s);
  return `${DAY_NAMES[d.getDay()]}, ${d.getDate()} ${MONTH_NAMES[d.getMonth()]} · ${fmtTime(s)}`;
}

// ── Event form ────────────────────────────────────────────────────────────────

const eventSchema = z.object({
  name:            z.string().min(1, "Required").max(200),
  description:     z.string().optional(),
  event_type:      z.enum(["service", "special", "outreach", "training", "meeting"]),
  start_datetime:  z.string().min(1, "Required"),
  end_datetime:    z.string().optional(),
  venue:           z.string().max(200).optional(),
  capacity:        z.number().nullable().optional(),
  is_published:    z.boolean(),
});
type EventFormValues = z.infer<typeof eventSchema>;

interface EventFormProps {
  branchId: number;
  editing?: Event;
  onClose: () => void;
}

function EventForm({ branchId, editing, onClose }: EventFormProps) {
  const queryClient = useQueryClient();

  const toLocal = (iso: string) => iso ? iso.slice(0, 16) : "";

  const { register, handleSubmit, formState: { errors } } = useForm<EventFormValues>({
    resolver: zodResolver(eventSchema),
    defaultValues: editing ? {
      name:           editing.name,
      description:    editing.description,
      event_type:     editing.event_type,
      start_datetime: toLocal(editing.start_datetime),
      end_datetime:   editing.end_datetime ? toLocal(editing.end_datetime) : "",
      venue:          editing.venue,
      capacity:       editing.capacity,
      is_published:   editing.is_published,
    } : { event_type: "service", is_published: true },
  });

  const createMut = useMutation({
    mutationFn: (d: EventFormValues) => createEvent({ ...d, branch: branchId }, branchId),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["events"] }); onClose(); },
  });
  const updateMut = useMutation({
    mutationFn: (d: EventFormValues) => updateEvent(editing!.id, d, branchId),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["events"] }); onClose(); },
  });

  const isPending = createMut.isPending || updateMut.isPending;

  function submit(d: EventFormValues) {
    editing ? updateMut.mutate(d) : createMut.mutate(d);
  }

  return (
    <form onSubmit={handleSubmit(submit)} className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-gray-900 text-sm">{editing ? "Edit Event" : "New Event"}</h2>
        <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 space-y-1">
          <label className="text-xs font-medium text-gray-600">Event Name *</label>
          <input type="text" {...register("name")} placeholder="e.g. Sunday Service" className={FIELD} />
          {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-600">Type *</label>
          <select {...register("event_type")} className={FIELD}>
            {EVENT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-600">Venue</label>
          <input type="text" {...register("venue")} placeholder="Main auditorium" className={FIELD} />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-600">Start *</label>
          <input type="datetime-local" {...register("start_datetime")} className={FIELD} />
          {errors.start_datetime && <p className="text-xs text-red-500">{errors.start_datetime.message}</p>}
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-600">End</label>
          <input type="datetime-local" {...register("end_datetime")} className={FIELD} />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-600">Capacity</label>
          <input type="number" min="1"
            {...register("capacity", { setValueAs: (v) => v === "" ? null : Number(v) })}
            placeholder="Unlimited" className={FIELD} />
        </div>
        <div className="col-span-2 space-y-1">
          <label className="text-xs font-medium text-gray-600">Description</label>
          <textarea {...register("description")} rows={2} className={FIELD} />
        </div>
        <div className="col-span-2 flex items-center gap-2">
          <input type="checkbox" {...register("is_published")} id="published" className="w-4 h-4 rounded border-gray-300" />
          <label htmlFor="published" className="text-sm text-gray-700">Published</label>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? "Saving…" : editing ? "Update Event" : "Create Event"}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={onClose}>Cancel</Button>
        {(createMut.isError || updateMut.isError) && <p className="text-xs text-red-500">Failed to save.</p>}
      </div>
    </form>
  );
}

// ── Upcoming event card ───────────────────────────────────────────────────────

function UpcomingCard({ event, onEdit, onRegistrations }: {
  event: Event;
  onEdit: () => void;
  onRegistrations: () => void;
}) {
  const d = new Date(event.start_datetime);
  const isFull = event.capacity !== null && event.registration_count >= event.capacity;

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4 flex gap-4 group">
      {/* Date block */}
      <div className="shrink-0 w-14 h-14 rounded-xl bg-blue-600 flex flex-col items-center justify-center text-white">
        <span className="text-[10px] font-semibold uppercase tracking-wide opacity-80">{MONTH_NAMES[d.getMonth()]}</span>
        <span className="text-2xl font-bold leading-none">{d.getDate()}</span>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-semibold text-gray-900 truncate">{event.name}</h3>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            <button onClick={onEdit} className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors">
              <Pencil size={13} />
            </button>
            <button onClick={onRegistrations} className="p-1 rounded hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors">
              <Users size={13} />
            </button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 mt-1.5 text-xs text-gray-500">
          <Badge variant={TYPE_BADGE[event.event_type] ?? "default"}>
            {EVENT_TYPES.find((t) => t.value === event.event_type)?.label ?? event.event_type}
          </Badge>
          <span className="flex items-center gap-1"><Clock size={11} />{fmtTime(event.start_datetime)}</span>
          {event.venue && <span className="flex items-center gap-1"><MapPin size={11} />{event.venue}</span>}
        </div>
        <div className="flex items-center gap-2 mt-2">
          <button
            onClick={onRegistrations}
            className={cn(
              "text-xs font-medium px-2 py-0.5 rounded-full border transition-colors",
              isFull
                ? "border-red-200 text-red-600 bg-red-50"
                : "border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100",
            )}
          >
            <span className="flex items-center gap-1">
              <UserPlus size={10} />
              {event.registration_count}{event.capacity ? ` / ${event.capacity}` : ""} registered
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Registrations slide-in ────────────────────────────────────────────────────

function RegistrationsPanel({ event, branchId, onClose }: {
  event: Event;
  branchId: number;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [memberSearch, setMemberSearch] = useState("");

  const { data: registrations = [], isLoading } = useQuery({
    queryKey: ["event-registrations", event.id, branchId],
    queryFn: () => getEventRegistrations(event.id, branchId),
  });

  const { data: membersData } = useQuery({
    queryKey: ["members", branchId, { search: memberSearch }],
    queryFn: () => getMembers(branchId, { search: memberSearch }),
    enabled: memberSearch.length >= 2,
  });

  const registerMut = useMutation({
    mutationFn: (memberId: number) => registerForEvent(event.id, { member: memberId }, branchId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event-registrations", event.id, branchId] });
      queryClient.invalidateQueries({ queryKey: ["events"] });
      setMemberSearch("");
    },
  });

  const checkInMut = useMutation({
    mutationFn: (regId: number) => checkInRegistration(event.id, regId, branchId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["event-registrations", event.id, branchId] }),
  });

  const registeredIds = new Set(registrations.filter((r) => r.member).map((r) => r.member!));
  const suggestions = (membersData?.results ?? []).filter((m) => !registeredIds.has(m.id));

  const regStatusBadge: Record<string, "success" | "info" | "danger"> = {
    attended: "success", registered: "info", cancelled: "danger",
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-96 bg-white border-l border-gray-200 shadow-2xl flex flex-col">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div>
          <h2 className="font-semibold text-gray-900">Registrations</h2>
          <p className="text-xs text-gray-400 truncate max-w-[280px]">{event.name} · {fmtDate(event.start_datetime)}</p>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
      </div>

      {/* Add member */}
      <div className="px-5 py-3 border-b border-gray-100">
        <div className="relative">
          <input
            type="search"
            placeholder="Search members to register…"
            value={memberSearch}
            onChange={(e) => setMemberSearch(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
          />
          {suggestions.length > 0 && memberSearch.length >= 2 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl border border-gray-200 shadow-xl z-10 max-h-48 overflow-auto">
              {suggestions.slice(0, 8).map((m) => (
                <button
                  key={m.id}
                  onClick={() => registerMut.mutate(m.id)}
                  disabled={registerMut.isPending}
                  className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-gray-50 text-left transition-colors"
                >
                  <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-[10px] font-semibold flex items-center justify-center shrink-0">
                    {m.full_name.split(" ").slice(0,2).map((n) => n[0]).join("")}
                  </div>
                  <span className="text-sm text-gray-800">{m.full_name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Registration list */}
      <div className="flex-1 overflow-auto px-5 py-3 space-y-1">
        {isLoading && <p className="text-sm text-gray-400 text-center py-6">Loading…</p>}
        {!isLoading && registrations.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-6">No registrations yet.</p>
        )}
        {registrations.map((reg) => (
          <div key={reg.id} className="flex items-center gap-2.5 py-2 group">
            <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 text-[11px] font-semibold flex items-center justify-center shrink-0">
              {reg.member_name.split(" ").slice(0,2).map((n) => n[0]).join("")}
            </div>
            <span className="text-sm text-gray-800 flex-1">{reg.member_name}</span>
            <Badge variant={regStatusBadge[reg.status] ?? "default"}>
              {reg.status}
            </Badge>
            {reg.status === "registered" && (
              <button
                onClick={() => checkInMut.mutate(reg.id)}
                disabled={checkInMut.isPending}
                title="Mark as attended"
                className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-emerald-50 text-gray-400 hover:text-emerald-600 transition-all"
              >
                <CheckCircle size={15} />
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="px-5 py-3 border-t border-gray-100 text-xs text-gray-400 text-center">
        {registrations.length} registration{registrations.length !== 1 ? "s" : ""}
        {event.capacity ? ` · ${event.capacity} capacity` : ""}
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

type ViewTab = "upcoming" | "all";

export default function EventsPage() {
  const queryClient = useQueryClient();
  const [tab, setTab]             = useState<ViewTab>("upcoming");
  const [typeFilter, setTypeFilter] = useState("");
  const [page, setPage]           = useState(1);
  const [showForm, setShowForm]   = useState(false);
  const [editing, setEditing]     = useState<Event | null>(null);
  const [regEvent, setRegEvent]   = useState<Event | null>(null);

  const { data: upcoming, isLoading: loadingUpcoming } = useQuery({
    queryKey: ["events-upcoming", BRANCH_ID],
    queryFn: () => getUpcomingEvents(BRANCH_ID),
    enabled: tab === "upcoming",
  });

  const { data: allEvents, isLoading: loadingAll } = useQuery({
    queryKey: ["events", BRANCH_ID, typeFilter, page],
    queryFn: () => getEvents(BRANCH_ID, { event_type: typeFilter || undefined, page }),
    placeholderData: (p) => p,
    enabled: tab === "all",
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => deleteEvent(id, BRANCH_ID),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["events"] }),
  });

  function openEdit(ev: Event) { setEditing(ev); setShowForm(true); }
  function closeForm() { setShowForm(false); setEditing(null); }

  const isLoading = tab === "upcoming" ? loadingUpcoming : loadingAll;

  return (
    <div className="p-6 space-y-4">
      <PageHeader title="Events" description="Manage church events and registrations.">
        <Button size="sm" onClick={() => { setEditing(null); setShowForm((v) => !v); }}>
          {showForm && !editing ? <X size={14} /> : <Plus size={14} />}
          {showForm && !editing ? "Cancel" : "Add Event"}
        </Button>
      </PageHeader>

      {showForm && (
        <EventForm branchId={BRANCH_ID} editing={editing ?? undefined} onClose={closeForm} />
      )}

      {/* Tab switcher */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {(["upcoming", "all"] as ViewTab[]).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setPage(1); }}
            className={cn(
              "px-4 py-1.5 rounded-lg text-sm font-medium transition-all",
              tab === t ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700",
            )}
          >
            {t === "upcoming" ? "Upcoming" : "All Events"}
          </button>
        ))}
      </div>

      {/* Upcoming cards */}
      {tab === "upcoming" && (
        <>
          {loadingUpcoming ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="bg-white border border-gray-200 rounded-2xl p-4 flex gap-4 animate-pulse">
                  <div className="w-14 h-14 rounded-xl bg-gray-100 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-gray-100 rounded w-3/4" />
                    <div className="h-2.5 bg-gray-100 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : upcoming?.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-2xl p-10 text-center text-gray-400 text-sm">
              No upcoming events. Create one to get started.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {upcoming?.map((ev) => (
                <UpcomingCard
                  key={ev.id}
                  event={ev}
                  onEdit={() => openEdit(ev)}
                  onRegistrations={() => setRegEvent(ev)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* All events table */}
      {tab === "all" && (
        <>
          {/* Type filter chips */}
          <div className="flex gap-2 flex-wrap">
            {[{ value: "", label: "All" }, ...EVENT_TYPES].map((t) => (
              <button
                key={t.value}
                onClick={() => { setTypeFilter(t.value); setPage(1); }}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors",
                  typeFilter === t.value
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-gray-600 border-gray-200 hover:border-gray-300",
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {loadingAll ? (
              <div className="divide-y divide-gray-50">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4 px-4 py-3.5 animate-pulse">
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 bg-gray-100 rounded w-40" />
                      <div className="h-2.5 bg-gray-100 rounded w-28" />
                    </div>
                    <div className="h-5 w-20 bg-gray-100 rounded-full" />
                  </div>
                ))}
              </div>
            ) : (
              <>
                <table className="min-w-full divide-y divide-gray-100">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Event</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">Type</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Start</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Venue</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Reg.</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">Status</th>
                      <th className="px-4 py-3 w-28" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {allEvents?.results.length === 0 && (
                      <tr><td colSpan={7} className="px-4 py-10 text-center text-gray-400 text-sm">No events found.</td></tr>
                    )}
                    {allEvents?.results.map((ev: Event) => (
                      <tr key={ev.id} className="hover:bg-gray-50 transition-colors group">
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium text-gray-900">{ev.name}</p>
                          {ev.description && (
                            <p className="text-xs text-gray-400 truncate max-w-[200px]">{ev.description}</p>
                          )}
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell">
                          <Badge variant={TYPE_BADGE[ev.event_type] ?? "default"}>
                            {EVENT_TYPES.find((t) => t.value === ev.event_type)?.label ?? ev.event_type}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">{fmtDateTime(ev.start_datetime)}</td>
                        <td className="px-4 py-3 text-sm text-gray-400 hidden md:table-cell">{ev.venue || "—"}</td>
                        <td className="px-4 py-3 text-sm text-center text-gray-600 hidden lg:table-cell">
                          <button onClick={() => setRegEvent(ev)} className="hover:text-blue-600 transition-colors">
                            {ev.registration_count}{ev.capacity ? ` / ${ev.capacity}` : ""}
                          </button>
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell">
                          <Badge variant={ev.is_published ? "success" : "default"}>
                            {ev.is_published ? "Published" : "Draft"}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => setRegEvent(ev)}
                              className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors"
                              title="Registrations"
                            >
                              <Users size={14} />
                            </button>
                            <button
                              onClick={() => openEdit(ev)}
                              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
                              title="Edit"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              onClick={() => { if (confirm("Delete this event?")) deleteMut.mutate(ev.id); }}
                              className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
                              title="Delete"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {allEvents && allEvents.count > 0 && (
                  <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 text-sm text-gray-500">
                    <span>{allEvents.count} event{allEvents.count !== 1 ? "s" : ""}</span>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={!allEvents.previous}>
                        Previous
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={!allEvents.next}>
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}

      {/* Registrations slide-in */}
      {regEvent && (
        <RegistrationsPanel
          event={regEvent}
          branchId={BRANCH_ID}
          onClose={() => setRegEvent(null)}
        />
      )}
    </div>
  );
}
