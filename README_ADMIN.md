# OMOTECH Admin Pages README

This README explains your admin system end-to-end:
- what each admin page does
- what data each page reads/writes
- how data moves through all stages (from login to reports)

---

## 1) Admin Access, Roles, and Guardrails

### Authentication flow
- Admin login uses `/admin/login`.
- Credentials are sent to `/api/auth/admin-login` (or Google login via `/api/auth/google-login`).
- On success, token and user profile are stored in `localStorage` as `authToken` and `authUser`.
- Admin API calls use `Authorization: Bearer <token>`.

### Roles in your admin
- `superadmin`: broad access to most modules.
- `admin`: operational access to core modules + permission-based pages.
- `manager`: station-focused access (not full global control).
- `user`: not an admin panel role.

### Permission model
- Central permission helpers live in `lib/permissions.ts`.
- Navigation and page access are derived from role + `pagePermissions`.
- Core pages are generally available for admin roles; advanced pages are permission-based.

---

## 2) Admin Pages and What They Do

Below is what each major admin page does and the data it touches.

### `/admin` (overview hub)
- Purpose: landing page with shortcuts to all modules by role.
- Reads: current authenticated user from auth context.
- Writes: none (navigation only).

### `/admin/dashboard`
- Purpose: high-level business summary.
- Reads APIs: `/api/orders`, `/api/expenses`, `/api/services`.
- Typical outputs: totals, trends, quick status cards.

### `/admin/orders`
- Purpose: full order operations and payment linking.
- Reads APIs: `/api/orders`, `/api/admin/payments/pending`.
- Writes APIs:
  - single order status updates via `/api/orders/[id]`
  - bulk accept pending via `/api/admin/orders/accept-pending`
  - STK initiation via `/api/mpesa/initiate`
  - connect payment via `/api/admin/orders/connect-payment` and `/api/admin/mpesa-transactions/connect`
- Key data: order status lifecycle, pending/confirmed flow, station-linked visibility.

### `/admin/pos`
- Purpose: create orders at point of sale and trigger payment/SMS.
- Reads APIs: `/api/stations`, `/api/stations/my-station`, `/api/categories`.
- Writes APIs:
  - create order via `/api/orders`
  - initiate STK via `/api/mpesa/initiate`
  - send SMS via `/api/sms`
  - apply promotions via `/api/promotions/lock-in`
- Key data: customer details, cart/services, payment status, station context.

### `/admin/clients`
- Purpose: customer CRM and cleanup utilities.
- Reads APIs: `/api/customers`, `/api/orders`.
- Writes APIs:
  - create/update/import via `/api/customers` and `/api/customers/bulk-import`
  - sync via `/api/customers/sync`
  - repair phones via `/api/admin/repair-order-phones`
  - optional SMS via `/api/sms`
- Key data: customer profile, phone normalization, order history relationship.

### `/admin/services` (and `/admin/services-updated`)
- Purpose: service catalog and categories management.
- Reads APIs: `/api/services`, `/api/categories`, `/api/stations`.
- Writes APIs:
  - service CRUD via `/api/services`
  - category CRUD via `/api/categories`
  - media upload via `/api/upload`
  - bulk edits via `/api/services/bulk-update`

### `/admin/expenses`
- Purpose: expense tracking and station-based financial entries.
- Reads API: `/api/expenses`.
- Writes API: `/api/expenses`.
- Access behavior: creation is role-restricted; station assignment is validated server-side.

### `/admin/reports` (and `/admin/reports/test`)
- Purpose: consolidated analytics.
- Reads API: `/api/admin/reports`.
- Data sources joined in backend: orders, customers, expenses, promotions, M-Pesa transactions.
- Outputs: revenue metrics, status distributions, top customers, retention, expense splits.

### `/admin/mpesa-transactions`
- Purpose: monitor and reconcile mobile money transactions.
- Reads APIs: `/api/admin/mpesa-transactions`, `/api/orders`.
- Writes APIs: `/api/admin/mpesa-transactions/connect`, plus order connect helpers.
- Use case: attach unmatched payments to the correct order and clear pending states.

### `/admin/payments` and `/admin/payments/pending`
- Purpose: payment operations queue.
- Reads APIs: `/api/admin/payments`, `/api/admin/payments/pending`.
- Writes APIs: `/api/admin/payments/confirm`, `/api/admin/payments/reject`, exports via `/api/admin/payments/export`.

### `/admin/promotions`
- Purpose: discount lifecycle management.
- Reads/Writes API: `/api/promotions`.
- POS integration: active promotions can be locked-in to orders.

### `/admin/inventory`
- Purpose: stock item management.
- Reads APIs: `/api/inventory`, `/api/stations`.
- Writes API: `/api/inventory`.
- Used together with orders to support stock operations.

### `/admin/inventory-management`
- Purpose: advanced inventory controls and movement tracking.
- Reads APIs: `/api/inventory`, `/api/inventory/movements`, `/api/stations`.
- Writes API: `/api/inventory/adjust`.

