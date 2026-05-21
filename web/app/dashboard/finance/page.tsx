"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { DollarSign, Landmark, FileText, Layers, BarChart2, GitMerge } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { getContributionSummary, getContributions } from "@/lib/api/finance";
import { PageHeader } from "@/components/dashboard/page-header";

const BRANCH_ID = 1;

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function currentPeriod() {
  const now = new Date();
  return {
    date_from: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`,
    date_to: new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10),
    label: `${MONTH_NAMES[now.getMonth()]} ${now.getFullYear()}`,
  };
}

const NAV_CARDS: { label: string; href: string; Icon: LucideIcon; desc: string }[] = [
  { label: "Contributions",   href: "/dashboard/finance/contributions",   Icon: DollarSign,  desc: "Record and view giving" },
  { label: "Batch Entry",     href: "/dashboard/finance/batch",           Icon: Layers,      desc: "Fast post-service entry" },
  { label: "Funds",           href: "/dashboard/finance/funds",           Icon: Landmark,    desc: "Manage funds and categories" },
  { label: "Pledges",         href: "/dashboard/finance/pledges",         Icon: FileText,    desc: "Track member pledges" },
  { label: "Reports",         href: "/dashboard/finance/reports",         Icon: BarChart2,   desc: "Giving statements and analytics" },
  { label: "Reconciliation",  href: "/dashboard/finance/reconciliation",  Icon: GitMerge,    desc: "Match deposits to contributions" },
];

export default function FinancePage() {
  const period = currentPeriod();

  const { data: summary, isLoading: loadingSummary } = useQuery({
    queryKey: ["finance-summary", BRANCH_ID, period.date_from],
    queryFn: () => getContributionSummary(BRANCH_ID, { date_from: period.date_from, date_to: period.date_to }),
  });

  const { data: recent } = useQuery({
    queryKey: ["contributions-recent", BRANCH_ID],
    queryFn: () => getContributions(BRANCH_ID, { exclude_reversals: true, page: 1 }),
  });

  return (
    <div className="p-6 space-y-6">
      <PageHeader title="Finance" description={`${period.label} overview`} />

      {/* Summary card */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
          Total Giving — {period.label}
        </p>
        {loadingSummary ? (
          <p className="mt-2 text-3xl font-bold text-gray-300">Loading…</p>
        ) : (
          <p className="mt-1 text-3xl font-bold text-gray-900">
            GHS {Number(summary?.grand_total ?? 0).toLocaleString("en-GH", { minimumFractionDigits: 2 })}
          </p>
        )}

        {summary && summary.by_fund.length > 0 && (
          <div className="mt-4 space-y-2 border-t border-gray-100 pt-4">
            {summary.by_fund.map((row) => (
              <div key={row.fund__id} className="flex items-center justify-between text-sm">
                <span className="text-gray-600">{row.fund__name}</span>
                <span className="font-medium text-gray-900">
                  {row.currency} {Number(row.total).toLocaleString("en-GH", { minimumFractionDigits: 2 })}
                  <span className="text-gray-400 text-xs ml-1">({row.count})</span>
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick nav */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {NAV_CARDS.map(({ label, href, Icon, desc }) => (
          <Link key={href} href={href}
            className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex items-start gap-3">
            <div className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-blue-50 shrink-0">
              <Icon size={18} className="text-gray-600" />
            </div>
            <div>
              <p className="font-semibold text-gray-900 text-sm">{label}</p>
              <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Recent contributions */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900 text-sm">Recent Contributions</h2>
          <Link href="/dashboard/finance/contributions" className="text-xs text-blue-600 hover:underline">
            View all →
          </Link>
        </div>
        <table className="min-w-full divide-y divide-gray-50">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Receipt</th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Member</th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Fund</th>
              <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase">Amount</th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {!recent?.results.length && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-400 text-sm">
                  No contributions yet.
                </td>
              </tr>
            )}
            {recent?.results.slice(0, 8).map((c) => (
              <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-2.5 text-xs text-gray-400 font-mono">{c.receipt_number}</td>
                <td className="px-4 py-2.5 text-sm text-gray-800">{c.member_name}</td>
                <td className="px-4 py-2.5 text-sm text-gray-500">{c.fund_name}</td>
                <td className="px-4 py-2.5 text-sm font-semibold text-gray-900 text-right">
                  GHS {Number(c.amount).toLocaleString("en-GH", { minimumFractionDigits: 2 })}
                </td>
                <td className="px-4 py-2.5 text-sm text-gray-500">{c.given_at}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
