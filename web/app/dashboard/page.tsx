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
  UserPlus,
  Phone,
  MapPin,
  Clock,
  TrendingUp,
  Building2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  getDashboardOverview,
  type TrendPoint,
  type FirstTimer,
  type UpcomingEvent,
  type BirthdayMember,
  type BranchComparison,
  type DashboardOverview,
} from "@/lib/api/dashboard";
import { cn } from "@/lib/utils";

const BRANCH_ID = 1;

const MONTH_NAMES = [
  "Jan","Feb","Mar","Apr","May","Jun",
  "Jul","Aug","Sep","Oct","Nov","Dec",
];

// ── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
  label, value, sub, href,
}: {
  label: string; value: string | number; sub?: string; href: string;
}) {
  return (
    <Link
      href={href}
      className="group block bg-white rounded-lg border border-gray-200 p-5 hover:border-gray-300 transition-colors"
    >
      <p className="text-3xl font-bold text-gray-900 tracking-tight leading-none">{value}</p>
      <p className="text-sm text-gray-500 mt-2">{label}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      <div className="mt-4 pt-3 border-t border-gray-100 flex items-center gap-1">
        <span className="text-xs text-gray-500 font-medium group-hover:text-gray-700 transition-colors">View all</span>
        <ArrowUpRight size={11} className="text-gray-400 group-hover:text-gray-600 transition-colors" />
      </div>
    </Link>
  );
}

// ── Attendance trend chart (stacked bar) ─────────────────────────────────────

function TrendBar({ total, firstTimers, maxTotal }: {
  total: number; firstTimers: number; maxTotal: number;
}) {
  const heightPct = maxTotal > 0 ? (total / maxTotal) * 100 : 0;
  const returning = Math.max(total - firstTimers, 0);
  return (
    <div
      className="w-full min-h-[3px] rounded-t-sm overflow-hidden flex flex-col-reverse"
      style={{ height: `${heightPct}%` }}
    >
      <div className="bg-neutral-800 w-full" style={{ flex: returning }} />
      {firstTimers > 0 && (
        <div className="bg-neutral-400 w-full" style={{ flex: firstTimers }} />
      )}
    </div>
  );
}

function AttendanceTrendChart({ data, loading }: { data: TrendPoint[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="flex items-end gap-1.5 h-36 px-1">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="flex-1 bg-gray-100 rounded-t-sm animate-pulse"
            style={{ height: `${35 + (i % 3) * 20}%` }}
          />
        ))}
      </div>
    );
  }
  if (!data.length) {
    return (
      <div className="h-36 flex flex-col items-center justify-center gap-2 text-gray-400">
        <TrendingUp size={22} className="text-gray-200" />
        <p className="text-sm">No attendance data yet</p>
      </div>
    );
  }
  const maxTotal = Math.max(...data.map((d) => d.total), 1);
  return (
    <div>
      <div className="flex items-end gap-1.5 h-36 group/chart">
        {data.map((d, i) => (
          <div
            key={i}
            className="flex-1 h-full flex flex-col justify-end relative group/bar"
          >
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover/bar:opacity-100 transition-opacity z-10 pointer-events-none">
              <span className="font-medium">{d.total}</span>
              {d.first_timers > 0 && (
                <span className="text-gray-300 ml-1">· {d.first_timers} new</span>
              )}
            </div>
            <TrendBar total={d.total} firstTimers={d.first_timers} maxTotal={maxTotal} />
          </div>
        ))}
      </div>
      <div className="flex gap-1.5 mt-2">
        {data.map((d, i) => (
          <span key={i} className="flex-1 text-center text-[10px] text-gray-400 truncate">
            {d.week_label}
          </span>
        ))}
      </div>
      <div className="flex items-center gap-4 mt-3">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm bg-neutral-800" />
          <span className="text-xs text-gray-500">Attendance</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm bg-neutral-400" />
          <span className="text-xs text-gray-500">First-timers</span>
        </div>
      </div>
    </div>
  );
}

// ── Giving comparison ─────────────────────────────────────────────────────────

