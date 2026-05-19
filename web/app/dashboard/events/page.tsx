"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { getEvents, createEvent, type Event } from "@/lib/api/events";

const BRANCH_ID = 1;

const EVENT_TYPES = [
  { value: "service", label: "Church Service" },
  { value: "special", label: "Special Event" },
  { value: "outreach", label: "Outreach" },
  { value: "training", label: "Training" },
  { value: "meeting", label: "Meeting" },
];

const TYPE_COLORS: Record<string, string> = {
  service: "bg-blue-100 text-blue-700",
  special: "bg-purple-100 text-purple-700",
  outreach: "bg-green-100 text-green-700",
  training: "bg-orange-100 text-orange-700",
  meeting: "bg-gray-100 text-gray-600",
};

const eventSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  description: z.string().optional(),
  event_type: z.enum(["service", "special", "outreach", "training", "meeting"]),
  start_datetime: z.string().min(1, "Start date/time is required"),
  end_datetime: z.string().optional(),
  venue: z.string().max(200).optional(),
  capacity: z.number().nullable().optional(),
  is_published: z.boolean(),
});

type EventFormValues = z.infer<typeof eventSchema>;

export default function EventsPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [typeFilter, setTypeFilter] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["events", BRANCH_ID, typeFilter, page],
    queryFn: () => getEvents(BRANCH_ID, { event_type: typeFilter || undefined, page }),
    placeholderData: (p) => p,
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<EventFormValues>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      event_type: "service",
      is_published: true,
    },
  });

  const mutation = useMutation({
    mutationFn: (d: EventFormValues) =>
      createEvent({ ...d, branch: BRANCH_ID }, BRANCH_ID),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events", BRANCH_ID] });
      setShowForm(false);
      reset();
    },
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Events</h1>
        <button onClick={() => setShowForm((v) => !v)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
          {showForm ? "Cancel" : "Add Event"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))}
          className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-4">
          <h2 className="font-semibold text-gray-800">New Event</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1">
              <label className="text-xs font-medium text-gray-600">Event Name *</label>
              <input type="text" {...register("name")} placeholder="e.g. Sunday Service"
                className="w-full border rounded-lg px-3 py-2 text-sm" />
              {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Type *</label>
              <select {...register("event_type")} className="w-full border rounded-lg px-3 py-2 text-sm">
                {EVENT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Venue</label>
              <input type="text" {...register("venue")} placeholder="Main auditorium"
                className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Start *</label>
              <input type="datetime-local" {...register("start_datetime")}
                className="w-full border rounded-lg px-3 py-2 text-sm" />
              {errors.start_datetime && <p className="text-xs text-red-500">{errors.start_datetime.message}</p>}
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">End</label>
              <input type="datetime-local" {...register("end_datetime")}
                className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Capacity</label>
              <input type="number" min="1" {...register("capacity", { setValueAs: (v) => v === "" ? null : Number(v) })}
                className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Leave blank for unlimited" />
            </div>
            <div className="col-span-2 space-y-1">
              <label className="text-xs font-medium text-gray-600">Description</label>
              <textarea {...register("description")} rows={2}
                className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div className="col-span-2 flex items-center gap-2">
              <input type="checkbox" {...register("is_published")} id="is_published"
                className="w-4 h-4 rounded border-gray-300" />
              <label htmlFor="is_published" className="text-sm text-gray-700">Published (visible to staff)</label>
            </div>
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={mutation.isPending}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
              {mutation.isPending ? "Saving..." : "Create Event"}
            </button>
            {mutation.isError && <p className="text-red-500 text-sm self-center">Failed to create event.</p>}
          </div>
        </form>
      )}

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {[{ value: "", label: "All" }, ...EVENT_TYPES].map((t) => (
          <button key={t.value} onClick={() => { setTypeFilter(t.value); setPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${typeFilter === t.value ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"}`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Loading events...</div>
        ) : (
          <>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Event</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Start</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Venue</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Registrations</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data?.results.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No events found.</td></tr>
                )}
                {data?.results.map((ev: Event) => (
                  <tr key={ev.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{ev.name}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_COLORS[ev.event_type] ?? "bg-gray-100 text-gray-600"}`}>
                        {EVENT_TYPES.find((t) => t.value === ev.event_type)?.label ?? ev.event_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {new Date(ev.start_datetime).toLocaleString("en-GH", { dateStyle: "medium", timeStyle: "short" })}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{ev.venue || "—"}</td>
                    <td className="px-4 py-3 text-sm text-center text-gray-600">
                      {ev.registration_count}{ev.capacity ? ` / ${ev.capacity}` : ""}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${ev.is_published ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                        {ev.is_published ? "Published" : "Draft"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {data && data.count > 0 && (
              <div className="flex items-center justify-between px-4 py-3 border-t text-sm text-gray-600">
                <span>{data.count} total</span>
                <div className="flex gap-2">
                  <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={!data.previous}
                    className="px-3 py-1 border rounded disabled:opacity-40">Previous</button>
                  <button onClick={() => setPage((p) => p + 1)} disabled={!data.next}
                    className="px-3 py-1 border rounded disabled:opacity-40">Next</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
