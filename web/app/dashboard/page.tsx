"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { getDashboardSummary } from "@/lib/api/dashboard";

const BRANCH_ID = 1;

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function StatCard({
  label, value, sub, href,
}: { label: string; value: string | number; sub?: string; href: string }) {
  return (
    <Link href={href}
      className="block bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
      <p className="mt-1 text-3xl font-bold text-gray-900">{value}</p>
      {sub && <p className="mt-1 text-xs text-gray-400">{sub}</p>}
      <p className="mt-2 text-xs text-blue-600">View →</p>
    </Link>
  );
}

export default function DashboardPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["dashboard-summary", BRANCH_ID],
    queryFn: () => getDashboardSummary(BRANCH_ID),
    staleTime: 60_000,
  });

  const monthLabel = data
    ? `${MONTH_NAMES[data.finance.month - 1]} ${data.finance.year}`
    : "This month";

  const givingFormatted = data
    ? Number(data.finance.this_month).toLocaleString("en-GH", { minimumFractionDigits: 2 })
    : "—";

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Overview</h1>
        <p className="text-sm text-gray-500 mt-1">Branch summary at a glance.</p>
      </div>

      {isError && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          Could not load dashboard data. Make sure the backend is running and you are logged in.
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <StatCard
          label="Active Members"
          value={isLoading ? "—" : (data?.members.total ?? 0)}
          href="/dashboard/members"
        />
        <StatCard
          label="Last Attendance"
          value={isLoading ? "—" : (data?.attendance.last_total ?? 0)}
          sub={data?.attendance.last_date ?? undefined}
          href="/dashboard/attendance"
        />
        <StatCard
          label={`Giving (${monthLabel})`}
          value={isLoading ? "—" : `GHS ${givingFormatted}`}
          href="/dashboard/finance"
        />
        <StatCard
          label="Upcoming Events"
          value={isLoading ? "—" : (data?.events.upcoming ?? 0)}
          href="/dashboard/events"
        />
        <StatCard
          label="Active Groups"
          value={isLoading ? "—" : (data?.groups.active ?? 0)}
          href="/dashboard/groups"
        />
      </div>

      {/* Announcements */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-gray-800">Active Announcements</h2>
          <Link href="/dashboard/communications" className="text-xs text-blue-600 hover:underline">
            Manage →
          </Link>
        </div>
        {isLoading && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 text-center text-sm text-gray-400">
            Loading...
          </div>
        )}
        {!isLoading && data?.announcements.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 text-center text-sm text-gray-400">
            No active announcements.
          </div>
        )}
        <div className="space-y-3">
          {data?.announcements.map((a) => (
            <div key={a.id} className="bg-white rounded-xl border border-gray-200 px-5 py-4 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-semibold text-gray-900">{a.title}</p>
                <span className="shrink-0 text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 font-medium capitalize">
                  {a.audience}
                </span>
              </div>
              <p className="mt-1.5 text-sm text-gray-600 leading-relaxed">{a.body}</p>
              {a.published_at && (
                <p className="mt-2 text-xs text-gray-400">
                  {new Date(a.published_at).toLocaleDateString("en-GH", { dateStyle: "medium" })}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
