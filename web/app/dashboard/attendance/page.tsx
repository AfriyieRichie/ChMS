"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus, X, ChevronDown, ChevronUp, Users, Calendar,
  Pencil, Trash2, UserCheck, Filter,
} from "lucide-react";
import {
  getAttendanceRecords, getAttendanceRecord, getAttendanceEntries,
  createAttendanceRecord, updateAttendanceRecord, deleteAttendanceRecord,
  addAttendanceEntry, getServiceTypes, getAllServiceTypes,
  createServiceType, updateServiceType,
  type AttendanceRecord, type ServiceType, type AttendanceEntry,
} from "@/lib/api/attendance";
import { getMembers } from "@/lib/api/members";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/dashboard/page-header";
import { cn } from "@/lib/utils";

const BRANCH_ID = 1;
const FIELD = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 bg-white disabled:bg-gray-50";

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function fmt(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getDate()} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
}

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

// ── Mini trend chart (CSS bars) ───────────────────────────────────────────────

function TrendChart({ records }: { records: AttendanceRecord[] }) {
  const weeks = useMemo(() => {
    const map = new Map<string, number>();
    records.forEach((r) => {
      const d = new Date(r.date);
      const mon = new Date(d);
      mon.setDate(d.getDate() - d.getDay() + (d.getDay() === 0 ? -6 : 1));
      const key = mon.toISOString().slice(0, 10);
      map.set(key, (map.get(key) ?? 0) + r.total_count);
    });
    const sorted = Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0])).slice(-8);
    const max = Math.max(...sorted.map((e) => e[1]), 1);
    return sorted.map(([week, total]) => {
      const d = new Date(week);
      return { label: `${d.getDate()} ${MONTH_NAMES[d.getMonth()]}`, total, pct: (total / max) * 100 };
    });
  }, [records]);

  if (weeks.length === 0) return null;

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Weekly Trend (last 8 weeks)</p>
      <div className="flex items-end gap-1.5 h-16">
        {weeks.map((w) => (
          <div key={w.label} className="flex-1 flex flex-col items-center gap-1">
            <div
              className="w-full bg-blue-500 rounded-t-sm min-h-[4px] transition-all"
              style={{ height: `${w.pct}%` }}
              title={`${w.label}: ${w.total}`}
            />
          </div>
        ))}
      </div>
      <div className="flex gap-1.5 mt-1">
        {weeks.map((w) => (
          <div key={w.label} className="flex-1 text-[9px] text-center text-gray-400 leading-tight">
            {w.label}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Record form (create / edit) ───────────────────────────────────────────────

interface RecordFormProps {
  branchId: number;
  serviceTypes: ServiceType[];
  editing?: AttendanceRecord;
  onClose: () => void;
}

function RecordForm({ branchId, serviceTypes, editing, onClose }: RecordFormProps) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    service_type: String(editing?.service_type ?? ""),
    date: editing?.date ?? new Date().toISOString().slice(0, 10),
    attendance_type: editing?.attendance_type ?? "physical",
    total_count: String(editing?.total_count ?? ""),
    male_count: String(editing?.male_count ?? ""),
    female_count: String(editing?.female_count ?? ""),
    children_count: String(editing?.children_count ?? ""),
    first_timers: String(editing?.first_timers ?? ""),
    notes: editing?.notes ?? "",
  });

  const createMut = useMutation({
    mutationFn: (p: Partial<AttendanceRecord>) => createAttendanceRecord({ ...p, branch: branchId }, branchId),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["attendance", branchId] }); onClose(); },
  });

  const updateMut = useMutation({
    mutationFn: (p: Partial<AttendanceRecord>) => updateAttendanceRecord(editing!.id, p, branchId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance", branchId] });
      queryClient.invalidateQueries({ queryKey: ["attendance-record", editing!.id, branchId] });
      onClose();
    },
  });

  const isPending = createMut.isPending || updateMut.isPending;
  const isError   = createMut.isError || updateMut.isError;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const payload: Partial<AttendanceRecord> = {
      service_type: Number(form.service_type),
      date: form.date,
      attendance_type: form.attendance_type as "physical" | "online",
      total_count: Number(form.total_count),
      male_count: Number(form.male_count) || 0,
      female_count: Number(form.female_count) || 0,
      children_count: Number(form.children_count) || 0,
      first_timers: Number(form.first_timers) || 0,
      notes: form.notes,
    };
    editing ? updateMut.mutate(payload) : createMut.mutate(payload);
  }

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <form onSubmit={submit} className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-gray-900 text-sm">{editing ? "Edit Record" : "New Attendance Record"}</h2>
        <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-600">Service Type *</label>
          <select required value={form.service_type} onChange={set("service_type")} className={FIELD}>
            <option value="">Select…</option>
            {serviceTypes.map((st) => <option key={st.id} value={st.id}>{st.name}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-600">Date *</label>
          <input type="date" required value={form.date} onChange={set("date")} className={FIELD} />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-600">Attendance Type</label>
          <select value={form.attendance_type} onChange={set("attendance_type")} className={FIELD}>
            <option value="physical">Physical</option>
            <option value="online">Online</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-600">Total Count *</label>
          <input type="number" min="0" required value={form.total_count} onChange={set("total_count")} className={FIELD} />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-600">Male</label>
          <input type="number" min="0" value={form.male_count} onChange={set("male_count")} className={FIELD} />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-600">Female</label>
          <input type="number" min="0" value={form.female_count} onChange={set("female_count")} className={FIELD} />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-600">Children</label>
          <input type="number" min="0" value={form.children_count} onChange={set("children_count")} className={FIELD} />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-600">First Timers</label>
          <input type="number" min="0" value={form.first_timers} onChange={set("first_timers")} className={FIELD} />
        </div>
        <div className="col-span-2 space-y-1">
          <label className="text-xs font-medium text-gray-600">Notes</label>
          <textarea value={form.notes} onChange={set("notes")} rows={2} className={FIELD} />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? "Saving…" : editing ? "Update" : "Save Record"}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={onClose}>Cancel</Button>
        {isError && <p className="text-xs text-red-500">Failed to save.</p>}
      </div>
    </form>
  );
}

