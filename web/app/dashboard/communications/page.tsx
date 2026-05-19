"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  getAnnouncements,
  createAnnouncement,
  deleteAnnouncement,
  type Announcement,
} from "@/lib/api/communications";

const BRANCH_ID = 1;

const AUDIENCE_LABELS: Record<string, string> = {
  all: "Everyone",
  members: "Members Only",
  leaders: "Group Leaders",
};

const announcementSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  body: z.string().min(1, "Body is required"),
  audience: z.enum(["all", "members", "leaders"]),
  is_published: z.boolean(),
  expires_at: z.string().optional(),
});

type AnnouncementFormValues = z.infer<typeof announcementSchema>;

export default function CommunicationsPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["announcements", BRANCH_ID, page],
    queryFn: () => getAnnouncements(BRANCH_ID, { page }),
    placeholderData: (p) => p,
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<AnnouncementFormValues>({
    resolver: zodResolver(announcementSchema),
    defaultValues: { audience: "all", is_published: true },
  });

  const createMutation = useMutation({
    mutationFn: (d: AnnouncementFormValues) =>
      createAnnouncement({
        ...d,
        branch: BRANCH_ID,
        expires_at: d.expires_at || undefined,
      }, BRANCH_ID),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["announcements", BRANCH_ID] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary", BRANCH_ID] });
      setShowForm(false);
      reset();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteAnnouncement(id, BRANCH_ID),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["announcements", BRANCH_ID] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary", BRANCH_ID] });
    },
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Communications</h1>
          <p className="text-xs text-gray-500 mt-0.5">Announcements visible on the dashboard</p>
        </div>
        <button onClick={() => setShowForm((v) => !v)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
          {showForm ? "Cancel" : "New Announcement"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit((d) => createMutation.mutate(d))}
          className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-4">
          <h2 className="font-semibold text-gray-800">New Announcement</h2>
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Title *</label>
              <input type="text" {...register("title")} placeholder="e.g. Church Picnic this Saturday"
                className="w-full border rounded-lg px-3 py-2 text-sm" />
              {errors.title && <p className="text-xs text-red-500">{errors.title.message}</p>}
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Message *</label>
              <textarea {...register("body")} rows={4} placeholder="Announcement details..."
                className="w-full border rounded-lg px-3 py-2 text-sm" />
              {errors.body && <p className="text-xs text-red-500">{errors.body.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600">Audience</label>
                <select {...register("audience")} className="w-full border rounded-lg px-3 py-2 text-sm">
                  <option value="all">Everyone</option>
                  <option value="members">Members Only</option>
                  <option value="leaders">Group Leaders</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600">Expires (optional)</label>
                <input type="datetime-local" {...register("expires_at")}
                  className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" {...register("is_published")} id="is_published"
                className="w-4 h-4 rounded border-gray-300" />
              <label htmlFor="is_published" className="text-sm text-gray-700">Publish immediately</label>
            </div>
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={createMutation.isPending}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
              {createMutation.isPending ? "Posting..." : "Post Announcement"}
            </button>
            {createMutation.isError && <p className="text-red-500 text-sm self-center">Failed to post.</p>}
          </div>
        </form>
      )}

      <div className="space-y-3">
        {isLoading && <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">Loading...</div>}
        {data?.results.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">
            No announcements yet.
          </div>
        )}
        {data?.results.map((a: Announcement) => (
          <div key={a.id} className="bg-white rounded-xl border border-gray-200 px-5 py-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-gray-900 text-sm">{a.title}</p>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 font-medium">
                    {AUDIENCE_LABELS[a.audience] ?? a.audience}
                  </span>
                  {!a.is_active && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 font-medium">
                      {a.is_published ? "Expired" : "Draft"}
                    </span>
                  )}
                </div>
                <p className="mt-1.5 text-sm text-gray-600 leading-relaxed">{a.body}</p>
                <div className="mt-2 flex items-center gap-3 text-xs text-gray-400">
                  {a.published_at && (
                    <span>Posted {new Date(a.published_at).toLocaleDateString("en-GH", { dateStyle: "medium" })}</span>
                  )}
                  {a.expires_at && (
                    <span>Expires {new Date(a.expires_at).toLocaleDateString("en-GH", { dateStyle: "medium" })}</span>
                  )}
                  {a.created_by_name && <span>by {a.created_by_name}</span>}
                </div>
              </div>
              <button
                onClick={() => { if (confirm("Delete this announcement?")) deleteMutation.mutate(a.id); }}
                className="shrink-0 text-xs text-red-400 hover:text-red-600 px-2 py-1">
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {data && data.count > 0 && (
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>{data.count} total</span>
          <div className="flex gap-2">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={!data.previous}
              className="px-3 py-1 border rounded disabled:opacity-40">Previous</button>
            <button onClick={() => setPage((p) => p + 1)} disabled={!data.next}
              className="px-3 py-1 border rounded disabled:opacity-40">Next</button>
          </div>
        </div>
      )}
    </div>
  );
}
