"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { getFunds, createFund, getGivingCategories } from "@/lib/api/finance";
import { fundSchema, type FundFormValues } from "@/lib/schemas/finance";

const BRANCH_ID = 1;

export default function FundsPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);

  const { data: funds, isLoading } = useQuery({
    queryKey: ["funds", BRANCH_ID, "all"],
    queryFn: () => getFunds(BRANCH_ID, false),
  });

  const { data: categories } = useQuery({
    queryKey: ["categories", BRANCH_ID],
    queryFn: () => getGivingCategories(BRANCH_ID),
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FundFormValues>({
    resolver: zodResolver(fundSchema),
    defaultValues: { is_designated: false },
  });

  const mutation = useMutation({
    mutationFn: (data: FundFormValues) => createFund({ ...data, branch: BRANCH_ID }, BRANCH_ID),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["funds", BRANCH_ID] });
      setShowForm(false);
      reset();
    },
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Funds & Categories</h1>
        <button onClick={() => setShowForm((v) => !v)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
          {showForm ? "Cancel" : "Add Fund"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))}
          className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-4">
          <h2 className="font-semibold text-gray-800">New Fund</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Fund Name *</label>
              <input type="text" {...register("name")} placeholder="e.g. General Fund"
                className="w-full border rounded-lg px-3 py-2 text-sm" />
              {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Short Code</label>
              <input type="text" {...register("code")} placeholder="e.g. GEN"
                className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div className="col-span-2 space-y-1">
              <label className="text-xs font-medium text-gray-600">Description</label>
              <textarea {...register("description")} rows={2} className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div className="col-span-2 flex items-center gap-2">
              <input type="checkbox" {...register("is_designated")} id="is_designated"
                className="w-4 h-4 rounded border-gray-300" />
              <label htmlFor="is_designated" className="text-sm text-gray-700">
                Designated fund (earmarked for a specific purpose)
              </label>
            </div>
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={mutation.isPending}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
              {mutation.isPending ? "Saving..." : "Create Fund"}
            </button>
            {mutation.isError && <p className="text-red-500 text-sm self-center">Failed to create fund.</p>}
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading && <div className="col-span-full p-8 text-center text-gray-500">Loading funds...</div>}
        {funds?.length === 0 && <div className="col-span-full p-8 text-center text-gray-400">No funds yet. Create one to get started.</div>}
        {funds?.map((fund) => (
          <div key={fund.id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm space-y-2">
            <div className="flex items-start justify-between">
              <h3 className="font-semibold text-gray-900">{fund.name}</h3>
              <div className="flex gap-1.5">
                {fund.is_designated && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-medium">Designated</span>
                )}
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${fund.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                  {fund.is_active ? "Active" : "Inactive"}
                </span>
              </div>
            </div>
            {fund.code && <p className="text-xs text-gray-400 font-mono">{fund.code}</p>}
            {fund.description && <p className="text-sm text-gray-600">{fund.description}</p>}
          </div>
        ))}
      </div>

      {/* Giving Categories */}
      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-3">Giving Categories</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {categories?.map((cat) => (
            <div key={cat.id} className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700">
              {cat.name}
            </div>
          ))}
          {categories?.length === 0 && (
            <p className="col-span-full text-sm text-gray-400">No categories yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
