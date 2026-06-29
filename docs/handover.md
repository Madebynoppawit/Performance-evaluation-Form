# Project Handover — AMW Annual Performance Evaluation System

Thank you for the opportunity to build this system. This page is a plain-language summary of
**what you're receiving, what's ready, and the few things left to go fully live.**

---

## At a glance

| | |
|---|---|
| **What it is** | A web app that runs your annual employee performance reviews end-to-end |
| **Version** | `v1.4.6` |
| **Where it lives** | https://github.com/Madebynoppawit/Performance-evaluation-Form |
| **Handover date** | 2026-06-29 |
| **Status** | **Ready to demo today.** A short setup (server + passwords) takes it fully live. |

---

## What you're getting

A complete, ready-to-run system that lets your team:

- **Run reviews online** — goals, competencies, attendance, comments, salary, and sign-off,
  all in one form (tailored per job level).
- **Score fairly** — one simple **1–5 scale** everywhere, with clear rating descriptions.
- **Control who sees what** — separate access for Employees, Supervisors/Managers, Admin/HR,
  and Directors.
- **Calibrate and finalize** — HR can review and lock final grades before a cycle closes.
- **See the big picture** — dashboards, reports, and an audit trail for leadership.
- **Export anything** — polished PDF (Thai + English) and Excel/CSV.
- **Work in 3 languages** — Thai, English, French.
- **Load employees easily** — import the staff list from your **WinDev** export (CSV).

---

## Is it ready?

Yes. Everything has been built, tested, and checked:

| Check | Result |
|---|---|
| Automated tests (app logic + screens) | 360 passed, 0 failed |
| Robot test that clicks through the real UI | 139 passed |
| Automated build and security pipeline | Green (8 of 8) |
| Security scan — no real staff data or passwords in the code | Clean |
| Matches your HR form requirements | Complete |

In short: **no known problems.** You can demo it with confidence.

---

## To go fully live

These last steps need your company's server and decisions — each one is simple:

1. **Pick a server** and set up the database.
2. **Set the secret keys** (one command generates them) and the website address.
3. **Turn on auto-deploy** with one switch once the server is ready.
4. **Import your real employees** from the WinDev CSV export.
5. **Change the demo passwords** to real ones.

Step-by-step instructions are in the **Deploy Checklist** (linked below). Your technical person
can follow it top to bottom.

---

## Your data stays yours and safe

- **Real employee information is never stored in the code** — it lives only in your database.
- Staff are loaded from your **WinDev** system: export to CSV, then import on the
  *User / Data Management* page. Keep that CSV file private (it is real personal data).
- The system **refuses to start** in production with a weak password key or an open security
  setting — protecting you by default.

---

## Where to find things

| You want… | Look here |
|---|---|
| The whole system (code and history) | the GitHub link above |
| Demo login IDs and passwords | the file `backend/prisma/seed.cjs` (kept out of public view) |
| How to run and set it up | **Developer & Admin Guide** + **Deploy Checklist** (below) |
| Day-to-day operations and backups | **Operations Runbook** (below) |

---

## Keeping it healthy

- Your developer runs one command (`npm run verify`) before any change — it auto-checks everything.
- Rebuild the app images about once a month so security stays current (the setup does this for you).
- Recommended ongoing care: bug fixes, small features, and security updates
  (typically **15–20% of the build cost per year**).

Your team can continue the project anytime — start with the **Developer & Admin Guide**.

---

## Sign-off

| Confirmed at handover | |
|---|---|
| Full system delivered to GitHub | Yes |
| All tests and quality checks passing | Yes |
| Documentation complete | Yes |
| No real personal data or passwords in the code | Yes |
| Demo runs from a clean setup | Yes |
| Remaining go-live steps written down for you | Yes |

<br />

**Delivered by:** _________________________  **Date:** ______________

**Accepted by (AMW):** ____________________  **Date:** ______________

---

## More detail (for your technical team)

[Developer & Admin Guide](developer-guide.md) · [README](../README.md) ·
[Deploy Checklist](deploy-checklist.md) · [Operations Runbook](operations-runbook.md) ·
[API](api.md) · [Data Model](data-model.md) · [System Test Cases](system-test-cases.md) ·
[Production Readiness](production-readiness.md) · [Threat Model](threat-model.md) ·
[UX/UI Standards](ux-ui-standards.md)
