"use client";

import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, X, RotateCcw, Download, Filter, ChevronDown, ChevronUp } from "lucide-react";
import {
  getContributions, createContribution, reverseContribution,
  getFunds, getGivingCategories, getContributionSummary,
  type Contribution,
} from "@/lib/api/finance";
import { getMembers, type Member } from "@/lib/api/members";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/dashboard/page-header";
import { cn } from "@/lib/utils";
import { contributionSchema, type ContributionFormValues } from "@/lib/schemas/finance";

const BRANCH_ID = 1;
const FIELD = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 bg-white disabled:bg-gray-50";

const PAYMENT_METHODS = [
  { value: "cash",          label: "Cash" },
  { value: "cheque",        label: "Cheque" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "mobile_money",  label: "Mobile Money" },
  { value: "card",          label: "Card" },
];

const PM_LABEL: Record<string, string> = {
  cash: "Cash", cheque: "Cheque", bank_transfer: "Bank Transfer",
  mobile_money: "Mobile Money", card: "Card",
};

function fmt(amount: string) {
  return `GHS ${Number(amount).toLocaleString("en-GH", { minimumFractionDigits: 2 })}`;
}

function fmtDate(s: string) {
  const d = new Date(s);
  return d.toLocaleDateString("en-GH", { day: "numeric", month: "short", year: "numeric" });
}

// ── Member search typeahead ───────────────────────────────────────────────────

