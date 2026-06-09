# AS/400 (Db2 for i) Integration — Design & Decision Notes

> Context: the company's system of record runs on **IBM AS/400 (IBM i)**, whose
> database is **Db2 for i**. This app currently uses **PostgreSQL via Prisma**.
> Prisma does **not** support Db2 for i, so connecting is an architecture
> decision, not a connection-string change.

## TL;DR — Recommendation

**Integrate, don't migrate (Option A).** Treat AS/400 as the **authoritative
source of employee / org master data** (people, departments, positions,
manager hierarchy). Keep the app's own database (PostgreSQL) as the system of
record for the **evaluation workflow** (cycles, scores, comments, sign-offs,
audit).

Wire it through a **ports-and-adapters seam** so the app depends on an
*interface* (`EmployeeDirectory`), not on AS/400 directly. Today that interface
is backed by Postgres; later it is backed by AS/400 — a localized change, no
rewrite.

```
                         ┌─────────────────────────────┐
   app services  ──────► │  EmployeeDirectory (port)   │
   (eval workflow)       └─────────────┬───────────────┘
                                       │  (one adapter, chosen by env)
                 ┌─────────────────────┼─────────────────────┐
                 ▼                     ▼                       ▼
        PrismaDirectory        As400OdbcDirectory      As400ApiDirectory
        (current / dev)        (direct Db2 for i)      (company REST/SP)
```

Evaluation data stays in Postgres; **employees are read (or synced) from
AS/400**. This matches the access model we already built ("admin/dev manage
accounts") — those accounts become a **projection/sync of AS/400 employees**.

## Why not full migration (Option B)?

Moving every table to Db2 for i means **dropping Prisma** and rewriting the
entire data layer in raw SQL (Db2 dialect), re-doing migrations as native
DDL/journaling on the iSeries, and losing type-safe queries + the existing
test suite's DB story. It's weeks of work, needs live Db2 access to even
develop, and couples a green-field app to a legacy box. Only do this if the
company **mandates** that all data physically live in Db2 for i.

## Integration mechanism — decide AFTER IT answers

| Option | How | Pros | Cons |
|---|---|---|---|
| **Direct ODBC** | Node `odbc` pkg + IBM i Access ODBC driver → Db2 for i | Full SQL, lowest latency | Needs DB credentials + network to the iSeries; couples to schema |
| **Company API/SP** | iSeries team exposes REST / stored procedures | Decoupled, IT controls access & security | Depends on what they expose; possible latency |
| **`idb-connector`** | IBM's native Node driver | Fastest | Runs **on** the IBM i (PASE) only — not for a separate app host |

We can't choose until IT answers the questionnaire below.

## Live-read vs Sync

- **Live read** (every request asks AS/400): always fresh, but couples uptime
  to the iSeries and adds latency.
- **Scheduled sync** (pull AS/400 employees into our DB every N hours / on a
  hook): resilient, fast reads, works offline; data is eventually consistent.

**Recommended: scheduled sync + on-demand refresh.** Employees rarely change
mid-day; the app stays fast and keeps working if the iSeries is briefly down.

---

## 📋 Questions to ask the IBM i / IT team (the unblocker)

Copy/paste this to IT:

**Access & connectivity**
1. Can we get **direct database access** to Db2 for i (ODBC/JDBC), or must we go
   through an **API / stored procedure** you provide?
2. If direct: host/IP, port, and which **ODBC driver** (IBM i Access Client
   Solutions?). Is there a **read-only service account** we can use?
3. Network path: is the iSeries reachable from where the app will run (cloud /
   on-prem / VPN)? Any firewall rules needed?

**Data / schema**
4. Which **library/schema** and **tables** hold employees, departments,
   positions, and the manager hierarchy? (table + key column names)
5. What is the **employee key** (badge/emp no.) and does it map to a login?
6. Character encoding (CCSID / EBCDIC fields?) and date/time formats.
7. Are there existing **views or stored procedures** for "active employees" we
   should use instead of raw tables?

**Auth / identity**
8. Should login authenticate against AS/400 (LDAP / iSeries user profiles), or
   keep app-managed passwords with employee identity sourced from AS/400?
9. Is there an **employee email** field (we use `@company` emails for login)?

**Ops & policy**
10. Read-only, or do we ever **write back** to AS/400? (Recommend read-only.)
11. Acceptable **sync frequency** / load limits on the iSeries.
12. Db2 for i **version** and whether SQL (vs native/record-level) access is OK.

---

## Phased plan

- **Phase 0 (now, no AS/400 access needed):** introduce the `EmployeeDirectory`
  port + a `PrismaDirectory` adapter (current behavior) + an env switch
  `EMPLOYEE_SOURCE`. App is "AS/400-ready" with zero behavior change.
- **Phase 1 (after IT answers):** implement the chosen adapter
  (`As400OdbcDirectory` or `As400ApiDirectory`) against a **sandbox**; map
  fields; handle CCSID/dates.
- **Phase 2:** scheduled **sync** job (AS/400 → app DB) + on-demand refresh;
  reconcile with app accounts.
- **Phase 3 (optional):** authenticate against iSeries identities if required.

## What can be built without AS/400 access

- The port + Prisma adapter + env switch (Phase 0).
- A typed **DTO/contract** for an employee record (the shape both adapters
  return), validated with Zod.
- A **mock As400 adapter** (fixture data) so the sync job and UI can be built
  and tested end-to-end before real access exists.

## What needs AS/400 access

- Real ODBC/API adapter, field mapping, CCSID/date handling, performance tuning,
  and the production sync schedule.
