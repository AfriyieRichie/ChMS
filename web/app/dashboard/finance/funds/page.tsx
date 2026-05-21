"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, X } from "lucide-react";
import {
  getFunds, createFund, updateFund,
  getGivingCategories, createGivingCategory,
  type Fund,
} from "@/lib/api/finance";
import { fundSchema, type FundFormValues } from "@/lib/schemas/finance";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/dashboard/page-header";
import { cn } from "@/lib/utils";

const BRANCH_ID = 1;
const FIELD = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 bg-white disabled:bg-gray-50";

export default function FundsPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");

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

  const createMut = useMutation({
    mutationFn: (d: FundFormValues) => createFund({ ...d, branch: BRANCH_ID }, BRANCH_ID),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["funds", BRANCH_ID] });
      setShowForm(false);
      reset();
    },
  });

  const toggleMut = useMutation({
    mutationFn: ({ id, is_active }: { id: number; is_active: boolean }) =>
      updateFund(id, { is_active }, BRANCH_ID),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["funds", BRANCH_ID] }),
  });

  const createCatMut = useMutation({
    mutationFn: (name: string) => createGivingCategory({ name }, BRANCH_ID),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories", BRANCH_ID] });
      setNewCategoryName("");
    },
  });

  return (
    <div className="p-6 space-y-6">
      <PageHeader title="Funds & Categories" description="Manage giving funds and giving categories.">
        <Button size="sm" onClick={() => setShowForm((v) => !v)}>
          {showForm ? <X size={14} /> : <Plus size={14} />}
          {showForm ? "Cancel" : "Add Fund"}
        </Button>
      </PageHeader>

      {showForm && (
        <form onSubmit={handleSubmit((d) => createMut.mutate(d))}
          className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 text-sm">New Fund</h2>
            <button type="button" onClick={() => { setShowForm(false); reset(); }}
              className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
          </div>
          <div className="grid grid-cols-2 gap-3">
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
              <input type="checkbox" {...register("is_designated")} id="is_designated" className="w-4 h-4 rounded border-gray-300" />
              <label htmlFor="is_designated" className="text-sm text-gray-700">Designated fund (earmarked for a specific purpose)</label>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button type="submit" size="sm" disabled={createMut.isPending}>
              {createMut.isPending ? "Saving…" : "Create Fund"}
            </Button>
            {createMut.isError && <p className="text-xs text-red-500">Failed to create.</p>}
          </div>
        </form>
      )}

      {/* Funds grid */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Funds</h2>
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-white border border-gray-200 rounded-lg p-4 animate-pulse space-y-2">
                <div className="h-4 bg-gray-100 rounded w-32" />
                <div className="h-3 bg-gray-100 rounded w-24" />
              </div>
            ))}
          </div>
        ) : funds?.length === 0 ? (
          <p className="text-sm text-gray-400">No funds yet. Create one to start recording contributions.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {funds?.map((fund: Fund) => (
              <div key={fund.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-gray-900">{fund.name}</h3>
                    {fund.code && <p className="text-xs text-gray-400 font-mono mt-0.5">{fund.code}</p>}
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    {fund.is_designated && <Badge variant="purple">Designated</Badge>}
                  </div>
                </div>
                {fund.description && <p className="text-xs text-gray-500 line-clamp-2">{fund.description}</p>}
                <div className="flex items-center justify-between pt-1">
                  <button
                    onClick={() => toggleMut.mutate({ id: fund.id, is_active: !fund.is_active })}
                    disabled={toggleMut.isPending}
                    className={cn(
                      "text-xs px-2.5 py-1 rounded-full font-medium transition-colors",
                      fund.is_active
                        ? "bg-green-100 text-green-700 hover:bg-red-50 hover:text-red-600"
                        : "bg-gray-100 text-gray-500 hover:bg-green-50 hover:text-green-700",
                    )}
                  >
                    {fund.is_active ? "Active" : "Inactive"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Giving Categories */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Giving Categories</h2>
        <div className="flex flex-wrap gap-2 mb-3">
          {categories?.map((cat) => (
            <span key={cat.id} className="bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-700 shadow-sm">
              {cat.name}
            </span>
          ))}
          {categories?.length === 0 && (
            <p className="text-sm text-gray-400">No categories yet.</p>
          )}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="New category name…"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && newCategoryName.trim()) { e.preventDefault(); createCatMut.mutate(newCategoryName.trim()); } }}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 bg-white w-64"
          />
          <Button
            size="sm"
            variant="outline"
            disabled={!newCategoryName.trim() || createCatMut.isPending}
            onClick={() => { if (newCategoryName.trim()) createCatMut.mutate(newCategoryName.trim()); }}
          >
            <Plus size={14} /> Add Category
          </Button>
        </div>
      </div>
    </div>
  );
}
