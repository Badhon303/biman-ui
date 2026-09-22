"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CalendarClock, CircleAlert, Search, Ticket as TicketIcon } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/data-page";
import { ShellPage } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/badge";
import { TD, TH, TBody, THead, TR, Table } from "@/components/ui/table";
import { equipment, maintenanceSchedules, tickets } from "@/lib/mock-data";
import type { MaintenanceSchedule, ScheduleStatus } from "@/lib/types";
import { overdueBy } from "@/lib/utils";

const DUE_SOON_DAYS = 15;

function equipmentName(id: string) {
  const item = equipment.find((entry) => entry.id === id);
  return item ? `${item.type} · ${item.assetNo}` : id;
}

function formatDate(value: string) {
  if (!value) return "—";

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

function toDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addMonths(date: Date, months: number) {
  const result = new Date(date);
  const day = result.getDate();
  result.setDate(1);
  result.setMonth(result.getMonth() + months);
  const lastDay = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
  result.setDate(Math.min(day, lastDay));
  return result;
}

function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function scheduleDates(status: ScheduleStatus, now: Date) {
  const lastDate =
    status === "Overdue"
      ? addMonths(addDays(now, -7), -6)
      : status === "Due soon"
        ? addMonths(addDays(now, DUE_SOON_DAYS - 1), -6)
        : now;
  const dueDate = addMonths(lastDate, 6);

  return {
    lastDate: toDateInput(lastDate),
    dueDate: toDateInput(dueDate),
  };
}

export default function SchedulePage() {
  const [status, setStatus] = useState("All");
  const [search, setSearch] = useState("");
  const [scheduleRows] = useState(maintenanceSchedules);
  const [generatedTickets, setGeneratedTickets] = useState<Record<string, string>>({});

  const rows = useMemo(
    () =>
      scheduleRows.filter((schedule) => {
        const matchesStatus = status === "All" || schedule.status === status;
        const matchesSearch = `${schedule.scheduleNo} ${equipmentName(schedule.equipmentId)}`
          .toLowerCase()
          .includes(search.toLowerCase());
        return matchesStatus && matchesSearch;
      }),
    [scheduleRows, search, status],
  );

  const generateTicket = (schedule: MaintenanceSchedule) => {
    const ticketNo = `TKT-2026-${String(schedule.id.replace("sch", "")).padStart(3, "0")}`;
    setGeneratedTickets((current) => ({ ...current, [schedule.id]: ticketNo }));
    toast.success(`${ticketNo} generated`, {
      description: `${equipmentName(schedule.equipmentId)} is now in the ticket queue.`,
    });
  };

  const totalDue = scheduleRows.filter(
    (schedule) => schedule.status === "Overdue" || schedule.status === "Due soon",
  ).length;
  const scheduledCount = scheduleRows.filter((schedule) => schedule.status === "Scheduled").length;

  return (
    <ShellPage>
      <PageHeader
        eyebrow="Maintenance / Schedule"
        title="Maintenance schedule"
        subtitle="Review maintenance schedules and generate a ticket when work is due."
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <SummaryCard
          icon={<CalendarClock className="h-5 w-5" />}
          label="Total schedules"
          value={scheduleRows.length}
          detail="Configured maintenance plans"
        />
        <SummaryCard
          icon={<CircleAlert className="h-5 w-5" />}
          label="Due attention"
          value={totalDue}
          detail="Due soon or overdue"
          tone="amber"
        />
        <SummaryCard
          icon={<CalendarClock className="h-5 w-5" />}
          label="Scheduled"
          value={scheduledCount}
          detail="Upcoming maintenance"
          tone="blue"
        />
      </div>

      <Card>
        <div className="flex flex-col gap-4 border-b p-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <Input
              className="pl-9"
              placeholder="Search schedule or equipment"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <select
              aria-label="Filter schedule status"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="rounded-lg border bg-white px-3 py-2 text-xs font-semibold text-slate-600 outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-900 dark:text-slate-300"
            >
              <option value="All">All statuses</option>
              <option value="Scheduled">Scheduled</option>
              <option value="Due soon">Due soon</option>
              <option value="Overdue">Overdue</option>
            </select>
          </div>
        </div>
        <Table>
          <THead>
            <TR>
              <TH>Schedule</TH>
              <TH>Equipment</TH>
              <TH>Start/last date</TH>
              <TH>Due date</TH>
              <TH>Overdue By</TH>
              <TH>Status</TH>
              <TH>Action</TH>
            </TR>
          </THead>
          <TBody>
            {rows.map((schedule) => {
              const generatedTicketNo = generatedTickets[schedule.id];
              const linkedTicketNo = schedule.ticketId
                ? tickets.find((ticket) => ticket.id === schedule.ticketId)?.ticketNo
                : undefined;
              const ticketNo = generatedTicketNo ?? linkedTicketNo;
              const hasTicket = Boolean(ticketNo);
              const displayStatus = schedule.status;
              const { lastDate, dueDate } = scheduleDates(schedule.status, new Date());
              return (
                <TR
                  key={schedule.id}
                  className={
                    schedule.status === "Due soon"
                      ? "bg-yellow-50/70 dark:bg-yellow-950/20"
                      : schedule.status === "Overdue"
                        ? "bg-rose-50/40 dark:bg-rose-950/10"
                        : ""
                  }
                >
                  <TD>
                    <div className="font-semibold text-slate-900 dark:text-white">
                      {schedule.scheduleNo}
                    </div>
                  </TD>
                  <TD>
                    <div className="font-medium text-slate-800 dark:text-slate-100">
                      {equipmentName(schedule.equipmentId).split(" · ")[0]}
                    </div>
                    <div className="text-xs text-slate-400">
                      {equipmentName(schedule.equipmentId).split(" · ")[1]}
                    </div>
                  </TD>
                  <TD>{formatDate(lastDate)}</TD>
                  <TD
                    className={schedule.status === "Overdue" ? "font-semibold text-rose-600" : ""}
                  >
                    {formatDate(dueDate)}
                  </TD>
                  <TD>{overdueBy(dueDate)}</TD>
                  <TD>
                    <StatusBadge status={displayStatus} />
                  </TD>
                  <TD>
                    {hasTicket ? (
                      <Link
                        href={schedule.ticketId ? `/tickets/${schedule.ticketId}` : "/tickets"}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600"
                      >
                        <TicketIcon className="h-3.5 w-3.5" />
                        {ticketNo}
                      </Link>
                    ) : (
                      <Button
                        variant="outline"
                        className="px-2.5 py-1.5 text-xs"
                        onClick={() => generateTicket(schedule)}
                      >
                        <TicketIcon className="h-3.5 w-3.5" />
                        Generate ticket
                      </Button>
                    )}
                  </TD>
                </TR>
              );
            })}
          </TBody>
        </Table>
        {rows.length === 0 && (
          <div className="p-10 text-center text-sm text-slate-500">
            No schedules match the selected filters.
          </div>
        )}
      </Card>
    </ShellPage>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  detail,
  tone = "slate",
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  detail: string;
  tone?: "slate" | "amber" | "blue" | "emerald";
}) {
  const tones = {
    slate: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
    amber: "bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-300",
    blue: "bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-300",
    emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-300",
  };
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            {label}
          </div>
          <div className="mt-2 text-3xl font-semibold tracking-tight">{value}</div>
          <div className="mt-1 text-xs text-slate-400">{detail}</div>
        </div>
        <div className={`grid h-10 w-10 place-items-center rounded-xl ${tones[tone]}`}>{icon}</div>
      </div>
    </Card>
  );
}