### `/admin/stations`
- Purpose: branch/station setup and manager assignment.
- Reads APIs: `/api/stations`, `/api/stations/available-managers`.
- Writes APIs: `/api/stations`, `/api/stations/assign-manager`, `/api/stations/remove-manager`.
- Critical to: manager scoping in orders, POS, and expenses.

### `/admin/users`
- Purpose: role and permission governance.
- Writes APIs:
  - role updates (`promote`, `demote`) via user admin endpoints
  - account status/approval
  - granular page permissions
- Effect: controls what each admin can see/do in panel modules.

### `/admin/gallery`
- Purpose: media gallery content.
- Reads/Writes API: `/api/gallery`.
- Uploads via: `/api/upload`.

### `/admin/banners`
- Purpose: homepage/banner content management.
- Reads/Writes API: `/api/banners`.

### `/admin/testimonials`
- Purpose: testimonial moderation.
- Reads/Writes API: `/api/testimonials/admin`.

### `/admin/social-media`
- Purpose: footer/social links configuration.
- Reads/Writes API: `/api/social-media`.

### `/admin/mpesa-c2b`
- Purpose: C2B callback registration and diagnostics.
- Reads/Writes API: `/api/payments/c2b/register`.

### `/admin/login`, `/admin/signup`, `/admin/pending-approval`
- Purpose: admin account access lifecycle.
- APIs: admin login/signup/google signup and approval states.

---

## 3) Core Data Entities You Operate

Main models used by admin workflows:
- `User` (roles, approvals, permissions, station assignment)
- `Order` (customer data, services, totals, statuses, payment state)
- `Customer` (CRM profile, status, phone identity)
- `Expense` (category, amount, date, station/creator context)
- `Station` (branch metadata and manager mapping)
- `Service`, `Category` (sellable catalog)
- `Inventory`, `InventoryMovement` (stock and audit trail)
- `Promotion` (discount logic and lock-in)
- `MpesaTransaction`, `PaymentAuditLog` (payment telemetry and reconciliation)
- Content models: `Banner`, `SocialMedia`, `Testimonial`

---

## 4) Data Lifecycle Across All Stages

This is the full operational chain in your admin system.

### Stage A: Access and session bootstrap
1. Admin signs in.
2. JWT/token stored locally.
3. UI loads role/permission profile.
4. Navigation and actions are filtered by role + permissions.

### Stage B: Master data setup (before daily operations)
1. Configure stations and assign managers.
2. Configure service categories and services.
3. Maintain inventory and opening stock state.
4. Configure promotions, banners, gallery, testimonials, social links.

### Stage C: Order capture
1. Staff uses POS or Orders page to create/manage orders.
2. Customer phone is validated/normalized.
3. Order includes creator identity and station context.
4. Order starts in lifecycle states (often `pending` first).

### Stage D: Payment initiation and collection
1. STK push can be triggered with valid Kenyan mobile format.
2. Order payment status moves to pending/paid/partial/failure states based on callbacks/reconciliation.
3. Pending payments can be confirmed/rejected from payment admin queues.
4. Unmatched M-Pesa records can be connected to orders manually.

### Stage E: Fulfillment and status progression
1. Orders move through status transitions (`pending` -> `confirmed` -> processing/delivery states).
2. Bulk actions (e.g., accept all pending) accelerate queue management.
3. Station visibility and manager scope continue to apply.

### Stage F: Customer and communication layer
1. Customer records are created/updated from operational activity.
2. CRM pages allow sync, import, and data quality repair (phone fixes).
3. Optional SMS notifications are sent for key interactions.

### Stage G: Financial tracking
1. Expenses are captured with station/creator metadata.
2. Revenue and transaction data are continuously aggregated from orders + payments.
3. Payment audit routes preserve reconciliation history.

### Stage H: Analytics and business decisions
1. Reports API aggregates across orders/customers/expenses/promotions/payments.
2. Outputs include revenue trends, status split, top/repeat customers, category breakdowns.
3. Leadership can compare station performance and identify bottlenecks.

---

## 5) Practical Notes for Operating Safely

- Keep station assignments accurate; many manager operations depend on them.
- Normalize customer phones consistently to avoid payment and SMS mismatch.
- Reconcile pending/unmatched M-Pesa entries daily to keep reports clean.
- Use permissioned roles instead of sharing superadmin credentials.
- Review expense and order data quality before month-end reporting.

---

## 6) Suggested Future Enhancements

- Add a dedicated admin API index endpoint for auto-generated internal docs.
- Add structured audit logging for role/permission changes.
- Add per-stage health dashboard (pending orders, unmatched payments, station gaps).
- Add weekly data quality checks (invalid phones, orphan orders, missing station links).

---

If you want, I can also generate:
- a non-technical version for staff training, and
- a technical version with endpoint-by-endpoint request/response contracts.
