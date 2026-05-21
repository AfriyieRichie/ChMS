"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, X, ChevronDown, ChevronUp, Mail, ShieldAlert, KeyRound } from "lucide-react";
import {
  getUsers, inviteUser, getRoles, assignRole, removeRole,
  deactivateUser, sendPasswordReset, getUserCapabilities,
  type User, type Role,
} from "@/lib/api/users";
import { getBranches, type Branch } from "@/lib/api/branches";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/dashboard/page-header";
import { cn } from "@/lib/utils";

const BRANCH_ID = 1;
const FIELD = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 bg-white";

const inviteSchema = z.object({
  full_name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
  phone: z.string().optional(),
});
type InviteValues = z.infer<typeof inviteSchema>;

function timeAgo(iso: string | null): string {
  if (!iso) return "Never";
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

// ── Capabilities panel ────────────────────────────────────────────────────────

function CapabilitiesPanel({ userId, branchId }: { userId: number; branchId: number }) {
  const [open, setOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["user-capabilities", userId, branchId],
    queryFn: () => getUserCapabilities(userId, branchId),
    enabled: open,
  });

  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wide hover:text-gray-700 transition-colors"
      >
        <ShieldAlert size={12} />
        Capabilities
        {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </button>

      {open && (
        <div className="mt-3">
          {isLoading ? (
            <p className="text-xs text-gray-400">Loading…</p>
          ) : !data?.all_capabilities.length ? (
            <p className="text-xs text-gray-400">No capabilities (no roles assigned).</p>
          ) : (
            <div className="space-y-3">
              {data.by_role.map((group, i) => (
                <div key={i} className="bg-gray-50 rounded-lg px-3 py-2.5">
                  <p className="text-xs font-semibold text-gray-700">
                    {group.role}
                    {group.branch && <span className="font-normal text-gray-400"> @ {group.branch}</span>}
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {group.capabilities.map((cap) => (
                      <span key={cap} className="text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded font-mono">
                        {cap}
                      </span>
                    ))}
                    {group.capabilities.length === 0 && (
                      <span className="text-[10px] text-gray-400">No capabilities on this role</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── User detail panel ─────────────────────────────────────────────────────────

function UserPanel({
  user,
  roles,
  branches,
  branchId,
  onClose,
  onUpdated,
}: {
  user: User;
  roles: Role[];
  branches: Branch[];
  branchId: number;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const [assignRoleId, setAssignRoleId] = useState("");
  const [assignBranchId, setAssignBranchId] = useState<string>("");
  const [resetSent, setResetSent] = useState(false);

  const removeMut = useMutation({
    mutationFn: ({ assignmentId }: { assignmentId: number }) =>
      removeRole(user.id, assignmentId, branchId),
    onSuccess: onUpdated,
  });

  const assignMut = useMutation({
    mutationFn: () =>
      assignRole(user.id, Number(assignRoleId), branchId,
        assignBranchId ? Number(assignBranchId) : null),
    onSuccess: () => {
      onUpdated();
      setAssignRoleId("");
      setAssignBranchId("");
    },
  });

  const deactivateMut = useMutation({
    mutationFn: () => deactivateUser(user.id, branchId),
    onSuccess: () => { onUpdated(); onClose(); },
  });

  const resetMut = useMutation({
    mutationFn: () => sendPasswordReset(user.id, branchId),
    onSuccess: () => setResetSent(true),
  });

  const selectedRole = roles.find((r) => r.id === Number(assignRoleId));

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-white shadow-2xl border-l border-gray-200 z-50 flex flex-col overflow-y-auto">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100 flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-gray-900">{user.full_name}</p>
            {user.is_network_admin && <Badge variant="purple">Admin</Badge>}
            <Badge variant={user.is_active ? "success" : "default"}>
              {user.is_active ? "Active" : "Inactive"}
            </Badge>
          </div>
          <p className="text-xs text-gray-400 mt-0.5 truncate">{user.email}</p>
          {user.phone && <p className="text-xs text-gray-400">{user.phone}</p>}
          <p className="text-xs text-gray-300 mt-1">
            Joined {new Date(user.date_joined).toLocaleDateString()} ·
            Last login: {timeAgo(user.last_login)}
          </p>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors shrink-0 mt-0.5">
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 px-5 py-4 space-y-6">
        {/* Current roles */}
        <div>
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
            Role Assignments
          </h3>
          {user.role_assignments.length === 0 ? (
            <p className="text-sm text-gray-400">No roles assigned.</p>
          ) : (
            <div className="space-y-2">
              {user.role_assignments.map((ra) => (
                <div key={ra.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 group">
                  <div>
                    <span className="text-sm font-medium text-gray-800">{ra.role_name}</span>
                    {ra.branch_name && (
                      <span className="text-xs text-gray-400 ml-2">@ {ra.branch_name}</span>
                    )}
                    {!ra.branch_name && (
                      <span className="text-xs text-purple-400 ml-2">network-level</span>
                    )}
                  </div>
                  <button
                    onClick={() => removeMut.mutate({ assignmentId: ra.id })}
                    disabled={removeMut.isPending}
                    className="text-xs text-red-400 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Assign role */}
        <div>
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
            Assign Role
          </h3>
          <div className="space-y-2">
            <select
              value={assignRoleId}
              onChange={(e) => setAssignRoleId(e.target.value)}
              className={FIELD}
            >
              <option value="">Select role…</option>
              {roles.map((r: Role) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>

            {selectedRole && selectedRole.capabilities.length > 0 && (
              <div className="bg-blue-50 rounded-lg px-3 py-2">
                <p className="text-[10px] text-blue-600 font-medium mb-1">Grants access to:</p>
                <div className="flex flex-wrap gap-1">
                  {selectedRole.capabilities.map((cap) => (
                    <span key={cap} className="text-[10px] px-1.5 py-0.5 bg-white text-blue-700 rounded font-mono border border-blue-100">
                      {cap}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <select
              value={assignBranchId}
              onChange={(e) => setAssignBranchId(e.target.value)}
              className={FIELD}
            >
              <option value="">Branch (required)</option>
              {branches.map((b: Branch) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
              <option value="">— Network level (admin only) —</option>
            </select>

            <Button
              size="sm"
              className="w-full"
              disabled={!assignRoleId || assignMut.isPending}
              onClick={() => assignMut.mutate()}
            >
              {assignMut.isPending ? "Assigning…" : "Assign Role"}
            </Button>
            {assignMut.isError && (
              <p className="text-xs text-red-500">Failed to assign role.</p>
            )}
          </div>
        </div>

        {/* Capabilities */}
        <CapabilitiesPanel userId={user.id} branchId={branchId} />

        {/* Danger zone */}
        <div className="border-t border-gray-100 pt-4 space-y-3">
          {user.is_active && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                Actions
              </p>
              <div className="space-y-2">
                <button
                  onClick={() => resetMut.mutate()}
                  disabled={resetMut.isPending || resetSent}
                  className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 transition-colors disabled:opacity-50"
                >
                  <KeyRound size={14} />
                  {resetSent ? "Reset email sent ✓" : resetMut.isPending ? "Sending…" : "Send password reset email"}
                </button>

                {!user.is_network_admin && (
                  <button
                    onClick={() => {
                      if (confirm(`Deactivate ${user.full_name}? Their history will be preserved.`)) {
                        deactivateMut.mutate();
                      }
                    }}
                    disabled={deactivateMut.isPending}
                    className="flex items-center gap-2 text-sm text-red-500 hover:text-red-700 transition-colors"
                  >
                    <ShieldAlert size={14} />
                    {deactivateMut.isPending ? "Deactivating…" : "Deactivate account"}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function UsersPage() {
  const queryClient = useQueryClient();
  const [showInvite, setShowInvite] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const { data: users, isLoading } = useQuery({
    queryKey: ["users", BRANCH_ID],
    queryFn: () => getUsers(BRANCH_ID),
  });

  const { data: roles } = useQuery({
    queryKey: ["roles"],
    queryFn: getRoles,
  });

  const { data: branchesData } = useQuery({
    queryKey: ["branches-all"],
    queryFn: () => getBranches(),
  });
  const branches = branchesData?.results ?? [];

  const { register, handleSubmit, reset, formState: { errors } } = useForm<InviteValues>({
    resolver: zodResolver(inviteSchema),
  });

  const inviteMut = useMutation({
    mutationFn: (d: InviteValues) => inviteUser(d, BRANCH_ID),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users", BRANCH_ID] });
      setShowInvite(false);
      reset();
    },
  });

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ["users", BRANCH_ID] });
    // Re-sync the selected user from fresh data
    setSelectedUser((prev) => {
      if (!prev) return null;
      return (users ?? []).find((u) => u.id === prev.id) ?? prev;
    });
  }

  return (
    <div className="p-6 space-y-6">
      <PageHeader title="Users" description="Manage staff accounts, roles, and access.">
        <Button size="sm" onClick={() => setShowInvite((v) => !v)}>
          {showInvite ? <X size={14} /> : <Mail size={14} />}
          {showInvite ? "Cancel" : "Invite User"}
        </Button>
      </PageHeader>

      {/* Invite form */}
      {showInvite && (
        <form
          onSubmit={handleSubmit((d) => inviteMut.mutate(d))}
          className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-4"
        >
          <div>
            <h2 className="font-semibold text-gray-900 text-sm">Invite New User</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              An email will be sent with a link for them to set their password.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Full Name *</label>
              <input type="text" {...register("full_name")} className={FIELD} />
              {errors.full_name && <p className="text-xs text-red-500">{errors.full_name.message}</p>}
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Email *</label>
              <input type="email" {...register("email")} className={FIELD} />
              {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Phone</label>
              <input type="tel" {...register("phone")} className={FIELD} />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button type="submit" size="sm" disabled={inviteMut.isPending}>
              {inviteMut.isPending ? "Sending invite…" : "Send Invite"}
            </Button>
            {inviteMut.isError && (
              <p className="text-red-500 text-sm">Failed to send invite. Email may already be registered.</p>
            )}
            {inviteMut.isSuccess && (
              <p className="text-emerald-600 text-sm">Invite sent successfully.</p>
            )}
          </div>
        </form>
      )}

      {/* User table */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
        {isLoading ? (
          <p className="px-4 py-8 text-center text-gray-400 text-sm">Loading users…</p>
        ) : !users?.length ? (
          <p className="px-4 py-8 text-center text-gray-400 text-sm">No users found for this branch.</p>
        ) : (
          <table className="min-w-full divide-y divide-gray-100">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase hidden md:table-cell">Roles</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase hidden lg:table-cell">Last Login</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {users.map((u: User) => (
                <tr
                  key={u.id}
                  className={cn(
                    "hover:bg-gray-50 cursor-pointer transition-colors",
                    selectedUser?.id === u.id && "bg-blue-50",
                  )}
                  onClick={() => setSelectedUser(selectedUser?.id === u.id ? null : u)}
                >
                  <td className="px-4 py-3">
                    <p className="text-sm font-semibold text-gray-900">{u.full_name}</p>
                    <p className="text-xs text-gray-400">{u.email}</p>
                    {u.phone && <p className="text-xs text-gray-300">{u.phone}</p>}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {u.is_network_admin && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium">
                          Network Admin
                        </span>
                      )}
                      {u.role_assignments.slice(0, 3).map((ra) => (
                        <span key={ra.id} className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                          {ra.role_name}
                          {ra.branch_name && <span className="text-gray-400"> @ {ra.branch_name}</span>}
                        </span>
                      ))}
                      {u.role_assignments.length > 3 && (
                        <span className="text-xs text-gray-400">+{u.role_assignments.length - 3} more</span>
                      )}
                      {u.role_assignments.length === 0 && !u.is_network_admin && (
                        <span className="text-xs text-gray-300">No roles</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 hidden lg:table-cell">
                    {timeAgo(u.last_login)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Badge variant={u.is_active ? "success" : "default"}>
                      {u.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Plus
                      size={14}
                      className={cn(
                        "text-gray-300 transition-transform",
                        selectedUser?.id === u.id && "rotate-45 text-gray-500",
                      )}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Detail panel */}
      {selectedUser && roles && (
        <UserPanel
          user={selectedUser}
          roles={roles}
          branches={branches}
          branchId={BRANCH_ID}
          onClose={() => setSelectedUser(null)}
          onUpdated={refresh}
        />
      )}

      {/* Overlay */}
      {selectedUser && (
        <div
          className="fixed inset-0 bg-black/10 z-40"
          onClick={() => setSelectedUser(null)}
        />
      )}
    </div>
  );
}
