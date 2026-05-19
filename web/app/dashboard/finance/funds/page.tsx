"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, X } from "lucide-react";
import { getFunds, createFund, getGivingCategories } from "@/lib/api/finance";
import { fundSchema, type FundFormValues } from "@/lib/schemas/finance";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/dashboard/page-header";

const BRANCH_ID = 1;
const FIELD = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 bg-white";

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
      <PageHeader title="Funds & Categories" description="Manage giving funds and categories.">
        <Button size="sm" onClick={() => setShowForm((v) => !v)}>
          {showForm ? <X size={14} /> : <Plus size={14} />}
          {showForm ? "Cancel" : "Add Fund"}
        </Button>
      </PageHeader>

      {showForm && (
        <form
          onSubmit={handleSubmit((d) => mutation.mutate(d))}
          className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-4"
        >
          <h2 className="font-semibold text-gray-900 text-sm">New Fund</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Fund Name *</label>
              <input type="text" {...register("name")} placeholder="e.g. General Fund" className={FIELD} />
              {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Short Code</label>
              <input type="text" {...register("code")} placeholder="e.g. GEN" className={FIELD} />
            </div>
            <div className="col-span-2 space-y-1">
              <label className="text-xs font-medium text-gray-600">Description</label>
              <textarea {...register("description")} rows={2} className={FIELD} />
            </div>
            <div className="col-span-2 flex items-center gap-2">
              <input type="checkbox" {...register("is_designated")} id="is_designated"
                className="w-4 h-4 rounded border-gray-300" />
              <label htmlFor="is_designated" className="text-sm text-gray-700">
                Designated fund (earmarked for a specific purpose)
              </label>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button type="submit" size="sm" disabled={mutation.isPending}>
              {mutation.isPending ? "Saving…" : "Create Fund"}
            </Button>
            {mutation.isError && <p className="text-red-500 text-sm">Failed to create fund.</p>}
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading && (
          <div className="col-span-full p-10 text-center text-gray-400 text-sm">Loading funds…</div>
        )}
        {funds?.length === 0 && (
          <div className="col-span-full p-10 text-center text-gray-400 text-sm">
            No funds yet. Create one to get started.
          </div>
        )}
        {funds?.map((fund) => (
          <div key={fund.id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm space-y-2">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-gray-900">{fund.name}</h3>
              <div className="flex gap-1.5 shrink-0">
                {fund.is_designated && <Badge variant="purple">Designated</Badge>}
                <Badge variant={fund.is_active ? "success" : "default"}>
                  {fund.is_active ? "Active" : "Inactive"}
                </Badge>
              </div>
            </div>
            {fund.code && <p className="text-xs text-gray-400 font-mono">{fund.code}</p>}
            {fund.description && <p className="text-sm text-gray-500">{fund.description}</p>}
          </div>
        ))}
      </div>

      {/* Giving Categories */}
      <div>
        <h2 className="text-sm font-semibold text-gray-900 mb-3">Giving Categories</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {categories?.map((cat) => (
            <div key={cat.id} className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 shadow-sm">
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
