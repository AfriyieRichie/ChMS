"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
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
  Search,
  Bell,
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
      className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
        active
          ? "bg-white/[0.08] text-white font-medium"
          : "text-neutral-400 hover:bg-white/[0.05] hover:text-neutral-200 font-normal"
      }`}
    >
      <Icon size={15} className="shrink-0" />
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
  const router = useRouter();
  const { data: me } = useQuery({ queryKey: ["me"], queryFn: getMe, staleTime: 600_000 });
  const [search, setSearch] = useState("");

  function isActive(href: string) {
    return pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
  }

  const userInitials = me?.full_name ? initials(me.full_name) : "?";
  const appName = process.env.NEXT_PUBLIC_APP_NAME ?? "ChMS";
  const appAbbr = appName.slice(0, 2).toUpperCase();

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (search.trim()) {
      router.push(`/dashboard/members?search=${encodeURIComponent(search.trim())}`);
      setSearch("");
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100">
      {/* Sidebar */}
      <aside className="w-56 bg-neutral-900 flex flex-col shrink-0">
        {/* Logo */}
        <div className="px-4 py-4 border-b border-white/[0.06] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-white/10 border border-white/15 flex items-center justify-center shrink-0">
              <span className="text-white text-xs font-bold tracking-tight">{appAbbr}</span>
            </div>
            <span className="font-semibold text-white text-sm tracking-tight leading-tight">
              {appName}
            </span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 px-2 overflow-y-auto space-y-4">
          <div className="space-y-0.5">
            {NAV_TOP.map(({ href, label, Icon }) => (
              <NavLink key={href} href={href} label={label} Icon={Icon} active={isActive(href)} />
            ))}
          </div>

          {NAV_GROUPS.map((group) => (
            <div key={group.label}>
              <p className="px-3 mb-1.5 text-[9px] font-semibold text-neutral-500 uppercase tracking-widest">
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
        <div className="p-2 border-t border-white/[0.06] shrink-0 space-y-0.5">
          <NavLink href="/dashboard/profile" label="My Profile" Icon={UserCircle} active={isActive("/dashboard/profile")} />
          <button
            onClick={() => {
              setAccessToken(null);
              window.location.href = "/login";
            }}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-normal text-neutral-400 hover:bg-white/[0.05] hover:text-neutral-200 transition-colors"
          >
            <LogOut size={15} className="shrink-0" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Right column */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-14 bg-white border-b border-gray-200 flex items-center px-5 shrink-0 gap-4">
          {/* Search */}
          <form onSubmit={handleSearch} className="flex-1 max-w-sm">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search people, groups, events…"
                className="w-full pl-8 pr-3 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-300 focus:border-gray-400 placeholder:text-gray-400 transition-colors"
              />
            </div>
          </form>

          <div className="flex items-center gap-1 ml-auto">
            {/* Date */}
            <span className="text-xs text-gray-400 hidden lg:block mr-3">
              {new Date().toLocaleDateString("en-GH", {
                weekday: "short",
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </span>

            {/* Notifications */}
            <button
              className="relative p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              title="Notifications"
            >
              <Bell size={17} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white" />
            </button>

            {/* Avatar */}
            <Link
              href="/dashboard/profile"
              className="ml-1 w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center text-white text-[11px] font-semibold hover:bg-neutral-700 transition-colors shrink-0"
              title={me?.full_name ?? "Profile"}
            >
              {userInitials}
            </Link>
          </div>
        </header>

        {/* Scrollable content */}
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
