"use client";

import { useQuery } from "@tanstack/react-query";
import { getAttendanceRecords } from "@/lib/api/attendance";
import { getContributionSummary, getMonthlyContributions } from "@/lib/api/finance";
import { getDashboardSummary } from "@/lib/api/dashboard";
import { PageHeader } from "@/components/dashboard/page-header";

const BRANCH_ID = 1;

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function nWeeksAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n * 7);
  return d.toISOString().slice(0, 10);
}

function monthLabel(isoDate: string) {
  const d = new Date(isoDate);
  return `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
}

export default function ReportsPage() {
  const { data: summary } = useQuery({
    queryKey: ["dashboard-summary", BRANCH_ID],
    queryFn: () => getDashboardSummary(BRANCH_ID),
    staleTime: 60_000,
  });

  const { data: attendance } = useQuery({
    queryKey: ["attendance-report", BRANCH_ID],
    queryFn: () => getAttendanceRecords(BRANCH_ID, { date_from: nWeeksAgo(12) }),
  });

  const { data: fundSummary } = useQuery({
    queryKey: ["fund-summary", BRANCH_ID],
    queryFn: () => getContributionSummary(BRANCH_ID),
  });

  const { data: monthly } = useQuery({
    queryKey: ["monthly-giving", BRANCH_ID],
    queryFn: () => getMonthlyContributions(BRANCH_ID, 6),
  });

  const attRecords = attendance?.results ?? [];
  const maxAtt = Math.max(...attRecords.map((r) => r.total_count), 1);
  const maxGiving = Math.max(...(monthly ?? []).map((m) => Number(m.total)), 1);

  return (
    <div className="p-6 space-y-6">
      <PageHeader title="Reports" description="Attendance trends and giving summaries." />

      {/* Stat overview row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Active Members", value: summary?.members.total ?? "—" },
          { label: "Last Attendance", value: summary?.attendance.last_total ?? "—" },
          {
            label: `Giving (${summary ? MONTH_NAMES[(summary.finance.month ?? 1) - 1] : "—"})`,
            value: summary
              ? `GHS ${Number(summary.finance.this_month).toLocaleString("en-GH", { minimumFractionDigits: 2 })}`
              : "—",
          },
          { label: "Active Groups", value: summary?.groups.active ?? "—" },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">{label}</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
          </div>
        ))}
      </div>

      {/* Attendance trend */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Attendance — Last 12 Weeks</h2>
        {attRecords.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">No attendance records in this period.</p>
        ) : (
          <div className="flex items-end gap-2 h-40 overflow-x-auto pb-2">
            {attRecords.slice().reverse().map((r) => {
              const pct = Math.round((r.total_count / maxAtt) * 100);
              return (
                <div key={r.id} className="flex flex-col items-center gap-1 min-w-[40px]">
                  <span className="text-[10px] text-gray-500">{r.total_count}</span>
                  <div className="w-8 bg-blue-500 rounded-t" style={{ height: `${Math.max(4, pct * 1.2)}px` }} />
                  <span className="text-[9px] text-gray-400 rotate-45 origin-left whitespace-nowrap mt-1">
                    {r.date}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Monthly giving */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Monthly Giving — Last 6 Months</h2>
        {!monthly || monthly.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">No giving data yet.</p>
        ) : (
          <div className="space-y-3">
            {monthly.map((m) => {
              const total = Number(m.total);
              const pct = Math.round((total / maxGiving) * 100);
              return (
                <div key={m.month} className="flex items-center gap-3">
                  <span className="text-xs text-gray-500 w-16 shrink-0">{monthLabel(m.month)}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
                    <div className="bg-green-500 h-3 rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs font-medium text-gray-700 w-28 text-right">
                    GHS {total.toLocaleString("en-GH", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Giving by fund */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Giving by Fund (All Time)</h2>
        {!fundSummary || fundSummary.by_fund.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">No contributions recorded yet.</p>
        ) : (
          <table className="min-w-full">
            <thead>
              <tr>
                <th className="text-left text-xs font-semibold text-gray-400 uppercase pb-2">Fund</th>
                <th className="text-right text-xs font-semibold text-gray-400 uppercase pb-2">Contributions</th>
                <th className="text-right text-xs font-semibold text-gray-400 uppercase pb-2">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {fundSummary.by_fund.map((f) => (
                <tr key={f.fund__id}>
                  <td className="py-2 text-sm text-gray-800">{f.fund__name}</td>
                  <td className="py-2 text-sm text-gray-500 text-right">{f.count}</td>
                  <td className="py-2 text-sm font-medium text-gray-900 text-right">
                    {f.currency} {Number(f.total).toLocaleString("en-GH", { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-gray-200">
                <td className="pt-3 text-sm font-semibold text-gray-700">Grand Total</td>
                <td />
                <td className="pt-3 text-sm font-bold text-gray-900 text-right">
                  GHS {Number(fundSummary.grand_total).toLocaleString("en-GH", { minimumFractionDigits: 2 })}
                </td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </div>
  );
}
