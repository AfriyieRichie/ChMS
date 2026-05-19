"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getPledges, type Pledge } from "@/lib/api/finance";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/dashboard/page-header";
import type { VariantProps } from "class-variance-authority";
import { badgeVariants } from "@/components/ui/badge";

const BRANCH_ID = 1;

type BadgeVariant = VariantProps<typeof badgeVariants>["variant"];

const STATUS_BADGE: Record<string, BadgeVariant> = {
  active:    "success",
  completed: "info",
  cancelled: "default",
  lapsed:    "danger",
};

const FREQ_LABELS: Record<string, string> = {
  one_time:  "One Time",
  weekly:    "Weekly",
  biweekly:  "Bi-weekly",
  monthly:   "Monthly",
  quarterly: "Quarterly",
  annual:    "Annual",
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
      <PageHeader title="Pledges" description="Member giving commitments and fulfillment tracking." />

      {/* Status filter chips */}
      <div className="flex gap-2 flex-wrap">
        {["", "active", "completed", "cancelled", "lapsed"].map((s) => (
          <button
            key={s}
            onClick={() => { setStatusFilter(s); setPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
              statusFilter === s
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
            }`}
          >
            {s === "" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-10 text-center text-gray-400 text-sm">Loading pledges…</div>
        ) : (
          <>
            <table className="min-w-full divide-y divide-gray-100">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Member</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Fund</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Pledged</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Fulfilled</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Balance</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Frequency</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data?.results.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-gray-400 text-sm">
                      No pledges found.
                    </td>
                  </tr>
                )}
                {data?.results.map((p: Pledge) => (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{p.member_name}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{p.fund_name}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-right font-medium">
                      {p.currency} {Number(p.amount).toLocaleString("en-GH", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-sm text-green-700 text-right">
                      {p.currency} {Number(p.total_fulfilled).toLocaleString("en-GH", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-right">
                      <span className={Number(p.balance) > 0 ? "text-orange-600" : "text-gray-400"}>
                        {p.currency} {Number(p.balance).toLocaleString("en-GH", { minimumFractionDigits: 2 })}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{FREQ_LABELS[p.frequency] ?? p.frequency}</td>
                    <td className="px-4 py-3">
                      <Badge variant={STATUS_BADGE[p.status] ?? "default"}>
                        {p.status.charAt(0).toUpperCase() + p.status.slice(1)}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {data && data.count > 0 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 text-sm text-gray-600">
                <span>{data.count} total</span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={!data.previous}>
                    Previous
                  </Button>
                  <Button variant="outline" size="sm"
                    onClick={() => setPage((p) => p + 1)}
                    disabled={!data.next}>
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
