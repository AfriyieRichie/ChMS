"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronUp, Plus } from "lucide-react";
import {
  getAttendanceRecords, getServiceTypes, createAttendanceRecord,
  getAllServiceTypes, createServiceType, updateServiceType,
  type AttendanceRecord, type ServiceType,
} from "@/lib/api/attendance";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/dashboard/page-header";

const BRANCH_ID = 1;
const FIELD = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 bg-white";

export default function AttendancePage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [showServiceTypes, setShowServiceTypes] = useState(false);
  const [newServiceTypeName, setNewServiceTypeName] = useState("");
  const [form, setForm] = useState({
    service_type: "",
    date: new Date().toISOString().slice(0, 10),
    attendance_type: "physical",
    total_count: "",
    male_count: "",
    female_count: "",
    children_count: "",
    first_timers: "",
    notes: "",
  });

  const { data: records, isLoading } = useQuery({
    queryKey: ["attendance", BRANCH_ID, page],
    queryFn: () => getAttendanceRecords(BRANCH_ID, { page }),
    placeholderData: (prev) => prev,
  });

  const { data: serviceTypes } = useQuery({
    queryKey: ["service-types", BRANCH_ID],
    queryFn: () => getServiceTypes(BRANCH_ID),
  });

  const { data: allServiceTypes } = useQuery({
    queryKey: ["all-service-types", BRANCH_ID],
    queryFn: () => getAllServiceTypes(BRANCH_ID),
    enabled: showServiceTypes,
  });

  const createSTMutation = useMutation({
    mutationFn: (name: string) => createServiceType({ name, is_active: true }, BRANCH_ID),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service-types", BRANCH_ID] });
      queryClient.invalidateQueries({ queryKey: ["all-service-types", BRANCH_ID] });
      setNewServiceTypeName("");
    },
  });

  const toggleSTMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: number; is_active: boolean }) =>
      updateServiceType(id, { is_active }, BRANCH_ID),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service-types", BRANCH_ID] });
      queryClient.invalidateQueries({ queryKey: ["all-service-types", BRANCH_ID] });
    },
  });

  const mutation = useMutation({
    mutationFn: (payload: Partial<AttendanceRecord>) =>
      createAttendanceRecord({ ...payload, branch: BRANCH_ID }, BRANCH_ID),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance", BRANCH_ID] });
      setShowForm(false);
      setForm((f) => ({ ...f, total_count: "", male_count: "", female_count: "", children_count: "", first_timers: "", notes: "" }));
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({
      service_type: Number(form.service_type),
      date: form.date,
      attendance_type: form.attendance_type as "physical" | "online",
      total_count: Number(form.total_count),
      male_count: Number(form.male_count) || 0,
      female_count: Number(form.female_count) || 0,
      children_count: Number(form.children_count) || 0,
      first_timers: Number(form.first_timers) || 0,
      notes: form.notes,
    });
  };

  return (
    <div className="p-6 space-y-6">
      <PageHeader title="Attendance" description="Track service attendance records.">
        <Button size="sm" onClick={() => setShowForm((v) => !v)}>
          <Plus size={14} />
          {showForm ? "Cancel" : "Record Attendance"}
        </Button>
      </PageHeader>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-4">
          <h2 className="font-semibold text-gray-900 text-sm">New Attendance Record</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Service Type</label>
              <select required value={form.service_type}
                onChange={(e) => setForm((f) => ({ ...f, service_type: e.target.value }))}
                className={FIELD}>
                <option value="">Select service type</option>
                {serviceTypes?.map((st) => (
                  <option key={st.id} value={st.id}>{st.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Date</label>
              <input type="date" required value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                className={FIELD} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Type</label>
              <select value={form.attendance_type}
                onChange={(e) => setForm((f) => ({ ...f, attendance_type: e.target.value }))}
                className={FIELD}>
                <option value="physical">Physical</option>
                <option value="online">Online</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Total Count *</label>
              <input type="number" min="0" required value={form.total_count}
                onChange={(e) => setForm((f) => ({ ...f, total_count: e.target.value }))}
                className={FIELD} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Male</label>
              <input type="number" min="0" value={form.male_count}
                onChange={(e) => setForm((f) => ({ ...f, male_count: e.target.value }))}
                className={FIELD} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Female</label>
              <input type="number" min="0" value={form.female_count}
                onChange={(e) => setForm((f) => ({ ...f, female_count: e.target.value }))}
                className={FIELD} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Children</label>
              <input type="number" min="0" value={form.children_count}
                onChange={(e) => setForm((f) => ({ ...f, children_count: e.target.value }))}
                className={FIELD} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">First Timers</label>
              <input type="number" min="0" value={form.first_timers}
                onChange={(e) => setForm((f) => ({ ...f, first_timers: e.target.value }))}
                className={FIELD} />
            </div>
            <div className="col-span-2 space-y-1">
              <label className="text-xs font-medium text-gray-600">Notes</label>
              <textarea value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                rows={2} className={FIELD} />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button type="submit" size="sm" disabled={mutation.isPending}>
              {mutation.isPending ? "Saving…" : "Save Record"}
            </Button>
            {mutation.isError && <p className="text-red-500 text-sm">Failed to save. Please try again.</p>}
          </div>
        </form>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-10 text-center text-gray-400 text-sm">Loading attendance records…</div>
        ) : (
          <>
            <table className="min-w-full divide-y divide-gray-100">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Service</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Type</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Total</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">First Timers</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {records?.results.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-10 text-center text-gray-400 text-sm">No records yet.</td></tr>
                )}
                {records?.results.map((r: AttendanceRecord) => (
                  <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm text-gray-900">{r.date}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{r.service_type_name}</td>
                    <td className="px-4 py-3">
                      <Badge variant={r.attendance_type === "online" ? "info" : "default"}>
                        {r.attendance_type === "online" ? "Online" : "Physical"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-right font-semibold">{r.total_count}</td>
                    <td className="px-4 py-3 text-sm text-gray-500 text-right">{r.first_timers}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {records && records.count > 0 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 text-sm text-gray-600">
                <span>{records.count} total</span>
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

      {/* Service Types management */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <button
          onClick={() => setShowServiceTypes((v) => !v)}
          className="w-full flex items-center justify-between px-5 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <span>Manage Service Types</span>
          {showServiceTypes ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
        </button>

        {showServiceTypes && (
          <div className="border-t border-gray-100 px-5 py-4 space-y-4">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="New service type name…"
                value={newServiceTypeName}
                onChange={(e) => setNewServiceTypeName(e.target.value)}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 bg-white"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newServiceTypeName.trim()) {
                    e.preventDefault();
                    createSTMutation.mutate(newServiceTypeName.trim());
                  }
                }}
              />
              <Button
                size="sm"
                onClick={() => { if (newServiceTypeName.trim()) createSTMutation.mutate(newServiceTypeName.trim()); }}
                disabled={!newServiceTypeName.trim() || createSTMutation.isPending}
              >
                <Plus size={14} />
                Add
              </Button>
            </div>

            <div className="divide-y divide-gray-50">
              {!allServiceTypes && <p className="text-sm text-gray-400 py-2">Loading…</p>}
              {allServiceTypes?.length === 0 && <p className="text-sm text-gray-400 py-2">No service types yet.</p>}
              {allServiceTypes?.map((st: ServiceType) => (
                <div key={st.id} className="flex items-center justify-between py-2.5">
                  <span className={`text-sm ${st.is_active ? "text-gray-800" : "text-gray-400 line-through"}`}>
                    {st.name}
                  </span>
                  <button
                    onClick={() => toggleSTMutation.mutate({ id: st.id, is_active: !st.is_active })}
                    disabled={toggleSTMutation.isPending}
                    className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${
                      st.is_active
                        ? "bg-green-100 text-green-700 hover:bg-red-50 hover:text-red-600"
                        : "bg-gray-100 text-gray-500 hover:bg-green-50 hover:text-green-700"
                    }`}
                  >
                    {st.is_active ? "Active" : "Inactive"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
