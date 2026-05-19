"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getPledges, type Pledge } from "@/lib/api/finance";

const BRANCH_ID = 1;

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  completed: "bg-blue-100 text-blue-700",
  cancelled: "bg-gray-100 text-gray-500",
  lapsed: "bg-red-100 text-red-700",
};

const FREQ_LABELS: Record<string, string> = {
  one_time: "One Time", weekly: "Weekly", biweekly: "Bi-weekly",
  monthly: "Monthly", quarterly: "Quarterly", annual: "Annual",
};

export default function PledgesPage() {
  const [statusFilter, setStatusFilter] = useState("active");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["pledges", BRANCH_ID, statusFilter, page],
    queryFn: () => getPledges(BRANCH_ID, { status: statusFilter || undefined, page }),
    placeholderData: (p) => p,
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Pledges</h1>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
          Add Pledge
        </button>
      </div>

      <div className="flex gap-2">
        {["", "active", "completed", "cancelled", "lapsed"].map((s) => (
          <button key={s} onClick={() => { setStatusFilter(s); setPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${statusFilter === s ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"}`}>
            {s === "" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Loading pledges...</div>
        ) : (
          <>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Member</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fund</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Pledged</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Fulfilled</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Balance</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Frequency</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data?.results.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No pledges found.</td></tr>
                )}
                {data?.results.map((p: Pledge) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{p.member_name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{p.fund_name}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-right">
                      {p.currency} {Number(p.amount).toLocaleString("en-GH", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-sm text-green-700 text-right">
                      {p.currency} {Number(p.total_fulfilled).toLocaleString("en-GH", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-right">
                      <span className={Number(p.balance) > 0 ? "text-orange-600" : "text-gray-500"}>
                        {p.currency} {Number(p.balance).toLocaleString("en-GH", { minimumFractionDigits: 2 })}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{FREQ_LABELS[p.frequency] ?? p.frequency}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[p.status] ?? "bg-gray-100 text-gray-600"}`}>
                        {p.status.charAt(0).toUpperCase() + p.status.slice(1)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
          </>
        )}
      </div>
    </div>
  );
}
