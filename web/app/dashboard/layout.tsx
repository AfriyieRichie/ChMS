"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { setAccessToken } from "@/lib/api";
import {
  LayoutDashboard,
  Users,
  Building2,
  ClipboardCheck,
  Wallet,
  CalendarDays,
  Users2,
  Megaphone,
  BarChart3,
  ShieldCheck,
  Home,
  History,
  UserCircle,
  LogOut,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const NAV: { href: string; label: string; Icon: LucideIcon }[] = [
  { href: "/dashboard", label: "Overview", Icon: LayoutDashboard },
  { href: "/dashboard/members", label: "Members", Icon: Users },
  { href: "/dashboard/branches", label: "Branches", Icon: Building2 },
  { href: "/dashboard/attendance", label: "Attendance", Icon: ClipboardCheck },
  { href: "/dashboard/finance", label: "Finance", Icon: Wallet },
  { href: "/dashboard/events", label: "Events", Icon: CalendarDays },
  { href: "/dashboard/groups", label: "Groups", Icon: Users2 },
  { href: "/dashboard/communications", label: "Comms", Icon: Megaphone },
  { href: "/dashboard/reports", label: "Reports", Icon: BarChart3 },
  { href: "/dashboard/users", label: "Users", Icon: ShieldCheck },
  { href: "/dashboard/households", label: "Households", Icon: Home },
  { href: "/dashboard/audit-log", label: "Audit Log", Icon: History },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-60 bg-slate-900 flex flex-col shrink-0">
        {/* Logo */}
        <div className="px-5 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
              <span className="text-white text-xs font-bold">C</span>
            </div>
            <span className="font-semibold text-white text-sm tracking-tight">
              {process.env.NEXT_PUBLIC_APP_NAME ?? "ChMS"}
            </span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-3 space-y-0.5 overflow-y-auto">
          {NAV.map(({ href, label, Icon }) => {
            const active =
              pathname === href ||
              (href !== "/dashboard" && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? "bg-blue-600 text-white"
                    : "text-slate-400 hover:bg-slate-800 hover:text-white"
                }`}
              >
                <Icon size={16} className="shrink-0" />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Bottom actions */}
        <div className="p-3 border-t border-slate-800 space-y-0.5">
          <Link
            href="/dashboard/profile"
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              pathname === "/dashboard/profile"
                ? "bg-blue-600 text-white"
                : "text-slate-400 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <UserCircle size={16} className="shrink-0" />
            My Profile
          </Link>
          <button
            onClick={() => {
              setAccessToken(null);
              window.location.href = "/login";
            }}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <LogOut size={16} className="shrink-0" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
