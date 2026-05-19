"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Plus, X, Pencil, Trash2, UserMinus, MapPin, Calendar,
  CheckCircle, XCircle, ClipboardList, GitBranch,
} from "lucide-react";
import {
  getGroups, createGroup, updateGroup, deleteGroup,
  getGroupMembers, addGroupMember, removeGroupMember,
  getGroupMeetings, createGroupMeeting,
  getGroupJoinRequests, decideJoinRequest,
  type Group, type GroupMembership, type GroupMeeting, type GroupJoinRequest,
} from "@/lib/api/groups";
import { getMembers } from "@/lib/api/members";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/dashboard/page-header";
import { cn } from "@/lib/utils";

const BRANCH_ID = 1;
const FIELD = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 bg-white disabled:bg-gray-50";

const GROUP_TYPES = [
  { value: "cell",       label: "Cell Group" },
  { value: "ministry",   label: "Ministry" },
  { value: "choir",      label: "Choir" },
  { value: "department", label: "Department" },
  { value: "prayer",     label: "Prayer Group" },
  { value: "other",      label: "Other" },
];

const DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];

type BadgeVariant = "info" | "purple" | "orange" | "warning" | "success" | "default";
const TYPE_BADGE: Record<string, BadgeVariant> = {
  cell: "info", ministry: "purple", choir: "orange", department: "warning", prayer: "success", other: "default",
};
const ROLE_BADGE: Record<string, BadgeVariant> = { leader: "warning", co_leader: "orange", member: "default" };
const ROLE_LABEL: Record<string, string> = { leader: "Leader", co_leader: "Co-Leader", member: "Member" };

function initials(name: string) {
  return name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();
}
function fmtDate(s: string) {
  const d = new Date(s);
  return d.toLocaleDateString("en-GH", { day: "numeric", month: "short", year: "numeric" });
}

// ── Group form ────────────────────────────────────────────────────────────────

const groupSchema = z.object({
  name:             z.string().min(1, "Required").max(100),
  group_type:       z.enum(["cell","ministry","choir","department","prayer","other"]),
  description:      z.string().optional(),
  parent_group:     z.number().nullable().optional(),
  meeting_day:      z.string().optional(),
  meeting_location: z.string().max(200).optional(),
  is_active:        z.boolean(),
});
type GroupFormValues = z.infer<typeof groupSchema>;

