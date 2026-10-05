"use client";
import Link from "next/link";
import { PlaneLoader } from '@/components/ui/plane-loader'
import { usePathname, useRouter } from "next/navigation";
import {
  Archive,
  Bell,
  Box,
  CalendarClock,
  ClipboardList,
  FileText,
  Gauge,
  LayoutDashboard,
  Loader2,
  LogOut,
  Plane,
  Settings,
  Users,
  Wrench,
  Menu,
  X,
  type LucideIcon,
} from "lucide-react";
import { useRole } from "./role-context";
import { useNotifications } from "./notifications-context";
import { NotificationBell } from "./notification-bell";
import { AirlinerSilhouette, AviationBackdrop } from "./aviation-backdrop";
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
  items: [
    { label: "User management", href: "/users", icon: Users },
    { label: "Archive", href: "/archive", icon: Archive },
  ],
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
        "fixed inset-y-0 left-0 z-50 flex w-[252px] flex-col overflow-hidden border border-white bg-white text-slate-800 shadow-soft transition-transform duration-200 ease-out lg:inset-y-4 lg:left-4 lg:z-40 lg:w-[228px] lg:translate-x-0 lg:rounded-[28px]",
        open ? "translate-x-0" : "-translate-x-full",
      )}
    >
      <div className="flex h-24 shrink-0 items-center justify-between px-5">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/20"><Plane className="h-6 w-6" aria-hidden="true" /></div>
          <div>
            <div className="text-lg font-bold tracking-tight">NGGL<span className="text-blue-600">.</span></div>
            <div className="text-[9px] font-semibold uppercase tracking-[.18em] text-slate-500">Ground operations</div>
          </div>
        </Link>
        <button type="button" className="rounded-lg p-1 text-slate-500 hover:text-blue-600 lg:hidden" onClick={onClose} aria-label="Close menu">
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="mx-4 mb-5 flex shrink-0 items-center gap-3 rounded-2xl border border-blue-100 bg-blue-50/60 px-3 py-3">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-white text-[11px] font-bold text-blue-700">DAC</span>
        <div>
          <div className="text-[9px] font-semibold uppercase tracking-widest text-slate-500">Workspace</div>
          <div className="mt-1 text-xs font-semibold">{organization === "Biman" ? "Biman Bangladesh" : "NGGL"}</div>
        </div>
      </div>
      <nav className="sidebar-nav-scroll flex-1 space-y-6 overflow-y-auto px-3 pb-4">
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
                      active ? "bg-blue-600 text-white shadow-md shadow-blue-600/20" : "text-slate-600 hover:bg-blue-50 hover:text-blue-700",
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
      <div className="relative mx-3 mb-3 shrink-0 overflow-hidden rounded-2xl bg-gradient-to-br from-blue-50 to-sky-100 p-4">
        <AirlinerSilhouette className="pointer-events-none absolute -right-5 -top-4 w-28 rotate-[30deg] text-blue-600/15" />
        <div className="relative mb-4">
          <div className="text-[10px] font-bold uppercase tracking-[.16em] text-blue-700">Ground control</div>
          <div className="mt-1 text-xs text-slate-600">Precision on the ground.</div>
        </div>
        <button type="button" onClick={onSignOut} className="relative flex items-center gap-2 rounded-lg text-xs font-medium text-slate-600 transition-colors hover:text-blue-700">
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
      <PlaneLoader fullScreen label="Loading…" />
    );
  }

  return (
    <div className="relative min-h-screen bg-[#eef2fb]">
      <AviationBackdrop className="fixed z-0 lg:left-[252px]" />
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
      <div className="relative z-10 lg:pl-[252px]">
        <header className="sticky top-0 z-30 flex h-[76px] items-center justify-between gap-3 bg-[#eef2fb]/90 px-5 backdrop-blur-xl lg:px-8">
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
              <div className="hidden text-xs text-slate-500 sm:block">{today} · Dhaka (DAC), Bangladesh</div>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <NotificationBell />
            <div className="hidden h-8 w-px bg-slate-200 sm:block" aria-hidden="true" />
            <div className="flex min-w-0 items-center gap-2 rounded-full border border-white bg-white/80 py-1 pl-1 pr-2 shadow-[0_2px_12px_-6px_rgba(15,23,42,0.18)] sm:gap-2.5 sm:pl-1.5 sm:pr-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-blue-100 to-sky-200 text-xs font-bold text-blue-800 ring-2 ring-white">{user.initials}</span>
              <span className="hidden min-w-0 sm:block">
                <span className="block max-w-[160px] truncate text-xs font-semibold text-slate-900">{user.name}</span>
                <span className="mt-0.5 block max-w-[160px] truncate text-[10px] text-slate-500">{user.role}</span>
              </span>
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-[1520px] px-4 pb-8 pt-2 sm:px-5 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
