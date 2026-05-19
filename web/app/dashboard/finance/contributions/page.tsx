"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { getContributions, createContribution, getFunds, getGivingCategories } from "@/lib/api/finance";
import { contributionSchema, type ContributionFormValues } from "@/lib/schemas/finance";

const BRANCH_ID = 1;

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
    queryFn: () => getContributions(BRANCH_ID, {
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

  const {
    register, handleSubmit, reset,
    formState: { errors },
  } = useForm<ContributionFormValues>({
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Contributions</h1>
          <p className="text-xs text-gray-500 mt-0.5">Append-only — use Reverse to correct entries</p>
        </div>
        <button onClick={() => setShowForm((v) => !v)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
          {showForm ? "Cancel" : "Record Contribution"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))}
          className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-4">
          <h2 className="font-semibold text-gray-800">New Contribution</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Fund *</label>
              <select {...register("fund", { valueAsNumber: true })} className="w-full border rounded-lg px-3 py-2 text-sm">
                <option value="">Select fund</option>
                {funds?.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
              {errors.fund && <p className="text-xs text-red-500">{errors.fund.message}</p>}
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Category</label>
              <select {...register("category", { setValueAs: (v) => v === "" ? null : Number(v) })} className="w-full border rounded-lg px-3 py-2 text-sm">
                <option value="">None</option>
                {categories?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Amount (GHS) *</label>
              <input type="number" step="0.01" min="0.01" {...register("amount")}
                className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="0.00" />
              {errors.amount && <p className="text-xs text-red-500">{errors.amount.message}</p>}
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Date *</label>
              <input type="date" {...register("given_at")} className="w-full border rounded-lg px-3 py-2 text-sm" />
              {errors.given_at && <p className="text-xs text-red-500">{errors.given_at.message}</p>}
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Payment Method *</label>
              <select {...register("payment_method")} className="w-full border rounded-lg px-3 py-2 text-sm">
                {PAYMENT_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Reference</label>
              <input type="text" {...register("reference")} placeholder="Cheque no., MoMo ref..."
                className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div className="col-span-2 space-y-1">
              <label className="text-xs font-medium text-gray-600">Notes</label>
              <textarea {...register("notes")} rows={2} className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <button type="submit" disabled={mutation.isPending}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
              {mutation.isPending ? "Saving..." : "Save"}
            </button>
            {mutation.isError && <p className="text-red-500 text-sm self-center">Failed to save.</p>}
          </div>
        </form>
      )}

      {/* Filter */}
      <div className="flex gap-3">
        <select value={filterFund} onChange={(e) => { setFilterFund(e.target.value); setPage(1); }}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
          <option value="">All funds</option>
          {funds?.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Loading contributions...</div>
        ) : (
          <>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Receipt</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Member</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fund</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Method</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {contributions?.results.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No contributions yet.</td></tr>
                )}
                {contributions?.results.map((c) => (
                  <tr key={c.id} className={`hover:bg-gray-50 ${c.is_reversal ? "opacity-60" : ""}`}>
                    <td className="px-4 py-3 text-xs text-gray-500 font-mono">{c.receipt_number}</td>
                    <td className="px-4 py-3 text-sm text-gray-800">{c.member_name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{c.fund_name}</td>
                    <td className={`px-4 py-3 text-sm font-medium text-right ${c.is_reversal ? "text-red-600" : "text-gray-900"}`}>
                      GHS {Number(c.amount).toLocaleString("en-GH", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 capitalize">{c.payment_method.replace("_", " ")}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{c.given_at}</td>
                    <td className="px-4 py-3">
                      {c.is_reversal && (
                        <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">Reversal</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {contributions && contributions.count > 0 && (
              <div className="flex items-center justify-between px-4 py-3 border-t text-sm text-gray-600">
                <span>{contributions.count} total</span>
                <div className="flex gap-2">
                  <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={!contributions.previous}
                    className="px-3 py-1 border rounded disabled:opacity-40">Previous</button>
                  <button onClick={() => setPage((p) => p + 1)} disabled={!contributions.next}
                    className="px-3 py-1 border rounded disabled:opacity-40">Next</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