function MemberSearch({
  value, onChange,
}: { value: Member | null; onChange: (m: Member | null) => void }) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);

  const { data } = useQuery({
    queryKey: ["members", BRANCH_ID, { search }],
    queryFn: () => getMembers(BRANCH_ID, { search }),
    enabled: search.length >= 2,
  });

  function select(m: Member) { onChange(m); setSearch(""); setOpen(false); }
  function clear() { onChange(null); setSearch(""); }

  if (value) {
    return (
      <div className="flex items-center gap-2 border border-gray-300 rounded-lg px-3 py-2 bg-white">
        <span className="text-sm text-gray-800 flex-1">{value.full_name}</span>
        <button type="button" onClick={clear} className="text-gray-400 hover:text-gray-600">
          <X size={14} />
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <input
        type="search"
        placeholder="Search member (optional)…"
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
              onMouseDown={() => select(m)}
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

// ── Reverse modal ─────────────────────────────────────────────────────────────

function ReverseModal({ contribution, branchId, onClose }: {
  contribution: Contribution;
  branchId: number;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [reason, setReason] = useState("");

  const mut = useMutation({
    mutationFn: () => reverseContribution(contribution.id, reason, branchId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contributions", branchId] });
      queryClient.invalidateQueries({ queryKey: ["finance-summary", branchId] });
      onClose();
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Reverse Contribution</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="bg-gray-50 border border-gray-200 rounded p-3 text-sm text-gray-600">
            <p className="font-medium">{contribution.member_name || "Anonymous"}</p>
            <p>{fmt(contribution.amount)} · {PM_LABEL[contribution.payment_method] ?? contribution.payment_method} · {fmtDate(contribution.given_at)}</p>
            <p className="text-xs mt-1 text-amber-600">Receipt: {contribution.receipt_number}</p>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600">Reason *</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              placeholder="Why is this being reversed?"
              className={FIELD}
            />
          </div>
          {mut.isError && <p className="text-xs text-red-500">Reversal failed. Please try again.</p>}
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="destructive"
              disabled={!reason.trim() || mut.isPending}
              onClick={() => mut.mutate()}
            >
              {mut.isPending ? "Processing…" : "Confirm Reversal"}
            </Button>
            <Button size="sm" variant="outline" onClick={onClose}>Cancel</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Export CSV ────────────────────────────────────────────────────────────────

function exportCSV(rows: Contribution[]) {
  const headers = ["Receipt","Member","Fund","Amount","Method","Date","Reversal"];
  const lines = rows.map((c) => [
    c.receipt_number, c.member_name, c.fund_name, c.amount,
    PM_LABEL[c.payment_method] ?? c.payment_method, c.given_at,
    c.is_reversal ? "Yes" : "No",
  ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","));
  const csv = [headers.join(","), ...lines].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "contributions.csv"; a.click();
  URL.revokeObjectURL(url);
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function ContributionsPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm]     = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage]             = useState(1);
  const [reversing, setReversing]   = useState<Contribution | null>(null);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);

  // Filters
  const [filterFund, setFilterFund]         = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo]     = useState("");
  const [showReversals, setShowReversals]   = useState(false);

  // Form member
  const [formMember, setFormMember] = useState<Member | null>(null);

  const params = {
    page,
    fund:             filterFund ? Number(filterFund) : undefined,
    date_from:        filterDateFrom || undefined,
    date_to:          filterDateTo || undefined,
    exclude_reversals: showReversals ? undefined : true,
  };

  const { data: contributions, isLoading } = useQuery({
    queryKey: ["contributions", BRANCH_ID, params],
    queryFn: () => getContributions(BRANCH_ID, params),
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

  // Summary for the current filters
  const { data: summary } = useQuery({
    queryKey: ["finance-summary", BRANCH_ID, filterFund, filterDateFrom, filterDateTo],
    queryFn: () => getContributionSummary(BRANCH_ID, {
      date_from: filterDateFrom || undefined,
      date_to:   filterDateTo   || undefined,
    }),
  });

  const { register, handleSubmit, reset, formState: { errors }, setValue } =
    useForm<ContributionFormValues>({
      resolver: zodResolver(contributionSchema),
      defaultValues: { currency: "GHS", payment_method: "cash", given_at: new Date().toISOString().slice(0, 10) },
    });

  const mutation = useMutation({
    mutationFn: (d: ContributionFormValues) =>
      createContribution({ ...d, branch: BRANCH_ID }, BRANCH_ID),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contributions", BRANCH_ID] });
      queryClient.invalidateQueries({ queryKey: ["finance-summary", BRANCH_ID] });
      setShowForm(false);
      setFormMember(null);
      reset();
    },
  });

  const activeFilterCount = [filterFund, filterDateFrom, filterDateTo].filter(Boolean).length;

  function clearFilters() { setFilterFund(""); setFilterDateFrom(""); setFilterDateTo(""); setPage(1); }

  return (
    <div className="p-6 space-y-4">
      <PageHeader title="Contributions" description="Append-only ledger — use Reverse to correct entries.">
        {contributions?.results.length ? (
          <Button variant="outline" size="sm" onClick={() => exportCSV(contributions.results)}>
            <Download size={14} /> Export
          </Button>
        ) : null}
        <Button size="sm" onClick={() => { setShowForm((v) => !v); }}>
          {showForm ? <X size={14} /> : <Plus size={14} />}
          {showForm ? "Cancel" : "Record Contribution"}
        </Button>
      </PageHeader>

      {/* Summary stat */}
      {summary && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">
            Total — {filterDateFrom || filterDateTo ? `${filterDateFrom || "…"} to ${filterDateTo || "now"}` : "all time"}
          </p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{fmt(String(summary.grand_total))}</p>
          {summary.by_fund.length > 1 && (
            <div className="flex flex-wrap gap-3 mt-2">
              {summary.by_fund.map((f) => (
                <span key={f.fund__id} className="text-xs text-gray-500">
                  {f.fund__name}: <span className="font-medium text-gray-700">{fmt(String(f.total))}</span>
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Record form */}
      {showForm && (
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))}
          className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 text-sm">New Contribution</h2>
            <button type="button" onClick={() => { setShowForm(false); setFormMember(null); reset(); }}
              className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1">
              <label className="text-xs font-medium text-gray-600">Member</label>
              <MemberSearch
                value={formMember}
                onChange={(m) => { setFormMember(m); setValue("member", m?.id ?? null); }}
              />
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
              <label className="text-xs font-medium text-gray-600">Amount (GHS) *</label>
              <input type="number" step="0.01" min="0.01" {...register("amount")} placeholder="0.00" className={FIELD} />
              {errors.amount && <p className="text-xs text-red-500">{errors.amount.message}</p>}
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Date *</label>
              <input type="date" {...register("given_at")} className={FIELD} />
              {errors.given_at && <p className="text-xs text-red-500">{errors.given_at.message}</p>}
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Payment Method *</label>
              <select {...register("payment_method")} className={FIELD}>
                {PAYMENT_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Reference</label>
              <input type="text" {...register("reference")} placeholder="Cheque no., MoMo ref…" className={FIELD} />
            </div>
            <div className="col-span-2 space-y-1">
              <label className="text-xs font-medium text-gray-600">Notes</label>
              <textarea {...register("notes")} rows={2} className={FIELD} />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button type="submit" size="sm" disabled={mutation.isPending}>
              {mutation.isPending ? "Saving…" : "Save Contribution"}
            </Button>
            {mutation.isError && <p className="text-xs text-red-500">Failed to save.</p>}
          </div>
        </form>
      )}

      {/* Filter bar */}
      <div className="flex gap-2 flex-wrap items-center">
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
        <label className="flex items-center gap-2 text-sm text-gray-600 ml-auto cursor-pointer">
          <input
            type="checkbox"
            checked={showReversals}
            onChange={(e) => { setShowReversals(e.target.checked); setPage(1); }}
            className="rounded border-gray-300"
          />
          Show reversals
        </label>
      </div>

      {showFilters && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Fund</label>
              <select value={filterFund}
                onChange={(e) => { setFilterFund(e.target.value); setPage(1); }}
                className={FIELD}>
                <option value="">All funds</option>
                {funds?.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">From</label>
              <input type="date" value={filterDateFrom}
                onChange={(e) => { setFilterDateFrom(e.target.value); setPage(1); }}
                className={FIELD} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">To</label>
              <input type="date" value={filterDateTo}
                onChange={(e) => { setFilterDateTo(e.target.value); setPage(1); }}
                className={FIELD} />
            </div>
          </div>
          <div className="mt-3 flex justify-end">
            <button onClick={clearFilters} className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
              Clear filters
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="divide-y divide-gray-50">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-3 animate-pulse">
                <div className="h-3 bg-gray-100 rounded w-24" />
                <div className="flex-1 h-3 bg-gray-100 rounded w-32" />
                <div className="h-3 bg-gray-100 rounded w-20" />
                <div className="h-3 bg-gray-100 rounded w-16" />
              </div>
            ))}
          </div>
        ) : (
          <>
            <table className="min-w-full divide-y divide-gray-100">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Receipt</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Member</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">Fund</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Method</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Date</th>
                  <th className="px-4 py-3 w-16" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {contributions?.results.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-gray-400 text-sm">No contributions found.</td>
                  </tr>
                )}
                {contributions?.results.map((c: Contribution) => (
                  <tr key={c.id} className={cn("hover:bg-gray-50 transition-colors group", c.is_reversal && "opacity-60")}>
                    <td className="px-4 py-3 font-mono text-xs text-gray-400">{c.receipt_number}</td>
                    <td className="px-4 py-3 text-sm text-gray-800">{c.member_name || <span className="italic text-gray-400">Anonymous</span>}</td>
                    <td className="px-4 py-3 text-sm text-gray-500 hidden sm:table-cell">{c.fund_name}</td>
                    <td className={cn("px-4 py-3 text-sm font-semibold text-right", c.is_reversal ? "text-red-600" : "text-gray-900")}>
                      {c.is_reversal ? "−" : ""}{fmt(c.amount)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 hidden md:table-cell">{PM_LABEL[c.payment_method] ?? c.payment_method}</td>
                    <td className="px-4 py-3 text-sm text-gray-400 hidden lg:table-cell">{fmtDate(c.given_at)}</td>
                    <td className="px-4 py-3 text-right">
                      {c.is_reversal ? (
                        <Badge variant="danger">Reversal</Badge>
                      ) : (
                        <button
                          onClick={() => setReversing(c)}
                          title="Reverse this contribution"
                          className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-all"
                        >
                          <RotateCcw size={14} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {contributions && contributions.count > 0 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 text-sm text-gray-500">
                <span>{contributions.count} record{contributions.count !== 1 ? "s" : ""}</span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={!contributions.previous}>
                    Previous
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={!contributions.next}>
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {reversing && (
        <ReverseModal
          contribution={reversing}
          branchId={BRANCH_ID}
          onClose={() => setReversing(null)}
        />
      )}
    </div>
  );
}
