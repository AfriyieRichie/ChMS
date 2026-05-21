"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Download } from "lucide-react";
import {
  getMe, updateMe, changePassword,
  getMyNotifications, updateMyNotifications,
  getMyGiving, downloadGivingStatement,
  getMyAttendance, getMyGroups,
} from "@/lib/api/users";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/dashboard/page-header";
import { cn } from "@/lib/utils";

const FIELD = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 bg-white";

type Tab = "profile" | "security" | "notifications" | "giving" | "attendance" | "groups";
const TABS: { id: Tab; label: string }[] = [
  { id: "profile",       label: "Profile" },
  { id: "security",      label: "Security" },
  { id: "notifications", label: "Notifications" },
  { id: "giving",        label: "My Giving" },
  { id: "attendance",    label: "Attendance" },
  { id: "groups",        label: "Groups" },
];

const GROUP_TYPE_LABELS: Record<string, string> = {
  cell: "Cell", life_group: "Life Group", ministry_team: "Ministry",
  choir: "Choir", class: "Class", prayer_team: "Prayer",
};

function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((n) => n[0].toUpperCase()).join("");
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Profile tab ───────────────────────────────────────────────────────────────

function ProfileTab() {
  const queryClient = useQueryClient();
  const { data: me } = useQuery({ queryKey: ["me"], queryFn: getMe });
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const mut = useMutation({
    mutationFn: updateMe,
    onSuccess: (updated) => {
      queryClient.setQueryData(["me"], updated);
      setMsg({ ok: true, text: "Profile updated." });
      setFullName("");
      setPhone("");
    },
    onError: () => setMsg({ ok: false, text: "Failed to update profile." }),
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    const payload: { full_name?: string; phone?: string } = {};
    if (fullName.trim()) payload.full_name = fullName.trim();
    if (phone.trim()) payload.phone = phone.trim();
    if (!Object.keys(payload).length) {
      setMsg({ ok: false, text: "Enter a new name or phone number to update." });
      return;
    }
    mut.mutate(payload);
  }

  return (
    <div className="space-y-6 max-w-lg">
      {/* Avatar */}
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-neutral-800 flex items-center justify-center text-white text-2xl font-bold shrink-0">
          {me?.full_name ? initials(me.full_name) : "?"}
        </div>
        <div>
          <p className="font-semibold text-gray-900">{me?.full_name}</p>
          <p className="text-sm text-gray-400">{me?.email}</p>
          {me?.is_network_admin && (
            <span className="text-xs text-purple-600 font-medium">Network Admin</span>
          )}
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-4">
        <h2 className="font-semibold text-gray-900 text-sm">Update Contact Info</h2>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600">Full Name</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder={me?.full_name}
              className={FIELD}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600">Phone</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. +233 24 000 0000"
              className={FIELD}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600">Email (read-only)</label>
            <input type="email" value={me?.email ?? ""} disabled className={cn(FIELD, "bg-gray-50 text-gray-400")} />
          </div>
          {msg && (
            <p className={`text-sm ${msg.ok ? "text-emerald-600" : "text-red-500"}`}>{msg.text}</p>
          )}
          <Button type="submit" size="sm" disabled={mut.isPending}>
            {mut.isPending ? "Saving…" : "Save Changes"}
          </Button>
        </form>
      </div>

      {/* Role assignments */}
      {me?.role_assignments && me.role_assignments.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <h2 className="font-semibold text-gray-900 text-sm mb-3">My Roles</h2>
          <div className="space-y-1.5">
            {me.role_assignments.map((ra) => (
              <div key={ra.id} className="flex items-center gap-2 text-sm text-gray-700">
                <span className="font-medium">{ra.role_name}</span>
                {ra.branch_name && <span className="text-gray-400">@ {ra.branch_name}</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Security tab ──────────────────────────────────────────────────────────────

function SecurityTab() {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const mut = useMutation({
    mutationFn: ({ old_pw, new_pw }: { old_pw: string; new_pw: string }) =>
      changePassword(old_pw, new_pw),
    onSuccess: () => {
      setMsg({ ok: true, text: "Password changed successfully." });
      setOldPassword(""); setNewPassword(""); setConfirm("");
    },
    onError: () => setMsg({ ok: false, text: "Failed to change password. Check your current password." }),
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (newPassword !== confirm) {
      setMsg({ ok: false, text: "Passwords do not match." });
      return;
    }
    if (newPassword.length < 8) {
      setMsg({ ok: false, text: "Password must be at least 8 characters." });
      return;
    }
    mut.mutate({ old_pw: oldPassword, new_pw: newPassword });
  }

  return (
    <div className="max-w-md">
      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-4">
        <h2 className="font-semibold text-gray-900 text-sm">Change Password</h2>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600">Current Password</label>
            <input type="password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} required className={FIELD} />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600">New Password</label>
            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required placeholder="Min. 8 characters" className={FIELD} />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600">Confirm New Password</label>
            <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required className={FIELD} />
          </div>
          {msg && (
            <p className={`text-sm ${msg.ok ? "text-emerald-600" : "text-red-500"}`}>{msg.text}</p>
          )}
          <Button type="submit" size="sm" disabled={mut.isPending}>
            {mut.isPending ? "Changing…" : "Change Password"}
          </Button>
        </form>
      </div>
    </div>
  );
}

// ── Notifications tab ─────────────────────────────────────────────────────────

const PREF_LABELS: { key: string; label: string; desc: string }[] = [
  { key: "email_attendance_reminders", label: "Attendance reminders", desc: "Service and event attendance alerts" },
  { key: "email_event_invites",        label: "Event invitations",    desc: "When you're invited to an event" },
  { key: "email_giving_receipts",      label: "Giving receipts",      desc: "Email receipt when a contribution is recorded" },
  { key: "email_announcements",        label: "Announcements",        desc: "General church announcements" },
  { key: "email_pastoral_care",        label: "Pastoral care",        desc: "Alerts from pastoral care team" },
];

function NotificationsTab() {
  const queryClient = useQueryClient();
  const { data: prefs, isLoading } = useQuery({
    queryKey: ["my-notifications"],
    queryFn: getMyNotifications,
  });

  const mut = useMutation({
    mutationFn: updateMyNotifications,
    onSuccess: (updated) => queryClient.setQueryData(["my-notifications"], updated),
  });

  function toggle(key: string, value: boolean) {
    mut.mutate({ [key]: value });
  }

  if (isLoading) return <p className="text-gray-400 text-sm">Loading…</p>;

  return (
    <div className="max-w-lg">
      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-4">
        <div>
          <h2 className="font-semibold text-gray-900 text-sm">Email Notifications</h2>
          <p className="text-xs text-gray-400 mt-0.5">Choose which emails you receive from ChMS.</p>
        </div>
        <div className="divide-y divide-gray-100">
          {PREF_LABELS.map(({ key, label, desc }) => {
            const checked = prefs ? (prefs as unknown as Record<string, boolean>)[key] : false;
            return (
              <div key={key} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium text-gray-800">{label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
                </div>
                <button
                  role="switch"
                  aria-checked={checked}
                  onClick={() => toggle(key, !checked)}
                  disabled={mut.isPending}
                  className={cn(
                    "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors",
                    checked ? "bg-neutral-800" : "bg-gray-200",
                    mut.isPending && "opacity-60",
                  )}
                >
                  <span
                    className={cn(
                      "pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow ring-0 transition-transform",
                      checked ? "translate-x-4" : "translate-x-0",
                    )}
                  />
                </button>
              </div>
            );
          })}
        </div>
        {prefs?.updated_at && (
          <p className="text-[10px] text-gray-300">
            Last updated: {new Date(prefs.updated_at).toLocaleString("en-GH")}
          </p>
        )}
      </div>
    </div>
  );
}

// ── Giving tab ────────────────────────────────────────────────────────────────

function GivingTab() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [downloading, setDownloading] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["my-giving", year],
    queryFn: () => getMyGiving(year),
  });

  async function handleDownload() {
    setDownloading(true);
    try {
      const blob = await downloadGivingStatement(year);
      triggerDownload(blob, `giving-statement-${year}.csv`);
    } finally {
      setDownloading(false);
    }
  }

  if (isLoading) return <p className="text-gray-400 text-sm">Loading…</p>;

  if (!data?.has_member_profile) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded p-5 text-sm text-gray-600 max-w-lg">
        Your account is not linked to a member profile. Contact your branch administrator.
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-center gap-3">
        <select
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 bg-white"
        >
          {Array.from({ length: 5 }, (_, i) => currentYear - i).map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>

        {data.results.length > 0 && (
          <Button variant="outline" size="sm" onClick={handleDownload} disabled={downloading}>
            <Download size={14} />
            {downloading ? "Downloading…" : "Download Statement"}
          </Button>
        )}

        {data.grand_total > 0 && (
          <span className="ml-auto text-sm font-semibold text-gray-700">
            Total: GHS {data.grand_total.toLocaleString("en-GH", { minimumFractionDigits: 2 })}
          </span>
        )}
      </div>

      {data.results.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-400 text-sm shadow-sm">
          No giving records for {year}.
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-100">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Date</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Receipt</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Fund</th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase">Amount</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase hidden sm:table-cell">Method</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data.results.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5 text-sm text-gray-600">{c.given_at}</td>
                  <td className="px-4 py-2.5 text-xs text-gray-400 font-mono">{c.receipt_number}</td>
                  <td className="px-4 py-2.5 text-sm text-gray-700">{c["fund__name"] || "—"}</td>
                  <td className="px-4 py-2.5 text-sm font-semibold text-gray-900 text-right">
                    {c.currency} {Number(c.amount).toLocaleString("en-GH", { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-gray-500 capitalize hidden sm:table-cell">
                    {c.payment_method.replace(/_/g, " ")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Attendance tab ────────────────────────────────────────────────────────────

function AttendanceTab() {
  const { data, isLoading } = useQuery({
    queryKey: ["my-attendance"],
    queryFn: getMyAttendance,
  });

  if (isLoading) return <p className="text-gray-400 text-sm">Loading…</p>;

  if (!data?.has_member_profile) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded p-5 text-sm text-gray-600 max-w-lg">
        Your account is not linked to a member profile. Contact your branch administrator.
      </div>
    );
  }

  if (!data.results.length) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-400 text-sm shadow-sm max-w-lg">
        No attendance records found.
      </div>
    );
  }

  return (
    <div className="max-w-xl">
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900 text-sm">Recent Attendance</h2>
          <span className="text-xs text-gray-400">{data.results.length} records</span>
        </div>
        <div className="divide-y divide-gray-50 max-h-[480px] overflow-auto">
          {data.results.map((e, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-2.5">
              <div className="w-2 h-2 rounded-full bg-green-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-800">{e.service ?? "Service"}</p>
                {e.branch && <p className="text-xs text-gray-400">{e.branch}</p>}
              </div>
              <span className="text-xs text-gray-400 shrink-0">{e.date}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Groups tab ────────────────────────────────────────────────────────────────

function GroupsTab() {
  const { data, isLoading } = useQuery({
    queryKey: ["my-groups"],
    queryFn: getMyGroups,
  });

  if (isLoading) return <p className="text-gray-400 text-sm">Loading…</p>;

  if (!data?.has_member_profile) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded p-5 text-sm text-gray-600 max-w-lg">
        Your account is not linked to a member profile. Contact your branch administrator.
      </div>
    );
  }

  if (!data.results.length) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-400 text-sm shadow-sm max-w-lg">
        No group memberships found.
      </div>
    );
  }

  const active = data.results.filter((g) => g.is_active);
  const past = data.results.filter((g) => !g.is_active);

  return (
    <div className="max-w-xl space-y-4">
      {active.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900 text-sm">Active Groups</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {active.map((g) => (
              <div key={g.group_id} className="flex items-center gap-3 px-4 py-3">
                <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600 text-xs font-semibold shrink-0">
                  {g.group_name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{g.group_name}</p>
                  <p className="text-xs text-gray-400">
                    {GROUP_TYPE_LABELS[g.group_type] ?? g.group_type} · Joined {g.joined_at}
                  </p>
                </div>
                <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full font-medium">Active</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {past.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900 text-sm text-gray-400">Past Groups</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {past.map((g) => (
              <div key={g.group_id} className="flex items-center gap-3 px-4 py-3 opacity-60">
                <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 text-xs font-bold shrink-0">
                  {g.group_name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-700 truncate">{g.group_name}</p>
                  <p className="text-xs text-gray-400">
                    {GROUP_TYPE_LABELS[g.group_type] ?? g.group_type} · Left {g.left_at}
                  </p>
                </div>
                <span className="text-xs text-gray-400">Past</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const [tab, setTab] = useState<Tab>("profile");
  const { data: me, isLoading } = useQuery({ queryKey: ["me"], queryFn: getMe });

  if (isLoading) return <div className="p-8 text-center text-gray-400 text-sm">Loading…</div>;

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="My Profile"
        description={me?.email ?? ""}
      />

      {/* Tabs */}
      <div className="flex gap-0.5 border-b border-gray-200 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px whitespace-nowrap shrink-0",
              tab === t.id
                ? "border-gray-900 text-blue-700"
                : "border-transparent text-gray-500 hover:text-gray-700",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "profile"       && <ProfileTab />}
      {tab === "security"      && <SecurityTab />}
      {tab === "notifications" && <NotificationsTab />}
      {tab === "giving"        && <GivingTab />}
      {tab === "attendance"    && <AttendanceTab />}
      {tab === "groups"        && <GroupsTab />}
    </div>
  );
}
