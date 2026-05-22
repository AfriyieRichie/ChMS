"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Plus, X, Trash2, Pencil, Send, Clock, Eye, Copy,
  MessageSquare, Users, Megaphone, FileText, List, AlertTriangle,
} from "lucide-react";
import {
  getAnnouncements, createAnnouncement, deleteAnnouncement,
  getTemplates, createTemplate, updateTemplate, deleteTemplate,
  getAudiences, createAudience, deleteAudience, previewAudience,
  getCampaigns, createCampaign, sendCampaign, scheduleCampaign, deleteCampaign,
  getMessageLogs, getOptOuts, createOptOut, deleteOptOut,
  type Announcement, type MessageTemplate, type Audience, type Campaign, type MessageLog,
} from "@/lib/api/communications";
import { getMembers } from "@/lib/api/members";
import { getMemberTags } from "@/lib/api/members";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/dashboard/page-header";
import { cn } from "@/lib/utils";

const BRANCH_ID = 1;
const FIELD = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300 focus:border-gray-400 bg-white disabled:bg-gray-50";

const CHANNELS = [
  { value: "sms",      label: "SMS",              icon: "💬" },
  { value: "email",    label: "Email",             icon: "✉️" },
  { value: "whatsapp", label: "WhatsApp",          icon: "📱" },
  { value: "push",     label: "Push Notification", icon: "🔔" },
];

const TEMPLATE_CATEGORIES = [
  { value: "welcome",        label: "Welcome" },
  { value: "birthday",       label: "Birthday Wish" },
  { value: "follow_up",      label: "First Visit Follow-up" },
  { value: "event_reminder", label: "Event Reminder" },
  { value: "pastoral",       label: "Pastoral Care" },
  { value: "custom",         label: "Custom" },
];

const TOKENS = [
  { token: "{{first_name}}",   label: "First Name" },
  { token: "{{last_name}}",    label: "Last Name" },
  { token: "{{full_name}}",    label: "Full Name" },
  { token: "{{branch_name}}", label: "Branch Name" },
  { token: "{{event_name}}",   label: "Event Name" },
  { token: "{{date}}",         label: "Date" },
];

const STATUS_BADGE: Record<string, "success" | "info" | "warning" | "default"> = {
  sent: "success", scheduled: "warning", draft: "default", failed: "default",
};

const LOG_STATUS_BADGE: Record<string, "success" | "info" | "warning" | "default"> = {
  delivered: "success", sent: "info", queued: "warning", failed: "default", opted_out: "default",
};

type PageTab = "announcements" | "templates" | "audiences" | "campaigns" | "log";

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString("en-GH", { day: "numeric", month: "short", year: "numeric" });
}

function initials(name: string) {
  return name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();
}

// ── Token picker ──────────────────────────────────────────────────────────────

