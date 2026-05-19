"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { setAccessToken } from "@/lib/api";

const NAV = [
  { href: "/dashboard", label: "Overview", icon: "⊞" },
  { href: "/dashboard/members", label: "Members", icon: "👥" },
  { href: "/dashboard/branches", label: "Branches", icon: "🏛" },
  { href: "/dashboard/attendance", label: "Attendance", icon: "📋" },
  { href: "/dashboard/finance", label: "Finance", icon: "💰" },
  { href: "/dashboard/events", label: "Events", icon: "📅" },
  { href: "/dashboard/groups", label: "Groups", icon: "🫂" },
  { href: "/dashboard/communications", label: "Comms", icon: "📣" },
  { href: "/dashboard/reports", label: "Reports", icon: "📊" },
  { href: "/dashboard/users", label: "Users", icon: "👤" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-56 bg-white border-r border-gray-200 flex flex-col shrink-0">
        <div className="px-5 py-4 border-b border-gray-200">
          <span className="font-bold text-lg text-gray-900">
            {process.env.NEXT_PUBLIC_APP_NAME ?? "ChMS"}
          </span>
        </div>
        <nav className="flex-1 py-4 px-3 space-y-0.5">
          {NAV.map(({ href, label, icon }) => {
            const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? "bg-blue-50 text-blue-700"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                }`}
              >
                <span className="text-base">{icon}</span>
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={() => { setAccessToken(null); window.location.href = "/login"; }}
            className="text-xs text-gray-500 hover:text-gray-700"
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
