"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, X, Printer, ChevronDown, ChevronRight, Crown } from "lucide-react";
import {
  getHouseholds, createHousehold, updateHousehold, getHouseholdGiving,
  type Household,
} from "@/lib/api/households";
import { getMembers, updateMember, type Member } from "@/lib/api/members";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/dashboard/page-header";
import { cn } from "@/lib/utils";

const BRANCH_ID = 1;
const FIELD = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 bg-white disabled:bg-gray-50";

const STATUS_COLOR: Record<string, string> = {
  member: "bg-emerald-100 text-emerald-700",
  regular: "bg-blue-100 text-blue-700",
  visitor: "bg-gray-100 text-gray-600",
  inactive: "bg-red-100 text-red-600",
  transferred: "bg-purple-100 text-purple-700",
  deceased: "bg-gray-200 text-gray-500",
};

const householdSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  phone: z.string().max(30).optional(),
  address: z.string().optional(),
  anniversary_date: z.string().optional().nullable(),
});
type HouseholdFormValues = z.infer<typeof householdSchema>;

// ── Initials avatar ────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  "bg-blue-100 text-blue-700", "bg-purple-100 text-purple-700",
  "bg-green-100 text-green-700", "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700", "bg-cyan-100 text-cyan-700",
];

function Avatar({ name, id, photo, size = "md" }: { name: string; id: number; photo?: string | null; size?: "sm" | "md" | "lg" }) {
  const color = AVATAR_COLORS[id % AVATAR_COLORS.length];
  const initials = name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();
  const sz = size === "sm" ? "w-7 h-7 text-[10px]" : size === "lg" ? "w-14 h-14 text-lg" : "w-9 h-9 text-xs";
  if (photo) {
    return <img src={photo} alt={name} className={`${sz} rounded-full object-cover shrink-0`} />;
  }
  return (
    <div className={`${sz} ${color} rounded-full flex items-center justify-center font-semibold shrink-0`}>
      {initials}
    </div>
  );
}

// ── Member typeahead ──────────────────────────────────────────────────────────

