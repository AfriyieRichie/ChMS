"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Trash2, X } from "lucide-react";
import {
  getAnnouncements, createAnnouncement, deleteAnnouncement, type Announcement,
} from "@/lib/api/communications";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/dashboard/page-header";
import type { VariantProps } from "class-variance-authority";
import { badgeVariants } from "@/components/ui/badge";

const BRANCH_ID = 1;
const FIELD = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 bg-white";

type BadgeVariant = VariantProps<typeof badgeVariants>["variant"];

const AUDIENCE_CONFIG: Record<string, { label: string; variant: BadgeVariant }> = {
  all: { label: "Everyone", variant: "info" },
  members: { label: "Members Only", variant: "success" },
  leaders: { label: "Group Leaders", variant: "purple" },
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
      createAnnouncement({ ...d, branch: BRANCH_ID, expires_at: d.expires_at || undefined }, BRANCH_ID),
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
      <PageHeader title="Communications" description="Announcements visible on the dashboard.">
        <Button size="sm" onClick={() => setShowForm((v) => !v)}>
          {showForm ? <X size={14} /> : <Plus size={14} />}
          {showForm ? "Cancel" : "New Announcement"}
        </Button>
      </PageHeader>

      {showForm && (
        <form onSubmit={handleSubmit((d) => createMutation.mutate(d))}
          className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-4">
          <h2 className="font-semibold text-gray-900 text-sm">New Announcement</h2>
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Title *</label>
              <input type="text" {...register("title")} placeholder="e.g. Church Picnic this Saturday" className={FIELD} />
              {errors.title && <p className="text-xs text-red-500">{errors.title.message}</p>}
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Message *</label>
              <textarea {...register("body")} rows={4} placeholder="Announcement details…" className={FIELD} />
              {errors.body && <p className="text-xs text-red-500">{errors.body.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600">Audience</label>
                <select {...register("audience")} className={FIELD}>
                  <option value="all">Everyone</option>
                  <option value="members">Members Only</option>
                  <option value="leaders">Group Leaders</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600">Expires (optional)</label>
                <input type="datetime-local" {...register("expires_at")} className={FIELD} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" {...register("is_published")} id="is_published"
                className="w-4 h-4 rounded border-gray-300" />
              <label htmlFor="is_published" className="text-sm text-gray-700">Publish immediately</label>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button type="submit" size="sm" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Posting…" : "Post Announcement"}
            </Button>
            {createMutation.isError && <p className="text-red-500 text-sm">Failed to post.</p>}
          </div>
        </form>
      )}

      <div className="space-y-3">
        {isLoading && (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400 text-sm">
            Loading…
          </div>
        )}
        {data?.results.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400 text-sm">
            No announcements yet.
          </div>
        )}
        {data?.results.map((a: Announcement) => {
          const audience = AUDIENCE_CONFIG[a.audience];
          return (
            <div key={a.id} className="bg-white rounded-xl border border-gray-200 px-5 py-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-gray-900 text-sm">{a.title}</p>
                    <Badge variant={audience?.variant ?? "default"}>
                      {audience?.label ?? a.audience}
                    </Badge>
                    {!a.is_active && (
                      <Badge variant="default">
                        {a.is_published ? "Expired" : "Draft"}
                      </Badge>
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
                  className="shrink-0 text-gray-300 hover:text-red-500 transition-colors p-1 rounded"
                  title="Delete announcement"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {data && data.count > 0 && (
        <div className="flex items-center justify-between text-sm text-gray-600">
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
    </div>
  );
}