function TokenPicker({ onInsert }: { onInsert: (token: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5 mt-1">
      {TOKENS.map((t) => (
        <button key={t.token} type="button" onClick={() => onInsert(t.token)}
          className="text-[11px] font-mono px-2 py-0.5 rounded border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors">
          {t.token}
        </button>
      ))}
    </div>
  );
}

// ── Announcements tab ─────────────────────────────────────────────────────────

const annSchema = z.object({
  title:        z.string().min(1, "Required").max(200),
  body:         z.string().min(1, "Required"),
  audience:     z.enum(["all", "members", "leaders"]),
  is_published: z.boolean(),
  expires_at:   z.string().optional(),
});
type AnnForm = z.infer<typeof annSchema>;

function AnnouncementsTab({ branchId }: { branchId: number }) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["announcements", branchId, page],
    queryFn: () => getAnnouncements(branchId, { page }),
    placeholderData: (p) => p,
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<AnnForm>({
    resolver: zodResolver(annSchema),
    defaultValues: { audience: "all", is_published: true },
  });

  const createMut = useMutation({
    mutationFn: (d: AnnForm) => createAnnouncement({ ...d, branch: branchId, expires_at: d.expires_at || undefined }, branchId),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["announcements", branchId] }); setShowForm(false); reset(); },
  });
  const deleteMut = useMutation({
    mutationFn: (id: number) => deleteAnnouncement(id, branchId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["announcements", branchId] }),
  });

  const AUDIENCE_BADGE: Record<string, "info" | "success" | "purple"> = { all: "info", members: "success", leaders: "purple" };
  const AUDIENCE_LABEL: Record<string, string> = { all: "Everyone", members: "Members Only", leaders: "Group Leaders" };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setShowForm((v) => !v)}>
          {showForm ? <X size={14} /> : <Plus size={14} />}
          {showForm ? "Cancel" : "New Announcement"}
        </Button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit((d) => createMut.mutate(d))}
          className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm space-y-4">
          <h3 className="font-semibold text-gray-900 text-sm">New Announcement</h3>
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
          <div className="grid grid-cols-2 gap-3">
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
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" {...register("is_published")} className="w-4 h-4 rounded border-gray-300" />
            Publish immediately
          </label>
          <div className="flex items-center gap-3">
            <Button type="submit" size="sm" disabled={createMut.isPending}>
              {createMut.isPending ? "Posting…" : "Post Announcement"}
            </Button>
          </div>
        </form>
      )}

      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="bg-white border border-gray-200 rounded-lg h-20 animate-pulse" />)}</div>
      ) : data?.results.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-10 text-center text-gray-400 text-sm">No announcements yet.</div>
      ) : (
        <div className="space-y-3">
          {data?.results.map((a: Announcement) => (
            <div key={a.id} className="bg-white rounded-lg border border-gray-200 px-5 py-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-gray-900 text-sm">{a.title}</p>
                    <Badge variant={AUDIENCE_BADGE[a.audience] ?? "default"}>{AUDIENCE_LABEL[a.audience] ?? a.audience}</Badge>
                    {!a.is_active && <Badge variant="default">{a.is_published ? "Expired" : "Draft"}</Badge>}
                  </div>
                  <p className="mt-1.5 text-sm text-gray-600">{a.body}</p>
                  <p className="mt-1 text-xs text-gray-400">{a.published_at ? `Posted ${fmtDate(a.published_at)}` : "Draft"}{a.created_by_name && ` · by ${a.created_by_name}`}</p>
                </div>
                <button onClick={() => { if (confirm("Delete?")) deleteMut.mutate(a.id); }}
                  className="text-gray-300 hover:text-red-500 transition-colors p-1 rounded shrink-0">
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {data && data.count > 5 && (
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>{data.count} total</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={!data.previous}>Previous</Button>
            <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={!data.next}>Next</Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Templates tab ─────────────────────────────────────────────────────────────

function TemplatesTab({ branchId }: { branchId: number }) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<MessageTemplate | null>(null);
  const [preview, setPreview] = useState<MessageTemplate | null>(null);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [bodyRef, setBodyRef] = useState<HTMLTextAreaElement | null>(null);

  const { data } = useQuery({
    queryKey: ["templates", branchId, categoryFilter],
    queryFn: () => getTemplates(branchId, { category: categoryFilter || undefined }),
  });

  const tplSchema = z.object({
    name:     z.string().min(1, "Required"),
    category: z.enum(["welcome","birthday","follow_up","event_reminder","pastoral","custom"]),
    channel:  z.enum(["sms","email","whatsapp","push"]),
    subject:  z.string().optional(),
    body:     z.string().min(1, "Required"),
    is_active: z.boolean(),
  });
  type TplForm = z.infer<typeof tplSchema>;

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<TplForm>({
    resolver: zodResolver(tplSchema),
    defaultValues: editing
      ? { name: editing.name, category: editing.category, channel: editing.channel, subject: editing.subject, body: editing.body, is_active: editing.is_active }
      : { category: "custom", channel: "sms", is_active: true },
  });

  const channel = watch("channel");

  function insertToken(token: string) {
    if (!bodyRef) return;
    const start = bodyRef.selectionStart ?? 0;
    const end = bodyRef.selectionEnd ?? 0;
    const current = bodyRef.value;
    const updated = current.slice(0, start) + token + current.slice(end);
    setValue("body", updated, { shouldValidate: true });
    setTimeout(() => { bodyRef.focus(); bodyRef.setSelectionRange(start + token.length, start + token.length); }, 0);
  }

  const createMut = useMutation({
    mutationFn: (d: TplForm) => createTemplate({ ...d, branch: branchId }, branchId),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["templates", branchId] }); setShowForm(false); reset(); },
  });
  const updateMut = useMutation({
    mutationFn: (d: TplForm) => updateTemplate(editing!.id, d, branchId),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["templates", branchId] }); setEditing(null); setShowForm(false); reset(); },
  });
  const deleteMut = useMutation({
    mutationFn: (id: number) => deleteTemplate(id, branchId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["templates", branchId] }),
  });

  function openCreate() { reset({ category: "custom", channel: "sms", is_active: true }); setEditing(null); setShowForm(true); }
  function openEdit(t: MessageTemplate) {
    reset({ name: t.name, category: t.category, channel: t.channel, subject: t.subject, body: t.body, is_active: t.is_active });
    setEditing(t); setShowForm(true);
  }

  const templates = data?.results ?? [];

  return (
    <div className="space-y-4">
      {/* Category filter */}
      <div className="flex items-center gap-2 flex-wrap">
        {[{ value: "", label: "All" }, ...TEMPLATE_CATEGORIES].map((c) => (
          <button key={c.value} onClick={() => setCategoryFilter(c.value)}
            className={cn("px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors",
              categoryFilter === c.value ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-600 border-gray-200 hover:border-gray-300")}>
            {c.label}
          </button>
        ))}
        <Button size="sm" className="ml-auto" onClick={openCreate}><Plus size={14} />New Template</Button>
      </div>

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSubmit((d) => editing ? updateMut.mutate(d) : createMut.mutate(d))}
          className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 text-sm">{editing ? "Edit Template" : "New Template"}</h3>
            <button type="button" onClick={() => { setShowForm(false); setEditing(null); }}
              className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1">
              <label className="text-xs font-medium text-gray-600">Template Name *</label>
              <input type="text" {...register("name")} placeholder="e.g. Welcome SMS" className={FIELD} />
              {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Category</label>
              <select {...register("category")} className={FIELD}>
                {TEMPLATE_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Channel</label>
              <select {...register("channel")} className={FIELD}>
                {CHANNELS.map((c) => <option key={c.value} value={c.value}>{c.icon} {c.label}</option>)}
              </select>
            </div>
            {channel === "email" && (
              <div className="col-span-2 space-y-1">
                <label className="text-xs font-medium text-gray-600">Subject</label>
                <input type="text" {...register("subject")} placeholder="Email subject line" className={FIELD} />
              </div>
            )}
            <div className="col-span-2 space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-gray-600">Message Body *</label>
                <span className="text-[10px] text-gray-400">Click a token to insert</span>
              </div>
              <textarea
                {...register("body")}
                ref={(el) => { setBodyRef(el); (register("body") as { ref: (el: HTMLTextAreaElement | null) => void }).ref(el); }}
                rows={5}
                placeholder="Hi {{first_name}}, …"
                className={FIELD}
              />
              <TokenPicker onInsert={insertToken} />
              {errors.body && <p className="text-xs text-red-500">{errors.body.message}</p>}
            </div>
            <div className="col-span-2 flex items-center gap-2">
              <input type="checkbox" {...register("is_active")} id="tpl_active" className="w-4 h-4 rounded border-gray-300" />
              <label htmlFor="tpl_active" className="text-sm text-gray-700">Active</label>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button type="submit" size="sm" disabled={createMut.isPending || updateMut.isPending}>
              {createMut.isPending || updateMut.isPending ? "Saving…" : editing ? "Update" : "Create Template"}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => { setShowForm(false); setEditing(null); }}>Cancel</Button>
          </div>
        </form>
      )}

      {/* Template grid */}
      {templates.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-10 text-center text-gray-400 text-sm">No templates yet.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {templates.map((t: MessageTemplate) => (
            <div key={t.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm group hover:shadow-md transition-all">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 text-sm truncate">{t.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{TEMPLATE_CATEGORIES.find((c) => c.value === t.category)?.label}</p>
                </div>
                <span className="text-lg shrink-0">{CHANNELS.find((c) => c.value === t.channel)?.icon}</span>
              </div>
              <p className="text-xs text-gray-500 line-clamp-3 mb-3 font-mono bg-gray-50 rounded-lg p-2">{t.body}</p>
              <div className="flex items-center justify-between">
                <Badge variant={t.is_active ? "success" : "default"}>{t.is_active ? "Active" : "Inactive"}</Badge>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => setPreview(t)} title="Preview"
                    className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors">
                    <Eye size={13} />
                  </button>
                  <button onClick={() => openEdit(t)} title="Edit"
                    className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors">
                    <Pencil size={13} />
                  </button>
                  <button onClick={() => { if (confirm("Delete template?")) deleteMut.mutate(t.id); }} title="Delete"
                    className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Preview modal */}
      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={() => setPreview(null)}>
          <div className="bg-white rounded-lg shadow-2xl p-6 max-w-lg w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">{preview.name}</h3>
              <button onClick={() => setPreview(null)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            {preview.subject && <p className="text-xs font-semibold text-gray-500 mb-1">Subject: {preview.subject}</p>}
            <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-700 font-mono whitespace-pre-wrap">{preview.body}</div>
            <div className="mt-3 flex items-center gap-2">
              <span className="text-xs text-gray-400">{CHANNELS.find((c) => c.value === preview.channel)?.icon} {CHANNELS.find((c) => c.value === preview.channel)?.label}</span>
              <span className="text-xs text-gray-300">·</span>
              <span className="text-xs text-gray-400">{TEMPLATE_CATEGORIES.find((c) => c.value === preview.category)?.label}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Audiences tab ─────────────────────────────────────────────────────────────

function AudiencesTab({ branchId }: { branchId: number }) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [previewId, setPreviewId] = useState<number | null>(null);
  const [previewData, setPreviewData] = useState<{ count: number; sample: string[] } | null>(null);

  const { data: tags } = useQuery({ queryKey: ["member-tags", branchId], queryFn: () => getMemberTags(branchId) });
  const { data } = useQuery({ queryKey: ["audiences", branchId], queryFn: () => getAudiences(branchId) });

  const [form, setForm] = useState({
    name: "", description: "",
    membership_status: [] as string[],
    gender: "",
    attended_in_days: "",
    not_attended_in_days: "",
    tag_ids: [] as number[],
  });

  const createMut = useMutation({
    mutationFn: () => createAudience({
      branch: branchId,
      name: form.name,
      description: form.description,
      filters: {
        membership_status: form.membership_status.length ? form.membership_status : undefined,
        gender: form.gender || undefined,
        attended_in_days: form.attended_in_days ? Number(form.attended_in_days) : undefined,
        not_attended_in_days: form.not_attended_in_days ? Number(form.not_attended_in_days) : undefined,
        tag_ids: form.tag_ids.length ? form.tag_ids : undefined,
      },
    }, branchId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["audiences", branchId] });
      setShowForm(false);
      setForm({ name: "", description: "", membership_status: [], gender: "", attended_in_days: "", not_attended_in_days: "", tag_ids: [] });
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => deleteAudience(id, branchId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["audiences", branchId] }),
  });

  const previewMut = useMutation({
    mutationFn: (id: number) => previewAudience(id, branchId),
    onSuccess: (d) => setPreviewData(d),
  });

  function toggleStatus(s: string) {
    setForm((f) => ({
      ...f,
      membership_status: f.membership_status.includes(s)
        ? f.membership_status.filter((x) => x !== s)
        : [...f.membership_status, s],
    }));
  }

  const STATUS_OPTIONS = ["active", "inactive", "new_convert", "visitor", "transferred", "deceased"];
  const audiences = data?.results ?? [];

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setShowForm((v) => !v)}>
          {showForm ? <X size={14} /> : <Plus size={14} />}
          {showForm ? "Cancel" : "New Audience"}
        </Button>
      </div>

      {showForm && (
        <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm space-y-4">
          <h3 className="font-semibold text-gray-900 text-sm">Define Audience</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1">
              <label className="text-xs font-medium text-gray-600">Audience Name *</label>
              <input type="text" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Active members last 30 days" className={FIELD} />
            </div>
            <div className="col-span-2 space-y-1">
              <label className="text-xs font-medium text-gray-600">Membership Status</label>
              <div className="flex flex-wrap gap-2">
                {STATUS_OPTIONS.map((s) => (
                  <label key={s} className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs cursor-pointer transition-colors capitalize",
                    form.membership_status.includes(s) ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-600 border-gray-200 hover:border-gray-300",
                  )}>
                    <input type="checkbox" checked={form.membership_status.includes(s)} onChange={() => toggleStatus(s)} className="sr-only" />
                    {s.replace("_", " ")}
                  </label>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Gender</label>
              <select value={form.gender} onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value }))} className={FIELD}>
                <option value="">Any</option>
                <option value="M">Male</option>
                <option value="F">Female</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Has tag</label>
              <select value="" onChange={(e) => { const id = Number(e.target.value); if (id && !form.tag_ids.includes(id)) setForm((f) => ({ ...f, tag_ids: [...f.tag_ids, id] })); }} className={FIELD}>
                <option value="">Add tag filter…</option>
                {(tags ?? []).filter((t) => !form.tag_ids.includes(t.id)).map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
              {form.tag_ids.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {form.tag_ids.map((id) => {
                    const tag = (tags ?? []).find((t) => t.id === id);
                    return (
                      <span key={id} className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">
                        {tag?.name ?? id}
                        <button type="button" onClick={() => setForm((f) => ({ ...f, tag_ids: f.tag_ids.filter((x) => x !== id) }))}
                          className="hover:text-red-500"><X size={10} /></button>
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Attended in last N days</label>
              <input type="number" min="1" value={form.attended_in_days}
                onChange={(e) => setForm((f) => ({ ...f, attended_in_days: e.target.value }))}
                placeholder="e.g. 30" className={FIELD} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Not attended in last N days</label>
              <input type="number" min="1" value={form.not_attended_in_days}
                onChange={(e) => setForm((f) => ({ ...f, not_attended_in_days: e.target.value }))}
                placeholder="e.g. 28" className={FIELD} />
            </div>
            <div className="col-span-2 space-y-1">
              <label className="text-xs font-medium text-gray-600">Description (optional)</label>
              <input type="text" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="What this audience represents" className={FIELD} />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button size="sm" disabled={!form.name || createMut.isPending} onClick={() => createMut.mutate()}>
              {createMut.isPending ? "Saving…" : "Save Audience"}
            </Button>
          </div>
        </div>
      )}

      {audiences.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-10 text-center text-gray-400 text-sm">No saved audiences yet.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {audiences.map((a: Audience) => (
            <div key={a.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm group hover:shadow-md transition-all">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 text-sm truncate">{a.name}</p>
                  {a.description && <p className="text-xs text-gray-400 mt-0.5">{a.description}</p>}
                </div>
              </div>
              {/* Filter pills */}
              <div className="flex flex-wrap gap-1 mb-3">
                {a.filters.membership_status?.map((s) => (
                  <span key={s} className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded capitalize">{s.replace("_"," ")}</span>
                ))}
                {a.filters.gender && <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{a.filters.gender === "M" ? "Male" : "Female"}</span>}
                {a.filters.attended_in_days && <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">Attended ≤{a.filters.attended_in_days}d</span>}
                {a.filters.not_attended_in_days && <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">Absent ≥{a.filters.not_attended_in_days}d</span>}
              </div>
              {/* Preview result */}
              {previewId === a.id && previewData && (
                <div className="mb-2 bg-indigo-50 rounded-lg p-2 text-xs text-indigo-800">
                  <span className="font-semibold">{previewData.count} members</span>
                  {previewData.sample.length > 0 && <span className="text-indigo-500"> — {previewData.sample.slice(0, 3).join(", ")}{previewData.count > 3 ? "…" : ""}</span>}
                </div>
              )}
              <div className="flex items-center justify-between">
                <button
                  onClick={() => { setPreviewId(a.id); setPreviewData(null); previewMut.mutate(a.id); }}
                  disabled={previewMut.isPending && previewId === a.id}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 transition-colors">
                  <Eye size={11} />{previewMut.isPending && previewId === a.id ? "Loading…" : "Preview count"}
                </button>
                <button onClick={() => { if (confirm(`Delete audience "${a.name}"?`)) deleteMut.mutate(a.id); }}
                  className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-all">
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Campaigns tab ─────────────────────────────────────────────────────────────

function CampaignsTab({ branchId }: { branchId: number }) {
  const queryClient = useQueryClient();
  const [showComposer, setShowComposer] = useState(false);
  const [scheduleMode, setScheduleMode] = useState(false);
  const [scheduleAt, setScheduleAt] = useState("");

  const { data: audienceData } = useQuery({ queryKey: ["audiences", branchId], queryFn: () => getAudiences(branchId) });
  const { data: templateData } = useQuery({ queryKey: ["templates", branchId], queryFn: () => getTemplates(branchId, { active_only: "true" }) });
  const { data: campaignData, isLoading } = useQuery({
    queryKey: ["campaigns", branchId],
    queryFn: () => getCampaigns(branchId),
    placeholderData: (p) => p,
  });

  const campSchema = z.object({
    name:     z.string().min(1, "Required"),
    audience: z.number({ message: "Select an audience" }),
    template: z.number({ message: "Select a template" }),
    channel:  z.enum(["sms","email","whatsapp","push"]),
  });
  type CampForm = z.infer<typeof campSchema>;

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CampForm>({
    resolver: zodResolver(campSchema),
    defaultValues: { channel: "sms" },
  });

  const createMut = useMutation({
    mutationFn: (d: CampForm) => createCampaign({ ...d, branch: branchId, status: "draft" }, branchId),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["campaigns", branchId] }); setShowComposer(false); reset(); },
  });

  const sendMut = useMutation({
    mutationFn: (id: number) => sendCampaign(id, branchId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["campaigns", branchId] }),
  });

  const scheduleMut = useMutation({
    mutationFn: ({ id, at }: { id: number; at: string }) => scheduleCampaign(id, at, branchId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["campaigns", branchId] }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => deleteCampaign(id, branchId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["campaigns", branchId] }),
  });

  const campaigns = campaignData?.results ?? [];
  const audiences = audienceData?.results ?? [];
  const templates = templateData?.results ?? [];

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setShowComposer((v) => !v)}>
          {showComposer ? <X size={14} /> : <Plus size={14} />}
          {showComposer ? "Cancel" : "New Campaign"}
        </Button>
      </div>

      {showComposer && (
        <form onSubmit={handleSubmit((d) => createMut.mutate(d))}
          className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm space-y-4">
          <h3 className="font-semibold text-gray-900 text-sm">Campaign Composer</h3>

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1">
              <label className="text-xs font-medium text-gray-600">Campaign Name *</label>
              <input type="text" {...register("name")} placeholder="e.g. Easter Sunday Reminder" className={FIELD} />
              {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Audience *</label>
              <select {...register("audience", { valueAsNumber: true })} className={FIELD}>
                <option value="">Select audience…</option>
                {audiences.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
              {errors.audience && <p className="text-xs text-red-500">{errors.audience.message}</p>}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Template *</label>
              <select {...register("template", { valueAsNumber: true })} className={FIELD}>
                <option value="">Select template…</option>
                {templates.map((t) => <option key={t.id} value={t.id}>{t.name} ({CHANNELS.find((c) => c.value === t.channel)?.icon})</option>)}
              </select>
              {errors.template && <p className="text-xs text-red-500">{errors.template.message}</p>}
            </div>

            <div className="col-span-2 space-y-1">
              <label className="text-xs font-medium text-gray-600">Channel</label>
              <div className="grid grid-cols-4 gap-2">
                {CHANNELS.map((ch) => (
                  <label key={ch.value} className={cn(
                    "flex flex-col items-center gap-1 p-3 rounded-xl border cursor-pointer transition-colors text-center",
                    "border-gray-200 bg-white hover:border-gray-300",
                  )}>
                    <input type="radio" {...register("channel")} value={ch.value} className="sr-only" />
                    <span className="text-xl">{ch.icon}</span>
                    <span className="text-xs font-medium text-gray-600">{ch.label}</span>
                    <span className="text-[10px] text-amber-500 font-medium">Coming soon</span>
                  </label>
                ))}
              </div>
              <p className="text-xs text-gray-400 flex items-center gap-1 mt-1">
                <AlertTriangle size={11} /> Channels are disabled until provider integration is configured. Campaigns will be queued.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button type="submit" size="sm" disabled={createMut.isPending}>
              {createMut.isPending ? "Saving…" : "Save as Draft"}
            </Button>
          </div>
        </form>
      )}

      {/* Campaign list */}
      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="bg-white border border-gray-200 rounded-lg h-20 animate-pulse" />)}</div>
      ) : campaigns.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-10 text-center text-gray-400 text-sm">No campaigns yet.</div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-100">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Campaign</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">Audience</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Channel</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Recipients</th>
                <th className="px-4 py-3 w-40" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {campaigns.map((c: Campaign) => (
                <tr key={c.id} className="hover:bg-gray-50 group">
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-gray-900">{c.name}</p>
                    <p className="text-xs text-gray-400">{c.template_name || "No template"} · {fmtDate(c.created_at)}</p>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 hidden sm:table-cell">{c.audience_name || "—"}</td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className="text-base">{CHANNELS.find((ch) => ch.value === c.channel)?.icon}</span>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={STATUS_BADGE[c.status] ?? "default"}>{c.status}</Badge>
                    {c.scheduled_at && <p className="text-[10px] text-gray-400 mt-0.5">{fmtDate(c.scheduled_at)}</p>}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-gray-500 hidden lg:table-cell">
                    {c.status === "sent" ? c.recipient_count : "—"}
                  </td>
                  <td className="px-4 py-3">
                    {c.status === "draft" && (
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => { if (confirm("Send this campaign now?")) sendMut.mutate(c.id); }}
                          disabled={sendMut.isPending}
                          title="Send now"
                          className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-gray-900 text-white text-xs font-medium hover:bg-gray-800 transition-colors disabled:opacity-50">
                          <Send size={11} /> Send
                        </button>
                        {!scheduleMode ? (
                          <button onClick={() => setScheduleMode(true)} title="Schedule"
                            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                            <Clock size={14} />
                          </button>
                        ) : (
                          <div className="flex items-center gap-1">
                            <input type="datetime-local" value={scheduleAt} onChange={(e) => setScheduleAt(e.target.value)}
                              className="text-xs border border-gray-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-gray-300" />
                            <button onClick={() => { if (scheduleAt) scheduleMut.mutate({ id: c.id, at: scheduleAt }); setScheduleMode(false); }}
                              disabled={!scheduleAt || scheduleMut.isPending}
                              className="text-xs text-blue-600 font-medium hover:underline disabled:opacity-50">OK</button>
                          </div>
                        )}
                        <button onClick={() => { if (confirm("Delete campaign?")) deleteMut.mutate(c.id); }}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Message Log tab ───────────────────────────────────────────────────────────

function LogTab({ branchId }: { branchId: number }) {
  const [page, setPage] = useState(1);
  const [memberSearch, setMemberSearch] = useState("");
  const [selectedMember, setSelectedMember] = useState<{ id: number; name: string } | null>(null);

  const { data: membersData } = useQuery({
    queryKey: ["members", branchId, { search: memberSearch }],
    queryFn: () => getMembers(branchId, { search: memberSearch }),
    enabled: memberSearch.length >= 2,
  });

  const { data, isLoading } = useQuery({
    queryKey: ["message-logs", branchId, selectedMember?.id, page],
    queryFn: () => getMessageLogs(branchId, { member: selectedMember?.id, page }),
    placeholderData: (p) => p,
  });

  const logs = data?.results ?? [];

  return (
    <div className="space-y-4">
      {/* Member filter */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <input type="search" placeholder="Filter by member…" value={selectedMember ? selectedMember.name : memberSearch}
            onChange={(e) => { setMemberSearch(e.target.value); if (selectedMember) setSelectedMember(null); setPage(1); }}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300 focus:border-gray-400"
          />
          {(membersData?.results ?? []).length > 0 && memberSearch.length >= 2 && !selectedMember && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl border border-gray-200 shadow-xl z-10 max-h-48 overflow-auto">
              {(membersData?.results ?? []).slice(0, 6).map((m) => (
                <button key={m.id} onClick={() => { setSelectedMember({ id: m.id, name: m.full_name }); setMemberSearch(""); setPage(1); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-gray-50 text-left">
                  <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-[10px] font-semibold flex items-center justify-center shrink-0">
                    {initials(m.full_name)}
                  </div>
                  <span className="text-sm">{m.full_name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        {selectedMember && (
          <button onClick={() => { setSelectedMember(null); setMemberSearch(""); setPage(1); }}
            className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1">
            <X size={12} /> Clear
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="bg-white border border-gray-200 rounded-lg h-40 animate-pulse" />
      ) : logs.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-10 text-center text-gray-400 text-sm">No messages logged yet.</div>
      ) : (
        <>
          <div className="bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden">
            <table className="min-w-full divide-y divide-gray-100">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Recipient</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">Campaign</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Channel</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Sent</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {logs.map((log: MessageLog) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-gray-100 text-gray-600 text-[10px] font-semibold flex items-center justify-center shrink-0">
                          {initials(log.member_name || "?")}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{log.member_name || "Unknown"}</p>
                          {log.recipient_address && <p className="text-xs text-gray-400">{log.recipient_address}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 hidden sm:table-cell">{log.campaign_name}</td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="text-base">{CHANNELS.find((c) => c.value === log.channel)?.icon}</span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={LOG_STATUS_BADGE[log.status] ?? "default"}>{log.status.replace("_", " ")}</Badge>
                      {log.error_message && <p className="text-[10px] text-red-400 mt-0.5 truncate max-w-[120px]">{log.error_message}</p>}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400 hidden lg:table-cell">
                      {log.sent_at ? fmtDate(log.sent_at) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {data && data.count > 0 && (
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>{data.count} messages</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={!data.previous}>Previous</Button>
                <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={!data.next}>Next</Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function CommunicationsPage() {
  const [tab, setTab] = useState<PageTab>("announcements");

  const TABS: { key: PageTab; label: string; icon: React.ReactNode }[] = [
    { key: "announcements", label: "Announcements", icon: <Megaphone size={14} /> },
    { key: "templates",     label: "Templates",     icon: <FileText size={14} /> },
    { key: "audiences",     label: "Audiences",     icon: <Users size={14} /> },
    { key: "campaigns",     label: "Campaigns",     icon: <Send size={14} /> },
    { key: "log",           label: "Message Log",   icon: <List size={14} /> },
  ];

  return (
    <div className="p-6 space-y-5">
      <PageHeader title="Communications" description="Templates, audiences, campaigns, and message history." />

      {/* Tab bar */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit flex-wrap">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={cn(
              "flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition-all",
              tab === t.key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700",
            )}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {tab === "announcements" && <AnnouncementsTab branchId={BRANCH_ID} />}
      {tab === "templates"     && <TemplatesTab     branchId={BRANCH_ID} />}
      {tab === "audiences"     && <AudiencesTab     branchId={BRANCH_ID} />}
      {tab === "campaigns"     && <CampaignsTab     branchId={BRANCH_ID} />}
      {tab === "log"           && <LogTab           branchId={BRANCH_ID} />}
    </div>
  );
}
