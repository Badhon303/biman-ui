# Biman GSE Digital Logbook — UAT Checklist

> Role-based acceptance checklist derived from `BACKEND_SPEC.md` and `backend-erd.puml`. Dashboard and report validation are intentionally out of scope for this pass and can be added later.

## How to use

- Run each test with a dedicated account for the role named in its section.
- Mark a test complete only after checking the expected result; record the result and evidence in your UAT tracker using the test ID.
- Suggested result values: **Pass / Fail / Blocked / N/A**.
- Test role restrictions using both the UI and a direct request where practical; a hidden/disabled control alone does not prove access is denied.

## Suggested test data

- Active accounts: one Super Admin, Manager, Engineer, and Biman Admin; also prepare one inactive account and one newly created account with a temporary password.
- At least two pieces of equipment of the same type, one of a different type, and one equipment record with documents and photos.
- An equipment type with contiguous hour bands including a custom band, a six-month V-Service, and applicable inspection checklist templates.
- Tickets in Open, Assigned, In Progress, Awaiting Parts, Awaiting Verification, and Closed states; ensure some tickets are assigned to the test Engineer and some are assigned to another Engineer.
- A due V-Service schedule and a pending parts/equipment request.

## Shared checks — all roles

### Authentication and own account

- [ ] **AUTH-01** — Sign in with valid active-user credentials; the user is authenticated as the expected role and organization.
- [ ] **AUTH-02** — Sign in with an incorrect password; access is denied without disclosing whether the email/account exists.
- [ ] **AUTH-03** — Sign in as an inactive user; access is denied.
- [ ] **AUTH-04** — On first sign-in with a temporary password, the user must set a new password before accessing protected application functions.
- [ ] **AUTH-05** — Change the current password using the correct current password and a valid new password; the new password works on the next sign-in.
- [ ] **AUTH-06** — Attempt password change with an incorrect current password; the change is rejected and the existing password remains valid.
- [ ] **AUTH-07** — Deactivate an account that has an existing refresh token; subsequent refresh attempts are rejected.

### Notifications

- [ ] **NTF-01** — View the signed-in user's notifications; another user's private notifications are not visible.
- [ ] **NTF-02** — Mark one notification as read; its read/unread state updates and remains correct after reload.
- [ ] **NTF-03** — Mark all notifications as read; all notifications belonging to the signed-in user are marked read.
- [ ] **NTF-04** — Trigger a relevant event and verify the correct role/user receives an in-app notification; no email notification is expected.

## Super Admin (NGGL)

### User administration

- [ ] **SA-USER-01** — Create an NGGL user with name, email, role, and organization; the account appears with the supplied details and an initial/temporary password is provided for secure handoff.
- [ ] **SA-USER-02** — Create a Biman Admin account; it is managed in this application, belongs to the Biman organization by default, and does not require external provisioning.
- [ ] **SA-USER-03** — Verify a newly created account is required to change its temporary password at first sign-in; it cannot access protected functions before doing so.
- [ ] **SA-USER-04** — Manage user status and deactivate an account; the inactive account cannot sign in and existing refresh tokens are invalidated.
- [ ] **SA-USER-05** — Attempt to create a duplicate email; the operation is rejected and existing user data is unchanged.
- [ ] **SA-USER-06** — Verify user administration is unavailable to Manager, Engineer, and Biman Admin (including direct access attempts).

### Equipment types, equipment, and hour meter

