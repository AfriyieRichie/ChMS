"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { getMembers, createMember, type Member } from "@/lib/api/members";

const addMemberSchema = z.object({
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  gender: z.enum(["male", "female", "other"]),
  phone: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  membership_status: z.enum(["visitor", "regular", "member"]),
});
type AddMemberValues = z.infer<typeof addMemberSchema>;

const BRANCH_ID = 1; // TODO: read from auth context / cookie

const STATUS_LABELS: Record<string, string> = {
  visitor: "Visitor",
  regular: "Regular",
  member: "Member",
  inactive: "Inactive",
};

const STATUS_COLORS: Record<string, string> = {
  visitor: "bg-yellow-100 text-yellow-800",
  regular: "bg-blue-100 text-blue-800",
  member: "bg-green-100 text-green-800",
  inactive: "bg-gray-100 text-gray-600",
};

export default function MembersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["members", BRANCH_ID, search, statusFilter, page],
    queryFn: () =>
      getMembers(BRANCH_ID, {
        search: search || undefined,
        status: statusFilter || undefined,
        page,
      }),
    placeholderData: (prev) => prev,
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<AddMemberValues>({
    resolver: zodResolver(addMemberSchema),
    defaultValues: { gender: "male", membership_status: "visitor" },
  });

  const addMutation = useMutation({
    mutationFn: (d: AddMemberValues) =>
      createMember({ ...d, full_name: `${d.first_name} ${d.last_name}`, email: d.email || undefined }, BRANCH_ID),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members", BRANCH_ID] });
      setShowForm(false);
      reset();
    },
  });

  function exportCSV() {
    if (!data?.results.length) return;
    const rows = [
      ["Name", "Email", "Phone", "Status", "Branch"],
      ...data.results.map((m: Member) => [
        m.full_name,
        m.email || "",
        m.phone || "",
        m.membership_status,
        m.primary_branch?.name || "",
      ]),
    ];
    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "members.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Members</h1>
        <div className="flex gap-2">
          {data?.results.length ? (
            <button
              onClick={exportCSV}
              className="px-3 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50"
            >
              Export CSV
            </button>
          ) : null}
          <button
            onClick={() => setShowForm((v) => !v)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            {showForm ? "Cancel" : "Add Member"}
          </button>
        </div>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit((d) => addMutation.mutate(d))}
          className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-4"
        >
          <h2 className="font-semibold text-gray-800">New Member</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">First Name *</label>
              <input type="text" {...register("first_name")}
                className="w-full border rounded-lg px-3 py-2 text-sm" />
              {errors.first_name && <p className="text-xs text-red-500">{errors.first_name.message}</p>}
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Last Name *</label>
              <input type="text" {...register("last_name")}
                className="w-full border rounded-lg px-3 py-2 text-sm" />
              {errors.last_name && <p className="text-xs text-red-500">{errors.last_name.message}</p>}
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Gender *</label>
              <select {...register("gender")} className="w-full border rounded-lg px-3 py-2 text-sm">
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Status *</label>
              <select {...register("membership_status")} className="w-full border rounded-lg px-3 py-2 text-sm">
                <option value="visitor">Visitor</option>
                <option value="regular">Regular</option>
                <option value="member">Member</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Phone</label>
              <input type="tel" {...register("phone")}
                className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Email</label>
              <input type="email" {...register("email")}
                className="w-full border rounded-lg px-3 py-2 text-sm" />
              {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
            </div>
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={addMutation.isPending}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
              {addMutation.isPending ? "Saving..." : "Save Member"}
            </button>
            {addMutation.isError && (
              <p className="text-red-500 text-sm self-center">Failed to create member.</p>
            )}
          </div>
        </form>
      )}

      {/* Filters */}
      <div className="flex gap-3">
        <input
          type="search"
          placeholder="Search by name, phone or email..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All statuses</option>
          {Object.entries(STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Loading members...</div>
        ) : isError ? (
          <div className="p-8 text-center text-red-500">Failed to load members.</div>
        ) : (
          <>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Phone</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Branch</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data?.results.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-400">No members found.</td>
                  </tr>
                )}
                {data?.results.map((m: Member) => (
                  <tr key={m.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-blue-700">
                      <Link href={`/dashboard/members/${m.id}`} className="hover:underline">{m.full_name}</Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{m.phone || "—"}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{m.email || "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[m.membership_status] ?? "bg-gray-100 text-gray-600"}`}>
                        {STATUS_LABELS[m.membership_status] ?? m.membership_status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {m.primary_branch?.name ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            {data && data.count > 0 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 text-sm text-gray-600">
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
          </>
        )}
      </div>
    </div>
  );
}
