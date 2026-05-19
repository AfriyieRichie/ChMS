"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getAuditLog, type AuditLogEntry } from "@/lib/api/audit";

const ACTION_COLORS = {
  create: "bg-green-100 text-green-700",
  update: "bg-blue-100 text-blue-700",
  delete: "bg-red-100 text-red-700",
};

export default function AuditLogPage() {
  const [page, setPage] = useState(1);
  const [objectType, setObjectType] = useState("");
  const [action, setAction] = useState("");
  const [expanded, setExpanded] = useState<number | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["audit-log", page, objectType, action],
    queryFn: () =>
      getAuditLog({
        page,
        object_type: objectType || undefined,
        action: (action || undefined) as AuditLogEntry["action"] | undefined,
      }),
    placeholderData: (p) => p,
  });

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Audit Log</h1>
        <p className="text-xs text-gray-500 mt-0.5">Record of all data changes (network admins only)</p>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <input
          type="text"
          placeholder="Object type (e.g. Member)"
          value={objectType}
          onChange={(e) => { setObjectType(e.target.value); setPage(1); }}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-48"
        />
        <select
          value={action}
          onChange={(e) => { setAction(e.target.value); setPage(1); }}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All actions</option>
          <option value="create">Create</option>
          <option value="update">Update</option>
          <option value="delete">Delete</option>
        </select>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {isLoading && <div className="p-8 text-center text-gray-400">Loading…</div>}
        {isError && (
          <div className="p-8 text-center text-red-500">
            Failed to load audit log. Only network admins can view this.
          </div>
        )}
        {!isLoading && !isError && (
          <>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">When</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actor</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Object</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">IP</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data?.results.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No log entries found.</td></tr>
                )}
                {data?.results.map((entry: AuditLogEntry) => (
                  <>
                    <tr key={entry.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                        {new Date(entry.timestamp).toLocaleString("en-GH", { dateStyle: "medium", timeStyle: "short" })}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">{entry.actor_name || "—"}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${ACTION_COLORS[entry.action]}`}>
                          {entry.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">{entry.object_type}</span>
                        <span className="text-gray-400 ml-1">#{entry.object_id}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400 font-mono">{entry.ip_address || "—"}</td>
                      <td className="px-4 py-3 text-right">
                        {(entry.before_data || entry.after_data) && (
                          <button
                            onClick={() => setExpanded(expanded === entry.id ? null : entry.id)}
                            className="text-xs text-blue-500 hover:text-blue-700"
                          >
                            {expanded === entry.id ? "Hide" : "Diff"}
                          </button>
                        )}
                      </td>
                    </tr>
                    {expanded === entry.id && (
                      <tr key={`${entry.id}-diff`}>
                        <td colSpan={6} className="px-4 py-3 bg-gray-50">
                          <div className="grid grid-cols-2 gap-4 text-xs">
                            {entry.before_data && (
                              <div>
                                <p className="font-semibold text-gray-500 mb-1">Before</p>
                                <pre className="bg-white border rounded p-2 overflow-auto max-h-40 text-gray-700">
                                  {JSON.stringify(entry.before_data, null, 2)}
                                </pre>
                              </div>
                            )}
                            {entry.after_data && (
                              <div>
                                <p className="font-semibold text-gray-500 mb-1">After</p>
                                <pre className="bg-white border rounded p-2 overflow-auto max-h-40 text-gray-700">
                                  {JSON.stringify(entry.after_data, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
            {data && data.count > 0 && (
              <div className="flex items-center justify-between px-4 py-3 border-t text-sm text-gray-600">
                <span>{data.count} total entries</span>
                <div className="flex gap-2">
                  <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={!data.previous}
                    className="px-3 py-1 border rounded disabled:opacity-40">Previous</button>
                  <button onClick={() => setPage((p) => p + 1)} disabled={!data.next}
                    className="px-3 py-1 border rounded disabled:opacity-40">Next</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
