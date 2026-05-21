"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Download, Plus, X, Filter, Upload, AlertTriangle,
  ChevronDown, ChevronUp, Users, Tag, ArrowRightLeft,
} from "lucide-react";
import {
  getMembers, createMember, getMemberTags, importMembersCSV,
  bulkAction, checkDuplicate,
  type Member, type MemberTag, type MemberFilters, type DuplicateMatch,
} from "@/lib/api/members";
import { getGroups } from "@/lib/api/groups";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/dashboard/page-header";
import { cn } from "@/lib/utils";

const BRANCH_ID = 1;

const FIELD = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 bg-white disabled:bg-gray-50";

// ── Status / badge config ─────────────────────────────────────────────────────

type BadgeVariant = "warning" | "info" | "success" | "default" | "danger" | "purple" | "orange";

const STATUS_CONFIG: Record<string, { label: string; variant: BadgeVariant }> = {
  visitor:     { label: "Visitor",     variant: "warning"  },
  regular:     { label: "Regular",     variant: "info"     },
  member:      { label: "Member",      variant: "success"  },
  inactive:    { label: "Inactive",    variant: "default"  },
  transferred: { label: "Transferred", variant: "purple"   },
  deceased:    { label: "Deceased",    variant: "danger"   },
};

const GENDER_LABELS: Record<string, string> = { male: "Male", female: "Female", other: "Other" };

// ── Add member schema ─────────────────────────────────────────────────────────

const addMemberSchema = z.object({
  first_name:        z.string().min(1, "Required"),
  last_name:         z.string().min(1, "Required"),
  middle_name:       z.string().optional(),
  gender:            z.enum(["male", "female", "other"]),
  phone:             z.string().optional(),
  email:             z.string().email("Invalid email").optional().or(z.literal("")),
  membership_status: z.enum(["visitor", "regular", "member", "inactive", "transferred", "deceased"]),
  date_of_birth:     z.string().optional(),
  date_joined:       z.string().optional(),
});
type AddMemberValues = z.infer<typeof addMemberSchema>;

// ── Tag pill ──────────────────────────────────────────────────────────────────

function TagPill({ tag }: { tag: MemberTag }) {
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold text-white"
      style={{ backgroundColor: tag.color }}
    >
      {tag.name}
    </span>
  );
}

// ── Member avatar (initials) ──────────────────────────────────────────────────

function MemberAvatar({ name, size = "sm" }: { name: string; size?: "sm" | "md" }) {
  const initials = name.split(" ").filter(Boolean).slice(0, 2).map((n) => n[0].toUpperCase()).join("");
  return (
    <div className={cn(
      "rounded-full bg-gray-100 text-gray-600 font-semibold flex items-center justify-center shrink-0",
      size === "sm" ? "w-7 h-7 text-xs" : "w-9 h-9 text-sm",
    )}>
      {initials}
    </div>
  );
}

// ── CSV Import Modal ──────────────────────────────────────────────────────────

