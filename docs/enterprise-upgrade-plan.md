# Enterprise Upgrade Plan

This plan covers the remaining external integrations required for a billion-baht production posture.

## Identity

- Replace local password auth with Microsoft Entra ID SSO for production users.
- Keep local auth only for emergency break-glass accounts and local development.
- Map IdP groups to `ADMIN`, `MANAGER`, and `EMPLOYEE` roles.
- Require MFA and conditional access in the IdP, not inside the app.

## Audit And Compliance

- Apply the `AuditEvent` migration before rollout.
- Retain audit records according to HR/legal policy.
- Alert on high-risk events: repeated failed login, bulk export, salary export, role-management changes.
- Review admin/manager access monthly.

## PDF Export

- Add `frontend/public/fonts/AMW-Report-Regular.ttf` before production deployment.
- Use an approved Unicode font such as Noto Sans Thai, IBM Plex Sans Thai, or Sarabun.
- Validate Thai, English, and French sample exports before release.

## Manager Form Alignment

Manager-provided PDFs received on 2026-06-08 add detail beyond the first annual form draft. Treat this as the source for the next form-alignment pass.

### Already Covered

- Core competency is represented as CC1 to CC4.
- Manager/director roles include MC1 and MC2.
- Evaluation rating scale uses 1 to 5 with Role Model, Exceeds Expectation, Meets Expectation, Needs Improvement, and Unsatisfactory.
- Attendance currently captures leave, late, and disciplinary level.

### Required Updates

- Align attendance late scoring. The newer combined sample uses:
  - Score 5: 1 to 3 times
  - Score 4: 4 to 5 times
  - Score 3: 6 to 7 times
  - Score 2: 8 to 9 times
  - Score 1: 10 or more times
- Keep leave scoring as:
  - Score 5: never / 0 days
  - Score 4: 1 to 2 days
  - Score 3: 3 to 4 days
  - Score 2: 5 to 6 days
  - Score 1: 7 or more days
- Clarify disciplinary scoring because the examples keep scores 5 to 3 as "No Warning" and score 2 as verbal/written warning once.
- Add training score support:
  - Manager minimum: 12 hours/year
  - Officer minimum: 10 hours/year
  - Blue collar minimum: 8 hours/year
  - Score bands: >=130%, 110-129%, 100-109%, 70-99%, <70% of minimum hours
- Add WIG/KPI alignment metadata for goal entries:
  - WIG-1 Customer Focus
  - WIG-2 People our Asset
  - WIG-3 Profit / Revenue / Company Result
- Add job-specific technical competency by position group:
  - Manager and up: planning, budgeting, cost control, project/risk/performance management, lean, stakeholders, data, resource planning, governance.
  - Non-manager/officer: technical knowledge, tools, process accuracy, documentation, data, SLA, problem solving, cross-functional coordination, quality awareness, 5S.
  - Supervisor: work planning, line balancing, quality, safety, OEE, maintenance coordination, RCA, coaching, production reporting.
  - Staff: job skill, machine operation, work instruction, quality checking, defect awareness, basic problem identification, tool usage, 5S, multi-skill readiness.

### Open Decision

There are two attendance examples with different late thresholds. Use the combined competency/attendance/training sample as the candidate standard unless HR confirms the older `6/8/10/12/>14` late threshold is still official.

## Observability

- Configure `SENTRY_DSN` or an equivalent APM sink.
- Dashboard these signals: readiness, 5xx rate, auth failures, export count, p95 latency, DB availability.
- Correlate logs and audit events by `requestId`.

## UX Quality Gates

- Keep Playwright E2E in CI.
- Add visual snapshots only for stable core flows: dashboard, evaluations table, export menu, evaluation form.
- Treat horizontal overflow, critical accessibility findings, or failed export downloads as release blockers.