function GivingBar({ label, value, maxValue, colorClass }: {
  label: string; value: number; maxValue: number; colorClass: string;
}) {
  const pct = maxValue > 0 ? Math.max((value / maxValue) * 100, value > 0 ? 2 : 0) : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-baseline">
        <span className="text-xs text-gray-500">{label}</span>
        <span className="text-sm font-semibold text-gray-800">
          {value.toLocaleString("en-GH", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
        </span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-700", colorClass)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function GivingComparison({
  finance, loading,
}: {
  finance: DashboardOverview["finance"] | undefined;
  loading: boolean;
}) {
  if (loading || !finance) {
    return (
      <div className="space-y-5">
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-1.5">
            <div className="flex justify-between">
              <div className="h-3 w-20 bg-gray-100 rounded animate-pulse" />
              <div className="h-3 w-16 bg-gray-100 rounded animate-pulse" />
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full animate-pulse" />
          </div>
        ))}
      </div>
    );
  }
  const thisMonth = Number(finance.this_month);
  const lastMonth = Number(finance.last_month);
  const lastYear = Number(finance.same_month_last_year);
  const maxVal = Math.max(thisMonth, lastMonth, lastYear, 1);
  const monthName = MONTH_NAMES[finance.month - 1];
  const prevMonthName = MONTH_NAMES[finance.month === 1 ? 11 : finance.month - 2];
  const prevMonthYear = finance.month === 1 ? finance.year - 1 : finance.year;

  return (
    <div className="space-y-4">
      <GivingBar
        label={`${monthName} ${finance.year} (current)`}
        value={thisMonth}
        maxValue={maxVal}
        colorClass="bg-neutral-800"
      />
      <GivingBar
        label={`${prevMonthName} ${prevMonthYear}`}
        value={lastMonth}
        maxValue={maxVal}
        colorClass="bg-neutral-400"
      />
      <GivingBar
        label={`${monthName} ${finance.year - 1}`}
        value={lastYear}
        maxValue={maxVal}
        colorClass="bg-gray-200"
      />
      {thisMonth > 0 && lastMonth > 0 && (
        <p className="text-xs text-gray-400 pt-1">
          {thisMonth >= lastMonth ? (
            <span className="text-gray-700 font-medium">
              +{(((thisMonth - lastMonth) / lastMonth) * 100).toFixed(1)}%
            </span>
          ) : (
            <span className="text-red-500 font-medium">
              {(((thisMonth - lastMonth) / lastMonth) * 100).toFixed(1)}%
            </span>
          )}{" "}
          vs last month
        </p>
      )}
    </div>
  );
}

// ── First-timers widget ───────────────────────────────────────────────────────

function FirstTimerRow({ person }: { person: FirstTimer }) {
  const abbr = person.full_name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join("");
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-gray-100 last:border-0">
      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 text-xs font-semibold shrink-0">
        {abbr}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{person.full_name}</p>
        <p className="text-xs text-gray-400">
          {new Date(person.service_date + "T00:00:00").toLocaleDateString("en-GH", {
            weekday: "short", month: "short", day: "numeric",
          })}
        </p>
      </div>
      {person.phone ? (
        <a
          href={`tel:${person.phone}`}
          className="shrink-0 inline-flex items-center gap-1 text-xs text-gray-600 hover:text-gray-900 font-medium"
        >
          <Phone size={11} />
          Call
        </a>
      ) : (
        <span className="shrink-0 text-xs text-gray-300">No phone</span>
      )}
    </div>
  );
}

// ── Upcoming events widget ────────────────────────────────────────────────────

const EVENT_TYPE_LABELS: Record<string, string> = {
  service: "Service", special: "Special", outreach: "Outreach",
  training: "Training", meeting: "Meeting",
};

