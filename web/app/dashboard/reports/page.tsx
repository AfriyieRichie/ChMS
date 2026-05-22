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
  new_convert: "bg-gray-100", transferred: "bg-gray-100", deceased: "bg-red-300",
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
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300">
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
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300">
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
                    <div className="bg-gray-100 h-full rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs text-gray-600 w-20 text-right">{s.total.toLocaleString()}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Gender + Age group demographic breakdown */}
      {((data?.by_gender.length ?? 0) > 0 || (data?.by_age_group.length ?? 0) > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {(data?.by_gender.length ?? 0) > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">By Gender</h3>
              <div className="space-y-3">
                {(data?.by_gender ?? []).map((g) => {
                  const total = (data?.by_gender ?? []).reduce((s, x) => s + x.count, 0);
                  const pct = total > 0 ? Math.round((g.count / total) * 100) : 0;
                  return (
                    <div key={g.gender} className="flex items-center gap-3">
                      <span className="text-xs text-gray-500 w-16 shrink-0 capitalize">{g.gender}</span>
                      <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
                        <div className="bg-teal-500 h-full rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs text-gray-600 w-20 text-right">{g.count} ({pct}%)</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {(data?.by_age_group.length ?? 0) > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">By Age Group</h3>
              <div className="space-y-3">
                {(data?.by_age_group ?? []).map((g) => {
                  const maxAge = Math.max(...(data?.by_age_group.map((x) => x.count) ?? [1]), 1);
                  const pct = Math.round((g.count / maxAge) * 100);
                  return (
                    <div key={g.group} className="flex items-center gap-3">
                      <span className="text-xs text-gray-500 w-16 shrink-0">{g.group}</span>
                      <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
                        <div className="bg-orange-400 h-full rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs text-gray-600 w-8 text-right">{g.count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Visitor Conversion ────────────────────────────────────────────────────────

const FUNNEL_COLORS = ["bg-blue-500", "bg-gray-100", "bg-gray-100"];

function ConversionTab() {
  const [months, setMonths] = useState(3);
  const { data, isLoading } = useQuery({
    queryKey: ["visitor-conversion", BRANCH_ID, months],
    queryFn: () => getVisitorConversion(BRANCH_ID, months),
  });

  const funnel = data?.funnel ?? [];
  const firstVisits = funnel[0]?.count ?? 0;
  const converted = funnel[funnel.length - 1]?.count ?? 0;
  const conversionRate = firstVisits > 0 ? Math.round((converted / firstVisits) * 100) : 0;
  const maxFunnel = Math.max(...funnel.map((f) => f.count), 1);

  const maxMonth = Math.max(...(data?.by_month.map((m) => m.first_visits) ?? [1]), 1);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <label className="text-xs font-medium text-gray-600">Period</label>
        <select value={months} onChange={(e) => setMonths(Number(e.target.value))}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300">
          {[1, 3, 6, 12].map((m) => <option key={m} value={m}>Last {m} month{m > 1 ? "s" : ""}</option>)}
        </select>
        {data && firstVisits > 0 && (
          <span className="ml-auto text-sm font-semibold text-gray-600">
            {conversionRate}% visit → member
          </span>
        )}
      </div>

      {isLoading ? (
        <p className="text-center text-gray-400 text-sm py-8">Loading…</p>
      ) : (
        <>
          {/* Funnel */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-semibold text-gray-900">Conversion Funnel</h3>
            {funnel.length === 0 ? (
              <p className="text-center text-gray-400 text-sm py-4">No visitor data in this period.</p>
            ) : (
              funnel.map((f, i) => {
                const pct = Math.round((f.count / maxFunnel) * 100);
                const color = FUNNEL_COLORS[i] ?? "bg-gray-400";
                return (
                  <div key={f.step} className="flex items-center gap-4">
                    <div className="w-36 shrink-0">
                      <p className="text-sm font-medium text-gray-700">{f.step}</p>
                    </div>
                    <div className="flex-1 bg-gray-100 rounded-full h-8 overflow-hidden flex items-center">
                      <div className={cn("h-full rounded-full flex items-center justify-end pr-3 transition-all", color)}
                        style={{ width: `${Math.max(8, pct)}%` }}>
                        <span className="text-white text-xs font-bold">{f.count}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Monthly trend */}
          {(data?.by_month.length ?? 0) > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Monthly Trend</h3>
              <div className="flex items-end gap-3 h-36 overflow-x-auto pb-2">
                {(data?.by_month ?? []).map((m) => {
                  const h1 = Math.round((m.first_visits / maxMonth) * 100);
                  const h2 = Math.round((m.followed_up / maxMonth) * 100);
                  const h3 = Math.round((m.converted / maxMonth) * 100);
                  return (
                    <div key={m.month} className="flex flex-col items-center gap-1 min-w-[60px]">
                      <div className="flex items-end gap-0.5 h-28">
                        <div className="w-3 bg-blue-500 rounded-t-sm" style={{ height: `${Math.max(4, h1)}%` }} title={`${m.first_visits} visits`} />
                        <div className="w-3 bg-gray-100 rounded-t-sm" style={{ height: `${Math.max(0, h2)}%` }} title={`${m.followed_up} followed up`} />
                        <div className="w-3 bg-gray-100 rounded-t-sm" style={{ height: `${Math.max(0, h3)}%` }} title={`${m.converted} converted`} />
                      </div>
                      <span className="text-[9px] text-gray-400 rotate-45 origin-left whitespace-nowrap mt-1">{monthLabel(m.month)}</span>
                    </div>
                  );
                })}
              </div>
              <div className="mt-3 flex gap-4 text-xs text-gray-500">
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-500 inline-block" /> Visits</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-gray-100 inline-block" /> Followed Up</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-gray-100 inline-block" /> Became Member</span>
              </div>
            </div>
          )}

          {/* How heard */}
          {(data?.how_heard.length ?? 0) > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">How They Heard</h3>
              <div className="space-y-3">
                {(data?.how_heard ?? []).map((h) => {
                  const total = (data?.how_heard ?? []).reduce((s, x) => s + x.count, 0);
                  const pct = total > 0 ? Math.round((h.count / total) * 100) : 0;
                  return (
                    <div key={h.how_heard} className="flex items-center gap-3">
                      <span className="text-xs text-gray-500 w-36 shrink-0 capitalize">{h.how_heard.replace(/_/g, " ")}</span>
                      <div className="flex-1 bg-gray-100 rounded-full h-2.5 overflow-hidden">
                        <div className="bg-gray-100 h-full rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs text-gray-600 w-16 text-right">{h.count} ({pct}%)</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
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
  const droppedMap = Object.fromEntries((data?.dropped ?? []).map((s) => [s.stage, s.count]));
  const maxCount = Math.max(
    ...(data?.stage_order ?? []).map((s) => (inProgressMap[s] ?? 0) + (completedMap[s] ?? 0) + (droppedMap[s] ?? 0)),
    1,
  );

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
              const dropped = droppedMap[stage] ?? 0;
              return (
                <div key={stage} className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-full bg-gray-100 text-gray-600 text-xs font-bold flex items-center justify-center shrink-0">
                    {i + 1}
                  </div>
                  <div className="w-36 shrink-0">
                    <p className="text-sm text-gray-700">{STAGE_LABELS[stage] ?? stage}</p>
                  </div>
                  <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden flex">
                    <div className="bg-gray-100 h-full" style={{ width: `${Math.round((done / maxCount) * 100)}%` }} />
                    <div className="bg-gray-100 h-full" style={{ width: `${Math.round((inP / maxCount) * 100)}%` }} />
                    <div className="bg-red-300 h-full" style={{ width: `${Math.round((dropped / maxCount) * 100)}%` }} />
                  </div>
                  <div className="w-36 text-right shrink-0 space-x-1">
                    {done > 0 && <span className="text-xs text-gray-600 font-medium">{done} done</span>}
                    {inP > 0 && <span className="text-xs text-gray-500">{done > 0 ? "· " : ""}{inP} active</span>}
                    {dropped > 0 && <span className="text-xs text-red-400">{(done > 0 || inP > 0) ? "· " : ""}{dropped} dropped</span>}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-gray-100 inline-block" /> Completed</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-gray-100 inline-block" /> In Progress</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-300 inline-block" /> Dropped</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Group Health ──────────────────────────────────────────────────────────────

function TrendBadge({ trend, delta }: { trend: string; delta: number }) {
  if (trend === "growing") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
        ↑ +{delta}
      </span>
    );
  }
  if (trend === "shrinking") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
        ↓ {delta}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
      ↔ Stable
    </span>
  );
}

function GroupHealthTab() {
  const { data, isLoading } = useQuery({
    queryKey: ["group-health", BRANCH_ID],
    queryFn: () => getGroupHealth(BRANCH_ID),
  });

  const groups = data?.groups ?? [];

  return (
    <div className="space-y-4">
      {isLoading ? (
        <p className="text-center text-gray-400 text-sm py-8">Loading…</p>
      ) : !groups.length ? (
        <p className="text-center text-gray-400 text-sm py-8">No groups found.</p>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-100">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Group</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase hidden sm:table-cell">Type</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase hidden md:table-cell">Leader</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Members</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Meetings (4w)</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Trend (8w)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {groups.map((g) => {
                const isActive = g.recent_meetings > 0;
                return (
                  <tr key={g.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 text-sm font-medium text-gray-900">{g.name}</td>
                    <td className="px-4 py-2.5 text-xs text-gray-500 hidden sm:table-cell">{TYPE_LABELS[g.type] ?? g.type}</td>
                    <td className="px-4 py-2.5 text-xs text-gray-500 hidden md:table-cell">{g.leader__full_name ?? "—"}</td>
                    <td className="px-4 py-2.5 text-sm text-gray-700 text-right font-medium">{g.member_count}</td>
                    <td className="px-4 py-2.5 text-center">
                      <span className={cn(
                        "inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-medium",
                        isActive ? "bg-green-100 text-green-700" : "bg-red-50 text-red-500",
                      )}>
                        {g.recent_meetings}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <TrendBadge trend={g.trend} delta={g.trend_delta} />
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
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300">
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
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
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
                        <span className="text-gray-500">{m.last_seen} <span className="text-gray-400 text-xs">({daysAgo}d ago)</span></span>
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
                ? "border-gray-900 text-blue-700"
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
