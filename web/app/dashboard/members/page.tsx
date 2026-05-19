"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { getMembers, type Member } from "@/lib/api/members";

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
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);

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

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Members</h1>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
          Add Member
        </button>
      </div>

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
