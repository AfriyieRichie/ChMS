"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CheckCircle, Circle, Plus, X, Trash2 } from "lucide-react";
import {
  getBankDeposits, createBankDeposit, toggleDepositReconciled, deleteBankDeposit,
  getContributionBatches, getContributionSummary,
  type BankDeposit, type ContributionBatch,
} from "@/lib/api/finance";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/dashboard/page-header";
import { cn } from "@/lib/utils";

const BRANCH_ID = 1;
const FIELD = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300 focus:border-gray-400 bg-white";

const depositSchema = z.object({
  date: z.string().min(1, "Date required"),
  amount: z.string().min(1).refine((v) => parseFloat(v) > 0, "Must be positive"),
  reference: z.string().min(1, "Reference required"),
  notes: z.string().optional(),
});
type DepositForm = z.infer<typeof depositSchema>;

function fmt(v: string | number) {
  return `GHS ${Number(v).toLocaleString("en-GH", { minimumFractionDigits: 2 })}`;
}

export default function ReconciliationPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [filterMonth, setFilterMonth] = useState(new Date().toISOString().slice(0, 7));

  const dateFrom = filterMonth ? `${filterMonth}-01` : undefined;
  const dateTo = filterMonth
    ? new Date(Number(filterMonth.slice(0, 4)), Number(filterMonth.slice(5, 7)), 0).toISOString().slice(0, 10)
    : undefined;

  const { data: deposits } = useQuery({
    queryKey: ["deposits", BRANCH_ID],
    queryFn: () => getBankDeposits(BRANCH_ID),
  });

  const { data: batches } = useQuery({
    queryKey: ["batches", BRANCH_ID],
    queryFn: () => getContributionBatches(BRANCH_ID),
  });

  const { data: summary } = useQuery({
    queryKey: ["finance-summary", BRANCH_ID, dateFrom, dateTo],
    queryFn: () => getContributionSummary(BRANCH_ID, { date_from: dateFrom, date_to: dateTo }),
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<DepositForm>({
    resolver: zodResolver(depositSchema),
    defaultValues: { date: new Date().toISOString().slice(0, 10) },
  });

  const createMut = useMutation({
    mutationFn: (d: DepositForm) => createBankDeposit(d, BRANCH_ID),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["deposits", BRANCH_ID] }); setShowForm(false); reset(); },
  });

  const toggleMut = useMutation({
    mutationFn: (id: number) => toggleDepositReconciled(id, BRANCH_ID),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["deposits", BRANCH_ID] }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => deleteBankDeposit(id, BRANCH_ID),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["deposits", BRANCH_ID] }),
  });

  const allDeposits = deposits?.results ?? [];
  const monthDeposits = filterMonth
    ? allDeposits.filter((d) => d.date.startsWith(filterMonth))
    : allDeposits;

  const depositTotal = monthDeposits.reduce((s, d) => s + Number(d.amount), 0);
  const reconciledTotal = monthDeposits.filter((d) => d.is_reconciled).reduce((s, d) => s + Number(d.amount), 0);
  const contributionTotal = Number(summary?.grand_total ?? 0);
  const variance = depositTotal - contributionTotal;

  const postedBatches = (batches?.results ?? []).filter((b) => b.is_posted && (!filterMonth || b.service_date.startsWith(filterMonth)));

  return (
    <div className="p-6 space-y-6">
      <PageHeader title="Reconciliation" description="Match bank deposits to recorded contributions.">
        <input
          type="month"
          value={filterMonth}
          onChange={(e) => setFilterMonth(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
        />
        <Button size="sm" onClick={() => setShowForm((v) => !v)}>
          {showForm ? <X size={14} /> : <Plus size={14} />}
          {showForm ? "Cancel" : "Add Deposit"}
        </Button>
      </PageHeader>

      {/* Variance summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Bank Deposits", value: fmt(depositTotal), color: "text-gray-900" },
          { label: "Contributions", value: fmt(contributionTotal), color: "text-gray-900" },
          { label: "Variance", value: fmt(Math.abs(variance)), color: variance === 0 ? "text-gray-600" : "text-red-600" },
          { label: "Reconciled", value: fmt(reconciledTotal), color: "text-blue-700" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
            <p className="text-[10px] text-gray-400 uppercase font-semibold tracking-wide">{label}</p>
            <p className={cn("text-xl font-bold mt-1", color)}>{value}</p>
          </div>
        ))}
      </div>

      {variance !== 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded p-3 text-sm text-gray-500">
          Variance of {fmt(Math.abs(variance))} detected. Bank deposits {variance > 0 ? "exceed" : "are below"} recorded contributions.
        </div>
      )}

      {/* Add deposit form */}
      {showForm && (
        <form onSubmit={handleSubmit((d) => createMut.mutate(d))}
          className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm space-y-4">
          <h2 className="font-semibold text-gray-900 text-sm">Record Bank Deposit</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Date *</label>
              <input type="date" {...register("date")} className={FIELD} />
              {errors.date && <p className="text-xs text-red-500">{errors.date.message}</p>}
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Amount (GHS) *</label>
              <input type="number" step="0.01" min="0.01" {...register("amount")} placeholder="0.00" className={FIELD} />
              {errors.amount && <p className="text-xs text-red-500">{errors.amount.message}</p>}
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Bank Reference *</label>
              <input type="text" {...register("reference")} placeholder="e.g. TXN-20240518-001" className={FIELD} />
              {errors.reference && <p className="text-xs text-red-500">{errors.reference.message}</p>}
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Notes</label>
              <input type="text" {...register("notes")} className={FIELD} />
            </div>
          </div>
          <div className="flex gap-3">
            <Button type="submit" size="sm" disabled={createMut.isPending}>
              {createMut.isPending ? "Saving…" : "Save Deposit"}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => { setShowForm(false); reset(); }}>
              Cancel
            </Button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bank deposits */}
        <div>
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Bank Deposits</h2>
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
            {monthDeposits.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-gray-400">No deposits recorded.</p>
            ) : (
              <div className="divide-y divide-gray-50">
                {monthDeposits.map((d: BankDeposit) => (
                  <div key={d.id} className={cn("flex items-center gap-3 px-4 py-3 group", d.is_reconciled && "bg-green-50/40")}>
                    <button
                      onClick={() => toggleMut.mutate(d.id)}
                      className="shrink-0 text-gray-300 hover:text-green-500 transition-colors"
                    >
                      {d.is_reconciled
                        ? <CheckCircle size={18} className="text-green-500" />
                        : <Circle size={18} />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-800 truncate font-mono text-xs">{d.reference}</p>
                      <p className="text-xs text-gray-400">{d.date}</p>
                    </div>
                    <span className={cn("text-sm font-semibold", d.is_reconciled ? "text-green-700" : "text-gray-900")}>
                      {fmt(d.amount)}
                    </span>
                    <button
                      onClick={() => deleteMut.mutate(d.id)}
                      className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-all"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Posted batches */}
        <div>
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Posted Batches (this period)</h2>
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
            {postedBatches.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-gray-400">No posted batches this period.</p>
            ) : (
              <div className="divide-y divide-gray-50">
                {postedBatches.map((b: ContributionBatch) => (
                  <div key={b.id} className="flex items-center gap-3 px-4 py-3">
                    <CheckCircle size={16} className="text-blue-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-800 font-medium truncate">{b.name}</p>
                      <p className="text-xs text-gray-400">{b.service_date} · {b.contribution_count} entries</p>
                    </div>
                    <span className="text-sm font-semibold text-gray-900">{fmt(b.total_amount)}</span>
                  </div>
                ))}
                <div className="px-4 py-2.5 bg-gray-50 flex justify-between text-xs font-semibold text-gray-600">
                  <span>Batch Total</span>
                  <span>{fmt(postedBatches.reduce((s, b) => s + Number(b.total_amount), 0))}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
