import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Dashboard" };

const CARDS = [
  { label: "Members", value: "—", href: "/dashboard/members", description: "View all members" },
  { label: "Branches", value: "—", href: "/dashboard/branches", description: "Manage branches" },
  { label: "Attendance", value: "—", href: "/dashboard/attendance", description: "Track attendance" },
  { label: "Giving", value: "GHS —", href: "#", description: "Coming soon" },
];

export default function DashboardPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Overview</h1>
        <p className="text-sm text-gray-500 mt-1">Welcome back. Here is a summary of your branch.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {CARDS.map(({ label, value, href, description }) => (
          <Link
            key={label}
            href={href}
            className="block bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow"
          >
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
            <p className="mt-1 text-3xl font-bold text-gray-900">{value}</p>
            <p className="mt-2 text-xs text-blue-600">{description} →</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
