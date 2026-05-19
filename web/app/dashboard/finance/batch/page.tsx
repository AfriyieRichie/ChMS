"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle, Plus, Trash2, Send, X, ArrowLeft } from "lucide-react";
import Link from "next/link";
import {
  getFunds, getGivingCategories, createContribution,
  createContributionBatch, getContributionBatches, postContributionBatch, deleteContributionBatch,
  type ContributionBatch,
} from "@/lib/api/finance";
import { getMembers, type Member } from "@/lib/api/members";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/dashboard/page-header";
import { cn } from "@/lib/utils";

const BRANCH_ID = 1;
const FIELD = "w-full border border-gray-200 rounded-md px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 bg-white";

interface BatchRow {
  id: string;
  member: Member | null;
  memberSearch: string;
  fund: string;
  amount: string;
  payment_method: string;
  reference: string;
  saved: boolean;
}

function newRow(): BatchRow {
  return {
    id: Math.random().toString(36).slice(2),
    member: null,
    memberSearch: "",
    fund: "",
    amount: "",
    payment_method: "cash",
    reference: "",
    saved: false,
  };
}

// ── Inline member autocomplete ────────────────────────────────────────────────

function MemberCell({
  row, onChange, onCommit, tabIndex,
}: {
  row: BatchRow;
  onChange: (partial: Partial<BatchRow>) => void;
  onCommit: () => void;
  tabIndex: number;
}) {
  const [open, setOpen] = useState(false);
  const { data } = useQuery({
    queryKey: ["members", BRANCH_ID, { search: row.memberSearch }],
    queryFn: () => getMembers(BRANCH_ID, { search: row.memberSearch }),
    enabled: row.memberSearch.length >= 2 && !row.member,
  });

  if (row.member) {
    return (
      <div className="flex items-center gap-1 border border-gray-200 rounded-md px-2.5 py-1.5 bg-white text-sm">
        <span className="flex-1 truncate">{row.member.full_name}</span>
        <button type="button" onClick={() => onChange({ member: null, memberSearch: "" })} className="text-gray-300 hover:text-gray-500">
          <X size={12} />
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <input
        tabIndex={tabIndex}
        type="text"
        placeholder="Member (optional)…"
        value={row.memberSearch}
        onChange={(e) => { onChange({ memberSearch: e.target.value }); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); onCommit(); } }}
        className={FIELD}
      />
      {open && row.memberSearch.length >= 2 && (data?.results.length ?? 0) > 0 && (
        <div className="absolute top-full left-0 z-30 mt-1 bg-white rounded-xl border border-gray-200 shadow-xl w-64 max-h-40 overflow-auto">
          {data!.results.slice(0, 6).map((m) => (
            <button
              key={m.id}
              type="button"
              onMouseDown={() => { onChange({ member: m, memberSearch: "" }); setOpen(false); }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
            >
              {m.full_name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Batch row ─────────────────────────────────────────────────────────────────

function BatchRowForm({
  row, funds, categories, rowIndex, onChange, onSave, onRemove, isLast,
}: {
  row: BatchRow;
  funds: { id: number; name: string }[];
  categories: { id: number; name: string }[];
  rowIndex: number;
  onChange: (partial: Partial<BatchRow>) => void;
  onSave: () => void;
  onRemove: () => void;
  isLast: boolean;
}) {
  const base = rowIndex * 6;
  const amountRef = useRef<HTMLInputElement>(null);

  const handleAmountKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || (e.key === "Tab" && !e.shiftKey && isLast)) {
      e.preventDefault();
      onSave();
    }
  };

  return (
    <div className={cn(
      "grid grid-cols-[180px_140px_90px_110px_110px_36px] gap-2 items-center px-3 py-2 border-b border-gray-50",
      row.saved && "bg-green-50/50",
    )}>
      <MemberCell row={row} onChange={onChange} onCommit={onSave} tabIndex={base + 1} />

      <select
        tabIndex={base + 2}
        value={row.fund}
        onChange={(e) => onChange({ fund: e.target.value })}
        className={FIELD}
      >
        <option value="">Fund *</option>
        {funds.map((f) => <option key={f.id} value={String(f.id)}>{f.name}</option>)}
      </select>

      <input
        ref={amountRef}
        tabIndex={base + 3}
        type="number"
        step="0.01"
        min="0.01"
        placeholder="Amount *"
        value={row.amount}
        onChange={(e) => onChange({ amount: e.target.value })}
        onKeyDown={handleAmountKeyDown}
        className={FIELD}
      />

      <select
        tabIndex={base + 4}
        value={row.payment_method}
        onChange={(e) => onChange({ payment_method: e.target.value })}
        className={FIELD}
      >
        <option value="cash">Cash</option>
        <option value="cheque">Cheque</option>
        <option value="bank_transfer">Bank Transfer</option>
        <option value="mobile_money">Mobile Money</option>
        <option value="card">Card</option>
      </select>

      <input
        tabIndex={base + 5}
        type="text"
        placeholder="Reference"
        value={row.reference}
        onChange={(e) => onChange({ reference: e.target.value })}
        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); onSave(); } }}
        className={FIELD}
      />

      <button
        type="button"
        onClick={onRemove}
        className="flex items-center justify-center w-8 h-8 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function BatchEntryPage() {
  const queryClient = useQueryClient();

  const [activeBatch, setActiveBatch] = useState<ContributionBatch | null>(null);
  const [rows, setRows] = useState<BatchRow[]>([newRow()]);
  const [saving, setSaving] = useState(false);
  const [runningTotal, setRunningTotal] = useState(0);
  const [batchName, setBatchName] = useState(`Sunday ${new Date().toLocaleDateString("en-GH", { day: "numeric", month: "short", year: "numeric" })}`);
  const [batchDate, setBatchDate] = useState(new Date().toISOString().slice(0, 10));

  const { data: batches } = useQuery({
    queryKey: ["batches", BRANCH_ID],
    queryFn: () => getContributionBatches(BRANCH_ID),
  });

  const { data: funds } = useQuery({
    queryKey: ["funds", BRANCH_ID],
    queryFn: () => getFunds(BRANCH_ID),
  });

  const { data: categories } = useQuery({
    queryKey: ["categories", BRANCH_ID],
    queryFn: () => getGivingCategories(BRANCH_ID),
  });

  const createBatchMut = useMutation({
    mutationFn: () => createContributionBatch({ name: batchName, service_date: batchDate }, BRANCH_ID),
    onSuccess: (batch) => {
      setActiveBatch(batch);
      queryClient.invalidateQueries({ queryKey: ["batches", BRANCH_ID] });
    },
  });

  const postBatchMut = useMutation({
    mutationFn: (id: number) => postContributionBatch(id, BRANCH_ID),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["batches", BRANCH_ID] });
      queryClient.invalidateQueries({ queryKey: ["contributions", BRANCH_ID] });
      queryClient.invalidateQueries({ queryKey: ["finance-summary", BRANCH_ID] });
      setActiveBatch(null);
      setRows([newRow()]);
    },
  });

  const deleteBatchMut = useMutation({
    mutationFn: (id: number) => deleteContributionBatch(id, BRANCH_ID),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["batches", BRANCH_ID] }),
  });

  useEffect(() => {
    const total = rows.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);
    setRunningTotal(total);
  }, [rows]);

  const updateRow = useCallback((id: string, partial: Partial<BatchRow>) => {
    setRows((prev) => prev.map((r) => r.id === id ? { ...r, ...partial } : r));
  }, []);

  const removeRow = useCallback((id: string) => {
    setRows((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const saveRow = useCallback(async (id: string) => {
    if (!activeBatch) return;
    const row = rows.find((r) => r.id === id);
    if (!row || !row.fund || !row.amount || parseFloat(row.amount) <= 0) return;

    setSaving(true);
    try {
      await createContribution({
        branch: BRANCH_ID,
        batch: activeBatch.id,
        member: row.member?.id ?? null,
        fund: Number(row.fund),
        amount: row.amount,
        given_at: activeBatch.service_date,
        payment_method: row.payment_method as "cash",
        reference: row.reference,
        currency: "GHS",
      }, BRANCH_ID);
      setRows((prev) => {
        const updated = prev.map((r) => r.id === id ? { ...r, saved: true } : r);
        return [...updated, newRow()];
      });
    } catch {
      // keep row in place so user can fix
    } finally {
      setSaving(false);
    }
  }, [activeBatch, rows]);

  const savedCount = rows.filter((r) => r.saved).length;
  const savedTotal = rows.filter((r) => r.saved).reduce((s, r) => s + parseFloat(r.amount || "0"), 0);

  const openBatches = batches?.results.filter((b) => !b.is_posted) ?? [];
  const postedBatches = batches?.results.filter((b) => b.is_posted) ?? [];

  if (!activeBatch) {
    return (
      <div className="p-6 space-y-6">
        <PageHeader title="Batch Entry" description="Group contributions from a service collection.">
          <Link href="/dashboard/finance">
            <Button variant="outline" size="sm"><ArrowLeft size={14} /> Back</Button>
          </Link>
        </PageHeader>

        {/* Start new batch */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-4">
          <h2 className="font-semibold text-gray-900 text-sm">Start New Batch</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1">
              <label className="text-xs font-medium text-gray-600">Batch Name</label>
              <input
                type="text"
                value={batchName}
                onChange={(e) => setBatchName(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Service Date</label>
              <input
                type="date"
                value={batchDate}
                onChange={(e) => setBatchDate(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
              />
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => createBatchMut.mutate()}
            disabled={!batchName.trim() || !batchDate || createBatchMut.isPending}
          >
            <Plus size={14} /> Create Batch &amp; Start Entry
          </Button>
        </div>

        {/* Open batches */}
        {openBatches.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Open Batches (not yet posted)</h2>
            <div className="space-y-2">
              {openBatches.map((b) => (
                <div key={b.id} className="bg-white border border-amber-200 rounded-xl p-4 shadow-sm flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm">{b.name}</p>
                    <p className="text-xs text-gray-400">{b.service_date} · {b.contribution_count} entries · GHS {Number(b.total_amount).toLocaleString("en-GH", { minimumFractionDigits: 2 })}</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button size="sm" onClick={() => setActiveBatch(b)}>
                      <Plus size={14} /> Continue
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => postBatchMut.mutate(b.id)}
                      disabled={postBatchMut.isPending || b.contribution_count === 0}
                    >
                      <Send size={14} /> Post
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => deleteBatchMut.mutate(b.id)}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Posted batches */}
        {postedBatches.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Posted Batches</h2>
            <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
              <table className="min-w-full divide-y divide-gray-100">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Batch</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Date</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase">Entries</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {postedBatches.map((b) => (
                    <tr key={b.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2.5 text-sm text-gray-800 flex items-center gap-2">
                        <CheckCircle size={14} className="text-green-500 shrink-0" /> {b.name}
                      </td>
                      <td className="px-4 py-2.5 text-sm text-gray-500">{b.service_date}</td>
                      <td className="px-4 py-2.5 text-sm text-gray-500 text-right">{b.contribution_count}</td>
                      <td className="px-4 py-2.5 text-sm font-semibold text-gray-900 text-right">
                        GHS {Number(b.total_amount).toLocaleString("en-GH", { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Active batch entry ─────────────────────────────────────────────────────

  return (
    <div className="p-6 space-y-4">
      <PageHeader
        title={`Batch Entry: ${activeBatch.name}`}
        description={`Service date: ${activeBatch.service_date} — Tab/Enter to move between rows`}
      >
        <Button variant="outline" size="sm" onClick={() => setActiveBatch(null)}>
          <ArrowLeft size={14} /> Back to Batches
        </Button>
        <Button
          size="sm"
          onClick={() => postBatchMut.mutate(activeBatch.id)}
          disabled={savedCount === 0 || postBatchMut.isPending}
        >
          <Send size={14} /> Post Batch ({savedCount})
        </Button>
      </PageHeader>

      {/* Running total */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex gap-8">
        <div>
          <p className="text-[10px] text-gray-400 uppercase font-semibold tracking-wide">Saved This Session</p>
          <p className="text-xl font-bold text-gray-900">
            GHS {savedTotal.toLocaleString("en-GH", { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-gray-400 uppercase font-semibold tracking-wide">Batch Total (all time)</p>
          <p className="text-xl font-bold text-emerald-700">
            GHS {Number(activeBatch.total_amount).toLocaleString("en-GH", { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-gray-400 uppercase font-semibold tracking-wide">Entries</p>
          <p className="text-xl font-bold text-gray-900">{activeBatch.contribution_count + savedCount}</p>
        </div>
      </div>

      {/* Entry grid */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-[180px_140px_90px_110px_110px_36px] gap-2 px-3 py-2 bg-gray-50 border-b border-gray-100">
          {["Member", "Fund", "Amount", "Method", "Reference", ""].map((h, i) => (
            <span key={i} className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">{h}</span>
          ))}
        </div>

        {/* Rows */}
        {rows.map((row, i) => (
          <BatchRowForm
            key={row.id}
            row={row}
            funds={funds ?? []}
            categories={categories ?? []}
            rowIndex={i}
            onChange={(p) => updateRow(row.id, p)}
            onSave={() => saveRow(row.id)}
            onRemove={() => removeRow(row.id)}
            isLast={i === rows.length - 1}
          />
        ))}

        {/* Add row button */}
        <div className="px-3 py-2">
          <button
            type="button"
            onClick={() => setRows((prev) => [...prev, newRow()])}
            className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            <Plus size={14} /> Add row
          </button>
        </div>
      </div>

      <p className="text-xs text-gray-400">
        Tip: Tab through each row. Enter on the last field saves the row and starts a new one.
        {saving && <span className="ml-2 text-blue-500">Saving…</span>}
      </p>
    </div>
  );
}
