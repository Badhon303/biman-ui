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
  Loader2,
  LogOut,
  Moon,
  Settings,
  Sun,
  Users,
  Wrench,
  Menu,
  X,
  type LucideIcon,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useRole } from "./role-context";
import { useNotifications } from "./notifications-context";
import { NotificationBell } from "./notification-bell";
import { memo, useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type NavItem = { label: string; href: string; icon: LucideIcon };
type NavSection = { group: string; items: NavItem[] };

const nav: NavSection[] = [
  { group: "Overview", items: [{ label: "Dashboard", href: "/dashboard", icon: LayoutDashboard }] },
  {
    group: "Maintenance",
    items: [
      { label: "Tickets", href: "/tickets", icon: ClipboardList },
      { label: "V Service Schedules", href: "/schedule", icon: CalendarClock },
      { label: "Requests", href: "/requests", icon: Wrench },
    ],
  },
  {
    group: "Assets",
    items: [
      { label: "Equipment List", href: "/equipment", icon: Box },
      { label: "Documents", href: "/documents", icon: FileText },
    ],
  },
  {
    group: "Insights",
    items: [
      { label: "Reports", href: "/reports", icon: Gauge },
      { label: "Notifications", href: "/notifications", icon: Bell },
    ],
  },
  { group: "Workspace", items: [{ label: "Settings", href: "/settings", icon: Settings }] },
];
const adminSection: NavSection = {
  group: "Admin",
  items: [{ label: "User management", href: "/users", icon: Users }],
};

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  weekday: "long",
  day: "2-digit",
  month: "long",
  year: "numeric",
  timeZone: "Asia/Dhaka",
});

function useToday() {
  const [today, setToday] = useState(() => dateFormatter.format(new Date()));
  useEffect(() => {
    const timer = window.setInterval(() => setToday(dateFormatter.format(new Date())), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  return today;
}

const Sidebar = memo(function Sidebar({
  pathname,
  open,
  organization,
  canManageUsers,
  unread,
  onClose,
  onSignOut,
}: {
  pathname: string;
  open: boolean;
  organization: string;
  canManageUsers: boolean;
  unread: number;
  onClose: () => void;
  onSignOut: () => void;
}) {
  const sections = canManageUsers ? [...nav, adminSection] : nav;
  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-50 flex w-[252px] flex-col border-r border-slate-800 bg-[#101d31] text-white transition-transform duration-200 ease-out lg:z-40 lg:translate-x-0",
        open ? "translate-x-0" : "-translate-x-full",
      )}
    >
      <div className="flex h-20 shrink-0 items-center justify-between px-6">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-500 font-bold tracking-tighter">NG</div>
          <div>
            <div className="text-[15px] font-bold tracking-tight">NGGL</div>
            <div className="text-[10px] uppercase tracking-[.18em] text-slate-400">GSE logbook</div>
          </div>
        </Link>
        <button type="button" className="rounded-lg p-1 text-slate-400 hover:text-white lg:hidden" onClick={onClose} aria-label="Close menu">
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="mx-4 mb-5 shrink-0 rounded-xl border border-white/10 bg-white/5 px-3 py-3">
        <div className="text-[10px] uppercase tracking-widest text-slate-400">Workspace</div>
        <div className="mt-1 text-sm font-medium">{organization === "Biman" ? "Biman Bangladesh" : "NGGL"}</div>
      </div>
      <nav className="flex-1 space-y-6 overflow-y-auto px-3 pb-4">
        {sections.map((section) => (
          <div key={section.group}>
            <div className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[.18em] text-slate-500">{section.group}</div>
            <div className="space-y-1">
              {section.items.map(({ label, href, icon: Icon }) => {
                const active = pathname === href || pathname.startsWith(href + "/");
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={onClose}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-colors",
                      active ? "bg-blue-500 text-white shadow-lg shadow-blue-950/30" : "text-slate-400 hover:bg-white/5 hover:text-white",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                    {href === "/notifications" && unread > 0 ? (
                      <span className="ml-auto rounded-full bg-rose-400 px-1.5 py-0.5 text-[10px] text-white">{unread > 99 ? "99+" : unread}</span>
                    ) : null}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
      <div className="shrink-0 border-t border-white/10 p-4">
        <button type="button" onClick={onSignOut} className="flex items-center gap-2 px-2 text-xs text-slate-500 transition-colors hover:text-white">
          <LogOut className="h-3.5 w-3.5" /> Log out
        </button>
      </div>
    </aside>
  );
});

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { role, user, loading, mustChangePassword, clearSession } = useRole();
  const { resolvedTheme, setTheme } = useTheme();
  const [mobile, setMobile] = useState(false);
  const { unread } = useNotifications();
  const today = useToday();
  const canManageUsers = role === "Super Admin" || role === "Manager";

  useEffect(() => {
    if (!loading && (!user || mustChangePassword)) router.replace("/login");
  }, [loading, mustChangePassword, router, user]);

  useEffect(() => {
    if (!mobile) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setMobile(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobile]);

  const closeMobile = useCallback(() => setMobile(false), []);
  const signOut = useCallback(async () => {
    try {
      const response = await fetch("/api/logout", { method: "POST" });
      if (!response.ok) throw new Error("Unable to complete logout.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to complete logout.");
    } finally {
      clearSession();
      router.replace("/login");
    }
  }, [clearSession, router]);

  if (loading || !user || mustChangePassword) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-50 dark:bg-slate-950" aria-busy="true">
        <Loader2 className="h-6 w-6 animate-spin text-blue-600" aria-label="Loading" />
      </div>
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <Sidebar
        pathname={pathname}
        open={mobile}
        organization={user.organization}
        canManageUsers={canManageUsers}
        unread={unread}
        onClose={closeMobile}
        onSignOut={signOut}
      />
      {mobile && <div className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-sm lg:hidden" onClick={closeMobile} aria-hidden="true" />}
      <div className="lg:pl-[252px]">
        <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b bg-white/85 px-5 backdrop-blur-xl dark:bg-slate-950/85 lg:px-9">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden"
              onClick={() => setMobile(true)}
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div>
              <div className="text-sm font-semibold">GSE Maintenance Operations</div>
              <div className="hidden text-xs text-slate-500 sm:block">{today} · Dhaka, Bangladesh</div>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <NotificationBell />
            <button
              type="button"
              onClick={() => setTheme(isDark ? "light" : "dark")}
              aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
              className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white"
            >
              {isDark ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
            </button>
            <div className="hidden h-7 w-px bg-slate-200 dark:bg-slate-800 sm:block" />
            <div className="flex items-center gap-2 text-left">
              <div className="grid h-8 w-8 place-items-center rounded-full bg-slate-900 text-[11px] font-bold text-white dark:bg-blue-600">
                {user.initials}
              </div>
              <div className="hidden md:block">
                <div className="text-xs font-semibold">{user.name}</div>
                <div className="text-[11px] text-slate-500">{user.role}</div>
              </div>
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-[1520px] p-5 lg:p-9">{children}</main>
      </div>
    </div>
  );
}