function ImportModal({ onClose, branchId }: { onClose: () => void; branchId: number }) {
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [result, setResult] = useState<{ created: number; skipped: number; errors: { row: number; error: string }[] } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (f: File) => importMembersCSV(branchId, f),
    onSuccess: (data) => {
      setResult(data);
      queryClient.invalidateQueries({ queryKey: ["members", branchId] });
    },
  });

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) setFile(f);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Import Members from CSV</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {!result ? (
            <>
              <p className="text-xs text-gray-500">
                Required columns: <code className="bg-gray-100 px-1 rounded">first_name</code>,{" "}
                <code className="bg-gray-100 px-1 rounded">last_name</code>. Optional:{" "}
                middle_name, gender, phone, email, date_of_birth, membership_status, baptism_status, address, notes, date_joined.
              </p>

              <div
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => inputRef.current?.click()}
                className={cn(
                  "border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors",
                  dragging ? "border-blue-400 bg-blue-50" : "border-gray-200 hover:border-gray-300",
                )}
              >
                <Upload size={24} className="mx-auto text-gray-300 mb-2" />
                {file ? (
                  <p className="text-sm font-medium text-gray-700">{file.name}</p>
                ) : (
                  <p className="text-sm text-gray-400">Drop a CSV file here or click to browse</p>
                )}
                <input
                  ref={inputRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
              </div>

              {mutation.isError && (
                <p className="text-sm text-red-600">Import failed. Check that your file is valid CSV.</p>
              )}

              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
                <Button
                  size="sm"
                  disabled={!file || mutation.isPending}
                  onClick={() => file && mutation.mutate(file)}
                >
                  {mutation.isPending ? "Importing…" : "Import"}
                </Button>
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded p-4 text-center">
                  <p className="text-2xl font-bold text-green-700">{result.created}</p>
                  <p className="text-xs text-green-600 mt-0.5">Members created</p>
                </div>
                <div className="bg-gray-50 rounded p-4 text-center">
                  <p className="text-2xl font-bold text-amber-700">{result.skipped}</p>
                  <p className="text-xs text-amber-600 mt-0.5">Skipped (duplicates)</p>
                </div>
              </div>
              {result.errors.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-red-600 mb-1.5">
                    {result.errors.length} row{result.errors.length !== 1 ? "s" : ""} had errors:
                  </p>
                  <div className="bg-red-50 rounded-lg p-3 max-h-36 overflow-auto space-y-1">
                    {result.errors.map((e, i) => (
                      <p key={i} className="text-xs text-red-700">
                        Row {e.row}: {e.error}
                      </p>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex justify-end">
                <Button size="sm" onClick={onClose}>Done</Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Bulk action bar ───────────────────────────────────────────────────────────

function BulkActionBar({
  selectedIds, onClear, branchId, tags, onDone,
}: {
  selectedIds: number[];
  onClear: () => void;
  branchId: number;
  tags: MemberTag[];
  onDone: () => void;
}) {
  const queryClient = useQueryClient();
  const [actionOpen, setActionOpen] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (payload: Parameters<typeof bulkAction>[1]) => bulkAction(branchId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members", branchId] });
      onClear();
      onDone();
      setActionOpen(null);
    },
  });

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 bg-gray-900 text-white px-5 py-3 rounded-lg shadow-2xl">
      <span className="text-sm font-semibold">{selectedIds.length} selected</span>
      <div className="w-px h-4 bg-white/20" />

      {/* Change status */}
      <div className="relative">
        <button
          onClick={() => setActionOpen(actionOpen === "status" ? null : "status")}
          className="flex items-center gap-1.5 text-sm text-white/80 hover:text-white transition-colors"
        >
          <Users size={14} />
          Change Status
        </button>
        {actionOpen === "status" && (
          <div className="absolute bottom-full mb-2 left-0 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden w-44">
            {Object.entries(STATUS_CONFIG).map(([value, { label }]) => (
              <button
                key={value}
                onClick={() => mutation.mutate({ action: "change_status", ids: selectedIds, status: value })}
                className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Add tag */}
      {tags.length > 0 && (
        <div className="relative">
          <button
            onClick={() => setActionOpen(actionOpen === "tag" ? null : "tag")}
            className="flex items-center gap-1.5 text-sm text-white/80 hover:text-white transition-colors"
          >
            <Tag size={14} />
            Add Tag
          </button>
          {actionOpen === "tag" && (
            <div className="absolute bottom-full mb-2 left-0 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden w-44">
              {tags.map((t) => (
                <button
                  key={t.id}
                  onClick={() => mutation.mutate({ action: "add_tag", ids: selectedIds, tag_id: t.id })}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: t.color }} />
                  {t.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {mutation.isPending && <span className="text-xs text-white/60">Saving…</span>}

      <div className="w-px h-4 bg-white/20" />
      <button onClick={onClear} className="text-sm text-white/60 hover:text-white transition-colors">
        <X size={16} />
      </button>
    </div>
  );
}

// ── Advanced filters panel ────────────────────────────────────────────────────

function FiltersPanel({
  filters, onChange, tags, groups,
}: {
  filters: MemberFilters;
  onChange: (f: Partial<MemberFilters>) => void;
  tags: MemberTag[];
  groups: { id: number; name: string }[];
}) {
  const sel = (field: keyof MemberFilters, value: string | number | undefined) =>
    onChange({ [field]: value || undefined });

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
        <div className="space-y-1">
          <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Gender</label>
          <select value={filters.gender ?? ""} onChange={(e) => sel("gender", e.target.value)} className={FIELD}>
            <option value="">Any</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Baptism</label>
          <select value={filters.baptism_status ?? ""} onChange={(e) => sel("baptism_status", e.target.value)} className={FIELD}>
            <option value="">Any</option>
            <option value="baptised">Baptised</option>
            <option value="not_baptised">Not Baptised</option>
            <option value="pending">Pending</option>
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Age min</label>
          <input
            type="number" min="0" max="120" placeholder="e.g. 18"
            value={filters.age_min ?? ""}
            onChange={(e) => onChange({ age_min: e.target.value ? Number(e.target.value) : undefined })}
            className={FIELD}
          />
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Age max</label>
          <input
            type="number" min="0" max="120" placeholder="e.g. 35"
            value={filters.age_max ?? ""}
            onChange={(e) => onChange({ age_max: e.target.value ? Number(e.target.value) : undefined })}
            className={FIELD}
          />
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Group</label>
          <select value={filters.group ?? ""} onChange={(e) => onChange({ group: e.target.value ? Number(e.target.value) : undefined })} className={FIELD}>
            <option value="">Any</option>
            {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Last attended from</label>
          <input
            type="date"
            value={filters.last_attended_from ?? ""}
            onChange={(e) => sel("last_attended_from", e.target.value)}
            className={FIELD}
          />
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Last attended to</label>
          <input
            type="date"
            value={filters.last_attended_to ?? ""}
            onChange={(e) => sel("last_attended_to", e.target.value)}
            className={FIELD}
          />
        </div>

        {tags.length > 0 && (
          <div className="col-span-2 space-y-1">
            <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Tags (all must match)</label>
            <div className="flex flex-wrap gap-1.5">
              {tags.map((t) => {
                const active = (filters.tags ?? []).includes(t.id);
                return (
                  <button
                    key={t.id}
                    onClick={() => {
                      const current = filters.tags ?? [];
                      onChange({ tags: active ? current.filter((id) => id !== t.id) : [...current, t.id] });
                    }}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium border transition-all",
                      active ? "border-transparent text-white" : "border-gray-200 text-gray-600 hover:border-gray-300",
                    )}
                    style={active ? { backgroundColor: t.color, borderColor: t.color } : undefined}
                  >
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: active ? "white" : t.color }}
                    />
                    {t.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="mt-3 flex justify-end">
        <button
          onClick={() => onChange({
            gender: undefined, baptism_status: undefined, age_min: undefined, age_max: undefined,
            group: undefined, last_attended_from: undefined, last_attended_to: undefined, tags: [],
          })}
          className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
        >
          Clear filters
        </button>
      </div>
    </div>
  );
}

// ── Add member form with duplicate detection ──────────────────────────────────

function AddMemberForm({ onClose, branchId }: { onClose: () => void; branchId: number }) {
  const queryClient = useQueryClient();
  const [duplicates, setDuplicates] = useState<DuplicateMatch[]>([]);
  const [dupeChecked, setDupeChecked] = useState(false);
  const [forceCreate, setForceCreate] = useState(false);

  const { register, handleSubmit, watch, formState: { errors } } = useForm<AddMemberValues>({
    resolver: zodResolver(addMemberSchema),
    defaultValues: { gender: "male", membership_status: "visitor" },
  });

  const mutation = useMutation({
    mutationFn: (d: AddMemberValues) =>
      createMember({ ...d, email: d.email || undefined }, branchId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members", branchId] });
      onClose();
    },
  });

  // Debounced duplicate check
  const phone = watch("phone");
  const email = watch("email");
  const firstName = watch("first_name");
  const lastName = watch("last_name");
  const dob = watch("date_of_birth");

  useEffect(() => {
    setDupeChecked(false);
    setForceCreate(false);
  }, [phone, email, firstName, lastName, dob]);

  async function runDupeCheck() {
    if (!phone && !email && !(firstName && lastName)) return;
    const result = await checkDuplicate(branchId, {
      phone: phone || undefined,
      email: email || undefined,
      first_name: firstName || undefined,
      last_name: lastName || undefined,
      date_of_birth: dob || undefined,
    });
    setDuplicates(result.duplicates);
    setDupeChecked(true);
  }

  function onSubmit(d: AddMemberValues) {
    if (!dupeChecked) {
      runDupeCheck().then(() => { /* will show dupes or allow submit on next click */ });
      return;
    }
    if (duplicates.length > 0 && !forceCreate) {
      setForceCreate(true);
      return;
    }
    mutation.mutate(d);
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-gray-900 text-sm">New Member</h2>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <X size={16} />
        </button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600">First Name *</label>
            <input type="text" {...register("first_name")} className={FIELD} />
            {errors.first_name && <p className="text-xs text-red-500">{errors.first_name.message}</p>}
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600">Last Name *</label>
            <input type="text" {...register("last_name")} className={FIELD} />
            {errors.last_name && <p className="text-xs text-red-500">{errors.last_name.message}</p>}
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600">Middle Name</label>
            <input type="text" {...register("middle_name")} className={FIELD} />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600">Gender *</label>
            <select {...register("gender")} className={FIELD}>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600">Phone</label>
            <input type="tel" {...register("phone")} className={FIELD} />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600">Email</label>
            <input type="email" {...register("email")} className={FIELD} />
            {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600">Date of Birth</label>
            <input type="date" {...register("date_of_birth")} className={FIELD} />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600">Date Joined</label>
            <input type="date" {...register("date_joined")} className={FIELD} />
          </div>
          <div className="col-span-2 space-y-1">
            <label className="text-xs font-medium text-gray-600">Status *</label>
            <select {...register("membership_status")} className={FIELD}>
              {Object.entries(STATUS_CONFIG).map(([value, { label }]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Duplicate warning */}
        {dupeChecked && duplicates.length > 0 && (
          <div className="rounded bg-gray-50 border border-gray-200 p-3 space-y-2">
            <div className="flex items-center gap-2 text-amber-800">
              <AlertTriangle size={15} />
              <p className="text-sm font-semibold">Possible duplicates found</p>
            </div>
            {duplicates.map((d) => (
              <div key={d.id} className="flex items-center justify-between text-sm">
                <span className="text-amber-700">
                  <Link href={`/dashboard/members/${d.id}`} className="underline font-medium">{d.full_name}</Link>
                  <span className="text-amber-500 ml-1">· {d.reason}</span>
                </span>
              </div>
            ))}
            {forceCreate && (
              <p className="text-xs text-amber-600">Click &quot;Save anyway&quot; to create despite duplicates.</p>
            )}
          </div>
        )}
        {dupeChecked && duplicates.length === 0 && (
          <p className="text-xs text-green-600 font-medium">No duplicates found.</p>
        )}

        <div className="flex items-center gap-3">
          <Button type="submit" size="sm" disabled={mutation.isPending}>
            {mutation.isPending
              ? "Saving…"
              : !dupeChecked
              ? "Check & Save"
              : duplicates.length > 0 && !forceCreate
              ? "Save anyway"
              : "Save Member"}
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          {mutation.isError && <p className="text-red-500 text-sm">Failed to create member.</p>}
        </div>
      </form>
    </div>
  );
}

// ── Export CSV ────────────────────────────────────────────────────────────────

function exportCSV(members: Member[]) {
  if (!members.length) return;
  const rows = [
    ["Name", "Gender", "Phone", "Email", "Status", "Baptism", "DOB", "Joined", "Branch", "Tags"],
    ...members.map((m) => [
      m.full_name,
      GENDER_LABELS[m.gender] ?? m.gender,
      m.phone || "",
      m.email || "",
      STATUS_CONFIG[m.membership_status]?.label ?? m.membership_status,
      m.baptism_status,
      m.date_of_birth || "",
      m.date_joined || "",
      m.primary_branch?.name || "",
      m.tags.map((t) => t.name).join("; "),
    ]),
  ];
  const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "members.csv";
  a.click();
  URL.revokeObjectURL(url);
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function MembersPage() {
  const [search, setSearch]           = useState("");
  const [statusFilter, setStatus]     = useState("");
  const [page, setPage]               = useState(1);
  const [showForm, setShowForm]       = useState(false);
  const [showImport, setShowImport]   = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selected, setSelected]       = useState<Set<number>>(new Set());
  const [advFilters, setAdvFilters]   = useState<MemberFilters>({});

  const filters: MemberFilters = {
    search: search || undefined,
    status: statusFilter || undefined,
    page,
    ...advFilters,
  };

  const { data, isLoading, isError } = useQuery({
    queryKey: ["members", BRANCH_ID, filters],
    queryFn: () => getMembers(BRANCH_ID, filters),
    placeholderData: (prev) => prev,
  });

  const { data: tags = [] } = useQuery({
    queryKey: ["member-tags", BRANCH_ID],
    queryFn: () => import("@/lib/api/members").then((m) => m.getMemberTags(BRANCH_ID)),
    staleTime: 60_000 * 5,
  });

  const { data: groupsData } = useQuery({
    queryKey: ["groups", BRANCH_ID],
    queryFn: () => getGroups(BRANCH_ID),
    staleTime: 60_000 * 5,
  });
  const groups = (Array.isArray(groupsData) ? groupsData : groupsData?.results ?? []) as { id: number; name: string }[];

  const allIds = data?.results.map((m) => m.id) ?? [];
  const allSelected = allIds.length > 0 && allIds.every((id) => selected.has(id));

  function toggleAll() {
    if (allSelected) {
      setSelected((s) => { const n = new Set(s); allIds.forEach((id) => n.delete(id)); return n; });
    } else {
      setSelected((s) => new Set([...s, ...allIds]));
    }
  }

  function toggleOne(id: number) {
    setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  function resetFiltersAndPage() { setPage(1); setSelected(new Set()); }

  const activeFilterCount = Object.values(advFilters).filter((v) =>
    v !== undefined && v !== "" && !(Array.isArray(v) && v.length === 0)
  ).length;

  return (
    <div className="p-6 space-y-4">
      <PageHeader title="Members" description="Manage your congregation.">
        <Button variant="outline" size="sm" onClick={() => setShowImport(true)}>
          <Upload size={14} /> Import CSV
        </Button>
        {data?.results.length ? (
          <Button variant="outline" size="sm" onClick={() => exportCSV(data.results)}>
            <Download size={14} /> Export
          </Button>
        ) : null}
        <Button size="sm" onClick={() => { setShowForm((v) => !v); }}>
          {showForm ? <X size={14} /> : <Plus size={14} />}
          {showForm ? "Cancel" : "Add Member"}
        </Button>
      </PageHeader>

      {showForm && (
        <AddMemberForm onClose={() => setShowForm(false)} branchId={BRANCH_ID} />
      )}

      {/* Search + status + filter toggle */}
      <div className="flex gap-2 flex-wrap">
        <input
          type="search"
          placeholder="Search name, phone or email…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); resetFiltersAndPage(); }}
          className="flex-1 min-w-48 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 bg-white"
        />
        <select
          value={statusFilter}
          onChange={(e) => { setStatus(e.target.value); resetFiltersAndPage(); }}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 bg-white"
        >
          <option value="">All statuses</option>
          {Object.entries(STATUS_CONFIG).map(([v, { label }]) => (
            <option key={v} value={v}>{label}</option>
          ))}
        </select>
        <button
          onClick={() => setShowFilters((v) => !v)}
          className={cn(
            "inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition-colors",
            showFilters || activeFilterCount > 0
              ? "bg-gray-900 text-white border-gray-900"
              : "bg-white text-gray-600 border-gray-300 hover:border-gray-400",
          )}
        >
          <Filter size={14} />
          Filters
          {activeFilterCount > 0 && (
            <span className="bg-white/30 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5">
              {activeFilterCount}
            </span>
          )}
          {showFilters ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {showFilters && (
        <FiltersPanel
          filters={advFilters}
          onChange={(f) => { setAdvFilters((prev) => ({ ...prev, ...f })); resetFiltersAndPage(); }}
          tags={tags}
          groups={groups}
        />
      )}

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="divide-y divide-gray-50">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-3">
                <div className="w-4 h-4 bg-gray-100 rounded animate-pulse" />
                <div className="w-7 h-7 rounded-full bg-gray-100 animate-pulse" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 bg-gray-100 rounded animate-pulse w-40" />
                  <div className="h-2.5 bg-gray-100 rounded animate-pulse w-28" />
                </div>
                <div className="h-5 w-16 bg-gray-100 rounded-full animate-pulse" />
              </div>
            ))}
          </div>
        ) : isError ? (
          <div className="p-10 text-center text-red-500 text-sm">Failed to load members.</div>
        ) : (
          <>
            <table className="min-w-full divide-y divide-gray-100">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-3 w-10">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleAll}
                      className="rounded border-gray-300"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Member</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">Phone</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Gender</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Tags</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide hidden xl:table-cell">Branch</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data?.results.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-gray-400 text-sm">
                      No members match your filters.
                    </td>
                  </tr>
                )}
                {data?.results.map((m: Member) => {
                  const statusCfg = STATUS_CONFIG[m.membership_status];
                  const isChecked = selected.has(m.id);
                  return (
                    <tr
                      key={m.id}
                      className={cn("hover:bg-gray-50 transition-colors", isChecked && "bg-blue-50/40")}
                    >
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleOne(m.id)}
                          className="rounded border-gray-300"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <MemberAvatar name={m.full_name} />
                          <div>
                            <Link
                              href={`/dashboard/members/${m.id}`}
                              className="text-sm font-semibold text-gray-900 hover:text-blue-600 transition-colors"
                            >
                              {m.full_name}
                            </Link>
                            {m.email && (
                              <p className="text-xs text-gray-400 truncate max-w-[180px]">{m.email}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500 hidden sm:table-cell">{m.phone || "—"}</td>
                      <td className="px-4 py-3 text-sm text-gray-500 hidden md:table-cell capitalize">{m.gender || "—"}</td>
                      <td className="px-4 py-3">
                        <Badge variant={statusCfg?.variant ?? "default"}>
                          {statusCfg?.label ?? m.membership_status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <div className="flex flex-wrap gap-1">
                          {m.tags.slice(0, 3).map((t) => <TagPill key={t.id} tag={t} />)}
                          {m.tags.length > 3 && (
                            <span className="text-[10px] text-gray-400">+{m.tags.length - 3}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-400 hidden xl:table-cell">
                        {m.primary_branch?.name ?? "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {data && data.count > 0 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 text-sm text-gray-500">
                <span>{data.count} {data.count === 1 ? "member" : "members"}</span>
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

      {/* Bulk action floating bar */}
      {selected.size > 0 && (
        <BulkActionBar
          selectedIds={Array.from(selected)}
          onClear={() => setSelected(new Set())}
          branchId={BRANCH_ID}
          tags={tags}
          onDone={() => setSelected(new Set())}
        />
      )}

      {/* Import modal */}
      {showImport && (
        <ImportModal onClose={() => setShowImport(false)} branchId={BRANCH_ID} />
      )}
    </div>
  );
}
