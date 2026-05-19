"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { getBranches, createBranch, updateBranch, type Branch } from "@/lib/api/branches";

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
          <input type="text" {...register("name")} placeholder="e.g. Accra Central"
            className="w-full border rounded-lg px-3 py-2 text-sm" />
          {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-600">Code</label>
          <input type="text" {...register("code")} placeholder="ACC"
            className="w-full border rounded-lg px-3 py-2 text-sm" />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-600">Currency</label>
          <input type="text" {...register("currency")} placeholder="GHS"
            className="w-full border rounded-lg px-3 py-2 text-sm" />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-600">City</label>
          <input type="text" {...register("city")}
            className="w-full border rounded-lg px-3 py-2 text-sm" />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-600">Region</label>
          <input type="text" {...register("region")}
            className="w-full border rounded-lg px-3 py-2 text-sm" />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-600">Country</label>
          <input type="text" {...register("country")} placeholder="Ghana"
            className="w-full border rounded-lg px-3 py-2 text-sm" />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-600">Phone</label>
          <input type="tel" {...register("phone")}
            className="w-full border rounded-lg px-3 py-2 text-sm" />
        </div>
        <div className="col-span-2 space-y-1">
          <label className="text-xs font-medium text-gray-600">Email</label>
          <input type="email" {...register("email")}
            className="w-full border rounded-lg px-3 py-2 text-sm" />
          {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
        </div>
        <div className="col-span-2 flex items-center gap-2">
          <input type="checkbox" {...register("is_active")} id="is_active"
            className="w-4 h-4 rounded border-gray-300" />
          <label htmlFor="is_active" className="text-sm text-gray-700">Active branch</label>
        </div>
      </div>
      <div className="flex gap-3">
        <button type="submit" disabled={isPending}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
          {isPending ? "Saving…" : submitLabel}
        </button>
        <button type="button" onClick={onCancel}
          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50">
          Cancel
        </button>
        {isError && <p className="text-red-500 text-sm self-center">Failed to save.</p>}
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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Branches</h1>
        <button
          onClick={() => { setShowCreate((v) => !v); setEditing(null); }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          {showCreate ? "Cancel" : "Add Branch"}
        </button>
      </div>

      {showCreate && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <h2 className="font-semibold text-gray-800 mb-4">New Branch</h2>
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
          <div className="col-span-full p-8 text-center text-gray-500">Loading branches...</div>
        )}
        {isError && (
          <div className="col-span-full p-8 text-center text-red-500">Failed to load branches.</div>
        )}
        {data?.results.map((branch: Branch) => (
          <div key={branch.id} className="space-y-3">
            <div
              className={`bg-white border rounded-xl p-4 shadow-sm space-y-2 cursor-pointer transition-all ${
                editing?.id === branch.id
                  ? "border-blue-400 ring-1 ring-blue-400"
                  : "border-gray-200 hover:border-gray-300"
              }`}
              onClick={() => {
                setShowCreate(false);
                setEditing(editing?.id === branch.id ? null : branch);
              }}
            >
              <div className="flex items-start justify-between">
                <h3 className="font-semibold text-gray-900">{branch.name}</h3>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  branch.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                }`}>
                  {branch.is_active ? "Active" : "Inactive"}
                </span>
              </div>
              {branch.code && <p className="text-xs text-gray-500 font-mono">{branch.code}</p>}
              {(branch.city || branch.country) && (
                <p className="text-sm text-gray-600">
                  {[branch.city, branch.region, branch.country].filter(Boolean).join(", ")}
                </p>
              )}
              {branch.phone && <p className="text-sm text-gray-600">{branch.phone}</p>}
              {branch.email && <p className="text-sm text-blue-600">{branch.email}</p>}
              <p className="text-xs text-gray-400">Click to edit</p>
            </div>

            {editing?.id === branch.id && (
              <div className="bg-white border border-blue-200 rounded-xl p-5 shadow-sm">
                <h3 className="font-semibold text-gray-800 mb-4 text-sm">Edit {branch.name}</h3>
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
          <div className="col-span-full p-8 text-center text-gray-400">No branches found.</div>
        )}
      </div>

      {data && data.count > 0 && (
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>{data.count} total</span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={!data.previous}
              className="px-3 py-1 border rounded disabled:opacity-40"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={!data.next}
              className="px-3 py-1 border rounded disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
