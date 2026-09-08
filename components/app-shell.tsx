"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  Box,
  CalendarClock,
  ClipboardList,
  FileText,
  Gauge,
  LayoutDashboard,
  LogOut,
  Moon,
  Settings,
  ShieldCheck,
  Sun,
  Users,
  Wrench,
  Menu,
  X,
  CircleHelp,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useRole } from "./role-context";
import { Role } from "@/lib/types";
import { notifications } from "@/lib/mock-data";
import { useState } from "react";
const nav = [
  { group: "Overview", items: [["Dashboard", "/dashboard", LayoutDashboard]] },
  {
    group: "Maintenance",
    items: [
      ["Tickets", "/tickets", ClipboardList],
      ["Schedule", "/schedule", CalendarClock],
      ["Requests", "/requests", Wrench],
    ],
  },
  {
    group: "Assets",
    items: [
      ["Equipment master", "/equipment", Box],
      ["Documents", "/documents", FileText],
    ],
  },
  {
    group: "Insights",
    items: [
      ["Reports", "/reports", Gauge],
      ["Notifications", "/notifications", Bell],
    ],
  },
];
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { role, setRole, user } = useRole();
  const { theme, setTheme } = useTheme();
  const [mobile, setMobile] = useState(false);
  const unread = notifications.filter((n) => !n.read).length;
  const canAdmin = role === "Super Admin";
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[252px] flex-col border-r border-slate-800 bg-[#101d31] text-white transition-transform lg:translate-x-0 ${mobile ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex h-20 items-center justify-between px-6">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-500 font-bold tracking-tighter">
              NG
            </div>
            <div>
              <div className="text-[15px] font-bold tracking-tight">NGGL</div>
              <div className="text-[10px] uppercase tracking-[.18em] text-slate-400">
                GSE logbook
              </div>
            </div>
          </Link>
          <button className="lg:hidden" onClick={() => setMobile(false)}>
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="mx-4 mb-5 rounded-xl border border-white/10 bg-white/5 px-3 py-3">
          <div className="text-[10px] uppercase tracking-widest text-slate-400">Workspace</div>
          <div className="mt-1 flex items-center justify-between text-sm font-medium">
            Biman Bangladesh
          </div>
        </div>
        <nav className="flex-1 space-y-6 px-3">
          {nav.map((section) => (
            <div key={section.group}>
              <div className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[.18em] text-slate-500">
                {section.group}
              </div>
              <div className="space-y-1">
                {section.items.map(([label, href, Icon]) => {
                  const active = pathname === href || pathname.startsWith(href + "/");
                  return (
                    <Link
                      key={href as string}
                      href={href as string}
                      onClick={() => setMobile(false)}
                      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition ${active ? "bg-blue-500 text-white shadow-lg shadow-blue-950/30" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}
                    >
                      <Icon className="h-4 w-4" />
                      {label as string}
                      {label === "Notifications" && unread > 0 ? (
                        <span className="ml-auto rounded-full bg-rose-400 px-1.5 py-0.5 text-[10px] text-white">
                          {unread}
                        </span>
                      ) : null}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
          {canAdmin && (
            <div>
              <div className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[.18em] text-slate-500">
                Admin
              </div>
              <div className="space-y-1">
                <Link
                  href="/users"
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium ${pathname.startsWith("/users") ? "bg-blue-500 text-white" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}
                >
                  <Users className="h-4 w-4" />
                  User management
                </Link>
                <Link
                  href="/settings"
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium ${pathname.startsWith("/settings") ? "bg-blue-500 text-white" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}
                >
                  <Settings className="h-4 w-4" />
                  Settings
                </Link>
              </div>
            </div>
          )}
        </nav>
        <div className="border-t border-white/10 p-4">
          <div className="flex items-center gap-3 rounded-xl p-2">
            <div className="grid h-8 w-8 place-items-center rounded-full bg-blue-500/20 text-xs font-bold text-blue-300">
              {user.initials}
            </div>
            <div className="min-w-0">
              <div className="truncate text-xs font-semibold">{user.name}</div>
              <div className="truncate text-[11px] text-slate-500">{user.role}</div>
            </div>
          </div>
          <Link
            href="/login"
            className="mt-2 flex items-center gap-2 px-2 text-xs text-slate-500 hover:text-white"
          >
            <LogOut className="h-3.5 w-3.5" /> Switch role
          </Link>
        </div>
      </aside>
      <div className="lg:pl-[252px]">
        <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b bg-white/85 px-5 backdrop-blur-xl dark:bg-slate-950/85 lg:px-9">
          <div className="flex items-center gap-3">
            <button
              className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden"
              onClick={() => setMobile(true)}
            >
              <Menu className="h-5 w-5" />
            </button>
            <div>
              <div className="text-sm font-semibold">GSE Maintenance Operations</div>
              <div className="hidden text-xs text-slate-500 sm:block">
                Sunday, 06 September 2026 · Dhaka, Bangladesh
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <Link
              href="/notifications"
              className="relative rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800"
            >
              <Bell className="h-[18px] w-[18px]" />
              {unread > 0 && (
                <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-950" />
              )}
            </Link>
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              {theme === "dark" ? (
                <Sun className="h-[18px] w-[18px]" />
              ) : (
                <Moon className="h-[18px] w-[18px]" />
              )}
            </button>
            <div className="hidden h-7 w-px bg-slate-200 dark:bg-slate-800 sm:block" />
            <button
              onClick={() => router.push("/login")}
              className="flex items-center gap-2 text-left"
            >
              <div className="grid h-8 w-8 place-items-center rounded-full bg-slate-900 text-[11px] font-bold text-white dark:bg-blue-600">
                {user.initials}
              </div>
              <div className="hidden md:block">
                <div className="text-xs font-semibold">{user.name}</div>
                <div className="text-[11px] text-slate-500">{user.role}</div>
              </div>
            </button>
          </div>
        </header>
        <main className="mx-auto max-w-[1520px] p-5 lg:p-9">{children}</main>
      </div>
    </div>
  );
}
export function ShellPage({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