function MemberSearch({ onSelect, excludeIds = [] }: { onSelect: (m: Member) => void; excludeIds?: number[] }) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);

  const { data } = useQuery({
    queryKey: ["members", BRANCH_ID, { search }],
    queryFn: () => getMembers(BRANCH_ID, { search }),
    enabled: search.length >= 2,
  });

  const results = data?.results.filter((m) => !excludeIds.includes(m.id)).slice(0, 8) ?? [];

  return (
    <div className="relative">
      <input
        type="search"
        placeholder="Search member to add…"
        value={search}
        onChange={(e) => { setSearch(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className={FIELD}
      />
      {open && search.length >= 2 && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl border border-gray-200 shadow-xl z-20 max-h-52 overflow-auto">
          {results.map((m) => (
            <button
              key={m.id}
              type="button"
              onMouseDown={() => { onSelect(m); setSearch(""); setOpen(false); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-gray-50 text-left"
            >
              <Avatar name={m.full_name} id={m.id} photo={(m as Member & { photo?: string | null }).photo} size="sm" />
              <div className="min-w-0">
                <p className="text-sm text-gray-800 truncate">{m.full_name}</p>
                <p className="text-[10px] text-gray-400">{m.membership_status}</p>
              </div>
            </button>
          ))}
        </div>
      )}
      {open && search.length >= 2 && results.length === 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl border border-gray-200 shadow-xl z-20 px-3 py-2 text-sm text-gray-400">
          No members found
        </div>
      )}
    </div>
  );
}

// ── Print directory ────────────────────────────────────────────────────────────

async function printDirectory(branchId: number) {
  const allHouseholdsResp = await getHouseholds(branchId, { page: 1 });
  const total = allHouseholdsResp.count;
  const pageSize = 100;
  const pages = Math.ceil(total / pageSize);

  let households: Household[] = [...allHouseholdsResp.results];
  for (let p = 2; p <= pages; p++) {
    const resp = await getHouseholds(branchId, { page: p });
    households = [...households, ...resp.results];
  }

  const membersByHousehold: Record<number, Member[]> = {};
  await Promise.all(
    households.map(async (hh) => {
      const resp = await getMembers(branchId, { household: hh.id });
      membersByHousehold[hh.id] = resp.results;
    })
  );

  const COLORS = ["#DBEAFE", "#EDE9FE", "#D1FAE5", "#FEF3C7", "#FCE7F3", "#CFFAFE"];

  const hhHtml = households
    .filter((hh) => (membersByHousehold[hh.id]?.length ?? 0) > 0)
    .map((hh) => {
      const members = membersByHousehold[hh.id] ?? [];
      const memberCards = members.map((m, i) => {
        const initials = m.full_name.split(" ").slice(0, 2).map((n: string) => n[0]).join("");
        const color = COLORS[m.id % COLORS.length];
        const photoHtml = (m as Member & { photo?: string | null }).photo
          ? `<img src="${(m as Member & { photo?: string | null }).photo}" style="width:64px;height:64px;border-radius:50%;object-fit:cover;" />`
          : `<div style="width:64px;height:64px;border-radius:50%;background:${color};display:flex;align-items:center;justify-content:center;font-weight:600;font-size:18px;color:#374151;">${initials}</div>`;
        const isHead = hh.head !== null && m.id === hh.head;
        return `<div style="text-align:center;padding:8px;width:90px;">
          ${photoHtml}
          <p style="font-size:11px;margin:6px 0 2px;font-weight:${isHead ? 700 : 500};color:#111827;">${m.full_name}</p>
          ${isHead ? '<p style="font-size:9px;color:#6366F1;font-weight:600;">HEAD</p>' : ""}
        </div>`;
      }).join("");
      return `<div style="break-inside:avoid;margin-bottom:24px;padding:16px;border:1px solid #E5E7EB;border-radius:12px;">
        <h3 style="font-size:14px;font-weight:700;color:#111827;margin:0 0 4px;">${hh.name}</h3>
        ${hh.address ? `<p style="font-size:11px;color:#6B7280;margin:0 0 12px;">${hh.address}</p>` : ""}
        <div style="display:flex;flex-wrap:wrap;gap:8px;">${memberCards}</div>
      </div>`;
    }).join("");

  const html = `<!DOCTYPE html><html><head><title>Church Directory</title>
<style>
  body { font-family: Georgia, serif; padding: 24px; color: #111827; }
  h1 { font-size: 24px; text-align: center; margin-bottom: 4px; }
  p.sub { text-align: center; color: #6B7280; font-size: 12px; margin-bottom: 24px; }
  .grid { columns: 3; column-gap: 16px; }
  @media print {
    body { padding: 12px; }
    .grid { columns: 3; }
    @page { margin: 1cm; }
  }
</style></head><body>
<h1>Church Pictorial Directory</h1>
<p class="sub">Generated ${new Date().toLocaleDateString("en-GH", { year: "numeric", month: "long", day: "numeric" })}</p>
<div class="grid">${hhHtml}</div>
<script>window.onload = () => window.print();</script>
</body></html>`;

  const w = window.open("", "_blank");
  if (w) { w.document.write(html); w.document.close(); }
}

// ── Household detail panel ─────────────────────────────────────────────────────

function HouseholdPanel({
  household,
  onClose,
  onUpdated,
}: {
  household: Household;
  onClose: () => void;
  onUpdated: (h: Household) => void;
}) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [givingOpen, setGivingOpen] = useState(false);

  const { data: membersData, refetch: refetchMembers } = useQuery({
    queryKey: ["household-members", household.id, BRANCH_ID],
    queryFn: () => getMembers(BRANCH_ID, { household: household.id }),
  });

  const { data: giving } = useQuery({
    queryKey: ["household-giving", household.id, BRANCH_ID],
    queryFn: () => getHouseholdGiving(household.id, BRANCH_ID),
    enabled: givingOpen,
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<HouseholdFormValues>({
    resolver: zodResolver(householdSchema),
    defaultValues: {
      name: household.name,
      phone: household.phone ?? "",
      address: household.address ?? "",
      anniversary_date: household.anniversary_date ?? "",
    },
  });

  const updateMut = useMutation({
    mutationFn: (d: HouseholdFormValues) =>
      updateHousehold(household.id, { ...d, anniversary_date: d.anniversary_date || null }, BRANCH_ID),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["households", BRANCH_ID] });
      onUpdated(updated);
      setEditing(false);
    },
  });

  const setHeadMut = useMutation({
    mutationFn: (memberId: number) => updateHousehold(household.id, { head: memberId }, BRANCH_ID),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["households", BRANCH_ID] });
      onUpdated(updated);
    },
  });

  const removeMemberMut = useMutation({
    mutationFn: (memberId: number) => updateMember(memberId, { household: null }, BRANCH_ID),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["household-members", household.id, BRANCH_ID] });
      queryClient.invalidateQueries({ queryKey: ["households", BRANCH_ID] });
    },
  });

  const addMemberMut = useMutation({
    mutationFn: (memberId: number) => updateMember(memberId, { household: household.id }, BRANCH_ID),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["household-members", household.id, BRANCH_ID] });
      queryClient.invalidateQueries({ queryKey: ["households", BRANCH_ID] });
      refetchMembers();
    },
  });

  const members = membersData?.results ?? [];
  const existingIds = members.map((m) => m.id);

  return (
    <div className="fixed right-0 top-0 bottom-0 w-[420px] bg-white border-l border-gray-200 shadow-2xl z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
        <div className="min-w-0">
          <h2 className="font-semibold text-gray-900 truncate">{household.name}</h2>
          {household.head_name && (
            <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
              <Crown size={10} className="text-amber-500" /> {household.head_name}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => { setEditing((v) => !v); if (!editing) reset({ name: household.name, phone: household.phone ?? "", address: household.address ?? "", anniversary_date: household.anniversary_date ?? "" }); }}
            className="text-xs text-blue-600 hover:text-blue-800 font-medium"
          >
            {editing ? "Cancel" : "Edit"}
          </button>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={16} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Edit form */}
        {editing && (
          <form onSubmit={handleSubmit((d) => updateMut.mutate(d))} className="px-5 py-4 space-y-3 border-b border-gray-100">
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Household Name *</label>
              <input type="text" {...register("name")} className={FIELD} />
              {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600">Phone</label>
                <input type="tel" {...register("phone")} className={FIELD} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600">Anniversary</label>
                <input type="date" {...register("anniversary_date")} className={FIELD} />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Address</label>
              <textarea {...register("address")} rows={2} className={FIELD} />
            </div>
            <div className="flex items-center gap-3">
              <Button type="submit" size="sm" disabled={updateMut.isPending}>
                {updateMut.isPending ? "Saving…" : "Save Changes"}
              </Button>
              {updateMut.isError && <p className="text-xs text-red-500">Failed to save.</p>}
            </div>
          </form>
        )}

        {/* Info summary (when not editing) */}
        {!editing && (
          <div className="px-5 py-3 border-b border-gray-100 space-y-1 text-sm text-gray-600">
            {household.phone && <p><span className="text-xs text-gray-400 w-20 inline-block">Phone</span>{household.phone}</p>}
            {household.address && <p><span className="text-xs text-gray-400 w-20 inline-block">Address</span>{household.address}</p>}
            {household.anniversary_date && (
              <p>
                <span className="text-xs text-gray-400 w-20 inline-block">Anniversary</span>
                {new Date(household.anniversary_date).toLocaleDateString("en-GH", { month: "long", day: "numeric", year: "numeric" })}
              </p>
            )}
          </div>
        )}

        {/* Members */}
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Members ({household.member_count})
          </h3>
          {!membersData && <p className="text-sm text-gray-400">Loading…</p>}
          {members.length === 0 && membersData && (
            <p className="text-sm text-gray-400">No members linked yet.</p>
          )}
          <div className="space-y-1.5">
            {members.map((m) => {
              const isHead = household.head !== null && m.id === household.head;
              return (
                <div key={m.id} className="flex items-center gap-2.5 py-1.5 group">
                  <Avatar name={m.full_name} id={m.id} photo={(m as Member & { photo?: string | null }).photo} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm text-gray-800 truncate">{m.full_name}</p>
                      {isHead && <Crown size={11} className="text-amber-500 shrink-0" />}
                    </div>
                    <p className={cn("text-[10px] px-1.5 py-0.5 rounded-full inline-block mt-0.5", STATUS_COLOR[m.membership_status] ?? "bg-gray-100 text-gray-600")}>
                      {m.membership_status}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    {!isHead && (
                      <button
                        onClick={() => setHeadMut.mutate(m.id)}
                        title="Set as head of household"
                        className="p-1 rounded hover:bg-amber-50 text-gray-300 hover:text-amber-500 transition-colors"
                      >
                        <Crown size={13} />
                      </button>
                    )}
                    <button
                      onClick={() => removeMemberMut.mutate(m.id)}
                      title="Remove from household"
                      className="p-1 rounded hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors"
                    >
                      <X size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Add member */}
          <div className="mt-3">
            <MemberSearch
              onSelect={(m) => addMemberMut.mutate(m.id)}
              excludeIds={existingIds}
            />
            {addMemberMut.isError && <p className="text-xs text-red-500 mt-1">Failed to add member.</p>}
          </div>
        </div>

        {/* Giving summary (collapsible) */}
        <div className="px-5 py-4">
          <button
            onClick={() => setGivingOpen((v) => !v)}
            className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wide w-full"
          >
            {givingOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
            Giving Summary
          </button>
          {givingOpen && (
            <div className="mt-3">
              {!giving && <p className="text-sm text-gray-400">Loading…</p>}
              {giving && (
                <>
                  <p className="text-sm font-semibold text-gray-900 mb-2">
                    Total: GHS {Number(giving.grand_total).toLocaleString("en-GH", { minimumFractionDigits: 2 })}
                  </p>
                  {giving.by_fund.length === 0 && (
                    <p className="text-sm text-gray-400">No contributions recorded.</p>
                  )}
                  <div className="space-y-1">
                    {giving.by_fund.map((f, i) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">{f.fund__name}</span>
                        <span className="text-gray-900 font-medium">
                          {f.currency} {Number(f.total).toLocaleString("en-GH", { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

const householdCreateSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  phone: z.string().max(30).optional(),
  address: z.string().optional(),
});
type HouseholdCreateValues = z.infer<typeof householdCreateSchema>;

export default function HouseholdsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState<Household | null>(null);
  const [printing, setPrinting] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["households", BRANCH_ID, page, search],
    queryFn: () => getHouseholds(BRANCH_ID, { page, search: search || undefined }),
    placeholderData: (p) => p,
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<HouseholdCreateValues>({
    resolver: zodResolver(householdCreateSchema),
  });

  const createMut = useMutation({
    mutationFn: (d: HouseholdCreateValues) => createHousehold({ ...d, branch: BRANCH_ID }, BRANCH_ID),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["households", BRANCH_ID] });
      setShowForm(false);
      reset();
    },
  });

  async function handlePrint() {
    setPrinting(true);
    try { await printDirectory(BRANCH_ID); } finally { setPrinting(false); }
  }

  return (
    <div className="p-6 space-y-6">
      {selected && (
        <div className="fixed inset-0 bg-black/10 z-40" onClick={() => setSelected(null)} />
      )}
      {selected && (
        <HouseholdPanel
          household={selected}
          onClose={() => setSelected(null)}
          onUpdated={(h) => setSelected(h)}
        />
      )}

      <PageHeader title="Households" description="Family units and giving directory.">
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={handlePrint} disabled={printing}>
            <Printer size={14} />
            {printing ? "Generating…" : "Print Directory"}
          </Button>
          <Button size="sm" onClick={() => setShowForm((v) => !v)}>
            {showForm ? <X size={14} /> : <Plus size={14} />}
            {showForm ? "Cancel" : "Add Household"}
          </Button>
        </div>
      </PageHeader>

      {showForm && (
        <form
          onSubmit={handleSubmit((d) => createMut.mutate(d))}
          className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-4"
        >
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 text-sm">New Household</h2>
            <button type="button" onClick={() => { setShowForm(false); reset(); }} className="text-gray-400 hover:text-gray-600">
              <X size={16} />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1">
              <label className="text-xs font-medium text-gray-600">Household Name *</label>
              <input type="text" {...register("name")} placeholder="e.g. Mensah Family" className={FIELD} />
              {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Phone</label>
              <input type="tel" {...register("phone")} className={FIELD} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Address</label>
              <input type="text" {...register("address")} className={FIELD} />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button type="submit" size="sm" disabled={createMut.isPending}>
              {createMut.isPending ? "Creating…" : "Create Household"}
            </Button>
            {createMut.isError && <p className="text-xs text-red-500">Failed to create.</p>}
          </div>
        </form>
      )}

      {/* Search */}
      <input
        type="search"
        placeholder="Search households…"
        value={search}
        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        className="w-full max-w-sm border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 bg-white"
      />

      {/* List */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {isLoading && (
          <div className="divide-y divide-gray-50">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-4 animate-pulse">
                <div className="w-10 h-10 bg-gray-100 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 bg-gray-100 rounded w-36" />
                  <div className="h-2.5 bg-gray-100 rounded w-48" />
                </div>
              </div>
            ))}
          </div>
        )}
        {!isLoading && data?.results.length === 0 && (
          <p className="px-5 py-10 text-center text-gray-400 text-sm">No households found.</p>
        )}
        <div className="divide-y divide-gray-50">
          {data?.results.map((hh: Household) => (
            <div
              key={hh.id}
              onClick={() => setSelected(hh)}
              className={cn(
                "flex items-center gap-4 px-5 py-4 cursor-pointer transition-colors",
                selected?.id === hh.id ? "bg-blue-50" : "hover:bg-gray-50",
              )}
            >
              {/* Avatar (household initial) */}
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0",
                AVATAR_COLORS[hh.id % AVATAR_COLORS.length],
              )}>
                {hh.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-gray-900 truncate">{hh.name}</p>
                  {hh.head_name && (
                    <p className="text-xs text-gray-400 flex items-center gap-0.5 shrink-0">
                      <Crown size={10} className="text-amber-400" /> {hh.head_name}
                    </p>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-0.5 truncate">
                  {[hh.address, hh.phone].filter(Boolean).join(" · ")}
                </p>
              </div>
              <Badge variant="default">
                {hh.member_count} {hh.member_count === 1 ? "member" : "members"}
              </Badge>
            </div>
          ))}
        </div>
        {data && data.count > 0 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 text-sm text-gray-500">
            <span>{data.count} household{data.count !== 1 ? "s" : ""}</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={!data.previous}>Previous</Button>
              <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={!data.next}>Next</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