- [ ] **SA-EQP-01** — Create and edit an equipment type and its services; changes are reflected in the type and are available when creating/editing equipment.
- [ ] **SA-EQP-02** — Save valid hour-band services that begin at 0 and are contiguous, non-overlapping, and have positive widths; save succeeds.
- [ ] **SA-EQP-03** — Try hour-band definitions with a starting gap, internal gap, overlap, zero/inverted width, or a non-final open-ended band; each invalid set is rejected with the relevant bands identified.
- [ ] **SA-EQP-04** — Configure V-Service as a six-month calendar service; it is excluded from hour-band continuity validation. Configure one or more custom hour bands; each is retained as a distinct service.
- [ ] **SA-EQP-05** — Attempt to delete an equipment type that is referenced by equipment; deletion is blocked or reassignment is required.
- [ ] **SA-EQP-06** — Create and edit equipment, specifications, photos, and documents; the asset number is generated in the `BGM-###` sequence and persisted equipment details display correctly.
- [ ] **SA-EQP-07** — Upload/replace primary, front, and side photos; each slot displays the current image and replacement does not leave the previous image attached. Verify additional `OTHER` photos within the stated limit.
- [ ] **SA-EQP-08** — Upload an allowed equipment document with name, type, and optional expiry date; it can be opened/downloaded by an authorized user. No document-expiry notification is expected in this version.
- [ ] **SA-EQP-09** — Update an equipment hour meter to the same or a higher value; the current value updates and a new, attributable history reading is appended.
- [ ] **SA-EQP-10** — Try to decrease the hour meter; the update is rejected and neither current value nor reading history changes.
- [ ] **SA-EQP-11** — Update the meter without running service-check; no PM ticket is created by the meter update alone.
- [ ] **SA-EQP-12** — Run the explicit service-check after a threshold is reached; the correct PM ticket is created with the correct service band, `Open` status, default `Medium` priority, selected due date, and cloned checklist.
- [ ] **SA-EQP-13** — Run service-check after a large meter jump across multiple bands; one ticket per crossed band is created in ascending order, with a due date entered for each.
- [ ] **SA-EQP-14** — Cross a custom hour-band service; the PM ticket uses `Others` and retains the specific custom service association/checklist.
- [ ] **SA-EQP-15** — Repeat the same service-check; duplicate tickets are not created. Verify each check records the actor, timestamp, and previous/current values.
- [ ] **SA-EQP-16** — Verify V-Service status is Due soon within 15 days of its due date, Overdue after the due date, and Scheduled otherwise; when due, one linked V-Service ticket is created and repeated checks do not duplicate it.
- [ ] **SA-EQP-17** — After a V-Service ticket is verified/closed, verify the next schedule is created for six months after the close date. Confirm F/B/C/D/E and custom hour-band services are not calendar-scheduled.
- [ ] **SA-EQP-18** — Soft-delete equipment; it is no longer offered as active equipment, while historical tickets and their referenced files remain available as specified.

### Tickets, requests, and verification

- [ ] **SA-TKT-01** — Create Breakdown, General, and Washing tickets; each requires a problem description and due date and saves the selected equipment, priority, and requesting party.
- [ ] **SA-TKT-02** — Confirm the manual ticket form does not offer PM types (F/B/C/D/E/V) or `Others`; PM tickets are created through the applicable service-check/schedule workflows only.
- [ ] **SA-TKT-03** — Edit an open ticket's priority, assigned Engineer, due date, and requesting party; changes are saved and reflected in ticket history.
- [ ] **SA-TKT-04** — Assign/reassign a ticket before closure; the newly assigned Engineer receives a notification. Verify assignment is not changed after closure.
- [ ] **SA-TKT-05** — Verify ticket transitions and history for creation, assignment, work start, awaiting parts (if used), submission for verification, and closure; each history entry has the correct actor and timestamp.
- [ ] **SA-TKT-06** — Review an Engineer's submitted maintenance record; reject/leave it unclosed if required checklist items, parts/labour details, functional/safety checks, or non-empty final feedback are missing.
- [ ] **SA-TKT-07** — Verify and close a complete ticket; it reaches Closed, gets a close date, and downtime is calculated by default. Override downtime during verification and confirm the override is retained.
- [ ] **SA-TKT-08** — Create a parts/equipment request where permitted by the role; verify the request is tied to the ticket/equipment and Biman Admin plus NGGL operational recipients are notified.
- [ ] **SA-TKT-09** — Approve/reject a pending request; status, approver, and decision date are recorded and the requesting Engineer is notified. Mark an approved request received and verify its status.

### Access and files

- [ ] **SA-ACCESS-01** — Verify Super Admin can view equipment and tickets across the system and access supported settings.
- [ ] **SA-ACCESS-02** — Verify image/document uploads and reads work for authorized records; unauthorized users cannot read files by guessing or reusing a file URL/ID.
- [ ] **SA-ACCESS-03** — Verify direct filesystem paths and raw upload directory contents are not exposed through the application.

## Manager (NGGL)

