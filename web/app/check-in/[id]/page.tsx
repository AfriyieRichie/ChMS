"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { selfCheckIn } from "@/lib/api/attendance";
import { CheckCircle, XCircle, Loader2, Church } from "lucide-react";

type Stage = "idle" | "loading" | "success" | "not_found" | "already" | "error";

export default function SelfCheckInPage() {
  const { id } = useParams<{ id: string }>();
  const recordId = Number(id);

  const [phone, setPhone] = useState("");
  const [stage, setStage] = useState<Stage>("idle");
  const [memberName, setMemberName] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!phone.trim()) return;
    setStage("loading");
    try {
      const res = await selfCheckIn(recordId, phone.trim());
      if (res.already_checked_in) {
        setMemberName(res.member_name);
        setStage("already");
      } else {
        setMemberName(res.member_name);
        setStage("success");
      }
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 404) {
        setStage("not_found");
      } else {
        setStage("error");
      }
    }
  }

  function reset() {
    setPhone("");
    setStage("idle");
    setMemberName("");
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-100 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-indigo-600 text-white mb-4">
            <Church size={32} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Service Check-In</h1>
          <p className="text-gray-500 text-sm mt-1">Enter your phone number to check in</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          {stage === "idle" || stage === "loading" ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number
                </label>
                <input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. 0244123456"
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  disabled={stage === "loading"}
                  autoFocus
                  autoComplete="tel"
                />
              </div>
              <button
                type="submit"
                disabled={stage === "loading" || !phone.trim()}
                className="w-full bg-indigo-600 text-white rounded-lg py-3 font-semibold text-base hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
              >
                {stage === "loading" ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Checking in…
                  </>
                ) : (
                  "Check In"
                )}
              </button>
            </form>
          ) : stage === "success" ? (
            <div className="text-center py-4 space-y-3">
              <CheckCircle size={56} className="text-green-500 mx-auto" />
              <div>
                <p className="text-xl font-bold text-gray-900">Welcome, {memberName}!</p>
                <p className="text-gray-500 text-sm mt-1">Your attendance has been recorded.</p>
              </div>
              <button
                onClick={reset}
                className="mt-4 text-indigo-600 text-sm font-medium hover:underline"
              >
                Check in another person
              </button>
            </div>
          ) : stage === "already" ? (
            <div className="text-center py-4 space-y-3">
              <CheckCircle size={56} className="text-blue-400 mx-auto" />
              <div>
                <p className="text-xl font-bold text-gray-900">Already Checked In</p>
                <p className="text-gray-500 text-sm mt-1">
                  {memberName} is already marked present for this service.
                </p>
              </div>
              <button
                onClick={reset}
                className="mt-4 text-indigo-600 text-sm font-medium hover:underline"
              >
                Check in another person
              </button>
            </div>
          ) : stage === "not_found" ? (
            <div className="text-center py-4 space-y-3">
              <XCircle size={56} className="text-red-400 mx-auto" />
              <div>
                <p className="text-xl font-bold text-gray-900">Phone Not Found</p>
                <p className="text-gray-500 text-sm mt-1">
                  No member found with that phone number. Please see a staff member for help.
                </p>
              </div>
              <button
                onClick={reset}
                className="mt-4 text-indigo-600 text-sm font-medium hover:underline"
              >
                Try again
              </button>
            </div>
          ) : (
            <div className="text-center py-4 space-y-3">
              <XCircle size={56} className="text-red-400 mx-auto" />
              <div>
                <p className="text-xl font-bold text-gray-900">Something Went Wrong</p>
                <p className="text-gray-500 text-sm mt-1">
                  Unable to complete check-in. Please try again or see a staff member.
                </p>
              </div>
              <button
                onClick={reset}
                className="mt-4 text-indigo-600 text-sm font-medium hover:underline"
              >
                Try again
              </button>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          {process.env.NEXT_PUBLIC_APP_NAME ?? "ChMS"} · Self Check-In
        </p>
      </div>
    </div>
  );
}
