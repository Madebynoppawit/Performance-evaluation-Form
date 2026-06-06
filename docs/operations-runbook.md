# Operations Runbook

## Daily Checks

- Confirm `/api/ready` returns `status=ok`.
- Review 5xx errors and auth failure spikes.
- Review audit logs for unusual export, user-management, or cycle-status activity.
- Confirm dependency and secret scan jobs are green.

## Deployment

1. Run `npm run verify`.
2. Run `npm run test:integration -w backend` against staging.
3. Apply database migrations with `npm run db:deploy -w backend`.
4. Deploy backend.
5. Wait for `/api/ready` to return `ok`.
6. Deploy frontend.
7. Smoke test login, dashboard, evaluation open, CSV export, PDF export, and report summary.

## Rollback

1. Stop frontend rollout first.
2. Roll backend to the previous known-good artifact.
3. If a migration is involved, follow the migration rollback note for that release.
4. Verify `/api/ready`.
5. Search logs for the incident `requestId` and affected actor.

## Incident Triage

- Capture time range, environment, request id, actor, route, and status.
- Check `/api/ready` for dependency health.
- Check recent deploys and migrations.
- Search audit logs for mutating requests around the incident.
- For suspected data exposure, preserve logs and disable affected credentials before remediation.

## Backup And Restore

- Backups must be encrypted.
- Restore drills should run at least quarterly.
- A restore is not complete until login, evaluation list, evaluation detail, and export flows are verified.

## Export Governance

- CSV/PDF exports are confidential HR records.
- Employee exports must not include salary and bonus data.
- Admin and manager exports may include salary data only for legitimate HR workflow.
- Export activity should be retained in centralized audit logs.
