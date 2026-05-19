"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Users,
  ClipboardCheck,
  Wallet,
  CalendarDays,
  Users2,
  ArrowUpRight,
  Megaphone,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { getDashboardSummary } from "@/lib/api/dashboard";
import { cn } from "@/lib/utils";

const BRANCH_ID = 1;

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

type StatColor = "blue" | "emerald" | "amber" | "violet" | "rose";

const COLOR_MAP: Record<StatColor, { bg: string; ring: string }> = {
  blue:    { bg: "bg-blue-600",    ring: "ring-blue-100"    },
  emerald: { bg: "bg-emerald-500", ring: "ring-emerald-100" },
  amber:   { bg: "bg-amber-500",   ring: "ring-amber-100"   },
  violet:  { bg: "bg-violet-500",  ring: "ring-violet-100"  },
  rose:    { bg: "bg-rose-500",    ring: "ring-rose-100"    },
};

function StatCard({
  label,
  value,
  sub,
  href,
  icon: Icon,
  color,
}: {
  label: string;
  value: string | number;
  sub?: string;
  href: string;
  icon: LucideIcon;
  color: StatColor;
}) {
  const c = COLOR_MAP[color];
  return (
    <Link
      href={href}
      className="group block bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5"
    >
      <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center mb-5 ring-4", c.bg, c.ring)}>
        <Icon size={20} className="text-white" />
      </div>
      <p className="text-3xl font-bold text-gray-900 tracking-tight leading-none">{value}</p>
      <p className="text-sm text-gray-500 mt-2 font-medium">{label}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      <div className="mt-5 pt-4 border-t border-gray-100 flex items-center gap-1">
        <span className="text-xs text-blue-600 font-medium group-hover:underline">View all</span>
        <ArrowUpRight size={12} className="text-blue-500 opacity-60 group-hover:opacity-100 transition-opacity" />
      </div>
    </Link>
  );
}

export default function DashboardPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["dashboard-summary", BRANCH_ID],
    queryFn: () => getDashboardSummary(BRANCH_ID),
    staleTime: 60_000,
  });

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const monthLabel = data
    ? `${MONTH_NAMES[data.finance.month - 1]} ${data.finance.year}`
    : "";

  const givingValue = isLoading
    ? "—"
    : data
    ? `GHS ${Number(data.finance.this_month).toLocaleString("en-GH", { minimumFractionDigits: 2 })}`
    : "—";

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{greeting}</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Here&apos;s what&apos;s happening at your church today.
        </p>
      </div>

      {isError && (
        <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700">
          Could not load dashboard data. Make sure the backend is running and you are logged in.
        </div>
      )}

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <StatCard
          label="Active Members"
          value={isLoading ? "—" : (data?.members.total ?? 0)}
          href="/dashboard/members"
          icon={Users}
          color="blue"
        />
        <StatCard
          label="Last Attendance"
          value={isLoading ? "—" : (data?.attendance.last_total ?? 0)}
          sub={data?.attendance.last_date ?? undefined}
          href="/dashboard/attendance"
          icon={ClipboardCheck}
          color="emerald"
        />
        <StatCard
          label="Monthly Giving"
          value={givingValue}
          sub={monthLabel || undefined}
          href="/dashboard/finance"
          icon={Wallet}
          color="amber"
        />
        <StatCard
          label="Upcoming Events"
          value={isLoading ? "—" : (data?.events.upcoming ?? 0)}
          href="/dashboard/events"
          icon={CalendarDays}
          color="violet"
        />
        <StatCard
          label="Active Groups"
          value={isLoading ? "—" : (data?.groups.active ?? 0)}
          href="/dashboard/groups"
          icon={Users2}
          color="rose"
        />
      </div>

      {/* Announcements */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Megaphone size={16} className="text-gray-400" />
            <h2 className="text-base font-semibold text-gray-900">Active Announcements</h2>
          </div>
          <Link
            href="/dashboard/communications"
            className="text-xs text-blue-600 hover:underline font-medium"
          >
            Manage →
          </Link>
        </div>

        {isLoading && (
          <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center text-sm text-gray-400">
            Loading announcements…
          </div>
        )}

        {!isLoading && data?.announcements.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
            <Megaphone size={24} className="text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-400">No active announcements.</p>
          </div>
        )}

        {data && data.announcements.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.announcements.map((a) => (
              <div
                key={a.id}
                className="bg-white rounded-2xl border border-gray-100 px-5 py-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <p className="text-sm font-semibold text-gray-900 leading-snug">{a.title}</p>
                  <span className="shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-blue-50 text-blue-600 capitalize">
                    {a.audience}
                  </span>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed">{a.body}</p>
                {a.published_at && (
                  <p className="mt-3 text-xs text-gray-400">
                    {new Date(a.published_at).toLocaleDateString("en-GH", { dateStyle: "medium" })}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