// ── Individual entries panel ──────────────────────────────────────────────────

function EntriesPanel({ record, branchId, onClose }: { record: AttendanceRecord; branchId: number; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [memberSearch, setMemberSearch] = useState("");
  const [firstVisit, setFirstVisit] = useState(false);

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["attendance-entries", record.id, branchId],
    queryFn: () => getAttendanceEntries(record.id, branchId),
  });

  const { data: membersData } = useQuery({
    queryKey: ["members", branchId, { search: memberSearch }],
    queryFn: () => getMembers(branchId, { search: memberSearch }),
    enabled: memberSearch.length >= 2,
  });

  const addMut = useMutation({
    mutationFn: (memberId: number) =>
      addAttendanceEntry(record.id, branchId, { member: memberId, is_first_visit: firstVisit }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance-entries", record.id, branchId] });
      setMemberSearch("");
    },
  });

  const filteredEntries = entries.filter((e) =>
    e.member_name.toLowerCase().includes(search.toLowerCase()),
  );

  const existingMemberIds = new Set(entries.map((e) => e.member));
  const memberSuggestions = (membersData?.results ?? []).filter((m) => !existingMemberIds.has(m.id));

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-96 bg-white border-l border-gray-200 shadow-2xl flex flex-col">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div>
          <h2 className="font-semibold text-gray-900">Attendance Entries</h2>
          <p className="text-xs text-gray-400">{fmt(record.date)} — {record.service_type_name}</p>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
      </div>

      {/* Add member */}
      <div className="px-5 py-3 border-b border-gray-100 space-y-2">
        <div className="relative">
          <input
            type="search"
            placeholder="Search members to add…"
            value={memberSearch}
            onChange={(e) => setMemberSearch(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
          />
          {memberSuggestions.length > 0 && memberSearch.length >= 2 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl border border-gray-200 shadow-xl z-10 max-h-48 overflow-auto">
              {memberSuggestions.slice(0, 8).map((m) => (
                <button
                  key={m.id}
                  onClick={() => addMut.mutate(m.id)}
                  disabled={addMut.isPending}
                  className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-gray-50 text-left transition-colors"
                >
                  <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-[10px] font-semibold flex items-center justify-center shrink-0">
                    {m.full_name.split(" ").slice(0,2).map((n) => n[0]).join("")}
                  </div>
                  <span className="text-sm text-gray-800">{m.full_name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
          <input type="checkbox" checked={firstVisit} onChange={(e) => setFirstVisit(e.target.checked)} className="rounded" />
          Mark as first visit
        </label>
      </div>

      {/* Search existing */}
      <div className="px-5 py-2 border-b border-gray-100">
        <input
          type="search"
          placeholder="Filter entries…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
        />
      </div>

      {/* Entry list */}
      <div className="flex-1 overflow-auto px-5 py-3 space-y-1">
        {isLoading && <p className="text-sm text-gray-400 text-center py-6">Loading…</p>}
        {!isLoading && filteredEntries.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-6">No entries yet.</p>
        )}
        {filteredEntries.map((entry) => (
          <div key={entry.id} className="flex items-center gap-2.5 py-2">
            <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 text-[11px] font-semibold flex items-center justify-center shrink-0">
              {entry.member_name.split(" ").slice(0,2).map((n) => n[0]).join("")}
            </div>
            <span className="text-sm text-gray-800 flex-1">{entry.member_name}</span>
            {entry.is_first_visit && (
              <Badge variant="success" className="text-[10px]">First visit</Badge>
            )}
          </div>
        ))}
      </div>

      <div className="px-5 py-3 border-t border-gray-100 text-xs text-gray-400 text-center">
        {entries.length} member{entries.length !== 1 ? "s" : ""} recorded
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function AttendancePage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<AttendanceRecord | null>(null);
  const [entriesRecord, setEntriesRecord] = useState<AttendanceRecord | null>(null);
  const [showServiceTypes, setShowServiceTypes] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [newSTName, setNewSTName] = useState("");
  const [filters, setFilters] = useState({ date_from: "", date_to: "", service_type: "" });

  const activeParams = {
    date_from: filters.date_from || undefined,
    date_to: filters.date_to || undefined,
    service_type: filters.service_type ? Number(filters.service_type) : undefined,
    page,
  };

  const { data: records, isLoading } = useQuery({
    queryKey: ["attendance", BRANCH_ID, activeParams],
    queryFn: () => getAttendanceRecords(BRANCH_ID, activeParams),
    placeholderData: (prev) => prev,
  });

  // For stats + trend, fetch last 90 days without pagination
  const { data: recentRecords } = useQuery({
    queryKey: ["attendance-recent", BRANCH_ID],
    queryFn: () => getAttendanceRecords(BRANCH_ID, {
      date_from: new Date(Date.now() - 90 * 86400_000).toISOString().slice(0, 10),
    }),
    staleTime: 60_000 * 5,
  });

  const { data: serviceTypes = [] } = useQuery({
    queryKey: ["service-types", BRANCH_ID],
    queryFn: () => getServiceTypes(BRANCH_ID),
  });

  const { data: allServiceTypes } = useQuery({
    queryKey: ["all-service-types", BRANCH_ID],
    queryFn: () => getAllServiceTypes(BRANCH_ID),
    enabled: showServiceTypes,
  });

  const createSTMut = useMutation({
    mutationFn: (name: string) => createServiceType({ name, is_active: true }, BRANCH_ID),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service-types", BRANCH_ID] });
      queryClient.invalidateQueries({ queryKey: ["all-service-types", BRANCH_ID] });
      setNewSTName("");
    },
  });

  const toggleSTMut = useMutation({
    mutationFn: ({ id, is_active }: { id: number; is_active: boolean }) =>
      updateServiceType(id, { is_active }, BRANCH_ID),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service-types", BRANCH_ID] });
      queryClient.invalidateQueries({ queryKey: ["all-service-types", BRANCH_ID] });
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => deleteAttendanceRecord(id, BRANCH_ID),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["attendance", BRANCH_ID] }),
  });

  // ── Stats ─────────────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const allRec = recentRecords?.results ?? [];
    const now = new Date();
    const monthRec = allRec.filter((r) => {
      const d = new Date(r.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const thisMonth = monthRec.reduce((s, r) => s + r.total_count, 0);
    const thisMonthFT = monthRec.reduce((s, r) => s + r.first_timers, 0);
    const avg = monthRec.length > 0 ? Math.round(thisMonth / monthRec.length) : 0;
    return { thisMonth, avg, thisMonthFT, services: monthRec.length };
  }, [recentRecords]);

  const activeFilterCount = [filters.date_from, filters.date_to, filters.service_type].filter(Boolean).length;

  function openEdit(r: AttendanceRecord) { setEditing(r); setShowForm(true); }
  function closeForm() { setShowForm(false); setEditing(null); }

  return (
    <div className="p-6 space-y-4">
      <PageHeader title="Attendance" description="Track service attendance records.">
        <Button size="sm" onClick={() => { setEditing(null); setShowForm((v) => !v); }}>
          {showForm && !editing ? <X size={14} /> : <Plus size={14} />}
          {showForm && !editing ? "Cancel" : "Record Attendance"}
        </Button>
      </PageHeader>

      {/* Create / edit form */}
      {showForm && (
        <RecordForm
          branchId={BRANCH_ID}
          serviceTypes={serviceTypes}
          editing={editing ?? undefined}
          onClose={closeForm}
        />
      )}

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="This month" value={stats.thisMonth.toLocaleString()} sub={`${stats.services} services`} />
        <StatCard label="Avg per service" value={stats.avg.toLocaleString()} />
        <StatCard label="First timers" value={stats.thisMonthFT.toLocaleString()} sub="this month" />
        <StatCard label="Total records" value={records?.count ?? "—"} />
      </div>

      {/* Trend chart */}
      {(recentRecords?.results?.length ?? 0) > 0 && (
        <TrendChart records={recentRecords!.results} />
      )}

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setShowFilters((v) => !v)}
          className={cn(
            "inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition-colors",
            showFilters || activeFilterCount > 0
              ? "bg-blue-600 text-white border-blue-600"
              : "bg-white text-gray-600 border-gray-300 hover:border-gray-400",
          )}
        >
          <Filter size={14} />
          Filters
          {activeFilterCount > 0 && (
            <span className="bg-white/30 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5">
              {activeFilterCount}
            </span>
          )}
          {showFilters ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {showFilters && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">From</label>
              <input type="date" value={filters.date_from}
                onChange={(e) => { setFilters((f) => ({ ...f, date_from: e.target.value })); setPage(1); }}
                className={FIELD} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">To</label>
              <input type="date" value={filters.date_to}
                onChange={(e) => { setFilters((f) => ({ ...f, date_to: e.target.value })); setPage(1); }}
                className={FIELD} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Service Type</label>
              <select value={filters.service_type}
                onChange={(e) => { setFilters((f) => ({ ...f, service_type: e.target.value })); setPage(1); }}
                className={FIELD}>
                <option value="">All</option>
                {serviceTypes.map((st) => <option key={st.id} value={st.id}>{st.name}</option>)}
              </select>
            </div>
          </div>
          <div className="mt-3 flex justify-end">
            <button
              onClick={() => { setFilters({ date_from: "", date_to: "", service_type: "" }); setPage(1); }}
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              Clear filters
            </button>
          </div>
        </div>
      )}

      {/* Records table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="divide-y divide-gray-50">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-3.5">
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 bg-gray-100 rounded animate-pulse w-32" />
                  <div className="h-2.5 bg-gray-100 rounded animate-pulse w-20" />
                </div>
                <div className="h-5 w-16 bg-gray-100 rounded-full animate-pulse" />
                <div className="h-5 w-12 bg-gray-100 rounded animate-pulse" />
              </div>
            ))}
          </div>
        ) : (
          <>
            <table className="min-w-full divide-y divide-gray-100">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Service</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">Type</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Total</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">M / F / Kids</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">First Timers</th>
                  <th className="px-4 py-3 w-28" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {records?.results.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-gray-400 text-sm">
                      No attendance records match your filters.
                    </td>
                  </tr>
                )}
                {records?.results.map((r: AttendanceRecord) => (
                  <tr key={r.id} className="hover:bg-gray-50 transition-colors group">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                          <Calendar size={14} className="text-blue-500" />
                        </div>
                        <span className="text-sm font-medium text-gray-900">{fmt(r.date)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{r.service_type_name}</td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <Badge variant={r.attendance_type === "online" ? "info" : "default"}>
                        {r.attendance_type === "online" ? "Online" : "Physical"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-sm font-bold text-gray-900">{r.total_count.toLocaleString()}</span>
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-gray-500 hidden md:table-cell">
                      {r.male_count > 0 || r.female_count > 0 || r.children_count > 0 ? (
                        <span>{r.male_count} / {r.female_count} / {r.children_count}</span>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-gray-500 hidden lg:table-cell">
                      {r.first_timers > 0 ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
                          <Users size={12} />
                          {r.first_timers}
                        </span>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => setEntriesRecord(r)}
                          className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors"
                          title="View individual entries"
                        >
                          <UserCheck size={14} />
                        </button>
                        <button
                          onClick={() => { openEdit(r); }}
                          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
                          title="Edit record"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm("Delete this attendance record?")) deleteMut.mutate(r.id);
                          }}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
                          title="Delete record"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {records && records.count > 0 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 text-sm text-gray-500">
                <span>{records.count} record{records.count !== 1 ? "s" : ""}</span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={!records.previous}>
                    Previous
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={!records.next}>
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Service Types */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <button
          onClick={() => setShowServiceTypes((v) => !v)}
          className="w-full flex items-center justify-between px-5 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <span>Manage Service Types</span>
          {showServiceTypes ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
        </button>

        {showServiceTypes && (
          <div className="border-t border-gray-100 px-5 py-4 space-y-3">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="New service type name…"
                value={newSTName}
                onChange={(e) => setNewSTName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && newSTName.trim()) { e.preventDefault(); createSTMut.mutate(newSTName.trim()); } }}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 bg-white"
              />
              <Button size="sm" disabled={!newSTName.trim() || createSTMut.isPending}
                onClick={() => { if (newSTName.trim()) createSTMut.mutate(newSTName.trim()); }}>
                <Plus size={14} /> Add
              </Button>
            </div>
            <div className="divide-y divide-gray-50">
              {!allServiceTypes && <p className="text-sm text-gray-400 py-2">Loading…</p>}
              {allServiceTypes?.length === 0 && <p className="text-sm text-gray-400 py-2">No service types yet.</p>}
              {allServiceTypes?.map((st: ServiceType) => (
                <div key={st.id} className="flex items-center justify-between py-2.5">
                  <span className={cn("text-sm", st.is_active ? "text-gray-800" : "text-gray-400 line-through")}>
                    {st.name}
                  </span>
                  <button
                    onClick={() => toggleSTMut.mutate({ id: st.id, is_active: !st.is_active })}
                    disabled={toggleSTMut.isPending}
                    className={cn(
                      "text-xs px-2.5 py-1 rounded-full font-medium transition-colors",
                      st.is_active
                        ? "bg-green-100 text-green-700 hover:bg-red-50 hover:text-red-600"
                        : "bg-gray-100 text-gray-500 hover:bg-green-50 hover:text-green-700",
                    )}
                  >
                    {st.is_active ? "Active" : "Inactive"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Individual entries slide-in */}
      {entriesRecord && (
        <EntriesPanel
          record={entriesRecord}
          branchId={BRANCH_ID}
          onClose={() => setEntriesRecord(null)}
        />
      )}
    </div>
  );
}