function GroupForm({ branchId, editing, allGroups, onClose }: {
  branchId: number; editing?: Group; allGroups: Group[]; onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const { register, handleSubmit, formState: { errors } } = useForm<GroupFormValues>({
    resolver: zodResolver(groupSchema),
    defaultValues: editing ? {
      name: editing.name, group_type: editing.group_type,
      description: editing.description, parent_group: editing.parent_group,
      meeting_day: editing.meeting_day, meeting_location: editing.meeting_location,
      is_active: editing.is_active,
    } : { group_type: "cell", is_active: true, parent_group: null },
  });

  const createMut = useMutation({
    mutationFn: (d: GroupFormValues) => createGroup({ ...d, branch: branchId }, branchId),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["groups", branchId] }); onClose(); },
  });
  const updateMut = useMutation({
    mutationFn: (d: GroupFormValues) => updateGroup(editing!.id, d, branchId),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["groups", branchId] }); onClose(); },
  });

  const isPending = createMut.isPending || updateMut.isPending;
  const otherGroups = allGroups.filter((g) => g.id !== editing?.id);

  return (
    <form onSubmit={handleSubmit((d) => editing ? updateMut.mutate(d) : createMut.mutate(d))}
      className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-gray-900 text-sm">{editing ? "Edit Group" : "New Group"}</h2>
        <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-600">Name *</label>
          <input type="text" {...register("name")} placeholder="e.g. Youth Cell A" className={FIELD} />
          {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-600">Type *</label>
          <select {...register("group_type")} className={FIELD}>
            {GROUP_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-600">Meeting Day</label>
          <select {...register("meeting_day")} className={FIELD}>
            <option value="">Not set</option>
            {DAYS.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-600">Location</label>
          <input type="text" {...register("meeting_location")} placeholder="Room 3B" className={FIELD} />
        </div>
        <div className="col-span-2 space-y-1">
          <label className="text-xs font-medium text-gray-600">Parent Group (for multiplication tracking)</label>
          <select {...register("parent_group", { setValueAs: (v) => v === "" ? null : Number(v) })} className={FIELD}>
            <option value="">None</option>
            {otherGroups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        </div>
        <div className="col-span-2 space-y-1">
          <label className="text-xs font-medium text-gray-600">Description</label>
          <textarea {...register("description")} rows={2} className={FIELD} />
        </div>
        <div className="col-span-2 flex items-center gap-2">
          <input type="checkbox" {...register("is_active")} id="is_active" className="w-4 h-4 rounded border-gray-300" />
          <label htmlFor="is_active" className="text-sm text-gray-700">Active group</label>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? "Saving…" : editing ? "Update" : "Create Group"}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={onClose}>Cancel</Button>
        {(createMut.isError || updateMut.isError) && <p className="text-xs text-red-500">Failed to save.</p>}
      </div>
    </form>
  );
}

// ── Group slide-in panel ──────────────────────────────────────────────────────

type GroupPanelTab = "members" | "meetings" | "requests";

function GroupPanel({ group, branchId, onClose }: {
  group: Group; branchId: number; onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<GroupPanelTab>("members");
  const [memberSearch, setMemberSearch] = useState("");
  const [role, setRole] = useState("member");
  const [meetingDate, setMeetingDate] = useState(new Date().toISOString().slice(0, 10));
  const [meetingCount, setMeetingCount] = useState(0);
  const [meetingNotes, setMeetingNotes] = useState("");

  // Members
  const { data: memberships = [], isLoading: loadingMembers } = useQuery({
    queryKey: ["group-members", group.id, branchId],
    queryFn: () => getGroupMembers(group.id, branchId),
  });

  const { data: membersData } = useQuery({
    queryKey: ["members", branchId, { search: memberSearch }],
    queryFn: () => getMembers(branchId, { search: memberSearch }),
    enabled: memberSearch.length >= 2,
  });

  const addMut = useMutation({
    mutationFn: (memberId: number) => addGroupMember(group.id, { member: memberId, role }, branchId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["group-members", group.id, branchId] });
      queryClient.invalidateQueries({ queryKey: ["groups", branchId] });
      setMemberSearch("");
    },
  });

  const removeMut = useMutation({
    mutationFn: (membershipId: number) => removeGroupMember(group.id, membershipId, branchId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["group-members", group.id, branchId] });
      queryClient.invalidateQueries({ queryKey: ["groups", branchId] });
    },
  });

  // Meetings
  const { data: meetings = [], refetch: refetchMeetings } = useQuery({
    queryKey: ["group-meetings", group.id, branchId],
    queryFn: () => getGroupMeetings(group.id, branchId),
    enabled: tab === "meetings",
  });

  const logMeetingMut = useMutation({
    mutationFn: () => createGroupMeeting(group.id, { date: meetingDate, present_count: meetingCount, notes: meetingNotes }, branchId),
    onSuccess: () => {
      refetchMeetings();
      setMeetingNotes("");
    },
  });

  // Join requests
  const { data: joinRequests = [], refetch: refetchRequests } = useQuery({
    queryKey: ["group-join-requests", group.id, branchId],
    queryFn: () => getGroupJoinRequests(group.id, branchId),
    enabled: tab === "requests",
  });

  const decideMut = useMutation({
    mutationFn: ({ id, decision }: { id: number; decision: "approve" | "reject" }) =>
      decideJoinRequest(group.id, id, decision, branchId),
    onSuccess: () => {
      refetchRequests();
      queryClient.invalidateQueries({ queryKey: ["group-members", group.id, branchId] });
      queryClient.invalidateQueries({ queryKey: ["groups", branchId] });
    },
  });

  const existingIds = new Set(memberships.map((m) => m.member));
  const suggestions = (membersData?.results ?? []).filter((m) => !existingIds.has(m.id));

  const pendingCount = joinRequests.filter((r) => r.status === "pending").length;

  const tabs: { key: GroupPanelTab; label: string }[] = [
    { key: "members", label: `Members (${memberships.length})` },
    { key: "meetings", label: `Meetings (${meetings.length})` },
    { key: "requests", label: `Requests${pendingCount > 0 ? ` (${pendingCount})` : ""}` },
  ];

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-[420px] bg-white border-l border-gray-200 shadow-2xl flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div>
          <h2 className="font-semibold text-gray-900">{group.name}</h2>
          <p className="text-xs text-gray-400">{GROUP_TYPES.find((t) => t.value === group.group_type)?.label}
            {group.parent_group_name && <span className="ml-1">· from {group.parent_group_name}</span>}
          </p>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-100 px-4">
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

      {/* ── Members tab ── */}
      {tab === "members" && (
        <>
          <div className="px-5 py-3 border-b border-gray-100 space-y-2">
            <div className="relative">
              <input type="search" placeholder="Search members to add…" value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
              />
              {suggestions.length > 0 && memberSearch.length >= 2 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl border border-gray-200 shadow-xl z-10 max-h-48 overflow-auto">
                  {suggestions.slice(0, 8).map((m) => (
                    <button key={m.id} onClick={() => addMut.mutate(m.id)} disabled={addMut.isPending}
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
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-500">Role:</label>
              <select value={role} onChange={(e) => setRole(e.target.value)}
                className="flex-1 border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 bg-white">
                <option value="member">Member</option>
                <option value="co_leader">Co-Leader</option>
                <option value="leader">Leader</option>
              </select>
            </div>
          </div>

          <div className="flex-1 overflow-auto px-5 py-3 space-y-1">
            {loadingMembers && <p className="text-sm text-gray-400 text-center py-6">Loading…</p>}
            {!loadingMembers && memberships.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-6">No members yet.</p>
            )}
            {memberships.map((m: GroupMembership) => (
              <div key={m.id} className="flex items-center gap-2.5 py-2 group">
                <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 text-[11px] font-semibold flex items-center justify-center shrink-0">
                  {initials(m.member_name)}
                </div>
                <span className="text-sm text-gray-800 flex-1">{m.member_name}</span>
                <Badge variant={ROLE_BADGE[m.role] ?? "default"}>{ROLE_LABEL[m.role] ?? m.role}</Badge>
                <button onClick={() => removeMut.mutate(m.id)} disabled={removeMut.isPending}
                  title="Remove from group"
                  className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-600 transition-all">
                  <UserMinus size={14} />
                </button>
              </div>
            ))}
          </div>

          <div className="px-5 py-3 border-t border-gray-100 text-xs text-gray-400 text-center">
            {memberships.length} member{memberships.length !== 1 ? "s" : ""}
          </div>
        </>
      )}

      {/* ── Meetings tab ── */}
      {tab === "meetings" && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Log meeting form */}
          <div className="px-5 py-3 border-b border-gray-100 space-y-2">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Log a meeting</p>
            <div className="flex gap-2">
              <input type="date" value={meetingDate} onChange={(e) => setMeetingDate(e.target.value)}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500" />
              <input type="number" min="0" value={meetingCount} onChange={(e) => setMeetingCount(Number(e.target.value))}
                placeholder="# present"
                className="w-24 border border-gray-300 rounded-lg px-3 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500" />
            </div>
            <div className="flex gap-2">
              <input type="text" value={meetingNotes} onChange={(e) => setMeetingNotes(e.target.value)}
                placeholder="Notes (optional)"
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500" />
              <button onClick={() => logMeetingMut.mutate()} disabled={logMeetingMut.isPending || !meetingDate}
                className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-1">
                <ClipboardList size={14} /> Log
              </button>
            </div>
            {logMeetingMut.isError && <p className="text-xs text-red-500">Failed — check if this date already exists.</p>}
          </div>

          {/* Meeting history */}
          <div className="flex-1 overflow-auto px-5 py-3 space-y-2">
            {meetings.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-6">No meetings logged yet.</p>
            )}
            {meetings.map((m: GroupMeeting) => (
              <div key={m.id} className="border border-gray-100 rounded-xl p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-800">{fmtDate(m.date)}</span>
                  <span className="text-xs font-medium bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                    {m.present_count} present
                  </span>
                </div>
                {m.notes && <p className="text-xs text-gray-500 mt-1">{m.notes}</p>}
                {m.recorded_by_name && <p className="text-[10px] text-gray-300 mt-1">Logged by {m.recorded_by_name}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Requests tab ── */}
      {tab === "requests" && (
        <div className="flex-1 overflow-auto px-5 py-3 space-y-2">
          {joinRequests.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-6">No join requests.</p>
          )}
          {joinRequests.map((req: GroupJoinRequest) => (
            <div key={req.id} className="border border-gray-100 rounded-xl p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 text-[11px] font-semibold flex items-center justify-center shrink-0">
                      {initials(req.member_name)}
                    </div>
                    <span className="text-sm font-medium text-gray-800">{req.member_name}</span>
                  </div>
                  {req.notes && <p className="text-xs text-gray-400 mt-1 ml-9">{req.notes}</p>}
                  <p className="text-[10px] text-gray-300 mt-0.5 ml-9">{fmtDate(req.created_at)}</p>
                </div>
                {req.status === "pending" ? (
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => decideMut.mutate({ id: req.id, decision: "approve" })}
                      disabled={decideMut.isPending}
                      title="Approve"
                      className="p-1.5 rounded-lg hover:bg-emerald-50 text-gray-400 hover:text-emerald-600 transition-colors"
                    >
                      <CheckCircle size={16} />
                    </button>
                    <button
                      onClick={() => decideMut.mutate({ id: req.id, decision: "reject" })}
                      disabled={decideMut.isPending}
                      title="Reject"
                      className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
                    >
                      <XCircle size={16} />
                    </button>
                  </div>
                ) : (
                  <Badge variant={req.status === "approved" ? "success" : "default"}>{req.status}</Badge>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Group card ────────────────────────────────────────────────────────────────

function GroupCard({ group, onEdit, onDelete, onOpen }: {
  group: Group; onEdit: () => void; onDelete: () => void; onOpen: () => void;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm group hover:shadow-md hover:border-gray-300 transition-all">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <h3 className="font-semibold text-gray-900 truncate">{group.name}</h3>
            {group.parent_group_name && (
              <span title={`Split from ${group.parent_group_name}`}>
                <GitBranch size={12} className="text-gray-300" />
              </span>
            )}
          </div>
          {group.leader_name && (
            <p className="text-xs text-gray-500 mt-0.5">
              Leader: <span className="text-gray-700 font-medium">{group.leader_name}</span>
            </p>
          )}
        </div>
        <Badge variant={TYPE_BADGE[group.group_type] ?? "default"} className="shrink-0">
          {GROUP_TYPES.find((t) => t.value === group.group_type)?.label ?? group.group_type}
        </Badge>
      </div>

      {group.description && (
        <p className="text-xs text-gray-500 mb-2 line-clamp-2">{group.description}</p>
      )}

      <div className="flex items-center gap-3 text-xs text-gray-400 mb-3">
        {group.meeting_day && (
          <span className="flex items-center gap-1"><Calendar size={11} />{group.meeting_day}</span>
        )}
        {group.meeting_location && (
          <span className="flex items-center gap-1 truncate"><MapPin size={11} />{group.meeting_location}</span>
        )}
      </div>

      <div className="flex items-center justify-between">
        <button onClick={onOpen} className="text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors">
          {group.member_count} member{group.member_count !== 1 ? "s" : ""} →
        </button>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={onEdit} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors">
            <Pencil size={13} />
          </button>
          <button onClick={onDelete} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors">
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function GroupsPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm]     = useState(false);
  const [editing, setEditing]       = useState<Group | null>(null);
  const [typeFilter, setTypeFilter] = useState("");
  const [activeGroup, setActiveGroup] = useState<Group | null>(null);
  const [showInactive, setShowInactive] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["groups", BRANCH_ID, typeFilter, showInactive],
    queryFn: () => getGroups(BRANCH_ID, {
      group_type: typeFilter || undefined,
      active_only: showInactive ? undefined : "true",
    }),
    placeholderData: (p) => p,
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => deleteGroup(id, BRANCH_ID),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["groups", BRANCH_ID] }),
  });

  function openEdit(g: Group) { setEditing(g); setShowForm(true); }
  function closeForm() { setShowForm(false); setEditing(null); }

  const groups = data?.results ?? [];
  const total = data?.count ?? 0;

  return (
    <div className="p-6 space-y-4">
      <PageHeader title="Groups" description="Cell groups, ministries, and departments.">
        <Button size="sm" onClick={() => { setEditing(null); setShowForm((v) => !v); }}>
          {showForm && !editing ? <X size={14} /> : <Plus size={14} />}
          {showForm && !editing ? "Cancel" : "Add Group"}
        </Button>
      </PageHeader>

      {showForm && (
        <GroupForm branchId={BRANCH_ID} editing={editing ?? undefined} allGroups={groups} onClose={closeForm} />
      )}

      {/* Controls */}
      <div className="flex items-center gap-2 flex-wrap">
        {[{ value: "", label: "All Types" }, ...GROUP_TYPES].map((t) => (
          <button key={t.value} onClick={() => setTypeFilter(t.value)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors",
              typeFilter === t.value ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-200 hover:border-gray-300",
            )}>
            {t.label}
          </button>
        ))}
        <button onClick={() => setShowInactive((v) => !v)}
          className={cn(
            "px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ml-auto",
            showInactive ? "bg-gray-700 text-white border-gray-700" : "bg-white text-gray-500 border-gray-200 hover:border-gray-300",
          )}>
          {showInactive ? "Active + Inactive" : "Active only"}
        </button>
      </div>

      {/* Group grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white border border-gray-200 rounded-2xl p-4 animate-pulse space-y-3">
              <div className="flex justify-between"><div className="h-4 bg-gray-100 rounded w-32" /><div className="h-5 bg-gray-100 rounded-full w-20" /></div>
              <div className="h-3 bg-gray-100 rounded w-24" />
              <div className="h-3 bg-gray-100 rounded w-16 mt-auto" />
            </div>
          ))}
        </div>
      ) : groups.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center text-gray-400 text-sm">
          No groups found. Create one to get started.
        </div>
      ) : (
        <>
          <p className="text-xs text-gray-400">{total} group{total !== 1 ? "s" : ""}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {groups.map((g: Group) => (
              <GroupCard key={g.id} group={g}
                onEdit={() => openEdit(g)}
                onDelete={() => { if (confirm(`Delete "${g.name}"?`)) deleteMut.mutate(g.id); }}
                onOpen={() => setActiveGroup(g)} />
            ))}
          </div>
        </>
      )}

      {/* Group slide-in */}
      {activeGroup && (
        <GroupPanel group={activeGroup} branchId={BRANCH_ID} onClose={() => setActiveGroup(null)} />
      )}
    </div>
  );
}