- [ ] **MGR-01** — Create and edit equipment types/services and equipment, including specifications, documents, and photos.
- [ ] **MGR-02** — Verify the same hour-band continuity rules as SA-EQP-02–04, in-use equipment-type deletion protection as SA-EQP-05, and equipment soft-deletion/history retention as SA-EQP-18.
- [ ] **MGR-03** — Update hour meters and append history; lower readings are rejected. Run explicit service-check and verify applicable PM tickets, due dates, multi-band ordering, custom `Others`, idempotency, and audit details as in SA-EQP-09–15.
- [ ] **MGR-04** — View V-Service schedules and verify due V-Service ticket creation and next-cycle behavior as in SA-EQP-16–17.
- [ ] **MGR-05** — Create Breakdown, General, and Washing tickets with required problem description and due date; PM and `Others` are not manually selectable.
- [ ] **MGR-06** — Edit open-ticket metadata, set priority, assign/reassign Engineers, and verify the newly assigned Engineer is notified.
- [ ] **MGR-07** — Verify and close a complete ticket; required maintenance information is present, close date is set, and downtime defaults from the ticket dates; verify an authorized override is retained.
- [ ] **MGR-08** — Create (where supported by the UI) and approve/reject/receive parts/equipment requests; validate decision metadata and requester notifications.
- [ ] **MGR-09** — View equipment/tickets and relevant history, but verify user create/edit/deactivate functions are denied (including direct access attempts).
- [ ] **MGR-10** — Verify Manager cannot manage user accounts, while own password and notification functions remain available.
- [ ] **MGR-11** — Verify equipment photo/document permissions and file access restrictions as in SA-ACCESS-02–03.

## Engineer (NGGL)

### Assigned maintenance work

- [ ] **ENG-01** — View equipment/tickets permitted to the account; tickets assigned to another Engineer remain read-only or are absent from the assigned-to-me view.
- [ ] **ENG-02** — Attempt to create a manual ticket or edit ticket metadata (priority, assignee, due date, requesting party); access is denied.
- [ ] **ENG-03** — Start work on an assigned Open or Assigned ticket; status changes to In Progress and history records the action.
- [ ] **ENG-04** — Attempt to start or modify work on a ticket assigned to another Engineer; access is denied.
- [ ] **ENG-05** — Open the ticket maintenance record and verify its checklist was cloned for this ticket/service, is initially unchecked, and can be completed without changing the master template or another ticket's checklist.
- [ ] **ENG-06** — Record parts used and labour hours; save and verify values persist on the assigned ticket.
- [ ] **ENG-07** — Record functional and safety checks and submit non-empty written feedback; feedback appears with author and timestamp, and a later feedback submission is retained as a separate entry.
- [ ] **ENG-08** — Attempt final submit with missing required checklist/maintenance fields or empty feedback; submission is rejected with the missing requirements identified.
- [ ] **ENG-09** — Final-submit a complete maintenance record; ticket changes to Awaiting Verification and the appropriate Manager/Super Admin users are notified.
- [ ] **ENG-10** — Upload up to 10 work/feedback images; valid images are optimized to WebP with a thumbnail (full image max 1600 px) and display to authorized viewers. Unsupported/mismatched file types, files over 15 MB, or more than 10 images are rejected.
- [ ] **ENG-11** — Attempt equipment-photo upload or work/feedback image upload for another Engineer's ticket; unauthorized upload is denied.
- [ ] **ENG-12** — Submit feedback containing unsafe HTML/script markup; stored/rendered feedback is sanitized and does not execute active content.

### Hour meter and requests

- [ ] **ENG-13** — Update the hour meter for permitted equipment; a new reading is recorded under the Engineer's account and the current value updates.
- [ ] **ENG-14** — Attempt to lower an hour-meter value; the update is rejected and history is unchanged.
- [ ] **ENG-15** — Run service-check where offered/authorized; meter update alone does not create PM work. Verify threshold-crossing tickets and due-date requirements match SA-EQP-12–15.
- [ ] **ENG-16** — Create a parts/equipment request on an assigned ticket with item, quantity, and reason; request is Pending and Biman Admin, Manager, and Super Admin receive the new-request notification.
- [ ] **ENG-17** — Attempt to create a request on a ticket not assigned to the Engineer; access is denied.
- [ ] **ENG-18** — While a linked request is pending or approved but not received, verify ticket shows Awaiting Parts where that workflow/state is enabled; verify the Engineer is notified of approval/rejection.

