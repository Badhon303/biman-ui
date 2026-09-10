"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Archive,
  Check,
  Download,
  FileText,
  Filter,
  Plus,
  Pencil,
  Search,
  SlidersHorizontal,
  Trash2,
  X,
} from "lucide-react";
import { ShellPage } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/badge";
import { TD, TH, TBody, THead, TR, Table } from "@/components/ui/table";
import {
  equipment,
  tickets,
  requests as initialRequests,
  notifications as initialNotifications,
  documents,
  users,
  engineers,
} from "@/lib/mock-data";
import { toast } from "sonner";
import { useRole } from "@/components/role-context";
export function PageHeader({
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
        <div className="mb-2 text-xs font-semibold uppercase tracking-[.18em] text-blue-600">
          {eyebrow}
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">{subtitle}</p>
      </div>
      {action}
    </div>
  );
}
export function TicketsPage() {
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [ticketRows, setTicketRows] = useState(tickets);
  const types = [
    "All",
    "Preventive Maintenance",
    "Breakdown Maintenance",
    "General Maintenance",
    "Washing Schedule",
  ];
  const rows = ticketRows.filter(
    (t) =>
      (filter === "All" || t.type === filter) &&
      `${t.ticketNo} ${t.equipmentId} ${getName(t.equipmentId)} ${t.assignedEngineer}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  return (
    <ShellPage>
      <PageHeader
        eyebrow="Maintenance / Tickets"
        title="Tickets"
        subtitle="One queue for preventive, breakdown, corrective and washing work."
        action={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            Create ticket
          </Button>
        }
      />
      <Card>
        <div className="flex flex-col gap-3 border-b p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <Input
              className="pl-9"
              placeholder="Search tickets or equipment"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {types.map((t) => (
              <button
                key={t}
                onClick={() => setFilter(t)}
                className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${filter === t ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"}`}
              >
                {t === "Preventive Maintenance"
                  ? "PM"
                  : t === "Breakdown Maintenance"
                    ? "Breakdown"
                    : t === "General Maintenance"
                      ? "General"
                      : t}
              </button>
            ))}
          </div>
        </div>
        <Table>
          <THead>
            <TR>
              <TH>Ticket</TH>
              <TH>Equipment</TH>
              <TH>Type</TH>
              <TH>Due date</TH>
              <TH>Assigned engineer</TH>
              <TH>Status</TH>
              <TH></TH>
            </TR>
          </THead>
          <TBody>
            {rows.map((t) => (
              <TR
                key={t.id}
                className={
                  t.status === "Closed"
                    ? "bg-emerald-50/40 dark:bg-emerald-950/10"
                    : new Date(t.dueDate) < new Date("2026-09-06")
                      ? "bg-rose-50/50 dark:bg-rose-950/10"
                      : ""
                }
              >
                <TD>
                  <Link className="font-semibold text-blue-600" href={`/tickets/${t.id}`}>
                    {t.ticketNo}
                  </Link>
                  <div className="mt-1 text-xs text-slate-400">Raised {t.createdDate}</div>
                </TD>
                <TD>
                  <div className="font-medium">{getName(t.equipmentId)}</div>
                  <div className="text-xs text-slate-400">
                    {t.equipmentId.replace("eq-", "BGSE-")}
                  </div>
                </TD>
                <TD>
                  <span className="text-xs">{t.type.replace(" Maintenance", "")}</span>
                </TD>
                <TD>
                  <div className="font-medium">{t.dueDate}</div>
                  <div className="text-xs text-slate-400">{t.priority} priority</div>
                </TD>
                <TD>{t.assignedEngineer}</TD>
                <TD>
                  <StatusBadge status={t.status} />
                </TD>
                <TD>
                  <div className="flex items-center gap-1">
                    <Link
                      href={`/tickets/${t.id}`}
                      className="rounded-md p-2 text-slate-500 transition hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-950/40"
                      aria-label={`Edit ${t.ticketNo}`}
                      title="Edit ticket"
                    >
                      <Pencil className="h-4 w-4" />
                    </Link>
                    <button
                      type="button"
                      className="rounded-md p-2 text-slate-500 transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"
                      aria-label={`Delete ${t.ticketNo}`}
                      title="Delete ticket"
                      onClick={() => {
                        setTicketRows((current) => current.filter((ticket) => ticket.id !== t.id));
                        toast.success("Ticket deleted (mock)");
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </Card>
      {createOpen && <TicketModal onClose={() => setCreateOpen(false)} />}
    </ShellPage>
  );
}
function TicketModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border bg-white p-6 shadow-2xl dark:bg-slate-900">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Create ticket</h2>
            <p className="mt-1 text-sm text-slate-500">Enter the basic details for a new ticket.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-2xl leading-none text-slate-400 hover:text-slate-700"
            aria-label="Close modal"
          >
            ×
          </button>
        </div>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            onClose();
            toast.success("Ticket created (mock)");
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-xs font-semibold">
              Equipment
              <Select className="mt-2 w-full" defaultValue={equipment[0]?.id}>
                <option value="" disabled>
                  Select equipment
                </option>
                {equipment.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.assetNo} · {item.type}
                  </option>
                ))}
              </Select>
            </label>
            <label className="text-xs font-semibold">
              Ticket type
              <Select className="mt-2 w-full" defaultValue="Breakdown Maintenance">
                <option>Preventive Maintenance</option>
                <option>Breakdown Maintenance</option>
                <option>General Maintenance</option>
                <option>Washing Schedule</option>
              </Select>
            </label>
            <label className="text-xs font-semibold">
              Priority
              <Select className="mt-2 w-full" defaultValue="Medium">
                <option>Low</option>
                <option>Medium</option>
                <option>High</option>
                <option>Critical</option>
              </Select>
            </label>
            <label className="text-xs font-semibold">
              Due date
              <Input className="mt-2" type="date" defaultValue="2026-09-10" />
            </label>
            <label className="text-xs font-semibold">
              Assigned engineer
              <Select className="mt-2 w-full" defaultValue="">
                <option value="" disabled>
                  Select engineer
                </option>
                {engineers.map((engineer) => (
                  <option key={engineer.id} value={engineer.id}>
                    {engineer.name}
                  </option>
                ))}
              </Select>
            </label>
          </div>
          <label className="block text-xs font-semibold">
            Problem description
            <textarea
              className="mt-2 min-h-28 w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 dark:bg-slate-950"
              placeholder="Describe the issue or planned maintenance"
            />
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">
              <Plus className="h-4 w-4" />
              Create ticket
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
function getName(id: string) {
  return equipment.find((e) => e.id === id)?.type ?? id;
}
function EquipmentModal({ onClose }: { onClose: () => void }) {
  const equipmentTypes = Array.from(new Set(equipment.map((item) => item.type)))

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border bg-white p-6 shadow-2xl dark:bg-slate-900">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Add equipment</h2>
            <p className="mt-1 text-sm text-slate-500">
              Enter the basic details for a new fleet asset.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-2xl leading-none text-slate-400 hover:text-slate-700"
            aria-label="Close modal"
          >
            ×
          </button>
        </div>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            onClose();
            toast.success("Equipment added (mock)");
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-xs font-semibold">
              Asset number
              <Input className="mt-2" placeholder="BGSE-001" />
            </label>
            <label className="text-xs font-semibold">
              Equipment name
              <Input className="mt-2" placeholder="Ground Power Unit" />
            </label>
            <label className="text-xs font-semibold">
              Equipment type
              <Select className="mt-2 w-full" defaultValue="" required>
                <option value="" disabled>
                  Select equipment type
                </option>
                {equipmentTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </Select>
            </label>
            <label className="text-xs font-semibold">
              Manufacturer
              <Input className="mt-2" placeholder="Manufacturer name" />
            </label>
            <label className="text-xs font-semibold">
              Model
              <Input className="mt-2" placeholder="Model number" />
            </label>
            <label className="text-xs font-semibold">
              Serial number
              <Input className="mt-2" placeholder="Serial number" />
            </label>
            <label className="text-xs font-semibold">
              Registration number
              <Input className="mt-2" placeholder="Registration number" />
            </label>
            <label className="text-xs font-semibold">
              Location
              <Input className="mt-2" placeholder="Dhaka apron" />
            </label>
            <label className="text-xs font-semibold">
              Status
              <Select className="mt-2 w-full" defaultValue="Available">
                <option>Available</option>
                <option>Under Maintenance</option>
                <option>Out of Service</option>
                <option>Inactive</option>
              </Select>
            </label>
            <label className="text-xs font-semibold">
              Actual GT date
              <Input className="mt-2" type="date" />
            </label>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">
              <Plus className="h-4 w-4" />
              Add equipment
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
export function EquipmentPage() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("All");
  const [addOpen, setAddOpen] = useState(false);
  const rows = equipment.filter(
    (e) =>
      (status === "All" || e.status === status) &&
      `${e.assetNo} ${e.type} ${e.manufacturer} ${e.location}`
        .toLowerCase()
        .includes(q.toLowerCase()),
  );
  return (
    <ShellPage>
      <PageHeader
        eyebrow="Assets / Fleet registry"
        title="Equipment List"
        subtitle="Your operational fleet, with a digital logbook attached to every asset."
        action={
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4" />
            Add equipment
          </Button>
        }
      />
      <Card>
        <div className="flex flex-col gap-3 border-b p-5 sm:flex-row">
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <Input
              className="pl-9"
              placeholder="Search asset, manufacturer or location"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <Select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option>All</option>
            <option>Available</option>
            <option>Under Maintenance</option>
            <option>Out of Service</option>
            <option>Inactive</option>
          </Select>
        </div>
        <Table>
          <THead>
            <TR>
              <TH>Asset no.</TH>
              <TH>Type</TH>
              <TH>Manufacturer / model</TH>
              <TH>Biman serial no.</TH>
              <TH>TLD serial no.</TH>
              <TH>Location</TH>
              <TH>Status</TH>
              <TH>Actions</TH>
            </TR>
          </THead>
          <TBody>
            {rows.map((e) => (
              <TR key={e.id}>
                <TD>
                  <Link href={`/equipment/${e.id}`} className="font-semibold text-blue-600">
                    {e.assetNo}
                  </Link>
                </TD>
                <TD>
                  <Link href={`/equipment/${e.id}`} className="font-medium hover:text-blue-600">
                    {e.type}
                  </Link>
                </TD>
                <TD>
                  {e.manufacturer}
                  <div className="text-xs text-slate-400">{e.model}</div>
                </TD>
                <TD className="font-mono text-xs">{e.bimanSerialNo}</TD>
                <TD className="font-mono text-xs">{e.TLDSerialNo}</TD>
                <TD>{e.location}</TD>
                <TD>
                  <StatusBadge status={e.status} />
                </TD>
                <TD>
                  <Link href={`/equipment/${e.id}`} className="text-xs font-semibold text-blue-600">
                    View profile
                  </Link>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </Card>
      {addOpen && <EquipmentModal onClose={() => setAddOpen(false)} />}
    </ShellPage>
  );
}
function RequestModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (data: {
    item: string;
    quantity: number;
    reason: string;
    ticketId: string;
    equipmentId: string;
  }) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border bg-white p-6 shadow-2xl dark:bg-slate-900">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Create equipment request</h2>
            <p className="mt-1 text-sm text-slate-500">
              Submit a parts or equipment request for approval.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-2xl leading-none text-slate-400 hover:text-slate-700"
            aria-label="Close modal"
          >
            ×
          </button>
        </div>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            const data = new FormData(e.currentTarget);
            onCreate({
              item: String(data.get("item")),
              quantity: Number(data.get("quantity")),
              reason: String(data.get("reason")),
              ticketId: String(data.get("ticketId")),
              equipmentId: String(data.get("equipmentId")),
            });
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-xs font-semibold">
              Item or part
              <Input className="mt-2" name="item" placeholder="Hydraulic hose" required />
            </label>
            <label className="text-xs font-semibold">
              Quantity
              <Input
                className="mt-2"
                name="quantity"
                type="number"
                min="1"
                defaultValue="1"
                required
              />
            </label>
            <label className="text-xs font-semibold">
              Linked ticket
              <Select
                className="mt-2 w-full"
                name="ticketId"
                defaultValue={tickets[0]?.id}
                required
              >
                {tickets.map((ticket) => (
                  <option key={ticket.id} value={ticket.id}>
                    {ticket.ticketNo} ·{" "}
                    {ticket.faultDescription ?? ticket.maintenanceRecord.problemDescription}
                  </option>
                ))}
              </Select>
            </label>
            <label className="text-xs font-semibold">
              Equipment
              <Select
                className="mt-2 w-full"
                name="equipmentId"
                defaultValue={equipment[0]?.id}
                required
              >
                {equipment.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.assetNo} · {item.type}
                  </option>
                ))}
              </Select>
            </label>
          </div>
          <label className="block text-xs font-semibold">
            Reason
            <textarea
              className="mt-2 min-h-28 w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 dark:bg-slate-950"
              name="reason"
              placeholder="Explain why this item is needed"
              required
            />
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">
              <Plus className="h-4 w-4" />
              Submit request
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
export function RequestsPage() {
  const { role, user } = useRole();
  const [rows, setRows] = useState(initialRequests);
  const [createOpen, setCreateOpen] = useState(false);
  const canCreate = role === "Engineer";
  const canApprove = role === "Biman Admin" || role === "Super Admin";
  const update = (id: string, status: "Approved" | "Rejected") => {
    setRows((rs) =>
      rs.map((r) =>
        r.id === id ? { ...r, status, approvedBy: "Md. Rashed", approvedDate: "2026-09-06" } : r,
      ),
    );
    toast.success(`Request ${status.toLowerCase()}`);
  };
  const createRequest = (data: {
    item: string;
    quantity: number;
    reason: string;
    ticketId: string;
    equipmentId: string;
  }) => {
    setRows((rs) => [
      ...rs,
      {
        id: `REQ-${String(rs.length + 1).padStart(3, "0")}`,
        requestNo: `REQ-${String(rs.length + 1).padStart(3, "0")}`,
        ...data,
        requestedBy: user.name,
        requestedDate: "2026-09-07",
        status: "Pending",
      },
    ]);
    setCreateOpen(false);
    toast.success("Request submitted for approval");
  };
  return (
    <ShellPage>
      <PageHeader
        eyebrow="Maintenance / Requests"
        title="Equipment & parts requests"
        subtitle="A request-and-approval record linked to maintenance work — not an inventory system."
        action={
          canCreate ? (
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" />
              Create request
            </Button>
          ) : undefined
        }
      />
      <Card>
        <div className="flex items-center justify-between border-b p-5">
          <div>
            <h2 className="text-sm font-semibold">All requests</h2>
            <p className="mt-1 text-xs text-slate-500">
              {rows.length} records across active tickets
            </p>
          </div>
          <Button variant="outline">
            <Filter className="h-4 w-4" />
            Filter
          </Button>
        </div>
        <Table>
          <THead>
            <TR>
              <TH>Request ID</TH>
              <TH>Item</TH>
              <TH>Linked ticket / asset</TH>
              <TH>Requested by</TH>
              <TH>Date</TH>
              <TH>Status</TH>
              <TH>Approved by</TH>
              <TH></TH>
            </TR>
          </THead>
          <TBody>
            {rows.map((r) => (
              <TR key={r.id}>
                <TD className="font-semibold">{r.id}</TD>
                <TD>
                  <div className="font-medium">
                    {r.item} ×{r.quantity}
                  </div>
                  <div className="max-w-[220px] truncate text-xs text-slate-400">{r.reason}</div>
                </TD>
                <TD>
                  <Link href={`/tickets/${r.ticketId}`} className="font-medium text-blue-600">
                    {r.ticketId}
                  </Link>
                  <div className="text-xs text-slate-400">{getName(r.equipmentId)}</div>
                </TD>
                <TD>{r.requestedBy}</TD>
                <TD>{r.requestedDate}</TD>
                <TD>
                  <StatusBadge status={r.status} />
                </TD>
                <TD>
                  {r.approvedBy ? (
                    <>
                      <div>{r.approvedBy}</div>
                      <div className="text-xs text-slate-400">{r.approvedDate}</div>
                    </>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </TD>
                <TD>
                  {canApprove && r.status === "Pending" && (
                    <div className="flex gap-1">
                      <Button className="h-8 px-2 text-xs" onClick={() => update(r.id, "Approved")}>
                        <Check className="h-3 w-3" />
                        Approve
                      </Button>
                      <Button
                        variant="danger"
                        className="h-8 px-2 text-xs"
                        onClick={() => update(r.id, "Rejected")}
                      >
                        <X className="h-3 w-3" />
                        Reject
                      </Button>
                    </div>
                  )}
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </Card>
      {createOpen && <RequestModal onClose={() => setCreateOpen(false)} onCreate={createRequest} />}
    </ShellPage>
  );
}
export function HistoryPage() {
  const [q, setQ] = useState("");
  const rows = tickets.filter(
    (t) =>
      t.status === "Closed" &&
      `${t.ticketNo} ${getName(t.equipmentId)} ${t.maintenanceRecord.repairActivity}`
        .toLowerCase()
        .includes(q.toLowerCase()),
  );
  return (
    <ShellPage>
      <PageHeader
        eyebrow="Maintenance / Closed work"
        title="Maintenance history"
        subtitle="Trace every completed maintenance activity across the fleet."
      />
      <Card>
        <div className="border-b p-5">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <Input
              className="pl-9"
              placeholder="Search closed work"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        </div>
        <Table>
          <THead>
            <TR>
              <TH>Ticket no.</TH>
              <TH>Asset</TH>
              <TH>Date</TH>
              <TH>Activity</TH>
              <TH>Parts used</TH>
              <TH>Downtime</TH>
              <TH>Closed by</TH>
            </TR>
          </THead>
          <TBody>
            {rows.map((t) => (
              <TR key={t.id}>
                <TD className="font-semibold text-blue-600">{t.ticketNo}</TD>
                <TD>{getName(t.equipmentId)}</TD>
                <TD>{t.dueDate}</TD>
                <TD>{t.maintenanceRecord.repairActivity}</TD>
                <TD>{t.maintenanceRecord.partsUsed || "None"}</TD>
                <TD>{t.downtimeHours ?? 0} hrs</TD>
                <TD>{t.assignedEngineer}</TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </Card>
    </ShellPage>
  );
}
export function NotificationsPage() {
  const [rows, setRows] = useState(initialNotifications);
  const mark = (id: string) => {
    setRows((rs) => rs.map((n) => (n.id === id ? { ...n, read: true } : n)));
    toast.success("Notification marked as read");
  };
  return (
    <ShellPage>
      <PageHeader
        eyebrow="Insights / Alerts"
        title="Notifications"
        subtitle="Stay ahead of due dates, approvals and equipment readiness signals."
      />
      <div className="mx-auto max-w-4xl space-y-3">
        {rows.map((n) => (
          <Card key={n.id} className={!n.read ? "border-blue-200 dark:border-blue-900/60" : ""}>
            <div className="flex items-start gap-4 p-5">
              <div
                className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl ${n.read ? "bg-slate-100 text-slate-500" : "bg-blue-50 text-blue-600 dark:bg-blue-950/40"}`}
              >
                <CircleIcon type={n.type} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-semibold">{n.type}</h3>
                  {!n.read && <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />}
                </div>
                <p className="mt-1 text-sm text-slate-500">{n.message}</p>
                <div className="mt-2 text-xs text-slate-400">
                  {n.timestamp} · {n.type}
                </div>
              </div>
              {!n.read && (
                <Button variant="ghost" className="text-xs" onClick={() => mark(n.id)}>
                  Mark read
                </Button>
              )}
            </div>
          </Card>
        ))}
        {rows.length === 0 && <Empty message="You’re all caught up" />}
      </div>
    </ShellPage>
  );
}
function CircleIcon({ type }: { type: string }) {
  return <div className="text-xs font-bold">{type.slice(0, 2).toUpperCase()}</div>;
}
function Empty({ message }: { message: string }) {
  return (
    <Card className="p-16 text-center">
      <Archive className="mx-auto h-10 w-10 text-slate-300" />
      <div className="mt-4 font-semibold">{message}</div>
      <div className="mt-1 text-sm text-slate-500">No records match the current view.</div>
    </Card>
  );
}
export function DocumentsPage() {
  return (
    <ShellPage>
      <PageHeader
        eyebrow="Assets / Records"
        title="Documents"
        subtitle="Manuals, certificates and operational documents linked to the right asset."
      />
      <Card>
        <Table>
          <THead>
            <TR>
              <TH>Document</TH>
              <TH>Linked asset</TH>
              <TH>Type</TH>
              <TH>Expiry date</TH>
              <TH></TH>
            </TR>
          </THead>
          <TBody>
            {documents.map((d) => (
              <TR key={d.id}>
                <TD>
                  <div className="flex items-center gap-3">
                    <div className="grid h-9 w-9 place-items-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/40">
                      <FileText className="h-4 w-4" />
                    </div>
                    <span className="font-medium">{d.name}</span>
                  </div>
                </TD>
                <TD>{d.assetNo}</TD>
                <TD>
                  <StatusBadge status={d.type} />
                </TD>
                <TD>{d.expiry ?? "—"}</TD>
                <TD>
                  <Button
                    variant="ghost"
                    className="text-xs"
                    onClick={() => toast.success("Preview opened (mock)")}
                  >
                    <Download className="h-4 w-4" />
                    View
                  </Button>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </Card>
    </ShellPage>
  );
}
