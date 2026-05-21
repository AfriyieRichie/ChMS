"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus, X, Users, Calendar, Pencil, Trash2, UserCheck,
  Filter, ChevronDown, ChevronUp, QrCode, Baby, UserPlus,
  CheckCircle, Circle, AlertTriangle, ArrowRight,
} from "lucide-react";
import {
  getAttendanceRecords, getAttendanceEntries,
  createAttendanceRecord, updateAttendanceRecord, deleteAttendanceRecord,
  addAttendanceEntry, removeAttendanceEntry,
  getServiceTypes, getAllServiceTypes, createServiceType, updateServiceType,
  getVisitors, createVisitor, updateVisitor,
  getChildCheckIns, createChildCheckIn, updateChildCheckIn,
  type AttendanceRecord, type ServiceType, type AttendanceEntry,
  type FirstTimeVisitor, type ChildCheckIn,
} from "@/lib/api/attendance";
import { getMembers, getMemberAttendance, type Member } from "@/lib/api/members";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/dashboard/page-header";
import { cn } from "@/lib/utils";

const BRANCH_ID = 1;
const FIELD = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 bg-white disabled:bg-gray-50";
const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const HOW_HEARD_LABELS: Record<string, string> = {
  friend: "Friend / Family", social_media: "Social Media",
  flyer: "Flyer / Poster", walk_in: "Walked In",
  radio_tv: "Radio / TV", website: "Website", other: "Other",
};

