"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download } from "lucide-react";
import { getAuditLog, exportAuditLog, type AuditLogEntry } from "@/lib/api/audit";
import { getUsers } from "@/lib/api/users";
import { getBranches } from "@/lib/api/branches";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/dashboard/page-header";
import type { VariantProps } from "class-variance-authority";
import { badgeVariants } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const BRANCH_ID = 1;
type BadgeVariant = VariantProps<typeof badgeVariants>["variant"];

const ACTION_BADGE: Record<string, BadgeVariant> = {
  create: "success",
  update: "info",
  delete: "danger",
};

const OBJECT_TYPES = [
  "Member", "Contribution", "Fund", "Pledge", "FinancialPeriod",
  "Branch", "Group", "Event", "Campaign", "User",
];

const FIELD = "border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300 focus:border-gray-400 bg-white";

function DiffCell({ before, after }: { before: Record<string, unknown> | null; after: Record<string, unknown> | null }) {
  if (!before && !after) return null;

  // Compute changed keys
  const allKeys = Array.from(new Set([
    ...Object.keys(before ?? {}),
    ...Object.keys(after ?? {}),
  ]));
  const changed = allKeys.filter(
    (k) => JSON.stringify((before ?? {})[k]) !== JSON.stringify((after ?? {})[k])
  );

  return (
    <div className="px-4 py-3 bg-gray-50 space-y-2 text-xs">
      {changed.length > 0 && (
        <div className="overflow-auto max-h-48">
          <table className="min-w-full text-xs">
            <thead>
              <tr className="text-gray-400">
                <th className="text-left pr-4 pb-1 font-medium">Field</th>
                <th className="text-left pr-4 pb-1 font-medium text-red-500">Before</th>
                <th className="text-left pb-1 font-medium text-emerald-600">After</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {changed.map((k) => (
                <tr key={k}>
                  <td className="pr-4 py-0.5 font-mono text-gray-500">{k}</td>
                  <td className="pr-4 py-0.5 text-red-500 font-mono">
                    {JSON.stringify((before ?? {})[k]) ?? "—"}
                  </td>
                  <td className="py-0.5 text-emerald-700 font-mono">
                    {JSON.stringify((after ?? {})[k]) ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {changed.length === 0 && (
        <pre className="text-gray-400 text-xs overflow-auto max-h-32">
          {JSON.stringify(after ?? before, null, 2)}
        </pre>
      )}
    </div>
  );
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AuditLogPage() {
  const [page, setPage] = useState(1);
  const [objectType, setObjectType] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [actorId, setActorId] = useState("");
  const [branchId, setBranchId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<number | null>(null);
  const [exporting, setExporting] = useState(false);

  const filters = {
    object_type: objectType || undefined,
    action: (actionFilter || undefined) as AuditLogEntry["action"] | undefined,
    actor: actorId ? Number(actorId) : undefined,
    branch: branchId ? Number(branchId) : undefined,
    date_from: dateFrom || undefined,
    date_to: dateTo || undefined,
    search: search || undefined,
  };

  const { data, isLoading, isError } = useQuery({
    queryKey: ["audit-log", page, filters],
    queryFn: () => getAuditLog({ ...filters, page }),
    placeholderData: (p) => p,
  });

  const { data: users } = useQuery({
    queryKey: ["users", BRANCH_ID],
    queryFn: () => getUsers(BRANCH_ID),
  });

  const { data: branchesData } = useQuery({
    queryKey: ["branches-all"],
    queryFn: () => getBranches(),
  });
  const branches = branchesData?.results ?? [];

  function resetFilters() {
    setObjectType(""); setActionFilter(""); setActorId("");
    setBranchId(""); setDateFrom(""); setDateTo(""); setSearch("");
    setPage(1);
  }

  function resetAndSet(setter: (v: string) => void, val: string) {
    setter(val);
    setPage(1);
  }

  async function handleExport() {
    setExporting(true);
    try {
      const blob = await exportAuditLog(filters);
      triggerDownload(blob, `audit-log-${new Date().toISOString().slice(0, 10)}.csv`);
    } finally {
      setExporting(false);
    }
  }

  const hasFilters = !!(objectType || actionFilter || actorId || branchId || dateFrom || dateTo || search);

  return (
    <div className="p-6 space-y-6">
      <PageHeader title="Audit Log" description="Immutable record of every privileged action.">
        <Button
          variant="outline"
          size="sm"
          onClick={handleExport}
          disabled={exporting}
        >
          <Download size={14} />
          {exporting ? "Exporting…" : "Export CSV"}
        </Button>
      </PageHeader>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm space-y-3">
        <div className="flex gap-3 flex-wrap items-end">
          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Actor</label>
            <select value={actorId} onChange={(e) => resetAndSet(setActorId, e.target.value)} className={FIELD}>
              <option value="">All users</option>
              {users?.map((u) => (
                <option key={u.id} value={u.id}>{u.full_name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Action</label>
            <select value={actionFilter} onChange={(e) => resetAndSet(setActionFilter, e.target.value)} className={FIELD}>
              <option value="">All actions</option>
              <option value="create">Create</option>
              <option value="update">Update</option>
              <option value="delete">Delete</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Object Type</label>
            <select value={objectType} onChange={(e) => resetAndSet(setObjectType, e.target.value)} className={FIELD}>
              <option value="">All types</option>
              {OBJECT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Branch</label>
            <select value={branchId} onChange={(e) => resetAndSet(setBranchId, e.target.value)} className={FIELD}>
              <option value="">All branches</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">From</label>
            <input type="date" value={dateFrom} onChange={(e) => resetAndSet(setDateFrom, e.target.value)} className={FIELD} />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">To</label>
            <input type="date" value={dateTo} onChange={(e) => resetAndSet(setDateTo, e.target.value)} className={FIELD} />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Search actor name</label>
            <input
              type="text"
              placeholder="Name…"
              value={search}
              onChange={(e) => resetAndSet(setSearch, e.target.value)}
              className={cn(FIELD, "w-36")}
            />
          </div>

          {hasFilters && (
            <button onClick={resetFilters} className="text-xs text-blue-500 hover:text-blue-700 self-end pb-1.5">
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {isLoading && <div className="p-10 text-center text-gray-400 text-sm">Loading…</div>}
        {isError && (
          <div className="p-10 text-center text-red-500 text-sm">
            Failed to load audit log. Only network admins and branch managers can view this.
          </div>
        )}

        {!isLoading && !isError && (
          <>
            <table className="min-w-full divide-y divide-gray-100">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">When</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Actor</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase hidden sm:table-cell">Branch</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Action</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Object</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase hidden md:table-cell">IP</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data?.results.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-gray-400 text-sm">
                      No log entries found.
                    </td>
                  </tr>
                )}
                {data?.results.map((entry: AuditLogEntry) => (
                  <>
                    <tr
                      key={entry.id}
                      className={cn(
                        "hover:bg-gray-50 transition-colors",
                        expanded === entry.id && "bg-blue-50/40",
                      )}
                    >
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                        {new Date(entry.timestamp).toLocaleString("en-GH", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-gray-800">{entry.actor_name || <span className="text-gray-400">System</span>}</p>
                        {entry.actor_email && (
                          <p className="text-xs text-gray-400">{entry.actor_email}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 hidden sm:table-cell">
                        {entry.branch_name ?? <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={ACTION_BADGE[entry.action] ?? "default"}>
                          {entry.action}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">
                          {entry.object_type}
                        </span>
                        <span className="text-gray-400 ml-1 text-xs">#{entry.object_id}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400 font-mono hidden md:table-cell">
                        {entry.ip_address || "—"}
                      </td>
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
                        <td colSpan={7} className="p-0">
                          <DiffCell before={entry.before_data} after={entry.after_data} />
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>

            {data && data.count > 0 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 text-sm text-gray-500">
                <span>{data.count.toLocaleString()} total entries</span>
                <div className="flex gap-2">
                  <Button
                    variant="outline" size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={!data.previous}
                  >
                    Previous
                  </Button>
                  <span className="text-xs self-center text-gray-400">Page {page}</span>
                  <Button
                    variant="outline" size="sm"
                    onClick={() => setPage((p) => p + 1)}
                    disabled={!data.next}
                  >
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
