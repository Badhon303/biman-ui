# Biman GSE Digital Logbook — Backend Specification

> Source of truth for building the NestJS backend that will replace the mock data in
> `lib/mock-data.ts` / `lib/types.ts`. Read alongside `docs/backend-erd.puml` (entity/relationship
> model) — this document describes **modules, workflows, business rules, and technical
> architecture** so an AI agent (or engineer) can implement the backend without access to the
> frontend author's intent.

## 1. Purpose & Domain Summary

NGGL maintains Biman Bangladesh Airlines' Ground Support Equipment (GSE) — belt loaders,
push-back tractors, GPUs, passenger steps, air-start units, etc. This system is a **digital
logbook + CMMS (Computerized Maintenance Management System)**:

- Tracks equipment (assets), their specifications, documents, photos and running hour meter.
- Defines **equipment types**, each with a catalog of **services** triggered by hour-meter bands
  (e.g. Service F: 0–500h, Service B: 500–1000h, ...) or by a fixed calendar interval
  (Service V: every 6 months).
- Raises **maintenance tickets** (work orders) — either auto-generated (hour-meter crossing a
  service band, or V-Service recurrence) or manually created (Breakdown, General, Washing,
  Others).
- Engineers execute tickets: run an inspection checklist, log parts/labour, attach photos, give
  written feedback, and mark functional/safety checks. Completion routes the ticket to
  Manager/Super Admin for verification before closing.
- Engineers may need **parts/equipment requests** fulfilled by Biman Admin during a job.
- All significant actions raise **notifications** to relevant roles.
- Full audit trail of every ticket (`TICKET_HISTORY`) and every hour-meter reading
  (`HOUR_METER_READING`).

## 2. Roles & Organizations

| Role | Organization | Capabilities |
|---|---|---|
| **Super Admin** | NGGL | Full control: user management (create users w/ default password), equipment type CRUD, equipment CRUD, ticket CRUD (create/edit/assign/verify/close), settings, reports, view everything. |
| **Manager** | NGGL | Same operational powers as Super Admin except user management: equipment type CRUD, equipment CRUD, ticket create/edit/assign/verify/close, approve/reject requests. |
| **Engineer** | NGGL | Update hour meter, work tickets assigned to them (start work, fill maintenance record/checklist, submit feedback → triggers verification), create parts/equipment requests, change own password. Read-only on equipment/tickets they are not assigned to (or scoped to "assigned to me" views). |
| **Biman Admin** | Biman Bangladesh Airlines | Create tickets (Breakdown, General, Washing — the "manual" types), describe ticket problems, approve/reject/receive parts requests, view equipment/tickets (read-only), receive/View notifications. Cannot edit equipment, users, or equipment types. |

Notes for backend:
- Users belong to an `organization` (`NGGL` or `Biman`/`Biman Bangladesh`) which is independent of
  `role` but role implies a default org (Biman Admin ⇒ Biman org; other three roles ⇒ NGGL).
- `status`: `Active | Inactive`. Inactive users cannot authenticate.
- Only **Super Admin** creates user accounts, with a **default/temporary password** the new user
  must change on first login (force `must_change_password` flag).
- Any authenticated user can change their own password (old password required).

## 3. Core Modules (NestJS)

Suggested module boundaries (one Nest module per bounded context, each with its own
controller/service/repository, DTOs, and Swagger annotations):

1. **AuthModule** — login (JWT access + refresh token), password change, forced password reset,
   guards (`JwtAuthGuard`, `RolesGuard`), `@Roles()` decorator.
2. **UsersModule** — CRUD for NGGL users (Super Admin only), list Biman users (read-only for
   others), profile/self endpoints.
3. **EquipmentTypesModule** — CRUD for equipment types and their nested `services` (Super
   Admin/Manager).