function fmt(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return `${d.getDate()} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
}

function weeksAgoDate(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n * 7);
  return d.toISOString().slice(0, 10);
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

// ── Trend chart ───────────────────────────────────────────────────────────────

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
          <div key={w.label} className="flex-1 flex flex-col items-center gap-1" title={`${w.label}: ${w.total}`}>
            <div className="w-full bg-neutral-700 rounded-t-sm min-h-[4px]" style={{ height: `${w.pct}%` }} />
          </div>
        ))}
      </div>
      <div className="flex gap-1.5 mt-1">
        {weeks.map((w) => (
          <div key={w.label} className="flex-1 text-[9px] text-center text-gray-400">{w.label}</div>
        ))}
      </div>
    </div>
  );
}

// ── Print child sticker ────────────────────────────────────────────────────────

function printChildSticker(child: ChildCheckIn, branchName = "First Assembly") {
  const html = `<!DOCTYPE html><html><head><title>Child Sticker</title>
<style>
  @page { size: 3.5in 2in; margin: 0; }
  body { font-family: Arial, sans-serif; margin: 0; padding: 0; }
  .sticker { width: 3.5in; height: 2in; border: 2px solid #111; border-radius: 8px;
    padding: 12px; box-sizing: border-box; display: flex; flex-direction: column; gap: 4px; }
  h1 { font-size: 10px; color: #6B7280; margin: 0 0 4px; text-transform: uppercase; letter-spacing: 1px; }
  h2 { font-size: 18px; font-weight: 900; margin: 0; color: #111; }
  p { font-size: 11px; margin: 2px 0; color: #374151; }
  .allergy { background: #FEE2E2; color: #991B1B; border-radius: 4px; padding: 2px 6px; font-weight: 700; font-size: 11px; }
  .code { font-size: 32px; font-weight: 900; color: #1D4ED8; text-align: center; margin-top: 4px; letter-spacing: 4px; }
  .code-label { font-size: 9px; color: #6B7280; text-align: center; text-transform: uppercase; }
</style></head><body>
<div class="sticker">
  <h1>${branchName} · Children</h1>
  <h2>${child.child_name}</h2>
  ${child.age ? `<p>Age: ${child.age}</p>` : ""}
  ${child.parent_name ? `<p>Parent: ${child.parent_name}</p>` : ""}
  ${child.parent_phone ? `<p>☎ ${child.parent_phone}</p>` : ""}
  ${child.allergy_notes ? `<p><span class="allergy">⚠ ${child.allergy_notes}</span></p>` : ""}
  <div class="code">${child.pickup_code}</div>
  <div class="code-label">Pickup Code</div>
</div>
<script>window.onload = () => window.print();</script>
</body></html>`;
  const w = window.open("", "_blank", "width=400,height=320");
  if (w) { w.document.write(html); w.document.close(); }
}

// ── QR Code modal ─────────────────────────────────────────────────────────────

function QRModal({ record, onClose }: { record: AttendanceRecord; onClose: () => void }) {
  const checkInUrl = `${window.location.origin}/check-in/${record.id}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(checkInUrl)}`;
  return (
    <div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl p-6 shadow-xl max-w-xs w-full" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Self Check-in QR</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
        </div>
        <p className="text-xs text-gray-500 mb-3">{fmt(record.date)} — {record.service_type_name}</p>
        <img src={qrUrl} alt="Check-in QR code" className="w-full rounded-lg" />
        <p className="text-xs text-gray-400 text-center mt-3">Members scan to self check-in</p>
        <p className="text-[10px] text-gray-300 text-center mt-1 break-all">{checkInUrl}</p>
      </div>
    </div>
  );
}

// ── Entries panel ─────────────────────────────────────────────────────────────

type EntryTab = "rollcall" | "visitors" | "children";

function EntriesPanel({ record, onClose }: { record: AttendanceRecord; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<EntryTab>("rollcall");
  const [memberSearch, setMemberSearch] = useState("");
  const [memberPage, setMemberPage] = useState(1);
  const [showQR, setShowQR] = useState(false);

  // Visitor form state
  const [visitorForm, setVisitorForm] = useState({ name: "", phone: "", email: "", how_heard: "", notes: "" });
  const [showVisitorForm, setShowVisitorForm] = useState(false);

  // Children form state
  const [childForm, setChildForm] = useState({ child_name: "", age: "", parent_name: "", parent_phone: "", allergy_notes: "" });
  const [showChildForm, setShowChildForm] = useState(false);

  const { data: entries = [] } = useQuery({
    queryKey: ["attendance-entries", record.id, BRANCH_ID],
    queryFn: () => getAttendanceEntries(record.id, BRANCH_ID),
  });

  const { data: membersData } = useQuery({
    queryKey: ["members-rollcall", BRANCH_ID, memberPage, memberSearch],
    queryFn: () => getMembers(BRANCH_ID, { page: memberPage, search: memberSearch || undefined }),
  });

  const { data: visitors = [], refetch: refetchVisitors } = useQuery({
    queryKey: ["visitors", record.id, BRANCH_ID],
    queryFn: () => getVisitors(record.id, BRANCH_ID),
    enabled: tab === "visitors",
  });

  const { data: children = [], refetch: refetchChildren } = useQuery({
    queryKey: ["children", record.id, BRANCH_ID],
    queryFn: () => getChildCheckIns(record.id, BRANCH_ID),
    enabled: tab === "children",
  });

  const presentIds = new Set(entries.map((e) => e.member));

  const addMut = useMutation({
    mutationFn: (payload: { member: number; is_first_visit?: boolean }) =>
      addAttendanceEntry(record.id, BRANCH_ID, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["attendance-entries", record.id, BRANCH_ID] }),
  });

  const removeMut = useMutation({
    mutationFn: (entryId: number) => removeAttendanceEntry(record.id, entryId, BRANCH_ID),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["attendance-entries", record.id, BRANCH_ID] }),
  });

  const createVisitorMut = useMutation({
    mutationFn: () => createVisitor({ ...visitorForm, attendance_record: record.id }, BRANCH_ID),
    onSuccess: () => {
      refetchVisitors();
      setVisitorForm({ name: "", phone: "", email: "", how_heard: "", notes: "" });
      setShowVisitorForm(false);
    },
  });

  const followUpMut = useMutation({
    mutationFn: ({ id, followed_up }: { id: number; followed_up: boolean }) =>
      updateVisitor(id, { followed_up }, BRANCH_ID),
    onSuccess: () => refetchVisitors(),
  });

  const createChildMut = useMutation({
    mutationFn: () => createChildCheckIn({
      ...childForm,
      age: childForm.age ? Number(childForm.age) : undefined,
      attendance_record: record.id,
    }, BRANCH_ID),
    onSuccess: () => {
      refetchChildren();
      setChildForm({ child_name: "", age: "", parent_name: "", parent_phone: "", allergy_notes: "" });
      setShowChildForm(false);
    },
  });

  const checkOutMut = useMutation({
    mutationFn: ({ id, checked_out }: { id: number; checked_out: boolean }) =>
      updateChildCheckIn(id, { checked_out }, BRANCH_ID),
    onSuccess: () => refetchChildren(),
  });

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-[420px] bg-white border-l border-gray-200 shadow-2xl flex flex-col">
      {showQR && <QRModal record={record} onClose={() => setShowQR(false)} />}

      {/* Header */}
      <div className="flex items-start justify-between px-5 py-4 border-b border-gray-100 shrink-0">
        <div>
          <h2 className="font-semibold text-gray-900 text-sm">{record.service_type_name}</h2>
          <p className="text-xs text-gray-400 mt-0.5">{fmt(record.date)} · {entries.length} checked in</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={() => setShowQR(true)} title="Self check-in QR code"
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors">
            <QrCode size={15} />
          </button>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-100 shrink-0">
        {([
          ["rollcall", "Roll Call", Users],
          ["visitors", "Visitors", UserPlus],
          ["children", "Children", Baby],
        ] as [EntryTab, string, React.ElementType][]).map(([t, label, Icon]) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold transition-colors",
              tab === t ? "text-gray-900 border-b-2 border-gray-900" : "text-gray-500 hover:text-gray-700",
            )}
          >
            <Icon size={13} /> {label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* ── Roll Call tab ─────────────────────────────────── */}
        {tab === "rollcall" && (
          <div className="flex flex-col h-full">
            <div className="px-4 py-3 border-b border-gray-50 shrink-0">
              <input
                type="search"
                placeholder="Search members…"
                value={memberSearch}
                onChange={(e) => { setMemberSearch(e.target.value); setMemberPage(1); }}
                className={FIELD}
              />
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
              {membersData?.results.map((m: Member) => {
                const isPresent = presentIds.has(m.id);
                const entry = entries.find((e) => e.member === m.id);
                return (
                  <button
                    key={m.id}
                    onClick={() => {
                      if (isPresent && entry) removeMut.mutate(entry.id);
                      else addMut.mutate({ member: m.id });
                    }}
                    disabled={addMut.isPending || removeMut.isPending}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors",
                      isPresent ? "bg-gray-50 hover:bg-gray-100" : "hover:bg-gray-50",
                    )}
                  >
                    <div className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center shrink-0",
                      isPresent ? "text-gray-700" : "text-gray-300",
                    )}>
                      {isPresent ? <CheckCircle size={18} /> : <Circle size={18} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-sm truncate", isPresent ? "text-emerald-800 font-medium" : "text-gray-800")}>
                        {m.full_name}
                      </p>
                      <p className="text-[10px] text-gray-400">{m.membership_status}</p>
                    </div>
                    {entry?.is_first_visit && (
                      <Badge variant="success" className="text-[10px] shrink-0">First</Badge>
                    )}
                  </button>
                );
              })}
            </div>
            {/* Pagination */}
            {membersData && (membersData.previous || membersData.next) && (
              <div className="flex justify-between items-center px-4 py-2 border-t border-gray-100 shrink-0">
                <Button size="sm" variant="outline" onClick={() => setMemberPage((p) => Math.max(1, p - 1))} disabled={!membersData.previous}>Prev</Button>
                <span className="text-xs text-gray-400">{membersData.count} members</span>
                <Button size="sm" variant="outline" onClick={() => setMemberPage((p) => p + 1)} disabled={!membersData.next}>Next</Button>
              </div>
            )}
          </div>
        )}

        {/* ── Visitors tab ──────────────────────────────────── */}
        {tab === "visitors" && (
          <div className="px-4 py-4 space-y-4">
            <Button size="sm" onClick={() => setShowVisitorForm((v) => !v)}>
              <Plus size={13} /> {showVisitorForm ? "Cancel" : "Add First-time Visitor"}
            </Button>

            {showVisitorForm && (
              <div className="bg-gray-50 rounded-xl p-4 space-y-3 border border-gray-200">
                <h3 className="text-xs font-semibold text-gray-700">New First-time Visitor</h3>
                <input type="text" placeholder="Full Name *" value={visitorForm.name}
                  onChange={(e) => setVisitorForm((f) => ({ ...f, name: e.target.value }))} className={FIELD} />
                <div className="grid grid-cols-2 gap-2">
                  <input type="tel" placeholder="Phone" value={visitorForm.phone}
                    onChange={(e) => setVisitorForm((f) => ({ ...f, phone: e.target.value }))} className={FIELD} />
                  <input type="email" placeholder="Email" value={visitorForm.email}
                    onChange={(e) => setVisitorForm((f) => ({ ...f, email: e.target.value }))} className={FIELD} />
                </div>
                <select value={visitorForm.how_heard}
                  onChange={(e) => setVisitorForm((f) => ({ ...f, how_heard: e.target.value }))} className={FIELD}>
                  <option value="">How did they hear about us?</option>
                  {Object.entries(HOW_HEARD_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
                <textarea placeholder="Notes…" rows={2} value={visitorForm.notes}
                  onChange={(e) => setVisitorForm((f) => ({ ...f, notes: e.target.value }))} className={FIELD} />
                <Button size="sm" disabled={!visitorForm.name.trim() || createVisitorMut.isPending}
                  onClick={() => createVisitorMut.mutate()}>
                  {createVisitorMut.isPending ? "Saving…" : "Save Visitor"}
                </Button>
              </div>
            )}

            <div className="space-y-2">
              {visitors.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-6">No first-time visitors recorded.</p>
              )}
              {visitors.map((v: FirstTimeVisitor) => (
                <div key={v.id} className={cn(
                  "rounded-xl border p-3 space-y-1",
                  v.followed_up ? "bg-gray-50 border-gray-200" : "bg-white border-amber-200",
                )}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{v.name}</p>
                      {v.phone && <p className="text-xs text-gray-500">{v.phone}</p>}
                      {v.how_heard && <p className="text-xs text-gray-400">{HOW_HEARD_LABELS[v.how_heard] ?? v.how_heard}</p>}
                      {v.notes && <p className="text-xs text-gray-500 italic mt-1">{v.notes}</p>}
                    </div>
                    <button
                      onClick={() => followUpMut.mutate({ id: v.id, followed_up: !v.followed_up })}
                      className={cn(
                        "text-xs px-2.5 py-1 rounded font-medium shrink-0 transition-colors",
                        v.followed_up
                          ? "bg-gray-100 text-gray-600"
                          : "bg-gray-50 border border-gray-200 text-gray-500 hover:bg-gray-100",
                      )}
                    >
                      {v.followed_up ? "Followed up ✓" : "Needs follow-up"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Children tab ──────────────────────────────────── */}
        {tab === "children" && (
          <div className="px-4 py-4 space-y-4">
            <Button size="sm" onClick={() => setShowChildForm((v) => !v)}>
              <Baby size={13} /> {showChildForm ? "Cancel" : "Check In Child"}
            </Button>

            {showChildForm && (
              <div className="bg-gray-50 rounded-xl p-4 space-y-3 border border-gray-200">
                <h3 className="text-xs font-semibold text-gray-700">New Child Check-in</h3>
                <input type="text" placeholder="Child's Full Name *" value={childForm.child_name}
                  onChange={(e) => setChildForm((f) => ({ ...f, child_name: e.target.value }))} className={FIELD} />
                <div className="grid grid-cols-2 gap-2">
                  <input type="number" placeholder="Age" min={0} max={17} value={childForm.age}
                    onChange={(e) => setChildForm((f) => ({ ...f, age: e.target.value }))} className={FIELD} />
                  <input type="text" placeholder="Parent Name" value={childForm.parent_name}
                    onChange={(e) => setChildForm((f) => ({ ...f, parent_name: e.target.value }))} className={FIELD} />
                </div>
                <input type="tel" placeholder="Parent Phone" value={childForm.parent_phone}
                  onChange={(e) => setChildForm((f) => ({ ...f, parent_phone: e.target.value }))} className={FIELD} />
                <textarea placeholder="Allergy notes / medical info…" rows={2} value={childForm.allergy_notes}
                  onChange={(e) => setChildForm((f) => ({ ...f, allergy_notes: e.target.value }))} className={FIELD} />
                <Button size="sm" disabled={!childForm.child_name.trim() || createChildMut.isPending}
                  onClick={() => createChildMut.mutate()}>
                  {createChildMut.isPending ? "Saving…" : "Check In"}
                </Button>
              </div>
            )}

            <div className="space-y-2">
              {children.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-6">No children checked in.</p>
              )}
              {children.map((c: ChildCheckIn) => (
                <div key={c.id} className={cn(
                  "rounded-xl border p-3 space-y-2",
                  c.checked_out ? "bg-gray-50 border-gray-200 opacity-60" : "bg-white border-blue-200",
                )}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{c.child_name}</p>
                      {c.age && <p className="text-xs text-gray-500">Age {c.age}</p>}
                      {c.parent_name && <p className="text-xs text-gray-500">Parent: {c.parent_name} {c.parent_phone && `· ${c.parent_phone}`}</p>}
                      {c.allergy_notes && (
                        <p className="text-xs text-red-600 font-medium mt-1 flex items-center gap-1">
                          <AlertTriangle size={11} /> {c.allergy_notes}
                        </p>
                      )}
                    </div>
                    <div className="text-right shrink-0 space-y-1">
                      <p className="text-xl font-black text-blue-700 tracking-widest">{c.pickup_code}</p>
                      <p className="text-[9px] text-gray-400 uppercase tracking-wide">Pickup code</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => printChildSticker(c)}
                      className="text-xs text-blue-600 hover:text-blue-800 font-medium">
                      Print sticker
                    </button>
                    <span className="text-gray-200">·</span>
                    <button
                      onClick={() => checkOutMut.mutate({ id: c.id, checked_out: !c.checked_out })}
                      className={cn("text-xs font-medium transition-colors",
                        c.checked_out ? "text-gray-400" : "text-emerald-600 hover:text-emerald-800")}
                    >
                      {c.checked_out ? "Checked out ✓" : "Mark checked out"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Record form ───────────────────────────────────────────────────────────────

function RecordForm({ serviceTypes, editing, onClose }: {
  serviceTypes: ServiceType[];
  editing?: AttendanceRecord;
  onClose: () => void;
}) {
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
    mutationFn: (p: Partial<AttendanceRecord>) => createAttendanceRecord({ ...p, branch: BRANCH_ID }, BRANCH_ID),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["attendance", BRANCH_ID] }); onClose(); },
  });
  const updateMut = useMutation({
    mutationFn: (p: Partial<AttendanceRecord>) => updateAttendanceRecord(editing!.id, p, BRANCH_ID),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["attendance", BRANCH_ID] }); onClose(); },
  });

  const isPending = createMut.isPending || updateMut.isPending;
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const p: Partial<AttendanceRecord> = {
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
    editing ? updateMut.mutate(p) : createMut.mutate(p);
  }

  return (
    <form onSubmit={submit} className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm space-y-4">
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
        {(createMut.isError || updateMut.isError) && <p className="text-xs text-red-500">Failed to save.</p>}
      </div>
    </form>
  );
}

// ── Reports tab ───────────────────────────────────────────────────────────────

function ReportsTab() {
  const [weeksAgo, setWeeksAgo] = useState(4);
  const [memberQuery, setMemberQuery] = useState("");
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);

  const cutoff = weeksAgoDate(weeksAgo);

  const { data: absentData, isLoading: absentLoading } = useQuery({
    queryKey: ["absent-members", BRANCH_ID, cutoff],
    queryFn: () => getMembers(BRANCH_ID, {
      not_attended_since: cutoff,
      status: "member",
      page: 1,
    }),
  });

  const { data: memberSearch } = useQuery({
    queryKey: ["member-search-report", BRANCH_ID, memberQuery],
    queryFn: () => getMembers(BRANCH_ID, { search: memberQuery }),
    enabled: memberQuery.length >= 2,
  });

  const { data: memberAttendance } = useQuery({
    queryKey: ["member-attendance-pattern", selectedMember?.id],
    queryFn: () => getMemberAttendance(selectedMember!.id, BRANCH_ID),
    enabled: !!selectedMember,
  });

  return (
    <div className="space-y-6">
      {/* Pastoral care */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900 text-sm">Pastoral Care Prompt</h3>
            <p className="text-xs text-gray-400 mt-0.5">Active members who haven't attended recently</p>
          </div>
          <select
            value={weeksAgo}
            onChange={(e) => setWeeksAgo(Number(e.target.value))}
            className="border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          >
            {[2, 4, 6, 8, 12].map((w) => <option key={w} value={w}>Last {w} weeks</option>)}
          </select>
        </div>
        {absentLoading ? (
          <div className="p-5 space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-8 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            {(absentData?.count ?? 0) > 0 && (
              <p className="px-5 pt-3 text-xs text-amber-600 font-medium">
                {absentData!.count} member{absentData!.count !== 1 ? "s" : ""} absent for {weeksAgo}+ weeks
              </p>
            )}
            <div className="divide-y divide-gray-50">
              {absentData?.results.length === 0 && (
                <p className="px-5 py-8 text-center text-gray-400 text-sm">No members missing — great attendance!</p>
              )}
              {absentData?.results.map((m: Member) => (
                <div key={m.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="w-8 h-8 rounded-full bg-gray-100 text-gray-600 text-xs font-semibold flex items-center justify-center shrink-0">
                    {m.full_name.split(" ").slice(0, 2).map((n) => n[0]).join("")}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{m.full_name}</p>
                    <p className="text-xs text-gray-400">
                      {m.phone && `${m.phone} · `}
                      {m.last_attended
                        ? `Last: ${fmt(m.last_attended)}`
                        : "Never attended"}
                    </p>
                  </div>
                  {m.phone && (
                    <a href={`tel:${m.phone}`}
                      className="text-xs text-blue-600 hover:text-blue-800 font-medium shrink-0 flex items-center gap-1">
                      Call <ArrowRight size={11} />
                    </a>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Member attendance pattern */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900 text-sm">Member Attendance Pattern</h3>
          <p className="text-xs text-gray-400 mt-0.5">Search a member to view their attendance history</p>
        </div>
        <div className="px-5 py-4 space-y-4">
          {selectedMember ? (
            <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
              <span className="text-sm text-blue-800 font-medium flex-1">{selectedMember.full_name}</span>
              <button onClick={() => setSelectedMember(null)} className="text-blue-400 hover:text-gray-700">
                <X size={14} />
              </button>
            </div>
          ) : (
            <div className="relative">
              <input
                type="search"
                placeholder="Search member…"
                value={memberQuery}
                onChange={(e) => { setMemberQuery(e.target.value); setSearchOpen(true); }}
                onFocus={() => setSearchOpen(true)}
                onBlur={() => setTimeout(() => setSearchOpen(false), 150)}
                className={FIELD}
              />
              {searchOpen && memberQuery.length >= 2 && (memberSearch?.results.length ?? 0) > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl border border-gray-200 shadow-xl z-10 max-h-48 overflow-auto">
                  {memberSearch!.results.slice(0, 8).map((m: Member) => (
                    <button key={m.id} type="button"
                      onMouseDown={() => { setSelectedMember(m); setMemberQuery(""); setSearchOpen(false); }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-gray-50 text-left text-sm text-gray-800">
                      {m.full_name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {selectedMember && memberAttendance && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Last {memberAttendance.length} records
              </p>
              {memberAttendance.length === 0 && (
                <p className="text-sm text-gray-400">No attendance records found.</p>
              )}
              <div className="space-y-1.5">
                {memberAttendance.slice(0, 20).map((a) => (
                  <div key={a.id} className="flex items-center gap-3 py-1.5 border-b border-gray-50 last:border-0">
                    <CheckCircle size={14} className="text-emerald-500 shrink-0" />
                    <div className="flex-1">
                      <span className="text-sm text-gray-800">{fmt(a.date)}</span>
                      <span className="text-xs text-gray-400 ml-2">{a.service_type}</span>
                    </div>
                    {a.is_first_visit && <Badge variant="success" className="text-[10px]">First</Badge>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Service types tab ─────────────────────────────────────────────────────────

function ServiceTypesTab() {
  const queryClient = useQueryClient();
  const [newName, setNewName] = useState("");

  const { data: allST } = useQuery({
    queryKey: ["all-service-types", BRANCH_ID],
    queryFn: () => getAllServiceTypes(BRANCH_ID),
  });

  const createMut = useMutation({
    mutationFn: (name: string) => createServiceType({ name, is_active: true }, BRANCH_ID),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service-types", BRANCH_ID] });
      queryClient.invalidateQueries({ queryKey: ["all-service-types", BRANCH_ID] });
      setNewName("");
    },
  });

  const toggleMut = useMutation({
    mutationFn: ({ id, is_active }: { id: number; is_active: boolean }) =>
      updateServiceType(id, { is_active }, BRANCH_ID),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service-types", BRANCH_ID] });
      queryClient.invalidateQueries({ queryKey: ["all-service-types", BRANCH_ID] });
    },
  });

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-5 space-y-4">
      <h3 className="font-semibold text-gray-900 text-sm">Manage Service Types</h3>
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="New service type name…"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && newName.trim()) { e.preventDefault(); createMut.mutate(newName.trim()); } }}
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 bg-white"
        />
        <Button size="sm" disabled={!newName.trim() || createMut.isPending}
          onClick={() => { if (newName.trim()) createMut.mutate(newName.trim()); }}>
          <Plus size={14} /> Add
        </Button>
      </div>
      <div className="divide-y divide-gray-50">
        {!allST && <p className="text-sm text-gray-400 py-2">Loading…</p>}
        {allST?.length === 0 && <p className="text-sm text-gray-400 py-2">No service types yet.</p>}
        {allST?.map((st: ServiceType) => (
          <div key={st.id} className="flex items-center justify-between py-2.5">
            <span className={cn("text-sm", st.is_active ? "text-gray-800" : "text-gray-400 line-through")}>
              {st.name}
            </span>
            <button
              onClick={() => toggleMut.mutate({ id: st.id, is_active: !st.is_active })}
              disabled={toggleMut.isPending}
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
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

type PageTab = "records" | "reports" | "services";

export default function AttendancePage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<PageTab>("records");
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<AttendanceRecord | null>(null);
  const [entriesRecord, setEntriesRecord] = useState<AttendanceRecord | null>(null);
  const [showFilters, setShowFilters] = useState(false);
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

  const { data: recentRecords } = useQuery({
    queryKey: ["attendance-recent", BRANCH_ID],
    queryFn: () => getAttendanceRecords(BRANCH_ID, {
      date_from: new Date(Date.now() - 90 * 86400_000).toISOString().slice(0, 10),
    }),
    staleTime: 300_000,
  });

  const { data: serviceTypes = [] } = useQuery({
    queryKey: ["service-types", BRANCH_ID],
    queryFn: () => getServiceTypes(BRANCH_ID),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => deleteAttendanceRecord(id, BRANCH_ID),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["attendance", BRANCH_ID] }),
  });

  const stats = useMemo(() => {
    const all = recentRecords?.results ?? [];
    const now = new Date();
    const month = all.filter((r) => {
      const d = new Date(r.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const total = month.reduce((s, r) => s + r.total_count, 0);
    const firstTimers = month.reduce((s, r) => s + r.first_timers, 0);
    const avg = month.length > 0 ? Math.round(total / month.length) : 0;
    return { total, avg, firstTimers, services: month.length };
  }, [recentRecords]);

  const activeFilterCount = [filters.date_from, filters.date_to, filters.service_type].filter(Boolean).length;

  return (
    <div className="p-6 space-y-4">
      {entriesRecord && (
        <>
          <div className="fixed inset-0 bg-black/10 z-40" onClick={() => setEntriesRecord(null)} />
          <EntriesPanel record={entriesRecord} onClose={() => setEntriesRecord(null)} />
        </>
      )}

      <PageHeader title="Attendance" description="Track service attendance across all sessions.">
        {tab === "records" && (
          <Button size="sm" onClick={() => { setEditing(null); setShowForm((v) => !v); }}>
            {showForm && !editing ? <X size={14} /> : <Plus size={14} />}
            {showForm && !editing ? "Cancel" : "Record Attendance"}
          </Button>
        )}
      </PageHeader>

      {/* Top-level tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {([
          ["records", "Records"],
          ["reports", "Reports"],
          ["services", "Services"],
        ] as [PageTab, string][]).map(([t, label]) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "px-4 py-1.5 rounded-lg text-sm font-medium transition-colors",
              tab === t ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Records tab */}
      {tab === "records" && (
        <>
          {showForm && (
            <RecordForm
              serviceTypes={serviceTypes}
              editing={editing ?? undefined}
              onClose={() => { setShowForm(false); setEditing(null); }}
            />
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label="This month" value={stats.total.toLocaleString()} sub={`${stats.services} services`} />
            <StatCard label="Avg per service" value={stats.avg.toLocaleString()} />
            <StatCard label="First timers" value={stats.firstTimers.toLocaleString()} sub="this month" />
            <StatCard label="Total records" value={records?.count ?? "—"} />
          </div>

          {(recentRecords?.results?.length ?? 0) > 0 && (
            <TrendChart records={recentRecords!.results} />
          )}

          {/* Filters */}
          <div className="flex gap-2 flex-wrap items-center">
            <button
              onClick={() => setShowFilters((v) => !v)}
              className={cn(
                "inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition-colors",
                showFilters || activeFilterCount > 0
                  ? "bg-gray-900 text-white border-gray-900"
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
                    onChange={(e) => { setFilters((f) => ({ ...f, date_from: e.target.value })); setPage(1); }} className={FIELD} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">To</label>
                  <input type="date" value={filters.date_to}
                    onChange={(e) => { setFilters((f) => ({ ...f, date_to: e.target.value })); setPage(1); }} className={FIELD} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Service Type</label>
                  <select value={filters.service_type}
                    onChange={(e) => { setFilters((f) => ({ ...f, service_type: e.target.value })); setPage(1); }} className={FIELD}>
                    <option value="">All</option>
                    {serviceTypes.map((st) => <option key={st.id} value={st.id}>{st.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="mt-3 flex justify-end">
                <button onClick={() => { setFilters({ date_from: "", date_to: "", service_type: "" }); setPage(1); }}
                  className="text-xs text-gray-400 hover:text-gray-600">Clear filters</button>
              </div>
            </div>
          )}

          {/* Records table */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
            {isLoading ? (
              <div className="divide-y divide-gray-50">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4 px-4 py-3.5 animate-pulse">
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 bg-gray-100 rounded w-32" />
                      <div className="h-2.5 bg-gray-100 rounded w-20" />
                    </div>
                    <div className="h-5 w-16 bg-gray-100 rounded-full" />
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
                      <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-400 text-sm">No records match your filters.</td></tr>
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
                          {r.male_count > 0 || r.female_count > 0 || r.children_count > 0
                            ? `${r.male_count} / ${r.female_count} / ${r.children_count}` : "—"}
                        </td>
                        <td className="px-4 py-3 text-right hidden lg:table-cell">
                          {r.first_timers > 0 ? (
                            <span className="inline-flex items-center gap-1 text-emerald-600 font-medium text-sm">
                              <Users size={12} />{r.first_timers}
                            </span>
                          ) : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => setEntriesRecord(r)}
                              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors" title="Roll call & visitors">
                              <UserCheck size={14} />
                            </button>
                            <button onClick={() => { setEditing(r); setShowForm(true); }}
                              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors" title="Edit">
                              <Pencil size={14} />
                            </button>
                            <button
                              onClick={() => { if (confirm("Delete this record?")) deleteMut.mutate(r.id); }}
                              className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors" title="Delete">
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
                      <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={!records.previous}>Previous</Button>
                      <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={!records.next}>Next</Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}

      {tab === "reports" && <ReportsTab />}
      {tab === "services" && <ServiceTypesTab />}
    </div>
  );
}
