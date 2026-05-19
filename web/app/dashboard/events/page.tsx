"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Plus, X, Pencil, Trash2, Users, MapPin, Clock,
  CheckCircle, UserPlus, RefreshCw, DollarSign, Repeat, ChevronLeft, ChevronRight,
} from "lucide-react";
import {
  getEvents, getUpcomingEvents, createEvent, updateEvent, deleteEvent,
  getEventRegistrations, registerForEvent, checkInRegistration,
  getVolunteerSlots, createVolunteerSlot, deleteVolunteerSlot,
  type Event, type EventRegistration, type VolunteerSlot,
} from "@/lib/api/events";
import { getMembers } from "@/lib/api/members";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/dashboard/page-header";
import { cn } from "@/lib/utils";

const BRANCH_ID = 1;
const FIELD = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 bg-white disabled:bg-gray-50";

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const MONTH_FULL = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAY_NAMES = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

const EVENT_TYPES = [
  { value: "service",    label: "Church Service" },
  { value: "conference", label: "Conference" },
  { value: "class",      label: "Class" },
  { value: "social",     label: "Social" },
  { value: "outreach",   label: "Outreach" },
  { value: "training",   label: "Training" },
  { value: "meeting",    label: "Meeting" },
];

const RECURRENCE_OPTIONS = [
  { value: "",         label: "Does not repeat" },
  { value: "daily",    label: "Daily" },
  { value: "weekly",   label: "Weekly" },
  { value: "biweekly", label: "Every 2 weeks" },
  { value: "monthly",  label: "Monthly" },
];

