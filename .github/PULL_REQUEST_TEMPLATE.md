## Summary

Describe what changed and why.

## Release Flavor

- [ ] Standard/no-AI behavior verified
- [ ] AI Preview behavior verified or not affected
- [ ] Release metadata/version impact considered

## Scope

- [ ] Frontend/UI
- [ ] Backend/API
- [ ] Database/Prisma
- [ ] Security/RBAC/audit
- [ ] Documentation/GitHub

## Validation

- [ ] `npm run lint`
- [ ] `npm test`
- [ ] `npm run test:e2e -w frontend`
- [ ] `npm run build`
- [ ] `npm audit --audit-level=high`

## Security Checklist

- [ ] No secrets, tokens, credentials, or private URLs committed
- [ ] Sensitive HR/salary data remains role-scoped
- [ ] New/changed mutating endpoints are audited
- [ ] API responses avoid leaking internal errors
- [ ] AI Preview changes do not send PII/salary data without explicit approval and audit logging

## Screenshots / Evidence

Attach UI screenshots, Swagger evidence, logs, or test output where relevant.
