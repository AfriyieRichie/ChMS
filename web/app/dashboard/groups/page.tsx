"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, X } from "lucide-react";
import { getGroups, createGroup, getGroupMembers, type Group, type GroupMembership } from "@/lib/api/groups";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/dashboard/page-header";
import type { VariantProps } from "class-variance-authority";
import { badgeVariants } from "@/components/ui/badge";

const BRANCH_ID = 1;
const FIELD = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 bg-white";

const GROUP_TYPES = [
  { value: "cell", label: "Cell Group" },
  { value: "ministry", label: "Ministry" },
  { value: "choir", label: "Choir" },
  { value: "department", label: "Department" },
  { value: "prayer", label: "Prayer Group" },
  { value: "other", label: "Other" },
];

type BadgeVariant = VariantProps<typeof badgeVariants>["variant"];

const TYPE_BADGE: Record<string, BadgeVariant> = {
  cell: "info",
  ministry: "purple",
  choir: "orange",
  department: "warning",
  prayer: "success",
  other: "default",
};

const ROLE_BADGE: Record<string, BadgeVariant> = {
  leader: "warning",
  co_leader: "orange",
  member: "default",
};

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const groupSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  group_type: z.enum(["cell", "ministry", "choir", "department", "prayer", "other"]),
  description: z.string().optional(),
  meeting_day: z.string().optional(),
  meeting_location: z.string().max(200).optional(),
  is_active: z.boolean(),
});
type GroupFormValues = z.infer<typeof groupSchema>;

export default function GroupsPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [typeFilter, setTypeFilter] = useState("");
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["groups", BRANCH_ID, typeFilter],
    queryFn: () => getGroups(BRANCH_ID, { group_type: typeFilter || undefined, active_only: "true" }),
    placeholderData: (p) => p,
  });

  const { data: members } = useQuery({
    queryKey: ["group-members", selectedGroup?.id, BRANCH_ID],
    queryFn: () => getGroupMembers(selectedGroup!.id, BRANCH_ID),
    enabled: !!selectedGroup,
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<GroupFormValues>({
    resolver: zodResolver(groupSchema),
    defaultValues: { group_type: "cell", is_active: true },
  });

  const mutation = useMutation({
    mutationFn: (d: GroupFormValues) => createGroup({ ...d, branch: BRANCH_ID }, BRANCH_ID),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["groups", BRANCH_ID] });
      setShowForm(false);
      reset();
    },
  });

  return (
    <div className="p-6 space-y-6">
      <PageHeader title="Groups" description="Cell groups, ministries, and departments.">
        <Button size="sm" onClick={() => setShowForm((v) => !v)}>
          {showForm ? <X size={14} /> : <Plus size={14} />}
          {showForm ? "Cancel" : "Add Group"}
        </Button>
      </PageHeader>

      {showForm && (
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))}
          className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-4">
          <h2 className="font-semibold text-gray-900 text-sm">New Group</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Group Name *</label>
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
              <label className="text-xs font-medium text-gray-600">Description</label>
              <textarea {...register("description")} rows={2} className={FIELD} />
            </div>
            <div className="col-span-2 flex items-center gap-2">
              <input type="checkbox" {...register("is_active")} id="is_active"
                className="w-4 h-4 rounded border-gray-300" />
              <label htmlFor="is_active" className="text-sm text-gray-700">Active group</label>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button type="submit" size="sm" disabled={mutation.isPending}>
              {mutation.isPending ? "Saving…" : "Create Group"}
            </Button>
            {mutation.isError && <p className="text-red-500 text-sm">Failed to create group.</p>}
          </div>
        </form>
      )}

      {/* Filter chips */}
      <div className="flex gap-2 flex-wrap">
        {[{ value: "", label: "All Types" }, ...GROUP_TYPES].map((t) => (
          <button key={t.value} onClick={() => setTypeFilter(t.value)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
              typeFilter === t.value
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading && <div className="col-span-full p-10 text-center text-gray-400 text-sm">Loading groups…</div>}
        {data?.results.length === 0 && (
          <div className="col-span-full p-10 text-center text-gray-400 text-sm">No groups found.</div>
        )}
        {data?.results.map((g: Group) => (
          <div key={g.id}
            className={`bg-white border rounded-xl p-4 shadow-sm space-y-3 cursor-pointer transition-all ${
              selectedGroup?.id === g.id
                ? "border-blue-400 ring-1 ring-blue-400"
                : "border-gray-200 hover:border-gray-300 hover:shadow-md"
            }`}
            onClick={() => setSelectedGroup(selectedGroup?.id === g.id ? null : g)}>
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-gray-900">{g.name}</h3>
              <Badge variant={TYPE_BADGE[g.group_type] ?? "default"}>
                {GROUP_TYPES.find((t) => t.value === g.group_type)?.label ?? g.group_type}
              </Badge>
            </div>
            {g.leader_name && (
              <p className="text-xs text-gray-500">
                Leader: <span className="text-gray-700 font-medium">{g.leader_name}</span>
              </p>
            )}
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>
                {g.meeting_day ? `Meets ${g.meeting_day}` : "No schedule"}
                {g.meeting_location ? ` · ${g.meeting_location}` : ""}
              </span>
              <span className="font-medium text-gray-700">
                {g.member_count} member{g.member_count !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
        ))}
      </div>

      {selectedGroup && (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 text-sm">{selectedGroup.name} — Members</h2>
            <button onClick={() => setSelectedGroup(null)}
              className="text-xs text-gray-400 hover:text-gray-600">
              Close
            </button>
          </div>
          <div className="divide-y divide-gray-50">
            {!members && <div className="p-6 text-center text-gray-400 text-sm">Loading…</div>}
            {members?.length === 0 && <div className="p-6 text-center text-gray-400 text-sm">No members yet.</div>}
            {members?.map((m: GroupMembership) => (
              <div key={m.id} className="px-5 py-3 flex items-center justify-between">
                <span className="text-sm text-gray-800">{m.member_name}</span>
                <Badge variant={ROLE_BADGE[m.role] ?? "default"}>
                  {m.role === "co_leader" ? "Co-Leader" : m.role.charAt(0).toUpperCase() + m.role.slice(1)}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
