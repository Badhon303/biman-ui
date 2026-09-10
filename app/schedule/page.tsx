"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  CalendarClock,
  CheckCircle2,
  CircleAlert,
  Clock3,
  Plus,
  Search,
  Ticket as TicketIcon,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/data-page";
import { ShellPage } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/badge";
import { TD, TH, TBody, THead, TR, Table } from "@/components/ui/table";
import { engineers, equipment, maintenanceSchedules } from "@/lib/mock-data";
import type { MaintenanceSchedule, ScheduleType } from "@/lib/types";

const scheduleFilters: Array<"All" | ScheduleType> = ["All", "Preventive Maintenance", "Washing"];

function equipmentName(id: string) {
  const item = equipment.find((entry) => entry.id === id);
  return item ? `${item.type} · ${item.assetNo}` : id;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

function scheduleTypeLabel(type: ScheduleType) {
  return type === "Preventive Maintenance" ? "PM" : "Washing";
}

export default function SchedulePage() {
  const [filter, setFilter] = useState<(typeof scheduleFilters)[number]>("All");
  const [status, setStatus] = useState("All");
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [scheduleRows, setScheduleRows] = useState(maintenanceSchedules);
  const [generatedTickets, setGeneratedTickets] = useState<Record<string, string>>({});

  const rows = useMemo(
    () =>
      scheduleRows.filter((schedule) => {
        const matchesType = filter === "All" || schedule.type === filter;
        const effectiveStatus = generatedTickets[schedule.id]
          ? "Ticket generated"
          : schedule.status;
        const matchesStatus = status === "All" || effectiveStatus === status;
        const matchesSearch =
          `${schedule.scheduleNo} ${schedule.activity} ${equipmentName(schedule.equipmentId)} ${schedule.assignedEngineer ?? ""}`
            .toLowerCase()
            .includes(search.toLowerCase());
        return matchesType && matchesStatus && matchesSearch;
      }),
    [filter, generatedTickets, scheduleRows, search, status],
  );

  const generateTicket = (schedule: MaintenanceSchedule) => {
    const ticketNo = `${scheduleTypeLabel(schedule.type) === "PM" ? "PM" : "WS"}-2026-${String(schedule.id.replace("sch", "")).padStart(3, "0")}`;
    setGeneratedTickets((current) => ({ ...current, [schedule.id]: ticketNo }));
    toast.success(`${ticketNo} generated`, {
      description: `${schedule.activity} for ${equipmentName(schedule.equipmentId)} is now in the ticket queue.`,
    });
  };

  const totalDue = scheduleRows.filter(
    (schedule) => schedule.status === "Overdue" || schedule.status === "Due soon",
  ).length;
  const activeCount = scheduleRows.filter((schedule) => schedule.status === "In progress").length;
  const completedCount = scheduleRows.filter((schedule) => schedule.status === "Completed").length;

  return (
    <ShellPage>
      <PageHeader
        eyebrow="Maintenance / Schedule"
        title="Maintenance schedule"
        subtitle="Plan preventive maintenance and washing cycles, then generate a ticket when work is due."
        action={
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4" />
            Add schedule
          </Button>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          icon={<CalendarClock className="h-5 w-5" />}
          label="Total schedules"
          value={scheduleRows.length}
          detail="PM and washing plans"
        />
        <SummaryCard
          icon={<CircleAlert className="h-5 w-5" />}
          label="Due attention"
          value={totalDue}
          detail="Due soon or overdue"
          tone="amber"
        />
        <SummaryCard
          icon={<Clock3 className="h-5 w-5" />}
          label="In progress"
          value={activeCount}
          detail="Currently being worked"
          tone="blue"
        />
        <SummaryCard
          icon={<CheckCircle2 className="h-5 w-5" />}
          label="Completed"
          value={completedCount}
          detail="Latest cycle completed"
          tone="emerald"
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
            {scheduleFilters.map((item) => (
              <button
                key={item}
                onClick={() => setFilter(item)}
                className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${filter === item ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"}`}
              >
                {item === "Preventive Maintenance" ? "PM" : item}
              </button>
            ))}
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
              <option value="In progress">In progress</option>
              <option value="Completed">Completed</option>
              <option value="Ticket generated">Ticket generated</option>
            </select>
          </div>
        </div>
        <Table>
          <THead>
            <TR>
              <TH>Schedule</TH>
              <TH>Equipment</TH>
              <TH>Type / frequency</TH>
              <TH>Last date</TH>
              <TH>Due date</TH>
              <TH>Overdue By</TH>
              <TH>Status</TH>
              <TH>Action</TH>
            </TR>
          </THead>
          <TBody>
            {rows.map((schedule) => {
              const ticketNo = generatedTickets[schedule.id];
              const hasTicket = Boolean(ticketNo || schedule.ticketId);
              const displayStatus = ticketNo ? "Ticket generated" : schedule.status;
              return (
                <TR
                  key={schedule.id}
                  className={
                    schedule.status === "Overdue" ? "bg-rose-50/40 dark:bg-rose-950/10" : ""
                  }
                >
                  <TD>
                    <div className="font-semibold text-slate-900 dark:text-white">
                      {schedule.scheduleNo}
                    </div>
                    <div className="mt-1 text-xs text-slate-400">{schedule.activity}</div>
                  </TD>
                  <TD>
                    <div className="font-medium text-slate-800 dark:text-slate-100">
                      {equipmentName(schedule.equipmentId).split(" · ")[0]}
                    </div>
                    <div className="text-xs text-slate-400">
                      {equipmentName(schedule.equipmentId).split(" · ")[1]}
                    </div>
                  </TD>
                  <TD>
                    <div className="font-medium">{scheduleTypeLabel(schedule.type)}</div>
                    <div className="text-xs text-slate-400">{schedule.frequency}</div>
                  </TD>
                  <TD>{formatDate(schedule.lastDate)}</TD>
                  <TD
                    className={schedule.status === "Overdue" ? "font-semibold text-rose-600" : ""}
                  >
                    {formatDate(schedule.dueDate)}
                  </TD>
                  <TD>{schedule.scheduleDuration}</TD>
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
                        {ticketNo ?? "View ticket"}
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
      {addOpen && (
        <AddScheduleModal
          sequence={scheduleRows.length + 1}
          onClose={() => setAddOpen(false)}
          onCreate={(schedule) => {
            setScheduleRows((current) => [...current, schedule]);
            setAddOpen(false);
            toast.success(`${schedule.scheduleNo} added`, {
              description: `${schedule.activity} has been added to the maintenance schedule.`,
            });
          }}
        />
      )}
    </ShellPage>
  );
}

type ScheduleForm = {
  type: ScheduleType;
  equipmentId: string;
  activity: string;
  frequency: string;
  lastDate: string;
  dueDate: string;
  scheduleDuration: string;
  assignedEngineer: string;
};

function AddScheduleModal({
  sequence,
  onClose,
  onCreate,
}: {
  sequence: number;
  onClose: () => void;
  onCreate: (schedule: MaintenanceSchedule) => void;
}) {
  const [form, setForm] = useState<ScheduleForm>({
    type: "Preventive Maintenance",
    equipmentId: equipment[0]?.id ?? "",
    activity: "",
    frequency: "",
    lastDate: "",
    dueDate: "",
    scheduleDuration: "",
    assignedEngineer: engineers[0]?.name ?? "",
  });

  const update = (field: keyof ScheduleForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onCreate({
      ...form,
      id: `sch${Date.now()}`,
      scheduleNo: `SCH-${new Date().getFullYear()}-${String(sequence).padStart(3, "0")}`,
      status: "Scheduled",
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4 backdrop-blur-sm"
      role="presentation"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <div
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border bg-white p-6 shadow-2xl dark:bg-slate-900"
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-schedule-title"
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 id="add-schedule-title" className="text-lg font-semibold">
              Add maintenance schedule
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Create a recurring plan for an equipment maintenance activity.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <form className="space-y-4" onSubmit={submit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-xs font-semibold">
              Schedule type
              <Select
                className="mt-2 w-full"
                value={form.type}
                onChange={(event) => update("type", event.target.value)}
              >
                <option value="Preventive Maintenance">Preventive Maintenance</option>
                <option value="Washing">Washing</option>
              </Select>
            </label>
            <label className="text-xs font-semibold">
              Equipment
              <Select
                className="mt-2 w-full"
                required
                value={form.equipmentId}
                onChange={(event) => update("equipmentId", event.target.value)}
              >
                {equipment.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.assetNo} · {item.type}
                  </option>
                ))}
              </Select>
            </label>
            <label className="text-xs font-semibold sm:col-span-2">
              Activity
              <Input
                className="mt-2"
                required
                placeholder="e.g. Monthly service"
                value={form.activity}
                onChange={(event) => update("activity", event.target.value)}
              />
            </label>
            <label className="text-xs font-semibold">
              Frequency
              <Input
                className="mt-2"
                required
                placeholder="e.g. Every 1 month"
                value={form.frequency}
                onChange={(event) => update("frequency", event.target.value)}
              />
            </label>
            <label className="text-xs font-semibold">
              Overdue By
              <Input
                className="mt-2"
                required
                placeholder="e.g. 2 days"
                value={form.scheduleDuration}
                onChange={(event) => update("scheduleDuration", event.target.value)}
              />
            </label>
            <label className="text-xs font-semibold">
              Last completed date
              <Input
                className="mt-2"
                required
                type="date"
                value={form.lastDate}
                onChange={(event) => update("lastDate", event.target.value)}
              />
            </label>
            <label className="text-xs font-semibold">
              Due date
              <Input
                className="mt-2"
                required
                type="date"
                value={form.dueDate}
                onChange={(event) => update("dueDate", event.target.value)}
              />
            </label>
            <label className="text-xs font-semibold">
              Assigned engineer
              <Select
                className="mt-2 w-full"
                value={form.assignedEngineer}
                onChange={(event) => update("assignedEngineer", event.target.value)}
              >
                <option value="">Unassigned</option>
                {engineers.map((engineer) => (
                  <option key={engineer.id} value={engineer.name}>
                    {engineer.name}
                  </option>
                ))}
              </Select>
            </label>
          </div>
          <div className="flex justify-end gap-3 border-t pt-5">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">
              <Plus className="h-4 w-4" />
              Add schedule
            </Button>
          </div>
        </form>
      </div>
    </div>
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