### Access restrictions

- [ ] **ENG-19** — Verify equipment types, equipment details, and unassigned tickets are read-only; user administration, equipment/type edits, ticket metadata edits, assignment, and ticket verification/closure are denied.
- [ ] **ENG-20** — Verify Engineer can view and update only their own notifications and change their own password.

## Biman Admin (Biman Bangladesh Airlines)

### Ticket creation and visibility

- [ ] **BA-01** — View equipment and tickets without edit access to equipment, specifications, photos, documents, or ticket metadata.
- [ ] **BA-02** — Create Breakdown, General, and Washing tickets and enter the required problem description and due date; ticket is recorded with the Biman Admin as creator.
- [ ] **BA-03** — Verify manual ticket creation does not offer PM services or `Others`.
- [ ] **BA-04** — Attempt to create/edit equipment, equipment types, user accounts, or ticket metadata, assign an Engineer, start work, or verify/close a ticket; each operation is denied.
- [ ] **BA-05** — Verify ticket status/history is visible for the created ticket, but only Manager/Super Admin can perform final verification and closure.

### Parts/equipment requests

- [ ] **BA-06** — View a new pending request and verify it is associated with the correct ticket, equipment, requester, item, quantity, and reason.
- [ ] **BA-07** — Approve a pending request; status, approver, and decision date are saved and the requesting Engineer is notified.
- [ ] **BA-08** — Reject a pending request; status, approver, and decision date are saved and the requesting Engineer is notified.
- [ ] **BA-09** — Mark an approved request as received; status updates to Received and the relevant ticket no longer waits for the unreceived item where that state is derived.
- [ ] **BA-10** — Attempt to approve/reject a request that is no longer Pending; the invalid transition is rejected.
- [ ] **BA-11** — Verify Biman Admin cannot create a parts/equipment request or change a request submitted by an Engineer, except for the specified approval/rejection/receipt actions.

### Access restrictions and notifications

- [ ] **BA-12** — Verify Biman Admin can view only notifications for their own account and can mark one/all as read.
- [ ] **BA-13** — Verify read-only equipment/ticket access does not expose private files outside the user's viewing permission; raw storage paths are not exposed.
- [ ] **BA-14** — Verify Biman Admin can change their own password but cannot access user administration or NGGL-only operational controls.

## Cross-role workflow checks

- [ ] **FLOW-01** — Super Admin/Manager creates a ticket or a Biman Admin creates a manual ticket; correct operational recipients are notified and ticket history identifies the creator.
- [ ] **FLOW-02** — Manager/Super Admin assigns an Engineer; only the assigned Engineer can start work and submit the maintenance record; unauthorized roles cannot impersonate the Engineer.
- [ ] **FLOW-03** — Engineer requests a part; Biman Admin approves/rejects and may mark it received; status changes and notifications are visible to the appropriate participants.
- [ ] **FLOW-04** — Engineer final-submits; Manager/Super Admin reviews and closes; ticket history, feedback, checklist, close date, and downtime are retained across roles.
- [ ] **FLOW-05** — Trigger a ticket status change/edit/close and verify the ticket creator, assigned Engineer, and Manager/Super Admin receive the notifications specified for that event.
- [ ] **FLOW-06** — Trigger hour-meter service crossing; verify Super Admin, Manager, and Biman Admin are notified, with no ticket created from the meter update until the explicit service-check runs.
- [ ] **FLOW-07** — Trigger a due V-Service schedule; verify the expected operational notification and linked ticket are created once.

## UAT sign-off

| Role | Tester | Date | Result | Open defects / notes |
|---|---|---|---|---|
| Super Admin |  |  |  |  |
| Manager |  |  |  |  |
| Engineer |  |  |  |  |
| Biman Admin |  |  |  |  |

### Specification points to confirm before execution

- The permission matrix allows Super Admin/Manager to create parts/equipment requests, while the detailed request workflow describes Engineers as the request creators. Confirm the intended UI behavior for operational users.
- `Completed` and `Closed` appear as separate lifecycle statuses, while the verification action is described as “Verify & close.” Confirm whether UAT should expect an intermediate Completed state or a direct transition to Closed.
- The ERD is explicitly approximate; validate user-facing behavior and business rules rather than requiring this exact schema.
