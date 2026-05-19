"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getMe, updateMe, changePassword } from "@/lib/api/users";

export default function ProfilePage() {
  const queryClient = useQueryClient();

  const { data: me, isLoading } = useQuery({
    queryKey: ["me"],
    queryFn: getMe,
  });

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [profileMsg, setProfileMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwMsg, setPwMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const profileMutation = useMutation({
    mutationFn: updateMe,
    onSuccess: (updated) => {
      queryClient.setQueryData(["me"], updated);
      setProfileMsg({ type: "success", text: "Profile updated." });
    },
    onError: () => setProfileMsg({ type: "error", text: "Failed to update profile." }),
  });

  const passwordMutation = useMutation({
    mutationFn: ({ old_pw, new_pw }: { old_pw: string; new_pw: string }) =>
      changePassword(old_pw, new_pw),
    onSuccess: () => {
      setPwMsg({ type: "success", text: "Password changed successfully." });
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (err: Error) =>
      setPwMsg({ type: "error", text: err.message || "Failed to change password." }),
  });

  function handleProfileSubmit(e: React.FormEvent) {
    e.preventDefault();
    setProfileMsg(null);
    const payload: { full_name?: string; phone?: string } = {};
    if (fullName.trim()) payload.full_name = fullName.trim();
    if (phone.trim()) payload.phone = phone.trim();
    if (!Object.keys(payload).length) {
      setProfileMsg({ type: "error", text: "Enter a new name or phone to update." });
      return;
    }
    profileMutation.mutate(payload);
  }

  function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPwMsg(null);
    if (newPassword !== confirmPassword) {
      setPwMsg({ type: "error", text: "Passwords do not match." });
      return;
    }
    if (newPassword.length < 8) {
      setPwMsg({ type: "error", text: "Password must be at least 8 characters." });
      return;
    }
    passwordMutation.mutate({ old_pw: oldPassword, new_pw: newPassword });
  }

  if (isLoading) return <div className="p-8 text-center text-gray-500">Loading...</div>;

  return (
    <div className="p-6 space-y-6 max-w-xl">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">My Profile</h1>
        <p className="text-xs text-gray-500 mt-0.5">{me?.email}</p>
      </div>

      {/* Profile info */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-4">
        <h2 className="font-semibold text-gray-800 text-sm">Update Profile</h2>
        <div className="text-sm text-gray-500">
          Current name: <span className="font-medium text-gray-900">{me?.full_name}</span>
        </div>
        <form onSubmit={handleProfileSubmit} className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600">Full Name</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder={me?.full_name}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600">Phone</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
          </div>
          {profileMsg && (
            <p className={`text-sm ${profileMsg.type === "success" ? "text-green-600" : "text-red-500"}`}>
              {profileMsg.text}
            </p>
          )}
          <button
            type="submit"
            disabled={profileMutation.isPending}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {profileMutation.isPending ? "Saving…" : "Save Changes"}
          </button>
        </form>
      </div>

      {/* Change password */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-4">
        <h2 className="font-semibold text-gray-800 text-sm">Change Password</h2>
        <form onSubmit={handlePasswordSubmit} className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600">Current Password</label>
            <input
              type="password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              required
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600">New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              placeholder="Min. 8 characters"
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600">Confirm New Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
          </div>
          {pwMsg && (
            <p className={`text-sm ${pwMsg.type === "success" ? "text-green-600" : "text-red-500"}`}>
              {pwMsg.text}
            </p>
          )}
          <button
            type="submit"
            disabled={passwordMutation.isPending}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {passwordMutation.isPending ? "Changing…" : "Change Password"}
          </button>
        </form>
      </div>
    </div>
  );
}
