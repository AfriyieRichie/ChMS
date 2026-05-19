"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getAuditLog, type AuditLogEntry } from "@/lib/api/audit";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/dashboard/page-header";
import type { VariantProps } from "class-variance-authority";
import { badgeVariants } from "@/components/ui/badge";

type BadgeVariant = VariantProps<typeof badgeVariants>["variant"];

const ACTION_BADGE: Record<string, BadgeVariant> = {
  create: "success",
  update: "info",
  delete: "danger",
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
      <PageHeader title="Audit Log" description="Record of all data changes (network admins only)." />

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <input
          type="text"
          placeholder="Object type (e.g. Member)"
          value={objectType}
          onChange={(e) => { setObjectType(e.target.value); setPage(1); }}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 bg-white w-52"
        />
        <select
          value={action}
          onChange={(e) => { setAction(e.target.value); setPage(1); }}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 bg-white"
        >
          <option value="">All actions</option>
          <option value="create">Create</option>
          <option value="update">Update</option>
          <option value="delete">Delete</option>
        </select>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {isLoading && <div className="p-10 text-center text-gray-400 text-sm">Loading…</div>}
        {isError && (
          <div className="p-10 text-center text-red-500 text-sm">
            Failed to load audit log. Only network admins can view this.
          </div>
        )}
        {!isLoading && !isError && (
          <>
            <table className="min-w-full divide-y divide-gray-100">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">When</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Actor</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Action</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Object</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">IP</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data?.results.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-gray-400 text-sm">
                      No log entries found.
                    </td>
                  </tr>
                )}
                {data?.results.map((entry: AuditLogEntry) => (
                  <>
                    <tr key={entry.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                        {new Date(entry.timestamp).toLocaleString("en-GH", { dateStyle: "medium", timeStyle: "short" })}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">{entry.actor_name || "—"}</td>
                      <td className="px-4 py-3">
                        <Badge variant={ACTION_BADGE[entry.action] ?? "default"}>
                          {entry.action}
                        </Badge>
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
                            className="text-xs text-blue-500 hover:text-blue-700 font-medium"
                          >
                            {expanded === entry.id ? "Hide" : "Diff"}
                          </button>
                        )}
                      </td>
                    </tr>
                    {expanded === entry.id && (
                      <tr key={`${entry.id}-diff`}>
                        <td colSpan={6} className="px-4 py-4 bg-gray-50">
                          <div className="grid grid-cols-2 gap-4 text-xs">
                            {entry.before_data && (
                              <div>
                                <p className="font-semibold text-gray-500 mb-1.5">Before</p>
                                <pre className="bg-white border border-gray-200 rounded-lg p-3 overflow-auto max-h-48 text-gray-700 text-xs">
                                  {JSON.stringify(entry.before_data, null, 2)}
                                </pre>
                              </div>
                            )}
                            {entry.after_data && (
                              <div>
                                <p className="font-semibold text-gray-500 mb-1.5">After</p>
                                <pre className="bg-white border border-gray-200 rounded-lg p-3 overflow-auto max-h-48 text-gray-700 text-xs">
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
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 text-sm text-gray-600">
                <span>{data.count} total entries</span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={!data.previous}>
                    Previous
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={!data.next}>
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