function UpcomingEventRow({ event }: { event: UpcomingEvent }) {
  const dt = new Date(event.start_datetime);
  const now = new Date();
  const todayStr = now.toDateString();
  const tomorrowStr = new Date(now.getTime() + 86_400_000).toDateString();
  const isToday = dt.toDateString() === todayStr;
  const isTomorrow = dt.toDateString() === tomorrowStr;

  return (
    <div className="flex gap-3 items-start py-3 border-b border-gray-100 last:border-0">
      <div className="shrink-0 w-11 text-center bg-gray-50 border border-gray-100 rounded py-1.5">
        <p className="text-[10px] text-gray-400 uppercase">{dt.toLocaleDateString("en-GH", { month: "short" })}</p>
        <p className="text-lg font-bold text-gray-900 leading-tight">{dt.getDate()}</p>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">
            {EVENT_TYPE_LABELS[event.event_type] ?? event.event_type}
          </span>
          {isToday && (
            <span className="text-[10px] font-semibold text-gray-900 uppercase tracking-wide">Today</span>
          )}
          {isTomorrow && (
            <span className="text-[10px] text-gray-400">Tomorrow</span>
          )}
        </div>
        <p className="text-sm font-medium text-gray-900 truncate">{event.name}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="inline-flex items-center gap-1 text-xs text-gray-400">
            <Clock size={10} />
            {dt.toLocaleTimeString("en-GH", { hour: "2-digit", minute: "2-digit" })}
          </span>
          {event.venue && (
            <span className="inline-flex items-center gap-1 text-xs text-gray-400">
              <MapPin size={10} />
              {event.venue}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Birthdays widget ──────────────────────────────────────────────────────────

function BirthdayRow({ person }: { person: BirthdayMember }) {
  const daysAway = person.days_away;
  const isToday = daysAway === 0;
  const label = isToday ? "Today" : daysAway === 1 ? "Tomorrow" : `In ${daysAway} days`;
  const dob = new Date(person.date_of_birth + "T00:00:00");
  const age = new Date().getFullYear() - dob.getFullYear();

  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-gray-100 last:border-0">
      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
        <span className="text-xs font-semibold text-gray-500">
          {person.full_name[0]?.toUpperCase()}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{person.full_name}</p>
        <p className="text-xs text-gray-400">Turns {age}</p>
      </div>
      <span className={cn(
        "shrink-0 text-xs font-medium",
        isToday ? "text-gray-900" : "text-gray-400",
      )}>
        {label}
      </span>
    </div>
  );
}

// ── Branch comparison table (HQ only) ────────────────────────────────────────

function BranchComparisonTable({ data }: { data: BranchComparison[] }) {
  const maxMembers = Math.max(...data.map((b) => b.member_count), 1);
  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
      <table className="min-w-full">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Branch</th>
            <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Members</th>
            <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-36">Relative size</th>
            <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Last attendance</th>
            <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {data.map((b) => (
            <tr key={b.id} className="hover:bg-gray-50 transition-colors">
              <td className="px-5 py-3">
                <p className="text-sm font-semibold text-gray-900">{b.name}</p>
                <p className="text-xs text-gray-400 font-mono">{b.code}</p>
              </td>
              <td className="px-5 py-3 text-sm font-bold text-right text-gray-900">{b.member_count}</td>
              <td className="px-5 py-3">
                <div className="h-1.5 bg-gray-100 rounded-full w-36 overflow-hidden">
                  <div
                    className="h-full bg-neutral-700 rounded-full"
                    style={{ width: `${(b.member_count / maxMembers) * 100}%` }}
                  />
                </div>
              </td>
              <td className="px-5 py-3 text-sm text-right text-gray-700">{b.last_attendance}</td>
              <td className="px-5 py-3 text-xs text-gray-400">
                {b.last_attendance_date
                  ? new Date(b.last_attendance_date + "T00:00:00").toLocaleDateString("en-GH", { dateStyle: "medium" })
                  : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Section wrapper ───────────────────────────────────────────────────────────

function SectionCard({
  title, icon: Icon, action, children, className,
}: {
  title: string;
  icon?: LucideIcon;
  action?: { label: string; href: string };
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("bg-white rounded-lg border border-gray-200 p-5", className)}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {Icon && <Icon size={14} className="text-gray-400" />}
          <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
        </div>
        {action && (
          <Link href={action.href} className="text-xs text-gray-500 hover:text-gray-800 font-medium transition-colors">
            {action.label} →
          </Link>
        )}
      </div>
      {children}
    </div>
  );
}

// ── Quick action button ───────────────────────────────────────────────────────

function QuickAction({ icon: Icon, label, href }: {
  icon: LucideIcon; label: string; href: string;
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors"
    >
      <Icon size={14} className="text-gray-500 shrink-0" />
      {label}
    </Link>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState({ icon: Icon, message }: { icon: LucideIcon; message: string }) {
  return (
    <div className="py-8 flex flex-col items-center gap-2 text-gray-400">
      <Icon size={20} className="text-gray-200" />
      <p className="text-sm">{message}</p>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["dashboard-overview", BRANCH_ID],
    queryFn: () => getDashboardOverview(BRANCH_ID),
    staleTime: 60_000,
  });

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const finance = data?.finance;
  const monthLabel = finance
    ? `${MONTH_NAMES[finance.month - 1]} ${finance.year}`
    : "";

  const givingValue = isLoading
    ? "—"
    : finance
    ? `GHS ${Number(finance.this_month).toLocaleString("en-GH", { minimumFractionDigits: 0 })}`
    : "—";

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap pb-2">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">{greeting}</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Here&apos;s what&apos;s happening at your church today.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <QuickAction icon={ClipboardCheck} label="Record Attendance" href="/dashboard/attendance" />
          <QuickAction icon={UserPlus} label="Add Member" href="/dashboard/members" />
          <QuickAction icon={Wallet} label="Record Giving" href="/dashboard/finance/contributions" />
        </div>
      </div>

      {isError && (
        <div className="rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700">
          Could not load dashboard data. Make sure the backend is running and you are logged in.
        </div>
      )}

      {/* ── Stat cards ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <StatCard
          label="Active Members"
          value={isLoading ? "—" : (data?.members.branch_total ?? 0)}
          href="/dashboard/members"
        />
        <StatCard
          label="Last Attendance"
          value={isLoading ? "—" : (data?.attendance.last_total ?? 0)}
          sub={data?.attendance.last_date
            ? new Date(data.attendance.last_date + "T00:00:00").toLocaleDateString("en-GH", { dateStyle: "medium" })
            : undefined}
          href="/dashboard/attendance"
        />
        <StatCard
          label="Monthly Giving"
          value={givingValue}
          sub={monthLabel || undefined}
          href="/dashboard/finance"
        />
        <StatCard
          label="Upcoming Events"
          value={isLoading ? "—" : (data?.attendance.upcoming_events ?? 0)}
          href="/dashboard/events"
        />
        <StatCard
          label="Active Groups"
          value={isLoading ? "—" : (data?.attendance.active_groups ?? 0)}
          href="/dashboard/groups"
        />
      </div>

      {/* ── Charts row ── */}
      <div className="grid gap-4 lg:grid-cols-3">
        <SectionCard
          title="Attendance Trend"
          icon={TrendingUp}
          action={{ label: "View records", href: "/dashboard/attendance" }}
          className="lg:col-span-2"
        >
          <AttendanceTrendChart
            data={data?.attendance_trend ?? []}
            loading={isLoading}
          />
        </SectionCard>

        <SectionCard title="Monthly Giving" icon={Wallet} action={{ label: "Finance", href: "/dashboard/finance" }}>
          <div className="mb-3">
            <p className="text-2xl font-bold text-gray-900">
              GHS{" "}
              {isLoading || !finance
                ? "—"
                : Number(finance.this_month).toLocaleString("en-GH", { minimumFractionDigits: 0 })}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">{monthLabel}</p>
          </div>
          <GivingComparison finance={finance} loading={isLoading} />
        </SectionCard>
      </div>

      {/* ── Insights row ── */}
      <div className="grid gap-4 md:grid-cols-3">
        <SectionCard
          title="First-timers This Week"
          icon={UserPlus}
          action={{ label: "Members", href: "/dashboard/members" }}
        >
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-3 items-center py-2">
                  <div className="w-8 h-8 rounded-full bg-gray-100 animate-pulse shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 bg-gray-100 rounded animate-pulse w-3/4" />
                    <div className="h-2.5 bg-gray-100 rounded animate-pulse w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : data?.first_timers_week.length === 0 ? (
            <EmptyState icon={UserPlus} message="No first-timers recorded this week" />
          ) : (
            <div>
              {data?.first_timers_week.map((p) => (
                <FirstTimerRow key={`${p.id}-${p.service_date}`} person={p} />
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard
          title="Upcoming Events"
          icon={CalendarDays}
          action={{ label: "All events", href: "/dashboard/events" }}
        >
          {isLoading ? (
            <div className="space-y-1">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-3 py-3">
                  <div className="w-11 h-11 bg-gray-100 rounded animate-pulse shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-gray-100 rounded animate-pulse w-3/4" />
                    <div className="h-2.5 bg-gray-100 rounded animate-pulse w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : data?.upcoming_events.length === 0 ? (
            <EmptyState icon={CalendarDays} message="No events in the next 7 days" />
          ) : (
            <div>
              {data?.upcoming_events.map((ev) => (
                <UpcomingEventRow key={ev.id} event={ev} />
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard
          title="Birthdays This Week"
          icon={Users}
          action={{ label: "Members", href: "/dashboard/members" }}
        >
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="flex gap-3 items-center py-2">
                  <div className="w-8 h-8 rounded-full bg-gray-100 animate-pulse shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 bg-gray-100 rounded animate-pulse w-3/4" />
                    <div className="h-2.5 bg-gray-100 rounded animate-pulse w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : data?.birthdays_week.length === 0 ? (
            <EmptyState icon={Users} message="No birthdays this week" />
          ) : (
            <div>
              {data?.birthdays_week.map((p) => (
                <BirthdayRow key={p.id} person={p} />
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      {/* ── Branch comparison (network admin only) ── */}
      {data?.branch_comparison && data.branch_comparison.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Building2 size={14} className="text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-900">Branch Overview</h2>
          </div>
          <BranchComparisonTable data={data.branch_comparison} />
        </div>
      )}

      {/* ── Announcements ── */}
      {!isLoading && data?.announcements && data.announcements.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-900">Active Announcements</h2>
            <Link href="/dashboard/communications" className="text-xs text-gray-500 hover:text-gray-800 font-medium transition-colors">
              Manage →
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.announcements.map((a) => (
              <div key={a.id} className="bg-white rounded-lg border border-gray-200 px-5 py-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <p className="text-sm font-semibold text-gray-900 leading-snug">{a.title}</p>
                  <span className="shrink-0 inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 capitalize">
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
        </div>
      )}
    </div>
  );
}
