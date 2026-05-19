"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getAttendanceRecords, getServiceTypes, createAttendanceRecord, type AttendanceRecord } from "@/lib/api/attendance";

const BRANCH_ID = 1; // TODO: read from auth context / cookie

export default function AttendancePage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Attendance</h1>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          {showForm ? "Cancel" : "Record Attendance"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-4">
          <h2 className="font-semibold text-gray-800">New Attendance Record</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Service Type</label>
              <select
                required
                value={form.service_type}
                onChange={(e) => setForm((f) => ({ ...f, service_type: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              >
                <option value="">Select service type</option>
                {serviceTypes?.map((st) => (
                  <option key={st.id} value={st.id}>{st.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Date</label>
              <input
                type="date"
                required
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Type</label>
              <select
                value={form.attendance_type}
                onChange={(e) => setForm((f) => ({ ...f, attendance_type: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              >
                <option value="physical">Physical</option>
                <option value="online">Online</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Total Count</label>
              <input
                type="number" min="0" required
                value={form.total_count}
                onChange={(e) => setForm((f) => ({ ...f, total_count: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Male</label>
              <input type="number" min="0" value={form.male_count} onChange={(e) => setForm((f) => ({ ...f, male_count: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Female</label>
              <input type="number" min="0" value={form.female_count} onChange={(e) => setForm((f) => ({ ...f, female_count: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Children</label>
              <input type="number" min="0" value={form.children_count} onChange={(e) => setForm((f) => ({ ...f, children_count: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">First Timers</label>
              <input type="number" min="0" value={form.first_timers} onChange={(e) => setForm((f) => ({ ...f, first_timers: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div className="col-span-2 space-y-1">
              <label className="text-xs font-medium text-gray-600">Notes</label>
              <textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={2} className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <button type="submit" disabled={mutation.isPending} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
              {mutation.isPending ? "Saving..." : "Save Record"}
            </button>
            {mutation.isError && <p className="text-red-500 text-sm self-center">Failed to save. Please try again.</p>}
          </div>
        </form>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Loading attendance records...</div>
        ) : (
          <>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Service</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">First Timers</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {records?.results.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">No records yet.</td></tr>
                )}
                {records?.results.map((r: AttendanceRecord) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">{r.date}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{r.service_type_name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 capitalize">{r.attendance_type}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-right font-medium">{r.total_count}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 text-right">{r.first_timers}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {records && records.count > 0 && (
              <div className="flex items-center justify-between px-4 py-3 border-t text-sm text-gray-600">
                <span>{records.count} total</span>
                <div className="flex gap-2">
                  <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={!records.previous} className="px-3 py-1 border rounded disabled:opacity-40">Previous</button>
                  <button onClick={() => setPage((p) => p + 1)} disabled={!records.next} className="px-3 py-1 border rounded disabled:opacity-40">Next</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
