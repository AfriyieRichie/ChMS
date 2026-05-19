"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { getHouseholds, createHousehold, updateHousehold, type Household } from "@/lib/api/households";
import { getMembers, type Member } from "@/lib/api/members";

const BRANCH_ID = 1;

const householdSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  phone: z.string().max(30).optional(),
  address: z.string().optional(),
});
type HouseholdFormValues = z.infer<typeof householdSchema>;

export default function HouseholdsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState<Household | null>(null);
  const [editing, setEditing] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["households", BRANCH_ID, page, search],
    queryFn: () => getHouseholds(BRANCH_ID, { page, search: search || undefined }),
    placeholderData: (p) => p,
  });

  const { data: householdMembersData } = useQuery({
    queryKey: ["household-members", selected?.id, BRANCH_ID],
    queryFn: () => getMembers(BRANCH_ID, { household: selected!.id }),
    enabled: !!selected,
  });

  const { register: regCreate, handleSubmit: handleCreate, reset: resetCreate, formState: { errors: createErrors } } =
    useForm<HouseholdFormValues>({ resolver: zodResolver(householdSchema) });

  const { register: regEdit, handleSubmit: handleEdit, reset: resetEdit, formState: { errors: editErrors } } =
    useForm<HouseholdFormValues>({ resolver: zodResolver(householdSchema) });

  const createMutation = useMutation({
    mutationFn: (d: HouseholdFormValues) =>
      createHousehold({ ...d, branch: BRANCH_ID }, BRANCH_ID),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["households", BRANCH_ID] });
      setShowForm(false);
      resetCreate();
    },
  });

  const updateMutation = useMutation({
    mutationFn: (d: HouseholdFormValues) =>
      updateHousehold(selected!.id, d, BRANCH_ID),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["households", BRANCH_ID] });
      setSelected(updated);
      setEditing(false);
      resetEdit();
    },
  });

  function openDetail(h: Household) {
    setSelected(h);
    setEditing(false);
    resetEdit({ name: h.name, phone: h.phone || "", address: h.address || "" });
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Households</h1>
          <p className="text-xs text-gray-500 mt-0.5">Family groupings linked to members</p>
        </div>
        <button onClick={() => { setShowForm((v) => !v); setSelected(null); }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
          {showForm ? "Cancel" : "Add Household"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate((d) => createMutation.mutate(d))}
          className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-4">
          <h2 className="font-semibold text-gray-800">New Household</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1">
              <label className="text-xs font-medium text-gray-600">Household Name *</label>
              <input type="text" {...regCreate("name")} placeholder="e.g. Mensah Family"
                className="w-full border rounded-lg px-3 py-2 text-sm" />
              {createErrors.name && <p className="text-xs text-red-500">{createErrors.name.message}</p>}
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Phone</label>
              <input type="tel" {...regCreate("phone")} className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Address</label>
              <input type="text" {...regCreate("address")} className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={createMutation.isPending}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
              {createMutation.isPending ? "Creating…" : "Create"}
            </button>
            {createMutation.isError && <p className="text-red-500 text-sm self-center">Failed to create.</p>}
          </div>
        </form>
      )}

      <div className="flex gap-3">
        <input type="search" placeholder="Search households…" value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* List */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          {isLoading && <div className="p-8 text-center text-gray-400">Loading…</div>}
          {!isLoading && data?.results.length === 0 && (
            <div className="p-8 text-center text-gray-400">No households found.</div>
          )}
          <div className="divide-y divide-gray-100">
            {data?.results.map((hh: Household) => (
              <div key={hh.id}
                className={`px-5 py-4 cursor-pointer hover:bg-gray-50 transition-colors ${selected?.id === hh.id ? "bg-blue-50" : ""}`}
                onClick={() => openDetail(hh)}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{hh.name}</p>
                    {hh.address && <p className="text-xs text-gray-400 mt-0.5">{hh.address}</p>}
                    {hh.phone && <p className="text-xs text-gray-400">{hh.phone}</p>}
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium">
                    {hh.member_count} {hh.member_count === 1 ? "member" : "members"}
                  </span>
                </div>
              </div>
            ))}
          </div>
          {data && data.count > 0 && (
            <div className="flex items-center justify-between px-4 py-3 border-t text-sm text-gray-600">
              <span>{data.count} total</span>
              <div className="flex gap-2">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={!data.previous}
                  className="px-3 py-1 border rounded disabled:opacity-40">Previous</button>
                <button onClick={() => setPage((p) => p + 1)} disabled={!data.next}
                  className="px-3 py-1 border rounded disabled:opacity-40">Next</button>
              </div>
            </div>
          )}
        </div>

        {/* Detail panel */}
        {selected && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <p className="font-semibold text-gray-900 text-sm">{selected.name}</p>
              <div className="flex gap-3">
                <button onClick={() => setEditing((v) => !v)}
                  className="text-xs text-blue-600 hover:text-blue-800">
                  {editing ? "Cancel" : "Edit"}
                </button>
                <button onClick={() => setSelected(null)} className="text-xs text-gray-400 hover:text-gray-600">
                  Close
                </button>
              </div>
            </div>

            {editing ? (
              <form onSubmit={handleEdit((d) => updateMutation.mutate(d))} className="px-5 py-4 space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-600">Name *</label>
                  <input type="text" {...regEdit("name")} className="w-full border rounded-lg px-3 py-2 text-sm" />
                  {editErrors.name && <p className="text-xs text-red-500">{editErrors.name.message}</p>}
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-600">Phone</label>
                  <input type="tel" {...regEdit("phone")} className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-600">Address</label>
                  <input type="text" {...regEdit("address")} className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div className="flex gap-3 pt-1">
                  <button type="submit" disabled={updateMutation.isPending}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                    {updateMutation.isPending ? "Saving…" : "Save"}
                  </button>
                  {updateMutation.isError && <p className="text-red-500 text-sm self-center">Failed to save.</p>}
                </div>
              </form>
            ) : (
              <div className="px-5 py-4 space-y-4">
                <div className="space-y-1">
                  {selected.phone && (
                    <p className="text-sm text-gray-600"><span className="text-xs text-gray-400 mr-2">Phone</span>{selected.phone}</p>
                  )}
                  {selected.address && (
                    <p className="text-sm text-gray-600"><span className="text-xs text-gray-400 mr-2">Address</span>{selected.address}</p>
                  )}
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                    Members ({selected.member_count})
                  </h3>
                  {!householdMembersData && <p className="text-sm text-gray-400">Loading…</p>}
                  {householdMembersData?.results.length === 0 && (
                    <p className="text-sm text-gray-400">No members linked. Assign via Member → Edit profile.</p>
                  )}
                  <div className="space-y-1">
                    {householdMembersData?.results.map((m: Member) => (
                      <div key={m.id} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                        <span className="text-sm text-gray-800">{m.full_name}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          m.membership_status === "member" ? "bg-green-100 text-green-700" :
                          m.membership_status === "regular" ? "bg-blue-100 text-blue-700" :
                          "bg-gray-100 text-gray-500"
                        }`}>{m.membership_status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
