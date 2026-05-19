"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { setAccessToken } from "@/lib/api";
import { getMe } from "@/lib/api/users";
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

type NavItem = { href: string; label: string; Icon: LucideIcon };

const NAV_TOP: NavItem[] = [
  { href: "/dashboard", label: "Overview", Icon: LayoutDashboard },
];

const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: "People",
    items: [
      { href: "/dashboard/members", label: "Members", Icon: Users },
      { href: "/dashboard/households", label: "Households", Icon: Home },
      { href: "/dashboard/branches", label: "Branches", Icon: Building2 },
    ],
  },
  {
    label: "Ministry",
    items: [
      { href: "/dashboard/attendance", label: "Attendance", Icon: ClipboardCheck },
      { href: "/dashboard/events", label: "Events", Icon: CalendarDays },
      { href: "/dashboard/groups", label: "Groups", Icon: Users2 },
      { href: "/dashboard/communications", label: "Comms", Icon: Megaphone },
    ],
  },
  {
    label: "Finance",
    items: [
      { href: "/dashboard/finance", label: "Finance", Icon: Wallet },
    ],
  },
  {
    label: "Admin",
    items: [
      { href: "/dashboard/reports", label: "Reports", Icon: BarChart3 },
      { href: "/dashboard/users", label: "Users", Icon: ShieldCheck },
      { href: "/dashboard/audit-log", label: "Audit Log", Icon: History },
    ],
  },
];

function NavLink({ href, label, Icon, active }: NavItem & { active: boolean }) {
  return (
    <Link
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
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join("");
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { data: me } = useQuery({ queryKey: ["me"], queryFn: getMe, staleTime: 600_000 });

  function isActive(href: string) {
    return pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
  }

  const userInitials = me?.full_name ? initials(me.full_name) : "?";

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Sidebar */}
      <aside className="w-60 bg-slate-900 flex flex-col shrink-0">
        {/* Logo */}
        <div className="px-5 py-[18px] border-b border-slate-800 shrink-0">
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
        <nav className="flex-1 py-4 px-3 overflow-y-auto space-y-5">
          <div className="space-y-0.5">
            {NAV_TOP.map(({ href, label, Icon }) => (
              <NavLink key={href} href={href} label={label} Icon={Icon} active={isActive(href)} />
            ))}
          </div>

          {NAV_GROUPS.map((group) => (
            <div key={group.label}>
              <p className="px-3 mb-2 text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items.map(({ href, label, Icon }) => (
                  <NavLink key={href} href={href} label={label} Icon={Icon} active={isActive(href)} />
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Bottom */}
        <div className="p-3 border-t border-slate-800 shrink-0 space-y-0.5">
          <NavLink href="/dashboard/profile" label="My Profile" Icon={UserCircle} active={isActive("/dashboard/profile")} />
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

      {/* Right column */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-14 bg-white border-b border-gray-100 flex items-center justify-end px-6 shrink-0 gap-4">
          <span className="text-xs text-gray-400 hidden sm:block">
            {new Date().toLocaleDateString("en-GH", {
              weekday: "short",
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </span>
          <Link
            href="/dashboard/profile"
            className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold hover:bg-blue-700 transition-colors shrink-0"
            title={me?.full_name ?? "Profile"}
          >
            {userInitials}
          </Link>
        </header>

        {/* Scrollable content */}
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
