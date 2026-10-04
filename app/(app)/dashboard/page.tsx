"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  CalendarClock,
  CalendarDays,
  ChevronRight,
  CircleAlert,
  Clock3,
  Plus,
  Search,
  Plane,
  Radar,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Kpi } from "@/components/dashboard/kpi";
import { AirlinerSilhouette } from "@/components/aviation-backdrop";
import type { ChartDatum } from "@/components/dashboard/charts";
import dynamic from "next/dynamic";

const chartFallback = () => <div className="h-[220px] w-full animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800/60" />;
const EquipmentChart = dynamic(() => import("@/components/dashboard/charts").then((m) => m.EquipmentChart), { ssr: false, loading: chartFallback });
const TicketChart = dynamic(() => import("@/components/dashboard/charts").then((m) => m.TicketChart), { ssr: false, loading: chartFallback });
import { StatusBadge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useRole } from "@/components/role-context";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/api-client";
import {
  ApiEquipment,
  ApiRequest,
  ApiSchedule,
  ApiTicket,
  displayDate,
  fetchAllPages,
} from "@/lib/api-data";
import type { AppNotification, PaginatedResponse } from "@/lib/types";
import { notificationLink } from "@/lib/notification-links";

type DashboardData = {
  equipment: ApiEquipment[];
  tickets: ApiTicket[];
  requests: ApiRequest[];
  schedules: ApiSchedule[];
  notifications: AppNotification[];
};

const emptyData: DashboardData = { equipment: [], tickets: [], requests: [], schedules: [], notifications: [] };
const DAY = 86_400_000;
const equipmentStatuses = [
  { name: "Available", color: "#2667ff", dot: "bg-blue-500" },
  { name: "Under Maintenance", color: "#f59e0b", dot: "bg-amber-400" },
  { name: "Out of Service", color: "#f43f5e", dot: "bg-rose-500" },
  { name: "Inactive", color: "#94a3b8", dot: "bg-slate-400" },
];
const ticketTypeColors: Record<string, string> = {
  "V-Service": "#8b5cf6",
  Breakdown: "#f43f5e",
  Washing: "#0ea5e9",
  General: "#64748b",
};

function daysUntil(date: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(date);
  due.setHours(0, 0, 0, 0);
  return Math.round((due.getTime() - today.getTime()) / DAY);
}

function dueLabel(date: string) {
  const days = daysUntil(date);
  if (days === 0) return "Due today";
  if (days > 0) return `In ${days} day${days === 1 ? "" : "s"}`;
  return `${-days} day${days === -1 ? "" : "s"} overdue`;
}

const isOpenTicket = (ticket: ApiTicket) => ticket.status !== "Closed";
const isOverdueTicket = (ticket: ApiTicket) => isOpenTicket(ticket) && daysUntil(ticket.dueDate) < 0;
const byDueDate = (a: { dueDate: string }, b: { dueDate: string }) =>
  new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
const labelFromEnum = (value: string) =>
  value.includes("_") || value === value.toUpperCase()
    ? value.toLowerCase().replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
    : value;

function greeting() {
  const hour = new Date().getHours();
  return hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
}

function useDashboardData() {
  const [data, setData] = useState<DashboardData>(emptyData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const [equipment, tickets, requests, schedules, notifications] = await Promise.allSettled([
      fetchAllPages<ApiEquipment>("equipment"),
      fetchAllPages<ApiTicket>("tickets"),
      fetchAllPages<ApiRequest>("requests"),
      apiRequest<ApiSchedule[]>("maintenance-schedules"),
      apiRequest<PaginatedResponse<AppNotification>>("notifications?page=1&limit=5"),
    ]);
    const value = <T,>(result: PromiseSettledResult<T>, fallback: T) =>
      result.status === "fulfilled" ? result.value : fallback;
    setData({
      equipment: value(equipment, []),
      tickets: value(tickets, []),
      requests: value(requests, []),
      schedules: value(schedules, []),
      notifications: value(notifications, { items: [], page: 1, limit: 5, total: 0 }).items,
    });
    const failed = [equipment, tickets, requests, schedules, notifications].find(
      (result): result is PromiseRejectedResult => result.status === "rejected",
    );
    setError(failed ? (failed.reason instanceof Error ? failed.reason.message : "Some dashboard data could not be loaded.") : "");
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const refresh = () => {
      clearTimeout(timer);
      timer = setTimeout(() => void load(), 300);
    };
    window.addEventListener("biman:data-mutation", refresh);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("biman:data-mutation", refresh);
    };
  }, [load]);

  return { data, loading, error };
}

