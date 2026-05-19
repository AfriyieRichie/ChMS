"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  getUsers, createUser, getRoles, assignRole, removeRole, deactivateUser,
  type User, type Role,
} from "@/lib/api/users";

const BRANCH_ID = 1;

const createSchema = z.object({
  full_name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
  phone: z.string().optional(),
  password: z.string().min(8, "Password must be at least 8 characters"),
});
type CreateValues = z.infer<typeof createSchema>;

export default function UsersPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [assignRoleId, setAssignRoleId] = useState("");

  const { data: users, isLoading } = useQuery({
    queryKey: ["users", BRANCH_ID],
    queryFn: () => getUsers(BRANCH_ID),
  });

  const { data: roles } = useQuery({
    queryKey: ["roles"],
    queryFn: getRoles,
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CreateValues>({
    resolver: zodResolver(createSchema),
  });

  const createMutation = useMutation({
    mutationFn: (d: CreateValues) => createUser(d, BRANCH_ID),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users", BRANCH_ID] });
      setShowForm(false);
      reset();
    },
  });

  const assignMutation = useMutation({
    mutationFn: ({ userId, roleId }: { userId: number; roleId: number }) =>
      assignRole(userId, roleId, BRANCH_ID),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users", BRANCH_ID] });
      setAssignRoleId("");
    },
  });

  const removeMutation = useMutation({
    mutationFn: ({ userId, assignmentId }: { userId: number; assignmentId: number }) =>
      removeRole(userId, assignmentId, BRANCH_ID),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users", BRANCH_ID] }),
  });

  const deactivateMutation = useMutation({
    mutationFn: (userId: number) => deactivateUser(userId, BRANCH_ID),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users", BRANCH_ID] });
      setSelectedUser(null);
    },
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Users</h1>
          <p className="text-xs text-gray-500 mt-0.5">Manage staff accounts and role assignments</p>
        </div>
        <button onClick={() => setShowForm((v) => !v)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
          {showForm ? "Cancel" : "Add User"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit((d) => createMutation.mutate(d))}
          className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-4">
          <h2 className="font-semibold text-gray-800">New User Account</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Full Name *</label>
              <input type="text" {...register("full_name")}
                className="w-full border rounded-lg px-3 py-2 text-sm" />
              {errors.full_name && <p className="text-xs text-red-500">{errors.full_name.message}</p>}
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Email *</label>
              <input type="email" {...register("email")}
                className="w-full border rounded-lg px-3 py-2 text-sm" />
              {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Phone</label>
              <input type="tel" {...register("phone")}
                className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Password *</label>
              <input type="password" {...register("password")}
                className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Min. 8 characters" />
              {errors.password && <p className="text-xs text-red-500">{errors.password.message}</p>}
            </div>
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={createMutation.isPending}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
              {createMutation.isPending ? "Creating..." : "Create User"}
            </button>
            {createMutation.isError && <p className="text-red-500 text-sm self-center">Failed to create user.</p>}
          </div>
        </form>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {/* User list */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          {isLoading && <div className="p-8 text-center text-gray-400">Loading users...</div>}
          {!isLoading && (!users || users.length === 0) && (
            <div className="p-8 text-center text-gray-400">No users found.</div>
          )}
          <div className="divide-y divide-gray-100">
            {users?.map((u: User) => (
              <div key={u.id}
                className={`px-5 py-4 cursor-pointer hover:bg-gray-50 transition-colors ${selectedUser?.id === u.id ? "bg-blue-50" : ""}`}
                onClick={() => setSelectedUser(selectedUser?.id === u.id ? null : u)}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{u.full_name}</p>
                    <p className="text-xs text-gray-400">{u.email}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {u.is_network_admin && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-medium">Admin</span>
                    )}
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${u.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                      {u.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>
                </div>
                {u.role_assignments.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {u.role_assignments.map((ra) => (
                      <span key={ra.id} className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600">
                        {ra.role_name}{ra.branch_name ? ` @ ${ra.branch_name}` : ""}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Role management panel */}
        {selectedUser && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <p className="font-semibold text-gray-900 text-sm">{selectedUser.full_name}</p>
                <p className="text-xs text-gray-400">{selectedUser.email}</p>
              </div>
              <button onClick={() => setSelectedUser(null)} className="text-xs text-gray-400 hover:text-gray-600">Close</button>
            </div>

            <div className="px-5 py-4 space-y-4">
              <div>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Current Roles</h3>
                {selectedUser.role_assignments.length === 0 && (
                  <p className="text-sm text-gray-400">No roles assigned.</p>
                )}
                <div className="space-y-2">
                  {selectedUser.role_assignments.map((ra) => (
                    <div key={ra.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                      <div>
                        <span className="text-sm font-medium text-gray-800">{ra.role_name}</span>
                        {ra.branch_name && <span className="text-xs text-gray-400 ml-2">@ {ra.branch_name}</span>}
                      </div>
                      <button
                        onClick={() => removeMutation.mutate({ userId: selectedUser.id, assignmentId: ra.id })}
                        disabled={removeMutation.isPending}
                        className="text-xs text-red-400 hover:text-red-600 px-2">
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Assign Role</h3>
                <div className="flex gap-2">
                  <select value={assignRoleId} onChange={(e) => setAssignRoleId(e.target.value)}
                    className="flex-1 border rounded-lg px-3 py-2 text-sm">
                    <option value="">Select role...</option>
                    {roles?.map((r: Role) => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                  <button
                    disabled={!assignRoleId || assignMutation.isPending}
                    onClick={() => assignMutation.mutate({ userId: selectedUser.id, roleId: Number(assignRoleId) })}
                    className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                    Assign
                  </button>
                </div>
              </div>

              {selectedUser.is_active && !selectedUser.is_network_admin && (
                <div className="pt-2 border-t border-gray-100">
                  <button
                    onClick={() => { if (confirm(`Deactivate ${selectedUser.full_name}?`)) deactivateMutation.mutate(selectedUser.id); }}
                    className="text-xs text-red-500 hover:text-red-700">
                    Deactivate this user
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
