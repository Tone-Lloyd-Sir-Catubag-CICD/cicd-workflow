# CI/CD as a Service Implementation Plan (V2)

## Status Snapshot (Codebase Review)

### Workflow Engine (`cicd-workflow`)
- Catalog JSON files exist (`catalog/*.json`).
- Workflow refs pinned to `v1` in templates and workflow-templates.
- Release policy doc exists (`docs/workflow-release-policy.md`).
- Actionlint CI exists (`.github/workflows/workflow-validation.yml`).
- Example manifests and generated workflows exist (`examples/`).
- **Gap:** No compatibility matrix doc found.

### SaaS API (`cicd-saas-api`)
- Auth, accounts, billing, GitHub App integration implemented.
- Catalog, manifest validation, renderers, provisioning, workflow sync implemented.
- Existing repository onboarding and audit logging implemented.
- Prisma schema and tests present.
- **Gap:** Provisioning worker is implemented as a service but not wired to a long-running worker/queue process.

### SaaS Web
- No `cicd-saas-web` project found.
- Existing `cicd-workflow-fe`/`cicd-workflow-be` are templates, not the SaaS portal.

## Stopping Point

Implementation progressed through backend phases (API, provisioning, GitHub/Stripe, manifests, existing repo onboarding) but stopped before building the customer-facing SaaS portal and before wiring a background worker to process provisioning jobs continuously.

## V2 Plan (Focus on MVP Delivery)

### Phase A: Close Engine/Docs Gaps
1. Add a compatibility matrix doc in `cicd-workflow/docs/compatibility-matrix.md`.
2. Confirm `cicd-workflow/catalog/*.json` is the source of truth; decide whether the API should read these JSON files instead of embedding catalog data.

### Phase B: Provisioning Worker Runtime
1. Add a worker entrypoint in `cicd-saas-api` (separate Nest bootstrap or CLI) that calls `ProvisioningWorkerService.runNextJob()` on an interval.
2. Add worker health/metrics endpoints or logs suitable for deployment.
3. Document how to run the worker in development and production.

### Phase C: Build SaaS Web Portal (`cicd-saas-web`)
1. Scaffold a Next.js app (App Router) with shared layout and routing.
2. Auth pages:
   - Register and login against API.
   - Store session token and inject it into API calls.
3. Billing pages:
   - Pricing page.
   - Checkout session creation and redirect.
   - Customer portal link.
4. GitHub onboarding:
   - Install URL flow.
   - Callback handling + installation list.
5. Project wizard:
   - Stack selection, pipeline actions, branch strategy.
   - Draft save/resume.
   - Summary + required secrets/variables.
6. Provisioning:
   - Submit provisioning request.
   - Show job status and logs.
7. Projects dashboard:
   - Project list and detail.
   - Workflow runs table.
8. Existing repo onboarding:
   - Discovery step.
   - Generate setup PR.

### Phase D: End-to-End Validation
1. Playwright smoke path:
   - Register -> subscribe -> connect GitHub -> create project -> provision -> view status.
2. Environment docs for API, worker, and web deployment.

## Decisions to Confirm
- Where to host the SaaS web portal (new repo vs. inside this mono workspace).
- Auth token storage strategy (cookie vs. in-memory vs. local storage).
- Queue/worker strategy (simple polling vs. Redis-backed queue).

