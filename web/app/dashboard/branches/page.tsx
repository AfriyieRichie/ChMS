"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, X } from "lucide-react";
import { getBranches, createBranch, updateBranch, type Branch } from "@/lib/api/branches";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/dashboard/page-header";

const FIELD = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 bg-white";

const branchSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  code: z.string().max(10).optional(),
  city: z.string().max(100).optional(),
  region: z.string().max(100).optional(),
  country: z.string().max(100).optional(),
  phone: z.string().max(30).optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  currency: z.string().max(10).optional(),
  is_active: z.boolean(),
});
type BranchFormValues = z.infer<typeof branchSchema>;

function BranchForm({
  defaultValues,
  onSave,
  onCancel,
  isPending,
  isError,
  submitLabel,
}: {
  defaultValues: BranchFormValues;
  onSave: (d: BranchFormValues) => void;
  onCancel: () => void;
  isPending: boolean;
  isError: boolean;
  submitLabel: string;
}) {
  const { register, handleSubmit, formState: { errors } } = useForm<BranchFormValues>({
    resolver: zodResolver(branchSchema),
    defaultValues,
  });

  return (
    <form onSubmit={handleSubmit(onSave)} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 space-y-1">
          <label className="text-xs font-medium text-gray-600">Branch Name *</label>
          <input type="text" {...register("name")} placeholder="e.g. Accra Central" className={FIELD} />
          {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-600">Code</label>
          <input type="text" {...register("code")} placeholder="ACC" className={FIELD} />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-600">Currency</label>
          <input type="text" {...register("currency")} placeholder="GHS" className={FIELD} />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-600">City</label>
          <input type="text" {...register("city")} className={FIELD} />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-600">Region</label>
          <input type="text" {...register("region")} className={FIELD} />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-600">Country</label>
          <input type="text" {...register("country")} placeholder="Ghana" className={FIELD} />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-600">Phone</label>
          <input type="tel" {...register("phone")} className={FIELD} />
        </div>
        <div className="col-span-2 space-y-1">
          <label className="text-xs font-medium text-gray-600">Email</label>
          <input type="email" {...register("email")} className={FIELD} />
          {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
        </div>
        <div className="col-span-2 flex items-center gap-2">
          <input type="checkbox" {...register("is_active")} id="is_active"
            className="w-4 h-4 rounded border-gray-300" />
          <label htmlFor="is_active" className="text-sm text-gray-700">Active branch</label>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? "Saving…" : submitLabel}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        {isError && <p className="text-red-500 text-sm">Failed to save.</p>}
      </div>
    </form>
  );
}

const EMPTY: BranchFormValues = {
  name: "", code: "", city: "", region: "", country: "", phone: "", email: "", currency: "", is_active: true,
};

function branchToForm(b: Branch): BranchFormValues {
  return {
    name: b.name,
    code: b.code ?? "",
    city: b.city ?? "",
    region: b.region ?? "",
    country: b.country ?? "",
    phone: b.phone ?? "",
    email: b.email ?? "",
    currency: b.currency ?? "",
    is_active: b.is_active,
  };
}

export default function BranchesPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<Branch | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["branches", page],
    queryFn: () => getBranches({ page }),
    placeholderData: (prev) => prev,
  });

  const createMutation = useMutation({
    mutationFn: (d: BranchFormValues) => createBranch(d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branches"] });
      setShowCreate(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (d: BranchFormValues) => updateBranch(editing!.id, d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branches"] });
      setEditing(null);
    },
  });

  return (
    <div className="p-6 space-y-6">
      <PageHeader title="Branches" description="Church branches in your network.">
        <Button size="sm" onClick={() => { setShowCreate((v) => !v); setEditing(null); }}>
          {showCreate ? <X size={14} /> : <Plus size={14} />}
          {showCreate ? "Cancel" : "Add Branch"}
        </Button>
      </PageHeader>

      {showCreate && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <h2 className="font-semibold text-gray-900 text-sm mb-4">New Branch</h2>
          <BranchForm
            defaultValues={EMPTY}
            onSave={(d) => createMutation.mutate(d)}
            onCancel={() => setShowCreate(false)}
            isPending={createMutation.isPending}
            isError={createMutation.isError}
            submitLabel="Create Branch"
          />
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading && (
          <div className="col-span-full p-10 text-center text-gray-400 text-sm">Loading branches…</div>
        )}
        {isError && (
          <div className="col-span-full p-10 text-center text-red-500 text-sm">Failed to load branches.</div>
        )}
        {data?.results.map((branch: Branch) => (
          <div key={branch.id} className="space-y-3">
            <div
              className={`bg-white border rounded-xl p-4 shadow-sm space-y-2 cursor-pointer transition-all ${
                editing?.id === branch.id
                  ? "border-blue-400 ring-1 ring-blue-400"
                  : "border-gray-200 hover:border-gray-300 hover:shadow-md"
              }`}
              onClick={() => {
                setShowCreate(false);
                setEditing(editing?.id === branch.id ? null : branch);
              }}
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-gray-900">{branch.name}</h3>
                <Badge variant={branch.is_active ? "success" : "default"}>
                  {branch.is_active ? "Active" : "Inactive"}
                </Badge>
              </div>
              {branch.code && <p className="text-xs text-gray-400 font-mono">{branch.code}</p>}
              {(branch.city || branch.country) && (
                <p className="text-sm text-gray-600">
                  {[branch.city, branch.region, branch.country].filter(Boolean).join(", ")}
                </p>
              )}
              {branch.phone && <p className="text-sm text-gray-500">{branch.phone}</p>}
              {branch.email && <p className="text-sm text-blue-600">{branch.email}</p>}
              <p className="text-xs text-gray-400">Click to edit</p>
            </div>

            {editing?.id === branch.id && (
              <div className="bg-white border border-blue-200 rounded-xl p-5 shadow-sm">
                <h3 className="font-semibold text-gray-900 mb-4 text-sm">Edit {branch.name}</h3>
                <BranchForm
                  defaultValues={branchToForm(branch)}
                  onSave={(d) => updateMutation.mutate(d)}
                  onCancel={() => setEditing(null)}
                  isPending={updateMutation.isPending}
                  isError={updateMutation.isError}
                  submitLabel="Save Changes"
                />
              </div>
            )}
          </div>
        ))}
        {data?.results.length === 0 && (
          <div className="col-span-full p-10 text-center text-gray-400 text-sm">No branches found.</div>
        )}
      </div>

      {data && data.count > 0 && (
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>{data.count} total</span>
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
    </div>
  );
}