export default function Dashboard() {
  const { role, user } = useRole();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const { data, loading, error } = useDashboardData();
  const { equipment, tickets, requests, schedules, notifications } = data;

  const stats = useMemo(() => {
    const countStatus = (status: string) => equipment.filter((e) => e.status === status).length;
    const openTickets = tickets.filter(isOpenTicket).sort(byDueDate);
    const weekAgo = Date.now() - 7 * DAY;
    const activeSchedules = schedules.filter((s) => !s.ticket || labelFromEnum(s.ticket.status) !== "Closed");
    return {
      available: countStatus("Available"),
      maintenance: countStatus("Under Maintenance"),
      availability: equipment.length ? Math.round((countStatus("Available") / equipment.length) * 100) : 0,
      equipmentChart: equipmentStatuses.map((s) => ({ name: s.name, value: countStatus(s.name), color: s.color })),
      openTickets,
      overdueTickets: openTickets.filter(isOverdueTicket),
      closedThisWeek: tickets.filter((t) => t.closedDate && new Date(t.closedDate).getTime() >= weekAgo).length,
      ticketChart: Object.entries(
        openTickets.reduce<Record<string, number>>((acc, t) => ({ ...acc, [t.serviceType]: (acc[t.serviceType] ?? 0) + 1 }), {}),
      )
        .map(([name, value]): ChartDatum => ({ name, value, color: ticketTypeColors[name] }))
        .sort((a, b) => b.value - a.value),
      pendingRequests: requests.filter((r) => r.status === "Pending"),
      activeSchedules,
      vOverdue: activeSchedules.filter((s) => s.status === "Overdue").length,
      vDueSoon: activeSchedules.filter((s) => s.status === "Due soon").length,
      vScheduled: activeSchedules.filter((s) => s.status === "Scheduled").length,
    };
  }, [equipment, tickets, requests, schedules]);

  const deferredSearch = useDeferredValue(search);
  const filteredEquipment = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase();
    return query
      ? equipment.filter((e) => `${e.assetNo} ${e.equipmentType} ${e.location}`.toLowerCase().includes(query))
      : equipment;
  }, [equipment, deferredSearch]);
  const show = (value: number | string) => (loading ? "…" : value);
  const canCreateTicket = role === "Super Admin" || role === "Manager" || role === "Biman Admin";
  const createTicket = canCreateTicket ? (
    <Button onClick={() => router.push("/tickets")}>
      <Plus className="h-4 w-4" />
      Create ticket
    </Button>
  ) : undefined;
  const errorBanner = error ? (
    <div className="mb-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300">
      {error}
    </div>
  ) : null;
  const vServicePanel = (
    <VServiceSchedule
      rows={stats.activeSchedules}
      overdue={stats.vOverdue}
      dueSoon={stats.vDueSoon}
      scheduled={stats.vScheduled}
      loading={loading}
    />
  );

  if (role === "Engineer") {
    const openAssigned = stats.openTickets;
    return (
      <>
        <PageIntro
          eyebrow="Engineer workspace"
          title={`${greeting()}, ${(user?.name ?? "").split(" ")[0]}.`}
          subtitle="Your assigned work, equipment requests and upcoming V-Service schedules, all in one place."
        />
        {errorBanner}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Kpi colorful
            featured
            label="Open tickets assigned to me"
            value={show(openAssigned.length)}
            delta={loading ? undefined : `${stats.closedThisWeek} closed in the last 7 days`}
            icon="ticket"
            href="/tickets"
          />
          <Kpi colorful
            label="In progress"
            value={show(openAssigned.filter((t) => t.status === "In Progress").length)}
            icon="wrench"
            color="amber"
            href="/tickets"
          />
          <Kpi colorful
            label="Awaiting parts"
            value={show(openAssigned.filter((t) => t.status === "Awaiting Parts").length)}
            icon="box"
            color="sky"
            href="/requests"
          />
          <Kpi colorful label="Overdue tickets" value={show(stats.overdueTickets.length)} icon="alert" color="rose" href="/tickets" />
        </div>
        <div className="mt-7 grid gap-6 xl:grid-cols-[1.35fr_.65fr]">
          <Card>
            <SectionTitle title="My open tickets" subtitle="Sorted by due date" action="View all" href="/tickets" />
            <TicketRows rows={openAssigned.slice(0, 6)} loading={loading} empty="No open tickets assigned to you." />
          </Card>
          <Card>
            <SectionTitle title="My equipment requests" action="View requests" href="/requests" />
            <RequestRows rows={requests.slice(0, 6)} loading={loading} />
          </Card>
        </div>
        <div className="mt-6">{vServicePanel}</div>
      </>
    );
  }

  if (role === "Biman Admin")
    return (
      <>
        <PageIntro
          eyebrow="Biman admin workspace"
          title="Approvals, without the busywork."
          subtitle="Create tickets, keep equipment requests moving and track V-Service readiness."
          action={createTicket}
        />
        {errorBanner}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Kpi colorful featured label="Pending approvals" value={show(stats.pendingRequests.length)} icon="box" color="amber" href="/requests" />
          <Kpi colorful
            label="Open tickets"
            value={show(stats.openTickets.length)}
            delta={loading ? undefined : `${stats.overdueTickets.length} overdue`}
            icon="ticket"
            color="sky"
            href="/tickets"
          />
          <Kpi colorful label="Under maintenance" value={show(stats.maintenance)} icon="wrench" color="rose" href="/equipment" />
          <Kpi colorful
            label="Available equipment"
            value={show(stats.available)}
            delta={loading ? undefined : `${stats.availability}% fleet availability`}
            icon="box"
            color="emerald"
            href="/equipment"
          />
        </div>
        <div className="mt-7 grid gap-6 xl:grid-cols-[1.15fr_.85fr]">
          <Card>
            <SectionTitle title="Equipment / parts requests to review" action="Open requests" href="/requests" />
            <RequestRows rows={stats.pendingRequests.slice(0, 6)} loading={loading} empty="No requests awaiting approval." />
          </Card>
          <Card>
            <SectionTitle title="Recent tickets raised" action="All tickets" href="/tickets" />
            <TicketRows rows={tickets.slice(0, 5)} loading={loading} />
          </Card>
        </div>
        <div className="mt-6 grid gap-6 xl:grid-cols-[1.15fr_.85fr]">
          {vServicePanel}
          <AttentionNeeded rows={notifications} loading={loading} />
        </div>
      </>
    );

  return (
    <>
      <PageIntro
        eyebrow={role === "Manager" ? "Manager workspace" : "Operations overview"}
        title="Maintenance command center"
        subtitle="A live view of equipment readiness across Biman’s ground operations."
        action={createTicket}
      />
      {errorBanner}
      <div className="grid gap-5 xl:grid-cols-[1.65fr_1fr]">
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
          <Kpi colorful featured label="Total equipment" value={show(equipment.length)} delta={loading ? undefined : `${stats.availability}% available`} icon="box" href="/equipment" />
          <Kpi colorful label="Under maintenance" value={show(stats.maintenance)} icon="wrench" color="amber" href="/equipment" />
          <Kpi colorful label="Open tickets" value={show(stats.openTickets.length)} icon="ticket" color="lime" href="/tickets" />
          <Kpi colorful label="Overdue tickets" value={show(stats.overdueTickets.length)} icon="alert" color="rose" href="/tickets" />
          <Kpi colorful label="V-Service due soon" value={show(stats.vDueSoon)} icon="calendar" color="violet" href="/schedule" />
          <Kpi colorful label="V-Service overdue" value={show(stats.vOverdue)} icon="calendar" color="emerald" href="/schedule" />
        </div>
        <Card className="relative flex min-w-0 flex-col overflow-hidden p-6">
          <AirlinerSilhouette className="pointer-events-none absolute -right-5 -top-8 w-36 rotate-[30deg] text-blue-600/[0.06]" />
          <div className="relative"><SectionTitle title="Fleet readiness" subtitle="Ground support equipment status" bare /></div>
          <div className="my-auto py-2"><EquipmentChart data={stats.equipmentChart} loading={loading} /></div>
          <div className="relative space-y-3 text-xs">
            {equipmentStatuses.map((s, i) => (
              <div key={s.name} className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${s.dot}`} />
                <span className="flex-1 text-slate-600">{s.name}</span>
                <b className="tabular-nums">{show(stats.equipmentChart[i].value)}</b>
              </div>
            ))}
          </div>
          <div className="mt-5 flex items-center justify-between rounded-xl bg-blue-50 px-3 py-2.5 text-xs text-blue-700">
            <span className="flex items-center gap-2"><Plane className="h-3.5 w-3.5" /> Equipment availability</span>
            <b>{loading ? "…" : equipment.length ? `${stats.availability}%` : "—"}</b>
          </div>
        </Card>
      </div>
      <div className="mt-5 grid gap-5 xl:grid-cols-[1.65fr_1fr]">
        <Card className="min-w-0 p-6">
          <SectionTitle title="Maintenance workload" subtitle="Open tickets by service type" bare />
          <div className="mt-5"><TicketChart data={stats.ticketChart} loading={loading} /></div>
        </Card>
        <AttentionNeeded rows={notifications} loading={loading} />
      </div>
      <div className="mt-5">{vServicePanel}</div>
      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Card>
          <SectionTitle title="Open tickets" subtitle="Sorted by due date" action="Open tickets" href="/tickets" />
          <TicketRows rows={stats.openTickets.slice(0, 5)} loading={loading} empty="No open tickets." />
        </Card>
        <Card>
          <SectionTitle
            title="Equipment List"
            subtitle="Search your fleet and open a digital logbook"
            action="View master"
            href="/equipment"
          />
          <div className="border-b px-5 py-4">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <Input
                className="pl-9"
                placeholder="Search asset, name or location"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="divide-y">
            {loading ? (
              <EmptyRow text="Loading equipment…" />
            ) : filteredEquipment.length === 0 ? (
              <EmptyRow text="No equipment found." />
            ) : (
              filteredEquipment.slice(0, 5).map((e) => (
                <Link
                  href={`/equipment/${e.id}`}
                  key={e.id}
                  className="flex items-center justify-between px-5 py-4 transition hover:bg-slate-50 dark:hover:bg-slate-800/50"
                >
                  <div className="flex items-center gap-3">
                    <div className="grid h-9 w-9 place-items-center rounded-lg bg-slate-100 text-xs font-bold text-slate-500 dark:bg-slate-800">
                      {e.equipmentType
                        .split(" ")
                        .map((x) => x[0])
                        .join("")
                        .slice(0, 2)}
                    </div>
                    <div>
                      <div className="text-sm font-semibold">{e.equipmentType}</div>
                      <div className="text-xs text-slate-500">
                        {e.assetNo} · {e.location}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={e.status} />
                    <ChevronRight className="h-4 w-4 text-slate-300" />
                  </div>
                </Link>
              ))
            )}
          </div>
        </Card>
      </div>
      {stats.pendingRequests.length > 0 && (
        <div className="mt-6">
          <Card>
            <SectionTitle title="Equipment / parts requests to review" action="Open requests" href="/requests" />
            <RequestRows rows={stats.pendingRequests.slice(0, 5)} loading={loading} />
          </Card>
        </div>
      )}
    </>
  );
}

function VServiceSchedule({
  rows,
  overdue,
  dueSoon,
  scheduled,
  loading,
}: {
  rows: ApiSchedule[];
  overdue: number;
  dueSoon: number;
  scheduled: number;
  loading: boolean;
}) {
  return (
    <Card>
      <SectionTitle
        title="V-Service schedule"
        subtitle="Six-monthly V-Service due dates across the fleet"
        action="See schedule"
        href="/schedule"
      />
      <div className="grid grid-cols-3 divide-x border-b text-center">
        {[
          ["Overdue", overdue, "text-rose-600"],
          ["Due soon", dueSoon, "text-amber-600"],
          ["Scheduled", scheduled, "text-blue-600"],
        ].map(([label, value, tone]) => (
          <div key={label} className="px-3 py-3">
            <div className={`text-lg font-semibold ${tone}`}>{loading ? "…" : value}</div>
            <div className="text-[11px] font-medium uppercase tracking-wider text-slate-400">{label}</div>
          </div>
        ))}
      </div>
      <div className="divide-y">
        {loading ? (
          <EmptyRow text="Loading V-Service schedule…" />
        ) : rows.length === 0 ? (
          <EmptyRow text="No V-Service schedules configured." />
        ) : (
          rows.slice(0, 5).map((s) => {
            const days = daysUntil(s.dueDate);
            return (
              <Link
                href={s.ticket ? `/tickets/${s.ticket.id}` : "/schedule"}
                key={s.id}
                className="flex items-center justify-between gap-3 px-5 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/50"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-violet-50 text-violet-600 dark:bg-violet-950/30 dark:text-violet-300">
                    <CalendarClock className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">{s.equipment.equipmentType.name}</div>
                    <div className="mt-1 truncate text-xs text-slate-500">
                      {s.equipment.assetNo} · {s.ticket ? `${s.ticket.ticketNo} (${labelFromEnum(s.ticket.status)})` : "No ticket yet"}
                    </div>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="flex items-center justify-end gap-1 text-xs font-semibold">
                    <CalendarDays className="h-3.5 w-3.5 text-violet-500" />
                    {displayDate(s.dueDate)}
                  </div>
                  <div className={`mt-1 text-[11px] font-medium ${days < 0 ? "text-rose-600" : days <= 15 ? "text-amber-600" : "text-slate-400"}`}>
                    {dueLabel(s.dueDate)}
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </Card>
  );
}

function AttentionNeeded({ rows, loading }: { rows: AppNotification[]; loading: boolean }) {
  return (
    <Card>
      <SectionTitle title="Attention needed" subtitle="Latest alerts" action="View all" href="/notifications" />
      <div className="divide-y">
        {loading ? (
          <EmptyRow text="Loading alerts…" />
        ) : rows.length === 0 ? (
          <EmptyRow text="You're all caught up." />
        ) : (
          rows.map((n) => (
            <Link
              href={notificationLink(n)?.href ?? "/notifications"}
              key={n.id}
              className="block px-5 py-4 transition hover:bg-slate-50 dark:hover:bg-slate-800/50"
            >
              <div className="flex gap-3">
                <div className="mt-0.5 h-fit rounded-lg bg-amber-50 p-2 text-amber-600 dark:bg-amber-950/30">
                  <CircleAlert className="h-4 w-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    {n.type}
                    {!n.read && <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />}
                  </div>
                  <div className="mt-1 text-xs leading-5 text-slate-500">{n.message}</div>
                  <div className="mt-2 flex items-center gap-1 text-[11px] text-slate-400">
                    <Clock3 className="h-3 w-3" />
                    {displayDate(n.timestamp)}
                  </div>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </Card>
  );
}

function PageIntro({
  eyebrow,
  title,
  subtitle,
  action,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  action?: React.ReactNode;
}) {
  return (
    <section className="relative mb-5 isolate overflow-hidden rounded-[28px] border border-white bg-gradient-to-r from-white via-[#f5f9ff] to-[#dbeafe] p-6 shadow-[0_8px_32px_-20px_rgba(37,99,235,0.25)] sm:p-8">
      <div className="pointer-events-none absolute inset-y-0 right-0 w-[45%] overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_30%)]" aria-hidden="true">
        <div className="absolute -right-12 -top-24 h-96 w-96 rounded-full border border-blue-300/30" />
        <div className="absolute -right-4 -top-16 h-80 w-80 rounded-full border border-dashed border-blue-400/30" />
        <svg viewBox="0 0 400 260" className="absolute inset-0 h-full w-full text-blue-400/50" fill="none">
          <path d="M-20 240C100 260 90 100 230 135S360 100 420-20" stroke="currentColor" strokeDasharray="4 7" />
        </svg>
        <AirlinerSilhouette illustrated className="absolute -right-12 -top-7 w-64 rotate-[32deg] text-white drop-shadow-[0_16px_12px_rgba(37,99,235,0.25)] sm:right-4 sm:w-72 lg:right-10" />
        <AirlinerSilhouette className="absolute bottom-7 left-[25%] w-12 rotate-[32deg] text-blue-500/40" />
        <AirlinerSilhouette className="absolute right-5 top-6 w-8 rotate-[32deg] text-blue-600/40" />
        <span className="absolute bottom-5 right-6 hidden font-mono text-[9px] tracking-[.22em] text-blue-700/70 sm:block">DAC / GROUND OPERATIONS</span>
      </div>
      <div className="relative max-w-[82%] sm:max-w-[65%]">
        <div className="mb-4 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.18em] text-blue-700">
          <Radar className="h-4 w-4 shrink-0" />
          {eyebrow}
        </div>
        <h1 className="text-2xl font-semibold leading-tight tracking-tight text-slate-900 sm:text-[30px]">{title}</h1>
        <p className="mt-2 max-w-lg text-sm leading-6 text-slate-600">{subtitle}</p>
        <div className="mt-5 flex flex-wrap items-center gap-4">
          {action}
          <span className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-blue-700"><Plane className="h-3.5 w-3.5" /> Precision on the ground</span>
        </div>
      </div>
    </section>
  );
}

function SectionTitle({
  title,
  subtitle,
  action,
  href,
  bare = false,
}: {
  title: string;
  subtitle?: string;
  action?: string;
  href?: string;
  bare?: boolean;
}) {
  return (
    <div className={`flex items-start justify-between gap-3 ${bare ? "" : "border-b border-slate-100 px-5 py-5"}`}>
      <div>
        <h2 className="flex items-center gap-2 text-sm font-semibold"><Plane className="h-3.5 w-3.5 shrink-0 text-blue-600" aria-hidden="true" />{title}</h2>
        {subtitle && <p className="mt-1 text-xs text-slate-500">{subtitle}</p>}
      </div>
      {action && href && (
        <Link
          href={href}
          className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700"
        >
          {action}
          <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      )}
    </div>
  );
}

function EmptyRow({ text }: { text: string }) {
  return <div className="p-8 text-center text-sm text-slate-500">{text}</div>;
}

function TicketRows({ rows, loading, empty = "No tickets found." }: { rows: ApiTicket[]; loading: boolean; empty?: string }) {
  if (loading) return <EmptyRow text="Loading tickets…" />;
  if (!rows.length) return <EmptyRow text={empty} />;
  return (
    <div className="divide-y">
      {rows.map((t) => {
        const overdue = isOverdueTicket(t);
        return (
          <Link
            href={`/tickets/${t.id}`}
            key={t.id}
            className="flex items-center justify-between gap-3 px-5 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/50"
          >
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">
                {t.ticketNo}{" "}
                <span className="ml-1 font-normal text-slate-500">
                  · {t.equipment?.equipmentType} {t.equipment?.assetNo ? `(${t.equipment.assetNo})` : ""}
                </span>
              </div>
              <div className="mt-1 text-xs text-slate-500">
                {t.serviceType} · {t.assignedEngineer?.name ?? "Unassigned"}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <div className="hidden text-right sm:block">
                <div className={`text-xs font-medium ${overdue ? "text-rose-600" : ""}`}>
                  {isOpenTicket(t) ? dueLabel(t.dueDate) : `Due ${displayDate(t.dueDate)}`}
                </div>
                <div className="text-[11px] text-slate-400">{t.priority} priority</div>
              </div>
              <StatusBadge status={t.status} />
            </div>
          </Link>
        );
      })}
    </div>
  );
}

function RequestRows({ rows, loading, empty = "No requests found." }: { rows: ApiRequest[]; loading: boolean; empty?: string }) {
  if (loading) return <EmptyRow text="Loading requests…" />;
  if (!rows.length) return <EmptyRow text={empty} />;
  return (
    <div className="divide-y">
      {rows.map((r) => (
        <Link
          href="/requests"
          key={r.id}
          className="flex items-center justify-between gap-3 px-5 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/50"
        >
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold">
              {r.item} <span className="font-normal text-slate-500">×{r.quantity}</span>
            </div>
            <div className="mt-1 truncate text-xs text-slate-500">
              {r.requestNo} · {r.ticket?.ticketNo ?? "—"} · {r.requestedBy?.name ?? "—"}
            </div>
          </div>
          <StatusBadge status={r.status} />
        </Link>
      ))}
    </div>
  );
}
