"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Download, Lock, Unlock, Plus, X } from "lucide-react";
import {
  getGivingByMember, getTopGivers, getLapsedGivers,
  getFinancialPeriods, createFinancialPeriod, lockPeriod, unlockPeriod,
  type GivingByMember, type LapsedGiver, type FinancialPeriod,
} from "@/lib/api/finance";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/dashboard/page-header";
import { cn } from "@/lib/utils";

const BRANCH_ID = 1;
const FIELD = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300 focus:border-gray-400 bg-white";
const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

type Tab = "by-member" | "top-givers" | "lapsed" | "periods";

function fmt(v: string | number, currency = "GHS") {
  return `${currency} ${Number(v).toLocaleString("en-GH", { minimumFractionDigits: 2 })}`;
}

function exportCSV(headers: string[], rows: (string | number | null | undefined)[][], filename: string) {
  const lines = rows.map((r) => r.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(","));
  const csv = [headers.join(","), ...lines].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ── By Member ─────────────────────────────────────────────────────────────────

function ByMemberTab() {
  const [year, setYear] = useState(new Date().getFullYear());
  const { data, isLoading } = useQuery({
    queryKey: ["giving-by-member", BRANCH_ID, year],
    queryFn: () => getGivingByMember(BRANCH_ID, year),
  });

  function doExport() {
    if (!data) return;
    exportCSV(
      ["Member", "Currency", "Contributions", "Total"],
      data.map((r) => [r.member__full_name, r.currency, r.count, r.total]),
      `giving-${year}.csv`,
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-gray-600">Year</label>
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
          >
            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        <Button variant="outline" size="sm" onClick={doExport} disabled={!data?.length}>
          <Download size={14} /> Export CSV
        </Button>
        <span className="text-xs text-gray-400 ml-auto">
          {data ? `${data.length} members · Total: ${fmt(data.reduce((s, r) => s + Number(r.total), 0))}` : ""}
        </span>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-400 text-sm">Loading…</div>
        ) : !data?.length ? (
          <div className="p-8 text-center text-gray-400 text-sm">No giving data for {year}.</div>
        ) : (
          <table className="min-w-full divide-y divide-gray-100">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">#</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Member</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Contributions</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Total</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase w-48">Progress</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data.map((r: GivingByMember, i) => {
                const maxTotal = Number(data[0].total);
                const pct = maxTotal > 0 ? (Number(r.total) / maxTotal) * 100 : 0;
                return (
                  <tr key={r.member} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 text-xs text-gray-400">{i + 1}</td>
                    <td className="px-4 py-2.5 text-sm text-gray-800 font-medium">{r.member__full_name}</td>
                    <td className="px-4 py-2.5 text-sm text-gray-500 text-right">{r.count}</td>
                    <td className="px-4 py-2.5 text-sm font-semibold text-gray-900 text-right">{fmt(r.total, r.currency)}</td>
                    <td className="px-4 py-2.5">
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ── Top Givers ────────────────────────────────────────────────────────────────

function TopGiversTab() {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [limit, setLimit] = useState(20);

  const { data, isLoading } = useQuery({
    queryKey: ["top-givers", BRANCH_ID, dateFrom, dateTo, limit],
    queryFn: () => getTopGivers(BRANCH_ID, { date_from: dateFrom || undefined, date_to: dateTo || undefined, limit }),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
          placeholder="From" className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300" />
        <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
          placeholder="To" className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300" />
        <select value={limit} onChange={(e) => setLimit(Number(e.target.value))}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300">
          {[10, 20, 50, 100].map((n) => <option key={n} value={n}>Top {n}</option>)}
        </select>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-400 text-sm">Loading…</div>
        ) : !data?.length ? (
          <div className="p-8 text-center text-gray-400 text-sm">No giving data for this period.</div>
        ) : (
          <table className="min-w-full divide-y divide-gray-100">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Rank</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Member</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Contributions</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data.map((r: GivingByMember, i) => (
                <tr key={r.member} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5">
                    <span className={cn(
                      "inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold",
                      i === 0 ? "bg-yellow-100 text-yellow-700" : i === 1 ? "bg-gray-100 text-gray-600" : i === 2 ? "bg-orange-50 text-orange-600" : "text-gray-400 text-[11px]",
                    )}>
                      {i + 1}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-sm font-medium text-gray-900">{r.member__full_name}</td>
                  <td className="px-4 py-2.5 text-sm text-gray-500 text-right">{r.count}</td>
                  <td className="px-4 py-2.5 text-sm font-bold text-gray-900 text-right">{fmt(r.total, r.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ── Lapsed Givers ─────────────────────────────────────────────────────────────

function LapsedTab() {
  const [days, setDays] = useState(90);
  const { data, isLoading } = useQuery({
    queryKey: ["lapsed-givers", BRANCH_ID, days],
    queryFn: () => getLapsedGivers(BRANCH_ID, days),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <label className="text-xs font-medium text-gray-600">Haven't given in</label>
        <select value={days} onChange={(e) => setDays(Number(e.target.value))}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300">
          {[30, 60, 90, 180, 365].map((d) => <option key={d} value={d}>{d} days</option>)}
        </select>
        {data && <span className="text-xs text-gray-400">{data.length} member{data.length !== 1 ? "s" : ""}</span>}
      </div>

      <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-400 text-sm">Loading…</div>
        ) : !data?.length ? (
          <div className="p-8 text-center text-gray-400 text-sm">No lapsed givers in this window.</div>
        ) : (
          <table className="min-w-full divide-y divide-gray-100">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Member</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Last Gave</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Total Given</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data.map((r: LapsedGiver) => (
                <tr key={r.member_id} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5 text-sm font-medium text-gray-900">{r.member_name}</td>
                  <td className="px-4 py-2.5 text-sm text-gray-500">{r.last_given ?? "—"}</td>
                  <td className="px-4 py-2.5 text-sm text-gray-700 text-right">{fmt(r.total_given)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ── Period Lock ───────────────────────────────────────────────────────────────

function PeriodsTab() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [newYear, setNewYear] = useState(new Date().getFullYear());
  const [newMonth, setNewMonth] = useState(new Date().getMonth() + 1);

  const { data: periods, isLoading } = useQuery({
    queryKey: ["periods", BRANCH_ID],
    queryFn: () => getFinancialPeriods(BRANCH_ID),
  });

  const createMut = useMutation({
    mutationFn: () => createFinancialPeriod({ year: newYear, month: newMonth }, BRANCH_ID),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["periods", BRANCH_ID] }); setShowCreate(false); },
  });

  const lockMut = useMutation({
    mutationFn: (id: number) => lockPeriod(id, BRANCH_ID),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["periods", BRANCH_ID] }),
  });

  const unlockMut = useMutation({
    mutationFn: (id: number) => unlockPeriod(id, BRANCH_ID),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["periods", BRANCH_ID] }),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500">Lock a period to prevent new contributions from being recorded against it.</p>
        <Button size="sm" onClick={() => setShowCreate((v) => !v)}>
          {showCreate ? <X size={14} /> : <Plus size={14} />}
          {showCreate ? "Cancel" : "Add Period"}
        </Button>
      </div>

      {showCreate && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex items-center gap-3">
          <select value={newYear} onChange={(e) => setNewYear(Number(e.target.value))}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300">
            {Array.from({ length: 3 }, (_, i) => new Date().getFullYear() - i).map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <select value={newMonth} onChange={(e) => setNewMonth(Number(e.target.value))}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300">
            {MONTH_NAMES.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
          </select>
          <Button size="sm" onClick={() => createMut.mutate()} disabled={createMut.isPending}>
            Create
          </Button>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-400 text-sm">Loading…</div>
        ) : !periods?.length ? (
          <div className="p-8 text-center text-gray-400 text-sm">No financial periods created yet.</div>
        ) : (
          <table className="min-w-full divide-y divide-gray-100">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Period</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Locked By</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Locked At</th>
                <th className="px-4 py-3 w-24" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {periods.map((p: FinancialPeriod) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5 text-sm font-medium text-gray-900">
                    {MONTH_NAMES[p.month - 1]} {p.year}
                  </td>
                  <td className="px-4 py-2.5">
                    <Badge variant={p.is_locked ? "danger" : "success"}>
                      {p.is_locked ? "Locked" : "Open"}
                    </Badge>
                  </td>
                  <td className="px-4 py-2.5 text-sm text-gray-500">{p.locked_by_name ?? "—"}</td>
                  <td className="px-4 py-2.5 text-sm text-gray-400">
                    {p.locked_at ? new Date(p.locked_at).toLocaleDateString("en-GH") : "—"}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {p.is_locked ? (
                      <Button size="sm" variant="outline" onClick={() => unlockMut.mutate(p.id)} disabled={unlockMut.isPending}>
                        <Unlock size={12} /> Unlock
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => lockMut.mutate(p.id)} disabled={lockMut.isPending}>
                        <Lock size={12} /> Lock
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

const TABS: { id: Tab; label: string }[] = [
  { id: "by-member", label: "By Member" },
  { id: "top-givers", label: "Top Givers" },
  { id: "lapsed", label: "Lapsed Givers" },
  { id: "periods", label: "Period Lock" },
];

export default function FinanceReportsPage() {
  const [tab, setTab] = useState<Tab>("by-member");

  return (
    <div className="p-6 space-y-6">
      <PageHeader title="Finance Reports" description="Giving analysis and period management." />

      <div className="flex gap-1 border-b border-gray-200">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px",
              tab === t.id
                ? "border-gray-900 text-blue-700"
                : "border-transparent text-gray-500 hover:text-gray-700",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "by-member"  && <ByMemberTab />}
      {tab === "top-givers" && <TopGiversTab />}
      {tab === "lapsed"     && <LapsedTab />}
      {tab === "periods"    && <PeriodsTab />}
    </div>
  );
}
