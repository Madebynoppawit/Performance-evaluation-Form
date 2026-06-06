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

## Observability

- Configure `SENTRY_DSN` or an equivalent APM sink.
- Dashboard these signals: readiness, 5xx rate, auth failures, export count, p95 latency, DB availability.
- Correlate logs and audit events by `requestId`.

## UX Quality Gates

- Keep Playwright E2E in CI.
- Add visual snapshots only for stable core flows: dashboard, evaluations table, export menu, evaluation form.
- Treat horizontal overflow, critical accessibility findings, or failed export downloads as release blockers.
