"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, X } from "lucide-react";
import { getPledges, createPledge, getFunds, getGivingCategories, type Pledge } from "@/lib/api/finance";
import { getMembers, type Member } from "@/lib/api/members";
import { pledgeSchema, type PledgeFormValues } from "@/lib/schemas/finance";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/dashboard/page-header";
import { cn } from "@/lib/utils";

const BRANCH_ID = 1;
const FIELD = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300 focus:border-gray-400 bg-white disabled:bg-gray-50";

type BadgeVariant = "success" | "info" | "default" | "danger";
const STATUS_BADGE: Record<string, BadgeVariant> = {
  active: "success", completed: "info", cancelled: "default", lapsed: "danger",
};

const FREQ_LABELS: Record<string, string> = {
  one_time: "One Time", weekly: "Weekly", biweekly: "Bi-weekly",
  monthly: "Monthly", quarterly: "Quarterly", annual: "Annual",
};

function fmt(amount: string, currency = "GHS") {
  return `${currency} ${Number(amount).toLocaleString("en-GH", { minimumFractionDigits: 2 })}`;
}

// ── Member search ─────────────────────────────────────────────────────────────

function MemberSearch({ value, onChange }: { value: Member | null; onChange: (m: Member | null) => void }) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);

  const { data } = useQuery({
    queryKey: ["members", BRANCH_ID, { search }],
    queryFn: () => getMembers(BRANCH_ID, { search }),
    enabled: search.length >= 2,
  });

  if (value) {
    return (
      <div className="flex items-center gap-2 border border-gray-300 rounded-lg px-3 py-2 bg-white">
        <span className="text-sm text-gray-800 flex-1">{value.full_name}</span>
        <button type="button" onClick={() => onChange(null)} className="text-gray-400 hover:text-gray-600">
          <X size={14} />
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <input
        type="search"
        placeholder="Search member…"
        value={search}
        onChange={(e) => { setSearch(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className={FIELD}
      />
      {open && search.length >= 2 && (data?.results.length ?? 0) > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl border border-gray-200 shadow-xl z-20 max-h-48 overflow-auto">
          {data!.results.slice(0, 8).map((m) => (
            <button
              key={m.id}
              type="button"
              onMouseDown={() => { onChange(m); setSearch(""); setOpen(false); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-gray-50 text-left"
            >
              <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-[10px] font-semibold flex items-center justify-center shrink-0">
                {m.full_name.split(" ").slice(0,2).map((n) => n[0]).join("")}
              </div>
              <span className="text-sm text-gray-800">{m.full_name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Progress bar ──────────────────────────────────────────────────────────────

function PledgeProgress({ pledge }: { pledge: Pledge }) {
  const pct = Number(pledge.amount) > 0
    ? Math.min(100, (Number(pledge.total_fulfilled) / Number(pledge.amount)) * 100)
    : 0;
  return (
    <div className="flex items-center gap-2 w-full">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all", pct >= 100 ? "bg-neutral-700" : "bg-neutral-600")}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[10px] text-gray-400 shrink-0">{Math.round(pct)}%</span>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function PledgesPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("active");
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [member, setMember] = useState<Member | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["pledges", BRANCH_ID, statusFilter, page],
    queryFn: () => getPledges(BRANCH_ID, { status: statusFilter || undefined, page }),
    placeholderData: (p) => p,
  });

  const { data: funds } = useQuery({
    queryKey: ["funds", BRANCH_ID],
    queryFn: () => getFunds(BRANCH_ID),
  });

  const { data: categories } = useQuery({
    queryKey: ["categories", BRANCH_ID],
    queryFn: () => getGivingCategories(BRANCH_ID),
  });

  const { register, handleSubmit, reset, setValue, formState: { errors } } =
    useForm<PledgeFormValues>({
      resolver: zodResolver(pledgeSchema),
      defaultValues: {
        currency: "GHS",
        frequency: "monthly",
        start_date: new Date().toISOString().slice(0, 10),
      },
    });

  const mutation = useMutation({
    mutationFn: (d: PledgeFormValues) => createPledge({ ...d, branch: BRANCH_ID }, BRANCH_ID),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pledges", BRANCH_ID] });
      setShowForm(false);
      setMember(null);
      reset();
    },
  });

  function closeForm() { setShowForm(false); setMember(null); reset(); }

  return (
    <div className="p-6 space-y-4">
      <PageHeader title="Pledges" description="Member giving commitments and fulfillment tracking.">
        <Button size="sm" onClick={() => setShowForm((v) => !v)}>
          {showForm ? <X size={14} /> : <Plus size={14} />}
          {showForm ? "Cancel" : "Add Pledge"}
        </Button>
      </PageHeader>

      {showForm && (
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))}
          className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 text-sm">New Pledge</h2>
            <button type="button" onClick={closeForm} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1">
              <label className="text-xs font-medium text-gray-600">Member *</label>
              <MemberSearch value={member} onChange={(m) => { setMember(m); setValue("member", m?.id ?? 0); }} />
              {errors.member && <p className="text-xs text-red-500">Member is required</p>}
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Fund *</label>
              <select {...register("fund", { valueAsNumber: true })} className={FIELD}>
                <option value="">Select fund…</option>
                {funds?.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
              {errors.fund && <p className="text-xs text-red-500">{errors.fund.message}</p>}
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Category</label>
              <select {...register("category", { setValueAs: (v) => v === "" ? null : Number(v) })} className={FIELD}>
                <option value="">None</option>
                {categories?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Pledge Amount *</label>
              <input type="number" step="0.01" min="0.01" {...register("amount")} placeholder="0.00" className={FIELD} />
              {errors.amount && <p className="text-xs text-red-500">{errors.amount.message}</p>}
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Frequency *</label>
              <select {...register("frequency")} className={FIELD}>
                {Object.entries(FREQ_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Start Date *</label>
              <input type="date" {...register("start_date")} className={FIELD} />
              {errors.start_date && <p className="text-xs text-red-500">{errors.start_date.message}</p>}
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">End Date</label>
              <input type="date" {...register("end_date", { setValueAs: (v) => v || null })} className={FIELD} />
            </div>
            <div className="col-span-2 space-y-1">
              <label className="text-xs font-medium text-gray-600">Notes</label>
              <textarea {...register("notes")} rows={2} className={FIELD} />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button type="submit" size="sm" disabled={mutation.isPending}>
              {mutation.isPending ? "Saving…" : "Create Pledge"}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={closeForm}>Cancel</Button>
            {mutation.isError && <p className="text-xs text-red-500">Failed to save.</p>}
          </div>
        </form>
      )}

      {/* Status filter chips */}
      <div className="flex gap-2 flex-wrap">
        {["", "active", "completed", "cancelled", "lapsed"].map((s) => (
          <button
            key={s}
            onClick={() => { setStatusFilter(s); setPage(1); }}
            className={cn(
              "px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors",
              statusFilter === s
                ? "bg-gray-900 text-white border-gray-900"
                : "bg-white text-gray-600 border-gray-200 hover:border-gray-300",
            )}
          >
            {s === "" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="divide-y divide-gray-50">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-3.5 animate-pulse">
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 bg-gray-100 rounded w-32" />
                  <div className="h-2.5 bg-gray-100 rounded w-48" />
                </div>
                <div className="h-5 w-16 bg-gray-100 rounded-full" />
              </div>
            ))}
          </div>
        ) : (
          <>
            <table className="min-w-full divide-y divide-gray-100">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Member</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">Fund</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Pledged</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Fulfilled</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-32 hidden lg:table-cell">Progress</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Freq.</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data?.results.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-gray-400 text-sm">No pledges found.</td>
                  </tr>
                )}
                {data?.results.map((p: Pledge) => (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{p.member_name}</td>
                    <td className="px-4 py-3 text-sm text-gray-500 hidden sm:table-cell">{p.fund_name}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 text-right">{fmt(p.amount, p.currency)}</td>
                    <td className="px-4 py-3 text-sm text-emerald-700 text-right hidden md:table-cell">{fmt(p.total_fulfilled, p.currency)}</td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <PledgeProgress pledge={p} />
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 hidden md:table-cell">{FREQ_LABELS[p.frequency] ?? p.frequency}</td>
                    <td className="px-4 py-3">
                      <Badge variant={STATUS_BADGE[p.status] ?? "default"}>
                        {p.status.charAt(0).toUpperCase() + p.status.slice(1)}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {data && data.count > 0 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 text-sm text-gray-500">
                <span>{data.count} pledge{data.count !== 1 ? "s" : ""}</span>
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