4. **EquipmentModule** — CRUD for equipment (Super Admin/Manager), specifications, documents,
   photos sub-resources, hour-meter update endpoint (all authenticated roles that touch equipment:
   Engineer/Manager/Super Admin — see §5.3), hour-meter history.
5. **TicketsModule** — ticket CRUD, status transitions, assignment, maintenance record
   (checklist, parts, labour, functional/safety checks), feedback entries, ticket history.
6. **MaintenanceScheduleModule** — V-Service (and other date-based) recurring schedules,
   due/overdue computation.
7. **RequestsModule** (Equipment/Parts Requests) — create, approve, reject, mark received.
8. **NotificationsModule** — persisted notifications + delivery (in-app now; email/push later),
   read/unread, mark-all-read.
9. **ReportsModule** — aggregate/analytics endpoints (availability, downtime/MTBF, PM compliance)
   — computed on read or via scheduled materialization job.
10. **SchedulerModule / JobsModule** — BullMQ producers & processors for background rules (hour
    meter service crossing, V-Service recurrence, overdue schedule detection, document expiry,
    notification fan-out).
11. **CommonModule** — pagination, filtering, audit interceptor, exception filters, Swagger config.

## 4. Data Model

Use `docs/backend-erd.puml` as the canonical ERD. Key clarifications for implementation:

- Replace all frontend "display name" fields (`assignedEngineer`, `createdBy`, `actor`,
  `requestedBy`, `approvedBy`, `recordedBy`) with **user ID foreign keys**; join to `User` for
  display name in API responses.
- `Ticket.pmType` / `serviceType` is an enum matching `EquipmentTypeService.name` for PM tickets,
  or one of `Breakdown | General | Washing | Others` for manually created tickets.
