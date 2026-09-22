"use client";
import Link from "next/link";
import { useState } from "react";
import {
  ArrowUpRight,
  CalendarDays,
  ChevronRight,
  CircleAlert,
  Clock3,
  MoreHorizontal,
  Plus,
  Search,
  Sparkles,
} from "lucide-react";
import { ShellPage } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Kpi } from "@/components/dashboard/kpi";
import { EquipmentChart, TicketChart } from "@/components/dashboard/charts";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { equipment, notifications, requests, tickets } from "@/lib/mock-data";
import { useRole } from "@/components/role-context";
import { Button } from "@/components/ui/button";
import { getEquipment } from "@/lib/mock-data";
export default function Dashboard() {
  const { role, user } = useRole();
  const [search, setSearch] = useState("");
  const isEngineer = role === "Engineer";
  const isBiman = role === "Biman Admin";
  const ownTickets = isEngineer ? tickets.filter((t) => t.assignedEngineer === user.name) : tickets;
  const filtered = equipment.filter((e) =>
    `${e.assetNo} ${e.type} ${e.location}`.toLowerCase().includes(search.toLowerCase()),
  );
  const availableCount = equipment.filter((e) => e.status === "Available").length;
  const maintenanceCount = equipment.filter((e) => e.status === "Under Maintenance").length;
  const outOfServiceCount = equipment.filter((e) => e.status === "Out of Service").length;
  const inactiveCount = equipment.filter((e) => e.status === "Inactive").length;
  if (isEngineer)
    return (
      <ShellPage>
        <PageIntro
          eyebrow="Engineer workspace"
          title={`Good morning, ${user.name.split(" ")[0]}.`}
          subtitle="Your assigned work and open equipment requests, all in one place."
        />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Kpi label="Assigned to me" value={ownTickets.length} icon="ticket" />
          <Kpi
            label="In progress"
            value={ownTickets.filter((t) => t.status === "In Progress").length}
            icon="wrench"
            color="amber"
          />
          <Kpi
            label="Awaiting parts"
            value={ownTickets.filter((t) => t.status === "Awaiting Parts").length}
            icon="box"
            color="rose"
          />
          <Kpi
            label="Completed this week"
            value="4"
            delta="+2 vs last week"
            icon="timer"
            color="emerald"
          />
        </div>
        <div className="mt-7 grid gap-6 xl:grid-cols-[1.35fr_.65fr]">
          <Card>
            <SectionTitle title="Assigned tickets" action="View all" href="/tickets" />
            <TicketRows rows={ownTickets} />
          </Card>
          <Card>
            <SectionTitle title="My equipment requests" action="View requests" href="/requests" />
            <RequestRows rows={requests.filter((r) => r.requestedBy === user.name)} />
          </Card>
        </div>
      </ShellPage>
    );
  if (isBiman)
    return (
      <ShellPage>
        <PageIntro
          eyebrow="Biman admin workspace"
          title="Approvals, without the busywork."
          subtitle="Create tickets and keep equipment requests moving."
          action={
            <Button onClick={() => location.assign("/tickets")}>
              <Plus className="h-4 w-4" />
              Create ticket
            </Button>
          }
        />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Kpi
            label="Pending approvals"
            value={requests.filter((r) => r.status === "Pending").length}
            icon="box"
            color="amber"
          />
          <Kpi
            label="Open tickets"
            value={tickets.filter((t) => t.status !== "Closed").length}
            icon="ticket"
          />
          <Kpi
            label="Under maintenance"
            value={equipment.filter((e) => e.status === "Under Maintenance").length}
            icon="wrench"
            color="rose"
          />
          <Kpi
            label="Available equipment"
            value={equipment.filter((e) => e.status === "Available").length}
            icon="box"
            color="emerald"
          />
        </div>
        <div className="mt-7 grid gap-6 xl:grid-cols-[1.15fr_.85fr]">
          <Card>
            <SectionTitle
              title="Equipment / parts requests to review"
              action="Open requests"
              href="/requests"
            />
            <RequestRows rows={requests.filter((r) => r.status === "Pending")} review />
          </Card>
          <Card>
            <SectionTitle title="Recent tickets raised" action="All tickets" href="/tickets" />
            <TicketRows rows={tickets.slice(0, 5)} />
          </Card>
        </div>
      </ShellPage>
    );
  return (
    <ShellPage>
      <PageIntro
        eyebrow={role === "Manager" ? "Manager workspace" : "Operations overview"}
        title="Maintenance command center"
        subtitle="A live view of equipment readiness across Biman’s ground operations."
        action={
          role === "Super Admin" ? (
            <Button onClick={() => location.assign("/tickets")}>
              <Plus className="h-4 w-4" />
              Create ticket
            </Button>
          ) : undefined
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <Kpi label="Total equipment" value={equipment.length} icon="box" />
        <Kpi label="Available" value={availableCount} icon="box" color="emerald" />
        <Kpi label="Under maintenance" value={maintenanceCount} icon="wrench" color="amber" />
        <Kpi label="Open tickets" value="8" icon="ticket" />
        <Kpi label="Overdue PM" value="1" icon="alert" color="rose" />
        <Kpi label="Washing due" value="2" icon="drop" color="sky" />
      </div>
      <div className="mt-7 grid gap-6 xl:grid-cols-[.8fr_1.2fr]">
        <Card className="p-6">
          <SectionTitle title="Equipment status" subtitle="Current fleet readiness" />
          <div className="mt-2 flex items-center gap-6">
            <EquipmentChart />
            <div className="space-y-3 text-xs">
              {[
                ["Available", String(availableCount), "bg-blue-500"],
                ["Under Maintenance", String(maintenanceCount), "bg-amber-400"],
                ["Out of Service", String(outOfServiceCount), "bg-rose-500"],
                ["Inactive", String(inactiveCount), "bg-slate-400"],
              ].map(([l, v, c]) => (
                <div key={l} className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${c}`} />
                  <span className="w-28 text-slate-500">{l}</span>
                  <b>{v}</b>
                </div>
              ))}
            </div>
          </div>
        </Card>
        <Card className="p-6">
          <SectionTitle title="Tickets by type" subtitle="Open workload across the operation" />
          <TicketChart />
        </Card>
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_.6fr]">
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
            {filtered.slice(0, 5).map((e) => (
              <Link
                href={`/equipment/${e.id}`}
                key={e.id}
                className="flex items-center justify-between px-5 py-4 transition hover:bg-slate-50 dark:hover:bg-slate-800/50"
              >
                <div className="flex items-center gap-3">
                  <div className="grid h-9 w-9 place-items-center rounded-lg bg-slate-100 text-xs font-bold text-slate-500 dark:bg-slate-800">
                    {e.type
                      .split(" ")
                      .map((x) => x[0])
                      .join("")
                      .slice(0, 2)}
                  </div>
                  <div>
                    <div className="text-sm font-semibold">{e.type}</div>
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
            ))}
          </div>
        </Card>
        <Card>
          <SectionTitle
            title="Attention needed"
            subtitle="Alerts from the last 24 hours"
            action="View all"
            href="/notifications"
          />
          <div className="divide-y">
            {notifications.slice(0, 4).map((n) => (
              <Link
                href="/notifications"
                key={n.id}
                className="block px-5 py-4 transition hover:bg-slate-50 dark:hover:bg-slate-800/50"
              >
                <div className="flex gap-3">
                  <div className="mt-0.5 rounded-lg bg-amber-50 p-2 text-amber-600 dark:bg-amber-950/30">
                    <CircleAlert className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold">{n.type}</div>
                    <div className="mt-1 text-xs leading-5 text-slate-500">{n.message}</div>
                    <div className="mt-2 flex items-center gap-1 text-[11px] text-slate-400">
                      <Clock3 className="h-3 w-3" />
                      {n.timestamp}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </Card>
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Card>
          <SectionTitle
            title="Upcoming PM"
            subtitle="Next 7 days"
            action="See schedule"
            href="/tickets"
          />
          <div className="divide-y">
            {tickets
              .filter((t) => t.serviceType === "Preventive Maintenance")
              .slice(0, 4)
              .map((t) => (
                <Link
                  href={`/tickets/${t.id}`}
                  className="flex items-center justify-between px-5 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  key={t.id}
                >
                  <div>
                    <div className="text-sm font-semibold">{getEquipment(t.equipmentId)?.type}</div>
                    <div className="mt-1 text-xs text-slate-500">
                      {t.ticketNo} · {t.assignedEngineer}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-xs font-semibold">
                      <CalendarDays className="h-3.5 w-3.5 text-blue-500" />
                      {t.dueDate}
                    </div>
                    <StatusBadge status={t.status} />
                  </div>
                </Link>
              ))}
          </div>
        </Card>
        <Card>
          <SectionTitle
            title="Recent open tickets"
            subtitle="Work needing attention"
            action="Open tickets"
            href="/tickets"
          />
          <TicketRows rows={tickets.filter((t) => t.status !== "Closed").slice(0, 4)} />
        </Card>
      </div>
      {role === "Super Admin" && (
        <div className="mt-7">
          <Card>
            <SectionTitle
              title="Equipment / parts requests to review"
              action="Open requests"
              href="/requests"
            />
            <RequestRows rows={requests.filter((r) => r.status === "Pending")} review />
          </Card>
        </div>
      )}
    </ShellPage>
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
    <div className="mb-7 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
      <div>
        <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[.18em] text-blue-600">
          <Sparkles className="h-3.5 w-3.5" />
          {eyebrow}
        </div>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-[32px]">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">{subtitle}</p>
      </div>
      {action}
    </div>
  );
}
function SectionTitle({
  title,
  subtitle,
  action,
  href,
}: {
  title: string;
  subtitle?: string;
  action?: string;
  href?: string;
}) {
  return (
    <div className="flex items-start justify-between border-b px-5 py-5">
      <div>
        <h2 className="text-sm font-semibold">{title}</h2>
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
function TicketRows({ rows }: { rows: typeof tickets }) {
  return (
    <div className="divide-y">
      {rows.map((t) => (
        <Link
          href={`/tickets/${t.id}`}
          key={t.id}
          className="flex items-center justify-between px-5 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/50"
        >
          <div>
            <div className="text-sm font-semibold">
              {t.ticketNo}{" "}
              <span className="ml-1 font-normal text-slate-500">
                · {getEquipment(t.equipmentId)?.type}
              </span>
            </div>
            <div className="mt-1 text-xs text-slate-500">
              {t.serviceType} · {t.assignedEngineer}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <div className="text-xs font-medium">Due {t.dueDate}</div>
              <div className="text-[11px] text-slate-400">{t.priority} priority</div>
            </div>
            <StatusBadge status={t.status} />
          </div>
        </Link>
      ))}
    </div>
  );
}
function RequestRows({ rows, review = false }: { rows: typeof requests; review?: boolean }) {
  return (
    <div className="divide-y">
      {rows.length === 0 ? (
        <div className="p-8 text-center text-sm text-slate-500">No requests found.</div>
      ) : (
        rows.map((r) => (
          <div
            key={r.id}
            className="flex items-center justify-between gap-3 px-5 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/50"
          >
            <div>
              <div className="text-sm font-semibold">
                {r.item} <span className="font-normal text-slate-500">×{r.quantity}</span>
              </div>
              <div className="mt-1 text-xs text-slate-500">
                {r.id} · {r.ticketId} · {r.requestedBy}
              </div>
            </div>
            <StatusBadge status={r.status} />
          </div>
        ))
      )}
    </div>
  );
}
