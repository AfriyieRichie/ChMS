"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Download, Plus, X } from "lucide-react";
import { getMembers, createMember, type Member } from "@/lib/api/members";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/dashboard/page-header";

const addMemberSchema = z.object({
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  gender: z.enum(["male", "female", "other"]),
  phone: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  membership_status: z.enum(["visitor", "regular", "member"]),
});
type AddMemberValues = z.infer<typeof addMemberSchema>;

const BRANCH_ID = 1;

const FIELD = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 bg-white";

type StatusVariant = "warning" | "info" | "success" | "default";

const STATUS_CONFIG: Record<string, { label: string; variant: StatusVariant }> = {
  visitor: { label: "Visitor", variant: "warning" },
  regular: { label: "Regular", variant: "info" },
  member: { label: "Member", variant: "success" },
  inactive: { label: "Inactive", variant: "default" },
};

export default function MembersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["members", BRANCH_ID, search, statusFilter, page],
    queryFn: () =>
      getMembers(BRANCH_ID, {
        search: search || undefined,
        status: statusFilter || undefined,
        page,
      }),
    placeholderData: (prev) => prev,
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<AddMemberValues>({
    resolver: zodResolver(addMemberSchema),
    defaultValues: { gender: "male", membership_status: "visitor" },
  });

  const addMutation = useMutation({
    mutationFn: (d: AddMemberValues) =>
      createMember(
        { ...d, full_name: `${d.first_name} ${d.last_name}`, email: d.email || undefined },
        BRANCH_ID
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members", BRANCH_ID] });
      setShowForm(false);
      reset();
    },
  });

  function exportCSV() {
    if (!data?.results.length) return;
    const rows = [
      ["Name", "Email", "Phone", "Status", "Branch"],
      ...data.results.map((m: Member) => [
        m.full_name,
        m.email || "",
        m.phone || "",
        m.membership_status,
        m.primary_branch?.name || "",
      ]),
    ];
    const csv = rows
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "members.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="p-6 space-y-6">
      <PageHeader title="Members" description="Manage your congregation members.">
        {data?.results.length ? (
          <Button variant="outline" size="sm" onClick={exportCSV}>
            <Download size={14} />
            Export CSV
          </Button>
        ) : null}
        <Button
          size="sm"
          onClick={() => setShowForm((v) => !v)}
        >
          {showForm ? <X size={14} /> : <Plus size={14} />}
          {showForm ? "Cancel" : "Add Member"}
        </Button>
      </PageHeader>

      {showForm && (
        <form
          onSubmit={handleSubmit((d) => addMutation.mutate(d))}
          className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-4"
        >
          <h2 className="font-semibold text-gray-900 text-sm">New Member</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">First Name *</label>
              <input type="text" {...register("first_name")} className={FIELD} />
              {errors.first_name && (
                <p className="text-xs text-red-500">{errors.first_name.message}</p>
              )}
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Last Name *</label>
              <input type="text" {...register("last_name")} className={FIELD} />
              {errors.last_name && (
                <p className="text-xs text-red-500">{errors.last_name.message}</p>
              )}
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Gender *</label>
              <select {...register("gender")} className={FIELD}>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Status *</label>
              <select {...register("membership_status")} className={FIELD}>
                <option value="visitor">Visitor</option>
                <option value="regular">Regular</option>
                <option value="member">Member</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Phone</label>
              <input type="tel" {...register("phone")} className={FIELD} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Email</label>
              <input type="email" {...register("email")} className={FIELD} />
              {errors.email && (
                <p className="text-xs text-red-500">{errors.email.message}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button type="submit" size="sm" disabled={addMutation.isPending}>
              {addMutation.isPending ? "Saving…" : "Save Member"}
            </Button>
            {addMutation.isError && (
              <p className="text-red-500 text-sm">Failed to create member.</p>
            )}
          </div>
        </form>
      )}

      {/* Filters */}
      <div className="flex gap-3">
        <input
          type="search"
          placeholder="Search by name, phone or email…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 bg-white"
        />
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 bg-white"
        >
          <option value="">All statuses</option>
          {Object.entries(STATUS_CONFIG).map(([value, { label }]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-10 text-center text-gray-400 text-sm">Loading members…</div>
        ) : isError ? (
          <div className="p-10 text-center text-red-500 text-sm">Failed to load members.</div>
        ) : (
          <>
            <table className="min-w-full divide-y divide-gray-100">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Phone
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Email
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Branch
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data?.results.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-gray-400 text-sm">
                      No members found.
                    </td>
                  </tr>
                )}
                {data?.results.map((m: Member) => {
                  const status = STATUS_CONFIG[m.membership_status];
                  return (
                    <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-sm font-medium">
                        <Link
                          href={`/dashboard/members/${m.id}`}
                          className="text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          {m.full_name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">{m.phone || "—"}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{m.email || "—"}</td>
                      <td className="px-4 py-3">
                        <Badge variant={status?.variant ?? "default"}>
                          {status?.label ?? m.membership_status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {m.primary_branch?.name ?? "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {data && data.count > 0 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 text-sm text-gray-600">
                <span className="text-gray-500">
                  {data.count} {data.count === 1 ? "member" : "members"}
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={!data.previous}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
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
