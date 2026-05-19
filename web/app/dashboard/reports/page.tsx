"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  getMembershipGrowth, getAttendanceTrends, getVisitorConversion,
  getDiscipleshipPipeline, getGroupHealth, getPastoralCareAlerts,
} from "@/lib/api/reports";
import { PageHeader } from "@/components/dashboard/page-header";
import { cn } from "@/lib/utils";

const BRANCH_ID = 1;
const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function monthLabel(iso: string) {
  const d = new Date(iso);
  return `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
}

type Tab = "membership" | "attendance" | "conversion" | "discipleship" | "groups" | "pastoral";

const TABS: { id: Tab; label: string }[] = [
  { id: "membership",   label: "Membership Growth" },
  { id: "attendance",   label: "Attendance Trends" },
  { id: "conversion",   label: "Visitor Conversion" },
  { id: "discipleship", label: "Discipleship Pipeline" },
  { id: "groups",       label: "Group Health" },
  { id: "pastoral",     label: "Pastoral Care" },
];

const STATUS_LABELS: Record<string, string> = {
  visitor: "Visitor", active: "Active", inactive: "Inactive",
  new_convert: "New Convert", transferred: "Transferred", deceased: "Deceased",
};

const STATUS_COLOR: Record<string, string> = {
  active: "bg-green-500", visitor: "bg-blue-400", inactive: "bg-gray-300",
  new_convert: "bg-purple-400", transferred: "bg-amber-400", deceased: "bg-red-300",
};

const STAGE_LABELS: Record<string, string> = {
  new_believer: "New Believer", foundation: "Foundation Class",
  water_baptism: "Water Baptism", holy_spirit: "Holy Spirit",
  discipleship: "Discipleship", membership: "Membership Class",
};

const TYPE_LABELS: Record<string, string> = {
  cell: "Cell", life_group: "Life Group", ministry_team: "Ministry",
  choir: "Choir", class: "Class", prayer_team: "Prayer",
};

// ── Membership Growth ─────────────────────────────────────────────────────────

function MembershipTab() {
  const [months, setMonths] = useState(6);
  const { data, isLoading } = useQuery({
    queryKey: ["membership-growth", BRANCH_ID, months],
    queryFn: () => getMembershipGrowth(BRANCH_ID, months),
  });

  const maxNew = Math.max(...(data?.new_by_month.map((m) => m.new) ?? [1]), 1);
  const totalActive = data?.status_breakdown.find((s) => s.membership_status === "active")?.count ?? 0;
  const totalVisitors = data?.status_breakdown.find((s) => s.membership_status === "visitor")?.count ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <label className="text-xs font-medium text-gray-600">Period</label>
        <select value={months} onChange={(e) => setMonths(Number(e.target.value))}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50">
          {[3, 6, 12, 24].map((m) => <option key={m} value={m}>Last {m} months</option>)}
        </select>
      </div>

      {/* Status breakdown */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {(data?.status_breakdown ?? []).map((s) => (
          <div key={s.membership_status} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
            <p className="text-xs font-medium text-gray-400">{STATUS_LABELS[s.membership_status] ?? s.membership_status}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{s.count}</p>
          </div>
        ))}
      </div>

      {/* New members trend */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">New Joins per Month</h3>
        {isLoading ? (
          <p className="text-center text-gray-400 text-sm py-4">Loading…</p>
        ) : !data?.new_by_month.length ? (
          <p className="text-center text-gray-400 text-sm py-4">No join data in this period.</p>
        ) : (
          <div className="flex items-end gap-3 h-36 overflow-x-auto pb-2">
            {data.new_by_month.map((m) => {
              const pct = Math.round((m.new / maxNew) * 100);
              return (
                <div key={m.month} className="flex flex-col items-center gap-1 min-w-[48px]">
                  <span className="text-[10px] text-gray-500">{m.new}</span>
                  <div className="w-10 bg-blue-500 rounded-t-sm" style={{ height: `${Math.max(4, pct * 1.1)}px` }} />
                  <span className="text-[9px] text-gray-400 rotate-45 origin-left whitespace-nowrap mt-1">{monthLabel(m.month)}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Leavers trend */}
      {(data?.left_by_month.length ?? 0) > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Departures per Month</h3>
          <div className="flex items-end gap-3 h-28 overflow-x-auto pb-2">
            {(data?.left_by_month ?? []).map((m) => {
              const maxLeft = Math.max(...(data?.left_by_month.map((x) => x.left) ?? [1]), 1);
              const pct = Math.round((m.left / maxLeft) * 100);
              return (
                <div key={m.month} className="flex flex-col items-center gap-1 min-w-[48px]">
                  <span className="text-[10px] text-gray-500">{m.left}</span>
                  <div className="w-10 bg-red-400 rounded-t-sm" style={{ height: `${Math.max(4, pct)}px` }} />
                  <span className="text-[9px] text-gray-400 rotate-45 origin-left whitespace-nowrap mt-1">{monthLabel(m.month)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Attendance Trends ─────────────────────────────────────────────────────────

function AttendanceTab() {
  const [months, setMonths] = useState(6);
  const { data, isLoading } = useQuery({
    queryKey: ["attendance-trends", BRANCH_ID, months],
    queryFn: () => getAttendanceTrends(BRANCH_ID, months),
  });

  const maxTotal = Math.max(...(data?.by_month.map((m) => m.total) ?? [1]), 1);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <label className="text-xs font-medium text-gray-600">Period</label>
        <select value={months} onChange={(e) => setMonths(Number(e.target.value))}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50">
          {[3, 6, 12, 24].map((m) => <option key={m} value={m}>Last {m} months</option>)}
        </select>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Monthly Attendance Totals</h3>
        {isLoading ? (
          <p className="text-center text-gray-400 text-sm py-4">Loading…</p>
        ) : !data?.by_month.length ? (
          <p className="text-center text-gray-400 text-sm py-4">No attendance data in this period.</p>
        ) : (
          <div className="space-y-3">
            {data.by_month.map((m) => {
              const pct = Math.round((m.total / maxTotal) * 100);
              return (
                <div key={m.month} className="flex items-center gap-3">
                  <span className="text-xs text-gray-500 w-16 shrink-0">{monthLabel(m.month)}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
                    <div className="bg-blue-500 h-3 rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs font-medium text-gray-700 w-32 text-right">
                    {m.total.toLocaleString()} ({m.sessions} sessions)
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {(data?.by_service.length ?? 0) > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">By Service Type</h3>
          <div className="space-y-3">
            {(data?.by_service ?? []).map((s) => {
              const maxSvc = Math.max(...(data?.by_service.map((x) => x.total) ?? [1]), 1);
              const pct = Math.round((s.total / maxSvc) * 100);
              return (
                <div key={s.service_type__name} className="flex items-center gap-3">
                  <span className="text-xs text-gray-500 w-28 shrink-0 truncate">{s.service_type__name}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-2.5 overflow-hidden">
                    <div className="bg-purple-500 h-full rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs text-gray-600 w-20 text-right">{s.total.toLocaleString()}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Visitor Conversion ────────────────────────────────────────────────────────

function ConversionTab() {
  const [months, setMonths] = useState(3);
  const { data, isLoading } = useQuery({
    queryKey: ["visitor-conversion", BRANCH_ID, months],
    queryFn: () => getVisitorConversion(BRANCH_ID, months),
  });

  const conversionRate = data && data.first_time_visitors > 0
    ? Math.round((data.new_members / data.first_time_visitors) * 100)
    : 0;

  const funnel = data ? [
    { label: "First-Time Visitors", value: data.first_time_visitors, color: "bg-blue-500" },
    { label: "New Members Joined", value: data.new_members, color: "bg-purple-500" },
    { label: "Total Active Members", value: data.total_active_members, color: "bg-emerald-500" },
    { label: "Current Visitors", value: data.current_visitors, color: "bg-amber-400" },
  ] : [];

  const maxVal = Math.max(...funnel.map((f) => f.value), 1);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <label className="text-xs font-medium text-gray-600">Period</label>
        <select value={months} onChange={(e) => setMonths(Number(e.target.value))}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50">
          {[1, 3, 6, 12].map((m) => <option key={m} value={m}>Last {m} month{m > 1 ? "s" : ""}</option>)}
        </select>
        {data && (
          <span className="ml-auto text-sm font-semibold text-purple-700">
            {conversionRate}% visitor → member
          </span>
        )}
      </div>

      {isLoading ? (
        <p className="text-center text-gray-400 text-sm py-8">Loading…</p>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-4">
          {funnel.map((f) => {
            const pct = Math.round((f.value / maxVal) * 100);
            return (
              <div key={f.label} className="flex items-center gap-4">
                <div className="w-48 shrink-0">
                  <p className="text-sm font-medium text-gray-700">{f.label}</p>
                </div>
                <div className="flex-1 bg-gray-100 rounded-full h-8 overflow-hidden flex items-center">
                  <div className={cn("h-full rounded-full flex items-center justify-end pr-3 transition-all", f.color)}
                    style={{ width: `${Math.max(8, pct)}%` }}>
                    <span className="text-white text-xs font-bold">{f.value}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Discipleship Pipeline ─────────────────────────────────────────────────────

function DiscipleshipTab() {
  const { data, isLoading } = useQuery({
    queryKey: ["discipleship-pipeline", BRANCH_ID],
    queryFn: () => getDiscipleshipPipeline(BRANCH_ID),
  });

  const inProgressMap = Object.fromEntries((data?.in_progress ?? []).map((s) => [s.stage, s.count]));
  const completedMap = Object.fromEntries((data?.completed ?? []).map((s) => [s.stage, s.count]));
  const maxCount = Math.max(...(data?.stage_order ?? []).map((s) => (inProgressMap[s] ?? 0) + (completedMap[s] ?? 0)), 1);

  return (
    <div className="space-y-6">
      {isLoading ? (
        <p className="text-center text-gray-400 text-sm py-8">Loading…</p>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-900 mb-5">Discipleship Journey Progress</h3>
          <div className="space-y-4">
            {(data?.stage_order ?? []).map((stage, i) => {
              const inP = inProgressMap[stage] ?? 0;
              const done = completedMap[stage] ?? 0;
              const total = inP + done;
              const pct = Math.round((total / maxCount) * 100);
              return (
                <div key={stage} className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 text-xs font-bold flex items-center justify-center shrink-0">
                    {i + 1}
                  </div>
                  <div className="w-36 shrink-0">
                    <p className="text-sm text-gray-700">{STAGE_LABELS[stage] ?? stage}</p>
                  </div>
                  <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden flex">
                    <div className="bg-purple-500 h-full" style={{ width: `${Math.round((done / maxCount) * 100)}%` }} />
                    <div className="bg-amber-400 h-full" style={{ width: `${Math.round((inP / maxCount) * 100)}%` }} />
                  </div>
                  <div className="w-20 text-right shrink-0">
                    <span className="text-xs text-purple-700 font-medium">{done} done</span>
                    {inP > 0 && <span className="text-xs text-amber-600"> · {inP} active</span>}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-purple-500 inline-block" /> Completed</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-400 inline-block" /> In Progress</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Group Health ──────────────────────────────────────────────────────────────

function GroupHealthTab() {
  const { data, isLoading } = useQuery({
    queryKey: ["group-health", BRANCH_ID],
    queryFn: () => getGroupHealth(BRANCH_ID),
  });

  const groups = data?.groups ?? [];
  const maxMembers = Math.max(...groups.map((g) => g.member_count), 1);

  return (
    <div className="space-y-4">
      {isLoading ? (
        <p className="text-center text-gray-400 text-sm py-8">Loading…</p>
      ) : !groups.length ? (
        <p className="text-center text-gray-400 text-sm py-8">No groups found.</p>
      ) : (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-100">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Group</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase hidden sm:table-cell">Type</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Members</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Meetings (4w)</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase w-32">Health</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {groups.map((g) => {
                const pct = Math.round((g.member_count / maxMembers) * 100);
                const isActive = g.recent_meetings > 0;
                return (
                  <tr key={g.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 text-sm font-medium text-gray-900">{g.name}</td>
                    <td className="px-4 py-2.5 text-xs text-gray-500 hidden sm:table-cell">{TYPE_LABELS[g.type] ?? g.type}</td>
                    <td className="px-4 py-2.5 text-sm text-gray-700 text-right">{g.member_count}</td>
                    <td className="px-4 py-2.5 text-center">
                      <span className={cn(
                        "inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-medium",
                        isActive ? "bg-green-100 text-green-700" : "bg-red-50 text-red-500",
                      )}>
                        {g.recent_meetings}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={cn("h-full rounded-full", isActive ? "bg-green-500" : "bg-gray-300")}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Pastoral Care ─────────────────────────────────────────────────────────────

function PastoralCareTab() {
  const [weeks, setWeeks] = useState(4);
  const { data, isLoading } = useQuery({
    queryKey: ["pastoral-care", BRANCH_ID, weeks],
    queryFn: () => getPastoralCareAlerts(BRANCH_ID, weeks),
  });

  const members = data?.members ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <label className="text-xs font-medium text-gray-600">Not seen in</label>
        <select value={weeks} onChange={(e) => setWeeks(Number(e.target.value))}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50">
          {[2, 4, 6, 8, 12].map((w) => <option key={w} value={w}>{w} weeks</option>)}
        </select>
        {data && <span className="text-xs text-gray-400">{members.length} member{members.length !== 1 ? "s" : ""}</span>}
      </div>

      {isLoading ? (
        <p className="text-center text-gray-400 text-sm py-8">Loading…</p>
      ) : !members.length ? (
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center shadow-sm">
          <p className="text-sm text-gray-400">All members have been seen in the last {weeks} weeks.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-100">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Member</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase hidden sm:table-cell">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Last Seen</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase hidden md:table-cell">Phone</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {members.map((m) => {
                const neverSeen = !m.last_seen;
                const daysAgo = m.last_seen ? Math.round((Date.now() - new Date(m.last_seen).getTime()) / 86400000) : null;
                return (
                  <tr key={m.id} className={cn("hover:bg-gray-50", neverSeen && "bg-red-50/30")}>
                    <td className="px-4 py-2.5 text-sm font-medium text-gray-900">{m.full_name}</td>
                    <td className="px-4 py-2.5 hidden sm:table-cell">
                      <span className="text-xs text-gray-500 capitalize">{m.membership_status.replace("_", " ")}</span>
                    </td>
                    <td className="px-4 py-2.5 text-sm">
                      {neverSeen ? (
                        <span className="text-red-500 text-xs font-medium">Never recorded</span>
                      ) : (
                        <span className="text-amber-600">{m.last_seen} <span className="text-gray-400 text-xs">({daysAgo}d ago)</span></span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-sm text-gray-500 hidden md:table-cell">{m.phone || "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const [tab, setTab] = useState<Tab>("membership");

  return (
    <div className="p-6 space-y-6">
      <PageHeader title="Reports" description="Cross-cutting analytics across all ministry areas." />

      <div className="flex gap-0.5 border-b border-gray-200 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px whitespace-nowrap shrink-0",
              tab === t.id
                ? "border-blue-600 text-blue-700"
                : "border-transparent text-gray-500 hover:text-gray-700",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "membership"   && <MembershipTab />}
      {tab === "attendance"   && <AttendanceTab />}
      {tab === "conversion"   && <ConversionTab />}
      {tab === "discipleship" && <DiscipleshipTab />}
      {tab === "groups"       && <GroupHealthTab />}
      {tab === "pastoral"     && <PastoralCareTab />}
    </div>
  );
}