- `MaintenanceRecord` is 1:1 with `Ticket` (created automatically when the ticket is created, from
  the equipment type's checklist template).
- `ChecklistItem` rows are **cloned per maintenance record** from a master checklist template (see
  §5.6) — not shared/mutated globally.
- `WORK_IMAGE` / feedback entries: model engineer feedback as a **collection of timestamped
  entries** (author, html body, image URLs) rather than a single string, since the UI supports
  multiple feedback submissions over the life of a ticket (`FeedbackEntry[]` in
  `app/tickets/[id]/page.tsx`). Add a `TICKET_FEEDBACK` table:
  `id, ticket_id FK, author_user_id FK, body_html, created_at`, with child `FEEDBACK_IMAGE` rows.
- `EquipmentRequest.ticketId` / `equipmentId` — always tied to a ticket; `equipmentId` is derived
  from the ticket's equipment for convenience/denormalized reporting.
- Store rich text (engineer feedback) as sanitized HTML (sanitize server-side, e.g. with
  `sanitize-html`) — never trust client HTML.
- Add standard audit columns to every table: `created_at`, `updated_at`, and where relevant
  `created_by_user_id` / `updated_by_user_id`.
- Add soft-delete (`deleted_at`) to `Equipment`, `EquipmentType`, and `User` rather than hard
  delete, since tickets/history reference them.

## 5. Business Rules & Workflows

### 5.1 Users & Auth

- Super Admin creates a user with `name, email, role, organization` → system generates a default
  password (or Super Admin sets one), emails/display it once, sets `must_change_password = true`.
- On first login (or whenever `must_change_password` is true), the user must set a new password
  before accessing any other endpoint.
- Users can self-service change password at any time (`PATCH /users/me/password`), requiring
  current password.
- JWT-based auth; `role` and `organization` embedded in the token/claims for guard checks.
- Deactivating a user (`status = Inactive`) invalidates future logins and existing refresh tokens.

### 5.2 Equipment Types & Services

- Super Admin/Manager CRUD equipment types (`EquipmentType`) each holding an ordered set of
  `EquipmentTypeService` records:
  - **Hour-based services**: `minHours`, `maxHours` (band), e.g. F (0–500), B (500–1000), C
    (1000–2000), D (2000–2500), E (2500–3000). Bands must be contiguous/non-overlapping per type
    (validate on save).
  - **Calendar-based services**: `months` set instead of hour band (e.g. V-Service every 6
    months) — recurs indefinitely, not a one-off band.
  - A type can mix hour-based and calendar-based services, and may define custom services beyond
    the standard F/B/C/D/E/V set.
- Deleting an equipment type in use by equipment should be blocked or require reassignment
  (business decision — default to **block delete if referenced by any equipment**).

### 5.3 Equipment & Hour Meter

- Super Admin/Manager: full CRUD on equipment (asset no auto-generated as `BGM-###`, sequential),
  specifications, documents (with optional expiry date), photos.
- **Hour meter updates**: Engineer, Manager, or Super Admin can update an equipment's hour meter
  (`POST /equipment/:id/hour-meter`). Rules:
  1. New value must be `>= current hourMeter` (monotonic; reject decreases, or require an
     explicit "correction" flag/reason for audit if a decrease is ever legitimate).
  2. Persist a new `HOUR_METER_READING` row (value, recordedAt, recordedByUserId) — never mutate
     history, only append.
  3. Update `Equipment.hourMeter` to the new value.
  4. **Service threshold crossing check** (core rule): compare the equipment's previous hour
     meter reading and the new reading against the equipment type's hour-based service bands.
     - Determine which service band the *previous* value fell in vs. which band the *new* value
       falls in.
     - If the equipment has crossed into a new (higher) band — i.e. `newValue >= service.minHours`
       for a service the equipment had not yet had performed for this "cycle" — then:
       a. Auto-generate a new maintenance **Ticket** (`serviceType` = crossed service name,
          `priority` = Medium by default, `status = Open`, `createdBy` = system/current actor,
          `dueDate` computed e.g. current date + configurable grace period).
       b. Clone the base inspection checklist into the ticket's `MaintenanceRecord`.
       c. Change/refresh the equipment's active `MAINTENANCE_SCHEDULE` service type to the newly
          crossed service (i.e. "the service type is changed" per requirements — the equipment's
          *current due service* becomes the next band above the one just triggered).
       d. Append a `TICKET_HISTORY` row ("Ticket created — hour meter threshold crossed").
       e. Emit an `APP_NOTIFICATION` to Super Admin, Manager, and Biman Admin (ticket created).
     - This check must be **idempotent** — do not create duplicate tickets if a ticket for that
       equipment + service band is already open/in-progress. Track "last serviced band" on the
       equipment (or infer from most recent non-closed/closed ticket of that type) to avoid
       re-triggering.
  5. All of the above (steps 3–4) should run inside a single DB transaction, then enqueue a BullMQ
     job for notification fan-out (see §7).

### 5.4 Maintenance Schedules (incl. V-Service recurrence)

- `MaintenanceSchedule` tracks calendar-based recurring services per equipment (primarily
  **V-Service**, every 6 months) with `lastDate`, `dueDate`, `status` (`Scheduled | Due soon |
  Overdue`), and optional linked `ticketId`.
- A scheduled job (daily) recomputes `status`:
  - `Due soon`: `dueDate` within `DUE_SOON_DAYS` (15 days, per `app/schedule/page.tsx`) of now.
  - `Overdue`: `dueDate` in the past.
  - `Scheduled`: otherwise.
- When a V-Service schedule becomes due (`dueDate <= now`) and has no open linked ticket yet:
  1. Auto-generate a `V-Service` ticket for the equipment.
  2. Link `MaintenanceSchedule.ticketId` to the new ticket.
  3. Emit a notification (ticket created).
- When a V-Service ticket is closed/verified, create the **next** `MaintenanceSchedule` row:
  `lastDate = closedDate`, `dueDate = lastDate + 6 months`, `status = Scheduled`, unlinked
  `ticketId` (fresh cycle) — i.e. V-Service is perpetually recurring.
- Same recurrence pattern generalizes to any equipment-type service with a `months` interval, not
  just V-Service.

### 5.5 Tickets — Types, Priority, Status

- `TicketType` (serviceType): `F-Service | B-Service | C-Service | D-Service | E-Service |
  V-Service | Breakdown | General | Washing | Others`.
  - **Auto-generated** types: `F/B/C/D/E-Service` (hour-meter crossing) and `V-Service` (calendar
    recurrence) — created only by the system (§5.3, §5.4), never manually via the create-ticket
    UI/endpoint. Reject manual creation attempts for these types (or restrict to Super Admin as an
    override/backfill action).
  - **Manually created** types: `Breakdown`, `General`, `Washing`, `Others` — creatable by Super
    Admin, Manager, and Biman Admin. `faultDescription` is required for these (the "problem
    description").
- `TicketStatus` lifecycle (linear, matches the stepper in `app/tickets/[id]/page.tsx`):
  `Open → Assigned → In Progress ⇄ Awaiting Parts → Awaiting Verification → Completed → Closed`.
  - `Open`: created, unassigned.
  - `Assigned`: engineer assigned (assignment triggers a notification to that engineer).
  - `In Progress`: engineer has started work (`Start work` action, Engineer only, from
    `Open`/`Assigned`).
  - `Awaiting Parts`: set when a linked `EquipmentRequest` is pending (optional explicit
    transition or derived state).
  - `Awaiting Verification`: engineer submits the maintenance record/final feedback
    (`Final submit`) — checklist, parts used, labour hours, functional/safety checks, feedback
    required (non-empty).
  - `Completed`/`Closed`: Manager/Super Admin action (`Verify & close`) — reviews the maintenance
    record and closes the ticket, sets `closedDate`, `downtimeHours` (computed or entered).
  - Any transition/edit appends a `TICKET_HISTORY` row (actor + label + timestamp) and emits a
    notification (per requirements: "other actions on the ticket generate notifications").
- **Priority**: `Low | Medium | High | Critical` — settable at creation and editable by
  Manager/Super Admin.
- **Assignment**: Manager/Super Admin assign/reassign an engineer to a ticket at any time before
  closing → notification to the newly assigned engineer.
- **Editing**: Manager/Super Admin can edit priority, assigned engineer, due date, requesting
  party while the ticket is open (`editing` state in UI). Engineers cannot edit ticket metadata,
  only their maintenance-record/checklist/feedback fields.
- Only Manager/Super Admin can perform "Verify & close" (final authority), regardless of who
  created the ticket (including Biman-Admin-created tickets).

### 5.6 Inspection Checklist

- A master checklist template exists per (equipment type, or globally — current mock data uses
  one **shared 60-item checklist** across all equipment types, grouped into categories: `Body
  Work, Engine, Transmission, Rear Axle, Brake, Hydraulic, Wheels & Suspension, Electrical,
  Greasing, Safety, General`).
- Model as `CHECKLIST_TEMPLATE_ITEM(id, equipment_type_id NULLABLE, category, label, sort_order)`
  — `equipment_type_id NULL` = applies to all types (global default), otherwise type-specific
  overrides. This is inferred from the requirement *"Based on the service type inspection
  checklist is different"* — the current mock only ships one template, so the schema should
  support **per-service-type / per-equipment-type checklist templates** even though seed data may
  only populate one.
- When a ticket is created, clone the applicable template's items into
  `CHECKLIST_ITEM(maintenance_record_id, category, label, checked=false)`.
- Engineer toggles items via `PATCH /tickets/:id/checklist/:itemId`.

### 5.7 Parts / Equipment Requests

- Engineers (assigned to a ticket) can create requests: `item, quantity, reason` → status
  `Pending`.
- Biman Admin (and Super Admin/Manager) approve or reject a pending request → status
  `Approved`/`Rejected`, `approvedBy`, `approvedDate` set → notification to the requesting
  engineer (`Request Approved` / `Request Rejected`).
- Approved requests are later marked `Received` (by whoever fulfills, e.g. Biman Admin or
  Manager) → notification optional.
- A ticket may move to `Awaiting Parts` while a linked request is `Pending`/`Approved-not-yet-
  received`.
- Creating a request always emits a `New Request` notification to Biman Admin (and
  Manager/Super Admin).

### 5.8 Notifications

Persisted, per-user (or broadcast to a role) `AppNotification` rows. Trigger matrix:

| Event | Recipients |
|---|---|
| Ticket created (manual or auto) | Super Admin, Manager, Biman Admin |
| Engineer assigned to a ticket | The assigned engineer (+ optionally Manager/Super Admin) |
| Ticket status changed / edited / closed | Ticket creator, assigned engineer, Manager/Super Admin |
| Equipment hour meter crosses a service threshold | Super Admin, Manager, Biman Admin |
| V-Service (or other recurring) schedule becomes due | Super Admin, Manager |
| Maintenance schedule overdue / due soon | Super Admin, Manager |
| Equipment/parts request created | Biman Admin, Manager, Super Admin |
| Equipment/parts request approved/rejected | Requesting engineer |
| Document expiring soon (insurance, certificates) | Super Admin, Manager |
| New user created / password reset | The new user |

- Notifications have `read: boolean`; endpoints: list (paginated, filter by read/unread),
  mark-read, mark-all-read.
- Delivery: persist to Postgres + publish to Redis pub/sub channel (or WebSocket gateway backed by
  Redis adapter) for real-time push to connected clients. Use BullMQ for any fan-out that needs
  retry semantics (e.g. email).

### 5.9 Documents & Expiry

- Equipment documents (`Manual | Insurance | Certificate | Other`) optionally have `expiryDate`.
- Daily job scans for documents expiring within N days (e.g. 30) → notification (`Insurance
  Expiry` etc.), similar to the mock notification `"GPU 90 KVA (BGM-003) insurance expires on
  10-Jul-26."`.

### 5.10 Reports

- Aggregate, read-mostly endpoints: equipment availability %, downtime/MTBF (mean time between
  failures) from ticket `downtimeHours` + `closedDate`, PM compliance (scheduled work completed
  on/before due date vs. late). Can be computed on-demand with SQL aggregates initially; consider
  materialized views or a nightly BullMQ job if datasets grow.

## 6. Permission Matrix (guard reference)

| Action | Super Admin | Manager | Engineer | Biman Admin |
|---|:---:|:---:|:---:|:---:|
| Create/manage users | ✅ | ❌ | ❌ | ❌ |
| Change own password | ✅ | ✅ | ✅ | ✅ |
| CRUD equipment types | ✅ | ✅ | ❌ | ❌ |
| CRUD equipment (list, specs, docs) | ✅ | ✅ | ❌ (read only) | ❌ (read only) |
| Update hour meter | ✅ | ✅ | ✅ | ❌ |
| Create ticket (Breakdown/General/Washing/Others) | ✅ | ✅ | ❌ | ✅ |
| Edit ticket metadata (priority/assignee/due date) | ✅ | ✅ | ❌ | ❌ |
| Assign engineer to ticket | ✅ | ✅ | ❌ | ❌ |
| Start work / submit maintenance record & feedback | ❌ | ❌ | ✅ (own tickets) | ❌ |
| Verify & close ticket | ✅ | ✅ | ❌ | ❌ |
| Create parts/equipment request | ✅ | ✅ | ✅ | ❌ |
| Approve/reject parts request | ✅ | ✅ | ❌ | ✅ |
| View reports | ✅ | ✅ | ⚠️ (limited) | ⚠️ (limited) |
| View notifications | ✅ | ✅ | ✅ (own) | ✅ (own) |

## 7. Background Jobs (BullMQ + Redis)

Redis backs BullMQ queues and can double as a cache / pub-sub layer for realtime notification
delivery.

| Queue | Trigger | Job |
|---|---|---|
| `hour-meter-check` | Enqueued synchronously after every hour-meter update | Recompute service band, create PM ticket if threshold crossed, update schedule, notify |
| `schedule-recurrence` | Cron (daily) | Recompute `MaintenanceSchedule.status`; auto-create V-Service (and other calendar-based) tickets when due |
| `document-expiry-check` | Cron (daily) | Scan `EquipmentDocument.expiryDate`, notify on approaching expiry |
| `notification-dispatch` | Enqueued by any module emitting a notification | Persist notification row(s) + push via WebSocket/Redis pub-sub (+ email later) |
| `ticket-sla-check` | Cron (hourly/daily) | Flag overdue tickets (`dueDate` passed, not closed), notify Manager/Super Admin |
| `reports-materialize` (optional) | Cron (nightly) | Precompute heavy report aggregates |

Use one BullMQ queue per concern with idempotent job handlers (dedupe via job ID, e.g.
`hour-meter-check:${equipmentId}:${readingId}`) to avoid duplicate ticket creation.

## 8. Tech Stack & Cross-Cutting Concerns

- **Framework**: NestJS (modular, DI, guards, interceptors, pipes).
- **Database**: PostgreSQL via TypeORM or Prisma (pick one; Prisma recommended for schema clarity
  and migrations — adjust module scaffolding accordingly). Use the ERD in
  `docs/backend-erd.puml` as the migration source of truth.
- **Cache/Queues**: Redis + BullMQ (`@nestjs/bullmq`).
- **Auth**: JWT (access + refresh), `passport-jwt`, `bcrypt`/`argon2` for password hashing,
  `@nestjs/throttler` for rate limiting login attempts.
- **Validation**: `class-validator` / `class-transformer` DTOs on every endpoint.
- **API docs**: `@nestjs/swagger`, tag controllers by module, document all DTOs and enums,
  generate `swagger.json` for the frontend team.
- **File uploads** (equipment photos, documents, work images): store via S3-compatible object
  storage (or local disk in dev) behind a signed-URL upload flow; persist only metadata + URL in
  Postgres.
- **Pagination/filtering**: standard `?page&limit&sort&search` query params on all list endpoints
  (equipment, tickets, requests, notifications, users).
- **Audit trail**: generic interceptor or explicit history tables (`TicketHistory`,
  `HourMeterReading`) — avoid over-engineering a generic audit log unless required later.
- **Testing**: unit tests for business rules (especially §5.3 threshold-crossing logic and §5.4
  recurrence logic — these are the trickiest and most valuable to cover), e2e tests per module
  with a test Postgres/Redis via Docker Compose.
- **Environment**: Docker Compose for local Postgres + Redis; `.env` for secrets (never commit).

## 9. Open Questions / Assumptions (flag to stakeholders before finalizing schema)

1. **Checklist templates**: mock data has one shared 60-item checklist for all equipment/service
   types, but the requirement states checklists differ by service type. Confirm whether templates
   should be authored per `EquipmentType`, per `TicketType` (service name), or both.
   Recommendation: keyed by `(equipment_type_id, service_type)` with fallback to a global default.
2. **Hour-meter decrease handling**: assume hour meters are monotonic; decide whether corrections
   need a separate audited "correction" workflow.
3. **Grace period / due date** for auto-generated PM tickets is unspecified in the mock — pick a
   configurable default (e.g. 7 days) per equipment type or globally, exposed via Settings.
4. **Downtime hours**: currently manually entered per ticket in the mock. Decide if this should be
   auto-computed from `createdDate`/`closedDate` timestamps instead/also.
5. **Biman Admin's own users**: currently view-only "Biman users" list is seeded, not managed via
   the app — confirm whether Biman-side user provisioning happens elsewhere or should also be
   Super-Admin-managed.
