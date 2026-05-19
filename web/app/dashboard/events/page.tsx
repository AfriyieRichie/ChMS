"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, X } from "lucide-react";
import { getEvents, createEvent, type Event } from "@/lib/api/events";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/dashboard/page-header";
import type { VariantProps } from "class-variance-authority";
import { badgeVariants } from "@/components/ui/badge";

const BRANCH_ID = 1;
const FIELD = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 bg-white";

const EVENT_TYPES = [
  { value: "service", label: "Church Service" },
  { value: "special", label: "Special Event" },
  { value: "outreach", label: "Outreach" },
  { value: "training", label: "Training" },
  { value: "meeting", label: "Meeting" },
];

type BadgeVariant = VariantProps<typeof badgeVariants>["variant"];

const TYPE_BADGE: Record<string, BadgeVariant> = {
  service: "info",
  special: "purple",
  outreach: "success",
  training: "orange",
  meeting: "default",
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
    defaultValues: { event_type: "service", is_published: true },
  });

  const mutation = useMutation({
    mutationFn: (d: EventFormValues) => createEvent({ ...d, branch: BRANCH_ID }, BRANCH_ID),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events", BRANCH_ID] });
      setShowForm(false);
      reset();
    },
  });

  return (
    <div className="p-6 space-y-6">
      <PageHeader title="Events" description="Upcoming and past church events.">
        <Button size="sm" onClick={() => setShowForm((v) => !v)}>
          {showForm ? <X size={14} /> : <Plus size={14} />}
          {showForm ? "Cancel" : "Add Event"}
        </Button>
      </PageHeader>

      {showForm && (
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))}
          className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-4">
          <h2 className="font-semibold text-gray-900 text-sm">New Event</h2>
          <div className="grid grid-cols-2 gap-4">
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
                placeholder="Leave blank for unlimited" className={FIELD} />
            </div>
            <div className="col-span-2 space-y-1">
              <label className="text-xs font-medium text-gray-600">Description</label>
              <textarea {...register("description")} rows={2} className={FIELD} />
            </div>
            <div className="col-span-2 flex items-center gap-2">
              <input type="checkbox" {...register("is_published")} id="is_published"
                className="w-4 h-4 rounded border-gray-300" />
              <label htmlFor="is_published" className="text-sm text-gray-700">Published (visible to staff)</label>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button type="submit" size="sm" disabled={mutation.isPending}>
              {mutation.isPending ? "Saving…" : "Create Event"}
            </Button>
            {mutation.isError && <p className="text-red-500 text-sm">Failed to create event.</p>}
          </div>
        </form>
      )}

      {/* Filter chips */}
      <div className="flex gap-2 flex-wrap">
        {[{ value: "", label: "All" }, ...EVENT_TYPES].map((t) => (
          <button key={t.value} onClick={() => { setTypeFilter(t.value); setPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
              typeFilter === t.value
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-10 text-center text-gray-400 text-sm">Loading events…</div>
        ) : (
          <>
            <table className="min-w-full divide-y divide-gray-100">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Event</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Start</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Venue</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Registrations</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data?.results.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-400 text-sm">No events found.</td></tr>
                )}
                {data?.results.map((ev: Event) => (
                  <tr key={ev.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{ev.name}</td>
                    <td className="px-4 py-3">
                      <Badge variant={TYPE_BADGE[ev.event_type] ?? "default"}>
                        {EVENT_TYPES.find((t) => t.value === ev.event_type)?.label ?? ev.event_type}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {new Date(ev.start_datetime).toLocaleString("en-GH", { dateStyle: "medium", timeStyle: "short" })}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{ev.venue || "—"}</td>
                    <td className="px-4 py-3 text-sm text-center text-gray-600">
                      {ev.registration_count}{ev.capacity ? ` / ${ev.capacity}` : ""}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={ev.is_published ? "success" : "default"}>
                        {ev.is_published ? "Published" : "Draft"}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {data && data.count > 0 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 text-sm text-gray-600">
                <span>{data.count} total</span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={!data.previous}>
                    Previous
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={!data.next}>
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