type BadgeVariant = "info" | "purple" | "orange" | "success" | "warning" | "default";
const TYPE_BADGE: Record<string, BadgeVariant> = {
  service: "info", conference: "purple", class: "warning",
  social: "orange", outreach: "success", training: "orange", meeting: "default",
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
function initials(name: string) {
  return name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();
}

// ── Event form ────────────────────────────────────────────────────────────────

const eventSchema = z.object({
  name:                 z.string().min(1, "Required").max(200),
  description:          z.string().optional(),
  event_type:           z.enum(["service","conference","class","social","outreach","training","meeting"]),
  start_datetime:       z.string().min(1, "Required"),
  end_datetime:         z.string().optional(),
  venue:                z.string().max(200).optional(),
  capacity:             z.number().nullable().optional(),
  cost:                 z.number().nullable().optional(),
  registration_required: z.boolean(),
  recurrence:           z.enum(["","daily","weekly","biweekly","monthly"]),
  recurrence_end:       z.string().optional(),
  is_published:         z.boolean(),
});
type EventFormValues = z.infer<typeof eventSchema>;

function EventForm({ branchId, editing, onClose }: {
  branchId: number; editing?: Event; onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const toLocal = (iso: string) => iso ? iso.slice(0, 16) : "";

  const { register, handleSubmit, watch, formState: { errors } } = useForm<EventFormValues>({
    resolver: zodResolver(eventSchema),
    defaultValues: editing ? {
      name: editing.name, description: editing.description,
      event_type: editing.event_type,
      start_datetime: toLocal(editing.start_datetime),
      end_datetime: editing.end_datetime ? toLocal(editing.end_datetime) : "",
      venue: editing.venue, capacity: editing.capacity,
      cost: editing.cost, registration_required: editing.registration_required,
      recurrence: editing.recurrence, recurrence_end: editing.recurrence_end ?? "",
      is_published: editing.is_published,
    } : { event_type: "service", is_published: true, registration_required: false, recurrence: "" },
  });

  const recurrence = watch("recurrence");

  const createMut = useMutation({
    mutationFn: (d: EventFormValues) => createEvent({ ...d, branch: branchId }, branchId),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["events"] }); onClose(); },
  });
  const updateMut = useMutation({
    mutationFn: (d: EventFormValues) => updateEvent(editing!.id, d, branchId),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["events"] }); onClose(); },
  });

  const isPending = createMut.isPending || updateMut.isPending;

  return (
    <form onSubmit={handleSubmit((d) => editing ? updateMut.mutate(d) : createMut.mutate(d))}
      className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-4">
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
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-600">Cost (leave blank if free)</label>
          <input type="number" min="0" step="0.01"
            {...register("cost", { setValueAs: (v) => v === "" ? null : Number(v) })}
            placeholder="0.00" className={FIELD} />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-600">Repeat</label>
          <select {...register("recurrence")} className={FIELD}>
            {RECURRENCE_OPTIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </div>
        {recurrence && (
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600">Repeat until</label>
            <input type="date" {...register("recurrence_end")} className={FIELD} />
          </div>
        )}

        <div className="col-span-2 space-y-1">
          <label className="text-xs font-medium text-gray-600">Description</label>
          <textarea {...register("description")} rows={2} className={FIELD} />
        </div>

        <div className="col-span-2 flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" {...register("registration_required")} className="w-4 h-4 rounded border-gray-300" />
            Registration required
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" {...register("is_published")} className="w-4 h-4 rounded border-gray-300" />
            Published
          </label>
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

function UpcomingCard({ event, onEdit, onDetails }: {
  event: Event; onEdit: () => void; onDetails: () => void;
}) {
  const d = new Date(event.start_datetime);
  const isFull = event.capacity !== null && event.registration_count >= event.capacity;

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4 flex gap-4 group">
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
            <button onClick={onDetails} className="p-1 rounded hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors">
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
          {event.recurrence && <span className="flex items-center gap-1"><Repeat size={11} />{RECURRENCE_OPTIONS.find((r) => r.value === event.recurrence)?.label}</span>}
          {event.cost && <span className="flex items-center gap-1"><DollarSign size={11} />GHS {Number(event.cost).toFixed(2)}</span>}
        </div>
        <button
          onClick={onDetails}
          className={cn(
            "mt-2 text-xs font-medium px-2 py-0.5 rounded-full border transition-colors",
            isFull ? "border-red-200 text-red-600 bg-red-50" : "border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100",
          )}
        >
          <span className="flex items-center gap-1">
            <UserPlus size={10} />
            {event.registration_count}{event.capacity ? ` / ${event.capacity}` : ""} registered
            {isFull && " — Full"}
          </span>
        </button>
      </div>
    </div>
  );
}

// ── Calendar view ─────────────────────────────────────────────────────────────

function CalendarView({ events, onEventClick }: { events: Event[]; onEventClick: (e: Event) => void }) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const eventsByDay = new Map<number, Event[]>();
  events.forEach((ev) => {
    const d = new Date(ev.start_datetime);
    if (d.getFullYear() === year && d.getMonth() === month) {
      const day = d.getDate();
      if (!eventsByDay.has(day)) eventsByDay.set(day, []);
      eventsByDay.get(day)!.push(ev);
    }
  });

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  }

  const cells: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
          <ChevronLeft size={16} />
        </button>
        <h2 className="font-semibold text-gray-900">{MONTH_FULL[month]} {year}</h2>
        <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-gray-100">
        {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((d) => (
          <div key={d} className="py-2 text-center text-xs font-semibold text-gray-400 uppercase tracking-wide">{d}</div>
        ))}
      </div>

      {/* Cells */}
      <div className="grid grid-cols-7">
        {cells.map((day, i) => {
          const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
          const dayEvents = day ? (eventsByDay.get(day) ?? []) : [];
          return (
            <div key={i} className={cn(
              "min-h-[80px] p-1.5 border-b border-r border-gray-50",
              !day && "bg-gray-50/50",
            )}>
              {day && (
                <>
                  <span className={cn(
                    "text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full mb-1",
                    isToday ? "bg-blue-600 text-white" : "text-gray-600",
                  )}>{day}</span>
                  <div className="space-y-0.5">
                    {dayEvents.slice(0, 3).map((ev) => (
                      <button
                        key={ev.id}
                        onClick={() => onEventClick(ev)}
                        className={cn(
                          "w-full text-left text-[10px] font-medium px-1.5 py-0.5 rounded truncate transition-colors",
                          "bg-blue-50 text-blue-700 hover:bg-blue-100",
                        )}
                      >
                        {fmtTime(ev.start_datetime)} {ev.name}
                      </button>
                    ))}
                    {dayEvents.length > 3 && (
                      <span className="text-[10px] text-gray-400 pl-1">+{dayEvents.length - 3} more</span>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Event details slide-in ────────────────────────────────────────────────────

type PanelTab = "registrations" | "volunteers";

function EventPanel({ event, branchId, onClose }: {
  event: Event; branchId: number; onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<PanelTab>("registrations");
  const [memberSearch, setMemberSearch] = useState("");
  const [volRole, setVolRole] = useState("");
  const [volSlots, setVolSlots] = useState(1);

  const { data: registrations = [], isLoading: loadingRegs } = useQuery({
    queryKey: ["event-registrations", event.id, branchId],
    queryFn: () => getEventRegistrations(event.id, branchId),
  });

  const { data: volunteerSlots = [], refetch: refetchSlots } = useQuery({
    queryKey: ["event-volunteer-slots", event.id, branchId],
    queryFn: () => getVolunteerSlots(event.id, branchId),
    enabled: tab === "volunteers",
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

  const addSlotMut = useMutation({
    mutationFn: () => createVolunteerSlot(event.id, { role_name: volRole, slots_needed: volSlots }, branchId),
    onSuccess: () => { refetchSlots(); setVolRole(""); setVolSlots(1); },
  });

  const deleteSlotMut = useMutation({
    mutationFn: (slotId: number) => deleteVolunteerSlot(event.id, slotId, branchId),
    onSuccess: () => refetchSlots(),
  });

  const registeredIds = new Set(registrations.filter((r) => r.member).map((r) => r.member!));
  const suggestions = (membersData?.results ?? []).filter((m) => !registeredIds.has(m.id));

  const regStatusBadge: Record<string, BadgeVariant> = {
    attended: "success", registered: "info", waitlisted: "warning", cancelled: "default",
  };

  const tabs: { key: PanelTab; label: string }[] = [
    { key: "registrations", label: `Registrations (${registrations.length})` },
    { key: "volunteers", label: `Volunteers (${volunteerSlots.length})` },
  ];

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-[420px] bg-white border-l border-gray-200 shadow-2xl flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div className="min-w-0">
          <h2 className="font-semibold text-gray-900 truncate">{event.name}</h2>
          <p className="text-xs text-gray-400">{fmtDate(event.start_datetime)} · {fmtTime(event.start_datetime)}</p>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 shrink-0 ml-2"><X size={18} /></button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-100 px-5">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={cn(
              "py-2.5 px-3 text-sm font-medium border-b-2 transition-colors -mb-px",
              tab === t.key ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700",
            )}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "registrations" && (
        <>
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
                    <button key={m.id} onClick={() => registerMut.mutate(m.id)} disabled={registerMut.isPending}
                      className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-gray-50 text-left transition-colors">
                      <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-[10px] font-semibold flex items-center justify-center shrink-0">
                        {initials(m.full_name)}
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
            {loadingRegs && <p className="text-sm text-gray-400 text-center py-6">Loading…</p>}
            {!loadingRegs && registrations.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-6">No registrations yet.</p>
            )}
            {registrations.map((reg: EventRegistration) => (
              <div key={reg.id} className="flex items-center gap-2.5 py-2 group">
                <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 text-[11px] font-semibold flex items-center justify-center shrink-0">
                  {initials(reg.member_name || "?")}
                </div>
                <span className="text-sm text-gray-800 flex-1 truncate">{reg.member_name}</span>
                <Badge variant={regStatusBadge[reg.status] ?? "default"}>{reg.status}</Badge>
                {reg.status === "registered" && (
                  <button onClick={() => checkInMut.mutate(reg.id)} disabled={checkInMut.isPending}
                    title="Mark as attended"
                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-emerald-50 text-gray-400 hover:text-emerald-600 transition-all">
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
        </>
      )}

      {tab === "volunteers" && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Add slot form */}
          <div className="px-5 py-3 border-b border-gray-100 space-y-2">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Add volunteer role</p>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Role (e.g. Usher)"
                value={volRole}
                onChange={(e) => setVolRole(e.target.value)}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
              />
              <input
                type="number"
                min="1"
                value={volSlots}
                onChange={(e) => setVolSlots(Number(e.target.value))}
                className="w-16 border border-gray-300 rounded-lg px-2 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
              />
              <button
                onClick={() => volRole && addSlotMut.mutate()}
                disabled={!volRole || addSlotMut.isPending}
                className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                <Plus size={14} />
              </button>
            </div>
          </div>

          {/* Volunteer slots list */}
          <div className="flex-1 overflow-auto px-5 py-3 space-y-2">
            {volunteerSlots.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-6">No volunteer slots defined.</p>
            )}
            {volunteerSlots.map((slot: VolunteerSlot) => (
              <div key={slot.id} className="flex items-center gap-3 py-2 group">
                <div className="w-7 h-7 rounded-full bg-amber-100 text-amber-700 text-xs font-bold flex items-center justify-center shrink-0">
                  {slot.slots_needed}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-800">{slot.role_name}</p>
                  {slot.notes && <p className="text-xs text-gray-400">{slot.notes}</p>}
                </div>
                <button
                  onClick={() => deleteSlotMut.mutate(slot.id)}
                  disabled={deleteSlotMut.isPending}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-600 transition-all"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

type ViewTab = "upcoming" | "calendar" | "all";

export default function EventsPage() {
  const queryClient = useQueryClient();
  const [tab, setTab]               = useState<ViewTab>("upcoming");
  const [typeFilter, setTypeFilter] = useState("");
  const [page, setPage]             = useState(1);
  const [showForm, setShowForm]     = useState(false);
  const [editing, setEditing]       = useState<Event | null>(null);
  const [detailEvent, setDetailEvent] = useState<Event | null>(null);

  const { data: upcoming, isLoading: loadingUpcoming } = useQuery({
    queryKey: ["events-upcoming", BRANCH_ID],
    queryFn: () => getUpcomingEvents(BRANCH_ID),
    enabled: tab === "upcoming",
  });

  const { data: allEventsForCalendar } = useQuery({
    queryKey: ["events-all-calendar", BRANCH_ID],
    queryFn: () => getEvents(BRANCH_ID, { page: 1 }),
    enabled: tab === "calendar",
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

  const viewTabs: { key: ViewTab; label: string }[] = [
    { key: "upcoming", label: "Upcoming" },
    { key: "calendar", label: "Calendar" },
    { key: "all", label: "All Events" },
  ];

  return (
    <div className="p-6 space-y-4">
      <PageHeader title="Events" description="Manage church events and registrations.">
        <Button size="sm" onClick={() => { setEditing(null); setShowForm((v) => !v); }}>
          {showForm && !editing ? <X size={14} /> : <Plus size={14} />}
          {showForm && !editing ? "Cancel" : "Add Event"}
        </Button>
      </PageHeader>

      {showForm && <EventForm branchId={BRANCH_ID} editing={editing ?? undefined} onClose={closeForm} />}

      {/* Tab switcher */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {viewTabs.map((t) => (
          <button key={t.key} onClick={() => { setTab(t.key); setPage(1); }}
            className={cn(
              "px-4 py-1.5 rounded-lg text-sm font-medium transition-all",
              tab === t.key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700",
            )}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Upcoming */}
      {tab === "upcoming" && (
        loadingUpcoming ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-white border border-gray-200 rounded-2xl p-4 flex gap-4 animate-pulse">
                <div className="w-14 h-14 rounded-xl bg-gray-100 shrink-0" />
                <div className="flex-1 space-y-2"><div className="h-3 bg-gray-100 rounded w-3/4" /><div className="h-2.5 bg-gray-100 rounded w-1/2" /></div>
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
              <UpcomingCard key={ev.id} event={ev}
                onEdit={() => openEdit(ev)}
                onDetails={() => setDetailEvent(ev)} />
            ))}
          </div>
        )
      )}

      {/* Calendar */}
      {tab === "calendar" && (
        <CalendarView
          events={allEventsForCalendar?.results ?? []}
          onEventClick={(ev) => setDetailEvent(ev)}
        />
      )}

      {/* All events table */}
      {tab === "all" && (
        <>
          <div className="flex gap-2 flex-wrap">
            {[{ value: "", label: "All" }, ...EVENT_TYPES].map((t) => (
              <button key={t.value} onClick={() => { setTypeFilter(t.value); setPage(1); }}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors",
                  typeFilter === t.value ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-200 hover:border-gray-300",
                )}>
                {t.label}
              </button>
            ))}
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {loadingAll ? (
              <div className="divide-y divide-gray-50">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4 px-4 py-3.5 animate-pulse">
                    <div className="flex-1 space-y-1.5"><div className="h-3 bg-gray-100 rounded w-40" /><div className="h-2.5 bg-gray-100 rounded w-28" /></div>
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
                          <div className="flex items-center gap-2 mt-0.5">
                            {ev.cost && <span className="text-xs text-gray-400 flex items-center gap-0.5"><DollarSign size={10} />GHS {Number(ev.cost).toFixed(2)}</span>}
                            {ev.recurrence && <span className="text-xs text-gray-400 flex items-center gap-0.5"><RefreshCw size={10} />{ev.recurrence}</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell">
                          <Badge variant={TYPE_BADGE[ev.event_type] ?? "default"}>
                            {EVENT_TYPES.find((t) => t.value === ev.event_type)?.label ?? ev.event_type}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">{fmtDateTime(ev.start_datetime)}</td>
                        <td className="px-4 py-3 text-sm text-gray-400 hidden md:table-cell">{ev.venue || "—"}</td>
                        <td className="px-4 py-3 text-sm text-center text-gray-600 hidden lg:table-cell">
                          <button onClick={() => setDetailEvent(ev)} className="hover:text-blue-600 transition-colors">
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
                            <button onClick={() => setDetailEvent(ev)} title="Details"
                              className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors">
                              <Users size={14} />
                            </button>
                            <button onClick={() => openEdit(ev)} title="Edit"
                              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors">
                              <Pencil size={14} />
                            </button>
                            <button onClick={() => { if (confirm("Delete this event?")) deleteMut.mutate(ev.id); }} title="Delete"
                              className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors">
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
                      <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={!allEvents.previous}>Previous</Button>
                      <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={!allEvents.next}>Next</Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}

      {/* Event details slide-in */}
      {detailEvent && (
        <EventPanel event={detailEvent} branchId={BRANCH_ID} onClose={() => setDetailEvent(null)} />
      )}
    </div>
  );
}
