import type { Metadata } from "next";

export const metadata: Metadata = { title: "Dashboard" };

export default function DashboardPage() {
  return (
    <div className="flex min-h-screen flex-col bg-muted/40">
      {/* Top nav placeholder */}
      <header className="border-b bg-background px-6 py-4 flex items-center justify-between">
        <span className="font-semibold text-lg">
          {process.env.NEXT_PUBLIC_APP_NAME ?? "ChMS"}
        </span>
        <nav className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>Branch switcher (coming Phase 1)</span>
          <a href="/login" className="underline-offset-4 hover:underline">
            Sign out
          </a>
        </nav>
      </header>

      <main className="flex-1 p-8 max-w-5xl mx-auto w-full">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Dashboard</h1>
        <p className="text-muted-foreground mb-8">
          Phase 1 in progress — RBAC, Branches, Members, and Attendance coming next.
        </p>

        {/* Placeholder stat cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Members", value: "—" },
            { label: "Branches", value: "—" },
            { label: "Attendance this week", value: "—" },
            { label: "Giving this month", value: "GHS —" },
          ].map(({ label, value }) => (
            <div
              key={label}
              className="rounded-xl border bg-card p-6 text-card-foreground shadow-sm"
            >
              <p className="text-sm text-muted-foreground">{label}</p>
              <p className="mt-1 text-2xl font-semibold">{value}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
