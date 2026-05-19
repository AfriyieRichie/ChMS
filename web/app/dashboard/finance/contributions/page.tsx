"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, X } from "lucide-react";
import { getContributions, createContribution, getFunds, getGivingCategories } from "@/lib/api/finance";
import { contributionSchema, type ContributionFormValues } from "@/lib/schemas/finance";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/dashboard/page-header";

const BRANCH_ID = 1;
const FIELD = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 bg-white";

const PAYMENT_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "cheque", label: "Cheque" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "mobile_money", label: "Mobile Money" },
  { value: "card", label: "Card" },
];

export default function ContributionsPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [page, setPage] = useState(1);
  const [filterFund, setFilterFund] = useState("");

  const { data: contributions, isLoading } = useQuery({
    queryKey: ["contributions", BRANCH_ID, page, filterFund],
    queryFn: () =>
      getContributions(BRANCH_ID, {
        page,
        fund: filterFund ? Number(filterFund) : undefined,
        exclude_reversals: false,
      }),
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

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ContributionFormValues>({
    resolver: zodResolver(contributionSchema),
    defaultValues: {
      currency: "GHS",
      payment_method: "cash",
      given_at: new Date().toISOString().slice(0, 10),
    },
  });

  const mutation = useMutation({
    mutationFn: (data: ContributionFormValues) =>
      createContribution({ ...data, branch: BRANCH_ID }, BRANCH_ID),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contributions", BRANCH_ID] });
      queryClient.invalidateQueries({ queryKey: ["finance-summary", BRANCH_ID] });
      setShowForm(false);
      reset();
    },
  });

  return (
    <div className="p-6 space-y-6">
      <PageHeader title="Contributions" description="Append-only — use Reverse to correct entries.">
        <Button size="sm" onClick={() => setShowForm((v) => !v)}>
          {showForm ? <X size={14} /> : <Plus size={14} />}
          {showForm ? "Cancel" : "Record Contribution"}
        </Button>
      </PageHeader>

      {showForm && (
        <form
          onSubmit={handleSubmit((d) => mutation.mutate(d))}
          className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-4"
        >
          <h2 className="font-semibold text-gray-900 text-sm">New Contribution</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Fund *</label>
              <select {...register("fund", { valueAsNumber: true })} className={FIELD}>
                <option value="">Select fund</option>
                {funds?.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
              {errors.fund && <p className="text-xs text-red-500">{errors.fund.message}</p>}
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Category</label>
              <select
                {...register("category", { setValueAs: (v) => v === "" ? null : Number(v) })}
                className={FIELD}
              >
                <option value="">None</option>
                {categories?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Amount (GHS) *</label>
              <input type="number" step="0.01" min="0.01" {...register("amount")}
                placeholder="0.00" className={FIELD} />
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
              {mutation.isPending ? "Saving…" : "Save"}
            </Button>
            {mutation.isError && <p className="text-red-500 text-sm">Failed to save.</p>}
          </div>
        </form>
      )}

      {/* Fund filter */}
      <div className="flex gap-3">
        <select
          value={filterFund}
          onChange={(e) => { setFilterFund(e.target.value); setPage(1); }}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 bg-white"
        >
          <option value="">All funds</option>
          {funds?.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-10 text-center text-gray-400 text-sm">Loading contributions…</div>
        ) : (
          <>
            <table className="min-w-full divide-y divide-gray-100">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Receipt</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Member</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Fund</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Method</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {contributions?.results.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-gray-400 text-sm">
                      No contributions yet.
                    </td>
                  </tr>
                )}
                {contributions?.results.map((c) => (
                  <tr key={c.id} className={`hover:bg-gray-50 transition-colors ${c.is_reversal ? "opacity-60" : ""}`}>
                    <td className="px-4 py-3 text-xs text-gray-400 font-mono">{c.receipt_number}</td>
                    <td className="px-4 py-3 text-sm text-gray-800">{c.member_name}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{c.fund_name}</td>
                    <td className={`px-4 py-3 text-sm font-semibold text-right ${c.is_reversal ? "text-red-600" : "text-gray-900"}`}>
                      GHS {Number(c.amount).toLocaleString("en-GH", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 capitalize">{c.payment_method.replace("_", " ")}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{c.given_at}</td>
                    <td className="px-4 py-3 text-right">
                      {c.is_reversal && <Badge variant="danger">Reversal</Badge>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {contributions && contributions.count > 0 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 text-sm text-gray-600">
                <span>{contributions.count} total</span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={!contributions.previous}>
                    Previous
                  </Button>
                  <Button variant="outline" size="sm"
                    onClick={() => setPage((p) => p + 1)}
                    disabled={!contributions.next}>
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
