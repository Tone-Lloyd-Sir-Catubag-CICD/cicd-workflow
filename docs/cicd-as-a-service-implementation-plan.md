# CI/CD as a Service Implementation Plan

## Short Answer

Yes, this is possible.

The product should be built as a SaaS control plane around the existing reusable workflow repo. Customers register, subscribe, connect GitHub, choose a project stack and CI/CD capabilities, then the platform provisions a GitHub repository with the right starter code, workflow files, secrets/variables checklist, and branch policy. The current `cicd-workflow` repo already contains much of the CI engine. What is missing is the SaaS application layer: accounts, billing, project wizard, GitHub App integration, workflow manifest generation, provisioning jobs, and status monitoring.

The safest architecture is not to let the frontend directly create repositories or write workflows. The frontend should collect choices. A backend control plane validates subscription access, converts choices into a pipeline manifest, then uses a GitHub App installation token to create/configure the customer's repository.

## Current Codebase Fit

This workspace already has three useful pieces:

- `cicd-workflow`: central reusable GitHub Actions platform.
- `cicd-workflow-be`: NestJS backend template and example consumer.
- `cicd-workflow-fe`: Next.js frontend template and example consumer.

What exists today is closer to a workflow-template platform than a SaaS. It can be turned into CI/CD as a Service by adding:

- SaaS portal frontend.
- SaaS backend API.
- Persistent database.
- Stripe subscription billing.
- GitHub OAuth/GitHub App installation.
- Project generator and provisioner.
- Template catalog and workflow manifest model.
- Job queue for long-running provisioning.
- Dashboard for provisioned projects and pipeline runs.

## External Feasibility Notes

GitHub supports the key operations needed:

- Create repositories through the REST API.
- Create repositories from templates.
- Use GitHub App installation tokens for authenticated API calls.
- Scope installation tokens to repositories and permissions.
- Request repository administration, contents, actions, secrets, variables, checks, and workflow permissions as needed.

Stripe supports the subscription flow needed:

- Create Checkout Sessions in subscription mode.
- Receive `checkout.session.completed` webhooks.
- Provision feature access from subscription events or entitlements.
- Use the customer portal for plan changes, cancellations, and billing updates.

Sources:

- GitHub repository API: https://docs.github.com/en/rest/repos/repos
- GitHub Apps installation tokens: https://docs.github.com/en/rest/apps/apps
- Stripe Checkout subscriptions: https://docs.stripe.com/payments/checkout/build-subscriptions
- Stripe subscription entitlements: https://docs.stripe.com/billing/subscriptions/build-subscriptions

## Product Goal

Build a self-service CI/CD platform where a user can:

1. Visit the landing page.
2. Register or sign in.
3. Subscribe to a plan.
4. Connect GitHub.
5. Choose project type, language, framework, deployment provider, and testing/security actions.
6. Generate a new GitHub repository.
7. Receive a working starter project with the selected pipeline.
8. See pipeline status, setup gaps, and next steps from the portal.

## Recommended Architecture

### High-Level Components

```text
User
  -> Next.js SaaS Portal
    -> NestJS SaaS API
      -> Database
      -> Stripe
      -> GitHub App API
      -> Provisioning Worker
        -> GitHub repository
        -> Generated workflow files
        -> Generated project template
        -> Branch protection and repo settings
        -> Optional provider setup checklist
```

### Repo Strategy

Use four logical repositories over time:

1. `cicd-workflow`
   - Keep this as the central reusable workflow platform.
   - Stores `.github/workflows/*.yml`, workflow templates, GitHub Actions metadata, and documentation.

2. `cicd-saas-api`
   - New backend control plane.
   - NestJS, Postgres/Supabase, Stripe webhooks, GitHub App integration, provisioning worker.

3. `cicd-saas-web`
   - New customer portal.
   - Next.js landing page, pricing, onboarding wizard, project dashboard, billing portal link.

4. Template repositories or template folders
   - Either separate GitHub template repositories per stack, or template folders in the backend that are pushed into new repos.
   - Recommended first version: use GitHub template repositories for each starter stack, then patch generated workflow files after creation.

The current `cicd-workflow-fe` and `cicd-workflow-be` can be converted into starter templates, but they should not be the SaaS portal/API directly unless you intentionally rename and reshape them.

## Core User Flow

### Flow 1: Visitor to Subscriber

1. User lands on marketing page.
2. User clicks `Start building`.
3. User registers with email/password or GitHub OAuth.
4. User chooses a plan.
5. Frontend creates a Stripe Checkout Session through backend.
6. User completes payment in Stripe Checkout.
7. Stripe sends webhook to backend.
8. Backend marks organization/account subscription as active.
9. User is redirected to onboarding.

### Flow 2: GitHub Connection

1. User clicks `Connect GitHub`.
2. User installs the CI/CD SaaS GitHub App into their personal account or organization.
3. GitHub redirects back with installation information.
4. Backend stores:
   - GitHub account owner.
   - Installation ID.
   - Allowed organizations.
   - Installation status.
5. Backend does not store long-lived GitHub user tokens for provisioning. It creates short-lived installation tokens when needed.

### Flow 3: Project Wizard

1. User selects target GitHub owner.
2. User enters repository name and visibility.
3. User selects stack:
   - Frontend: React, Next.js.
   - Backend: Node.js, NestJS.
   - Mobile: React Native, Expo, Android Kotlin.
4. User selects project structure:
   - Single service.
   - Multi-service monorepo.
5. User selects CI/CD capabilities:
   - Install dependencies.
   - Lint.
   - Typecheck.
   - Unit tests.
   - Integration tests.
   - E2E tests.
   - k6 performance tests.
   - SonarCloud scan.
   - Docker build.
   - Trivy scan.
   - Deploy to Vercel.
   - Deploy to Render.
   - Auto-promotion PRs.
   - Version tags.
   - Production approval gate.
6. User sees generated summary:
   - Files that will be created.
   - GitHub variables/secrets required.
   - Monthly plan feature usage.
7. User clicks `Create project`.

### Flow 4: Provisioning

1. Backend creates a provisioning job.
2. Worker obtains a GitHub App installation token.
3. Worker creates repository from the chosen template.
4. Worker writes generated workflow files.
5. Worker writes config files:
   - `cicd.config.json`
   - `README.md`
   - `.github/workflows/<pipeline>.yml`
   - Optional `tests/e2e/*`
   - Optional `tests/performance/*`
6. Worker creates branches:
   - `test`
   - `uat`
   - `main`
7. Worker configures repository variables where possible.
8. Worker records required manual secrets that cannot be known by the platform.
9. Worker optionally creates environments:
   - `test`
   - `uat`
   - `production`
10. Worker optionally configures branch protection.
11. Worker triggers the first workflow run or leaves instructions if GitHub requires user-owned secret setup first.
12. Dashboard shows status and next steps.

## MVP Scope

The MVP should not try to automate every external provider on day one. It should prove the full loop for a narrow but real path.

### MVP Must Have

- Landing page.
- Authentication.
- Stripe subscription.
- GitHub App installation.
- Project wizard.
- Next.js project generation.
- NestJS project generation.
- GitHub repository creation.
- Workflow caller generation.
- Required secrets/variables checklist.
- Project dashboard.
- Provisioning job status.
- Basic run status links to GitHub Actions.

### MVP Should Avoid

- Full SonarCloud project creation automation.
- Full Vercel/Render account automation.
- Complex marketplace billing.
- Self-hosted runners.
- Bring-your-own-existing-repo migration.
- Multi-cloud deploy abstraction.
- Enterprise SSO.

Those can be added after the primary provisioning loop works.

## Subscription Model

### Suggested Plans

#### Free Trial

- 1 project.
- Public repository only.
- Basic workflow: install, lint, test, build.
- No auto-promotion.
- No deploy automation.

#### Starter

- 3 projects.
- Private repositories.
- Frontend/backend templates.
- Unit tests, lint, build.
- Basic dashboard.

#### Pro

- 10 projects.
- E2E tests.
- k6 tests.
- Docker build.
- Deploy caller workflows.
- Auto-promotion PRs.
- Version tags.

#### Team

- 25+ projects.
- Organization installs.
- Branch protection.
- Production approval gates.
- Multi-service monorepos.
- Audit log.

### Feature Gating

Store feature access in your own database even if you use Stripe entitlements. Stripe is the source for billing events; your database is the source for fast application authorization.

Example feature flags:

```json
{
  "maxProjects": 10,
  "privateRepos": true,
  "stacks": ["nextjs", "react", "nestjs", "nodejs"],
  "actions": ["lint", "typecheck", "unit", "build", "e2e", "k6", "docker", "deploy"],
  "autoPromotion": true,
  "branchProtection": true,
  "teamMembers": 5
}
```

## GitHub App Design

### Required Permissions

Start with the minimum that can provision repositories:

- Repository administration: write.
- Repository contents: write.
- Actions: write.
- Workflows: write, if GitHub separates this in the selected permission UI.
- Metadata: read.
- Secrets: write, if managing Actions secrets through GitHub APIs.
- Variables: write, if managing Actions variables.
- Checks: read.
- Deployments: write, only when deploy status integration is needed.

Avoid requesting organization-wide admin permissions unless the feature requires it.

### GitHub App Events

Subscribe to:

- Installation created/deleted/suspended.
- Repository events.
- Workflow run events.
- Check suite/check run events.

### GitHub Integration Data

Persist:

```text
github_installations
- id
- account_id
- installation_id
- github_account_login
- github_account_type
- permissions_json
- suspended_at
- created_at
- updated_at
```

Do not persist installation tokens. They expire and should be created on demand.

## Workflow Generation Model

The wizard should not directly assemble YAML by string concatenation. Use a typed manifest and deterministic renderers.

### Example Manifest

```json
{
  "project": {
    "name": "student-portal",
    "visibility": "private",
    "repoOwner": "acme-school"
  },
  "stack": {
    "type": "frontend",
    "framework": "nextjs",
    "nodeVersion": "22",
    "packageManager": "npm"
  },
  "pipeline": {
    "branches": ["test", "uat", "main"],
    "quality": {
      "lint": true,
      "typecheck": true,
      "unitTests": true,
      "coverageThreshold": 80,
      "build": true
    },
    "advanced": {
      "playwright": true,
      "k6": false,
      "sonarcloud": false,
      "docker": false,
      "autoPromotion": true,
      "productionGate": true
    },
    "deployment": {
      "provider": "vercel",
      "enabled": true
    }
  }
}
```

### Generated Output

For a frontend project:

```text
.github/workflows/master-pipeline-fe.yml
cicd.config.json
tests/unit/sanity.test.ts
tests/e2e/playwright-e2e.ts
tests/performance/k6-smoke.ts
README.md
```

For a backend project:

```text
.github/workflows/master-pipeline-be.yml
cicd.config.json
tests/e2e/app.e2e-spec.ts
tests/performance/smoke.js
README.md
Dockerfile
```

## Backend Control Plane Plan

### Suggested Stack

- NestJS.
- PostgreSQL or Supabase Postgres.
- Prisma or TypeORM. Prisma is recommended for speed and type safety.
- BullMQ or a database-backed job queue.
- Stripe SDK.
- Octokit for GitHub API calls.
- Zod or class-validator for request validation.

### Backend Modules

```text
src/auth/
  Handles user sessions, JWT/cookies, password or OAuth sign-in.

src/accounts/
  Customer account and team ownership.

src/billing/
  Stripe checkout, webhooks, subscription state, plan features.

src/github/
  GitHub App install callback, installation token creation, GitHub API wrapper.

src/catalog/
  Supported stacks, actions, tests, templates, deployment providers.

src/projects/
  Project records, wizard draft, generated manifest, dashboard.

src/provisioning/
  Provisioning jobs, repository creation, workflow generation, status tracking.

src/workflows/
  GitHub workflow run status sync and dashboard summaries.

src/audit/
  Records who created projects, changed config, installed GitHub, ran provisioning.
```

### API Endpoints

```text
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
GET  /api/me

POST /api/billing/checkout-session
POST /api/billing/webhook
POST /api/billing/customer-portal
GET  /api/billing/subscription

GET  /api/github/install-url
GET  /api/github/callback
GET  /api/github/installations
GET  /api/github/owners

GET  /api/catalog/stacks
GET  /api/catalog/actions
GET  /api/catalog/templates
GET  /api/catalog/deployment-providers

POST /api/projects/drafts
PATCH /api/projects/drafts/:id
POST /api/projects/drafts/:id/validate
POST /api/projects/drafts/:id/provision
GET  /api/projects
GET  /api/projects/:id
GET  /api/projects/:id/provisioning-jobs
GET  /api/projects/:id/workflow-runs
```

### Database Model

```text
users
- id
- email
- password_hash
- name
- created_at

accounts
- id
- name
- owner_user_id
- created_at

account_members
- account_id
- user_id
- role
- created_at

subscriptions
- id
- account_id
- stripe_customer_id
- stripe_subscription_id
- plan_key
- status
- current_period_end
- features_json
- created_at
- updated_at

github_installations
- id
- account_id
- installation_id
- github_account_login
- github_account_type
- permissions_json
- suspended_at
- created_at
- updated_at

project_drafts
- id
- account_id
- created_by_user_id
- name
- repo_owner
- repo_name
- visibility
- stack_json
- pipeline_json
- validation_json
- status
- created_at
- updated_at

projects
- id
- account_id
- github_installation_id
- name
- repo_owner
- repo_name
- repo_url
- default_branch
- stack_key
- manifest_json
- status
- created_at
- updated_at

provisioning_jobs
- id
- project_draft_id
- project_id
- status
- current_step
- error_code
- error_message
- logs_json
- started_at
- completed_at
- created_at

workflow_runs
- id
- project_id
- github_run_id
- workflow_name
- branch
- status
- conclusion
- html_url
- started_at
- completed_at
- synced_at

audit_events
- id
- account_id
- user_id
- event_type
- subject_type
- subject_id
- metadata_json
- created_at
```

## Frontend Portal Plan

### Pages

```text
/
  Landing page, value proposition, examples, CTA.

/pricing
  Plans, feature comparison, subscribe buttons.

/login
/register
  Authentication.

/billing/return
  Stripe return page.

/app
  Dashboard home.

/app/onboarding
  Connect GitHub and subscription checks.

/app/projects
  List projects.

/app/projects/new
  Project wizard.

/app/projects/:id
  Project status, repo link, workflow run summary, required secrets.

/app/settings/billing
  Current plan, portal link.

/app/settings/github
  Installations and reconnect flow.
```

### Wizard Steps

1. Repository
   - Owner.
   - Name.
   - Private/public.
   - Description.

2. Stack
   - Frontend/backend/mobile.
   - Framework/language.
   - Package manager.
   - Node/runtime version.

3. Quality Gates
   - Lint.
   - Typecheck.
   - Unit tests.
   - Coverage threshold.
   - Build.

4. Advanced Checks
   - Playwright.
   - k6.
   - SonarCloud.
   - Docker.
   - Trivy.

5. Deployment
   - None.
   - Vercel.
   - Render.
   - Manual deploy commands.

6. Promotion Policy
   - Branches.
   - Auto PR from `test` to `uat`.
   - Auto PR from `uat` to `main`.
   - Production approval gate.

7. Review
   - Generated files.
   - Required secrets.
   - Plan limits.
   - Create button.

### UI Rules

- Do not expose raw YAML in the primary wizard.
- Show a human-readable pipeline summary.
- Provide an advanced tab where users can preview generated workflow YAML.
- Every paid/locked capability should show why it is locked and which plan unlocks it.
- Every external secret should show exact provider instructions.

## Provisioning Details

### Provisioning Steps

```text
queued
  -> validate_subscription
  -> validate_github_installation
  -> validate_repo_name_available
  -> create_repository_from_template
  -> generate_manifest
  -> render_workflow
  -> commit_generated_files
  -> create_branches
  -> configure_variables
  -> configure_environments
  -> configure_branch_protection
  -> trigger_initial_workflow
  -> completed
```

### Failure Handling

Each step must be idempotent. If a job fails halfway through:

- Repository already created: continue instead of creating a duplicate.
- File already committed: compare content before rewriting.
- Branch exists: skip creation.
- Variable exists: update it if generated by the platform.
- Secret missing: record manual action instead of failing unless it is required for first run.

### Job Status States

```text
queued
running
waiting_for_user
succeeded
failed_retryable
failed_terminal
cancelled
```

### Common User-Action Blocks

- GitHub App missing required permissions.
- Repository name already exists.
- Plan does not allow private repositories.
- Plan does not allow selected feature.
- Vercel project ID secret missing.
- Render deploy hook missing.
- SonarCloud token missing.

## Template Strategy

### Option A: GitHub Template Repositories

Recommended for MVP.

Pros:

- Fast to build.
- Native GitHub support.
- Easy to inspect generated repos.
- Good for starter projects.

Cons:

- Harder to deeply customize before creation.
- Requires post-generation commits for exact workflow choices.

### Option B: Backend File Renderer

Pros:

- Fully dynamic.
- Can generate only selected files.
- Easier to support arbitrary combinations.

Cons:

- More code to maintain.
- Easier to accidentally produce broken projects.

### Option C: Hybrid

Recommended long term.

- Use template repositories for baseline language/framework structure.
- Use backend renderers for workflows, config, tests, and docs.

## Workflow Catalog

Represent every selectable action as catalog data.

```json
{
  "key": "playwright",
  "label": "Playwright E2E",
  "category": "testing",
  "supportedStacks": ["react", "nextjs"],
  "requiresFiles": ["tests/e2e/playwright-e2e.ts"],
  "requiresSecrets": [],
  "requiresVariables": ["E2E_BASE_URL"],
  "plan": "pro"
}
```

Initial catalog:

```text
quality.lint
quality.typecheck
quality.unit_tests
quality.coverage
quality.build
security.npm_audit
security.license_check
security.trivy
analysis.sonarcloud
testing.playwright
testing.k6
package.docker
deploy.vercel
deploy.render
release.version_tags
promotion.auto_pr
governance.production_gate
```

## Generated Workflow Direction

Do not create a unique fully expanded workflow for every user. Generate thin caller workflows that invoke the central reusable workflows.

Example:

```yaml
name: "CI/CD Pipeline"

on:
  push:
    branches: [test, uat, main]
  pull_request:
    branches: [test, uat, main]
  workflow_dispatch:

permissions:
  contents: write
  pull-requests: write
  packages: write
  security-events: write

jobs:
  pipeline:
    uses: Tone-Lloyd-Sir-Catubag-CICD/cicd-workflow/.github/workflows/master-pipeline-fe.yml@v1
    with:
      pipeline_mode: single
      enable_playwright: true
      enable_grafana_k6: false
      run_deploy: true
      run_promotion: true
      dry_run: false
    secrets: inherit
```

Important: publish stable tags like `v1`, `v1.1`, `v2`. Do not generate customer workflows pinned to `@main` once this becomes a product.

## Implementation Phases

### Phase 0: Stabilize Current Workflow Platform

Goal: make the current workflow repo product-ready before building SaaS around it.

Tasks:

1. Rename stale docs from `ImplementSprint/central-workflow` to the actual platform repo or introduce a config variable in docs.
2. Create release tag `v1` for stable reusable workflows.
3. Update caller templates to reference `Tone-Lloyd-Sir-Catubag-CICD/cicd-workflow@v1`.
4. Validate backend caller and frontend caller against local example repos.
5. Add a machine-readable workflow catalog file:
   - `catalog/stacks.json`
   - `catalog/actions.json`
   - `catalog/templates.json`
6. Add example generated manifests.
7. Add actionlint validation in CI.
8. Add a compatibility matrix doc.

Deliverable:

- Current CI workflow platform can be treated as a stable engine.

### Phase 1: SaaS Backend Foundation

Goal: create the API that owns users, accounts, subscriptions, GitHub installs, project drafts, and provisioning records.

Tasks:

1. Create new NestJS app.
2. Add database.
3. Add auth.
4. Add account model.
5. Add subscription model.
6. Add project draft model.
7. Add project model.
8. Add provisioning job model.
9. Add API validation.
10. Add OpenAPI docs.
11. Add unit and integration tests.

Deliverable:

- Backend can create users, accounts, project drafts, and return catalog data.

### Phase 2: Billing

Goal: users can subscribe and unlock plan-gated features.

Tasks:

1. Create Stripe products and prices.
2. Add checkout-session endpoint.
3. Add billing webhook endpoint.
4. Verify webhook signatures.
5. Handle subscription created, updated, cancelled, and payment failed events.
6. Persist subscription status.
7. Map plans to feature flags.
8. Add customer portal endpoint.
9. Add tests for plan access checks.

Deliverable:

- Backend can enforce whether a user can create projects and choose paid capabilities.

### Phase 3: GitHub App Integration

Goal: users can install the GitHub App and the backend can create installation tokens.

Tasks:

1. Create GitHub App.
2. Configure callback URL.
3. Configure webhook URL.
4. Configure required permissions.
5. Add install URL endpoint.
6. Add callback handler.
7. Store installation records.
8. Add JWT signing for GitHub App authentication.
9. Add installation token factory.
10. Add API wrapper for repository operations.
11. Add webhook handler for installation suspended/deleted.

Deliverable:

- Backend can see connected GitHub owners and produce short-lived installation tokens.

### Phase 4: Project Wizard Frontend

Goal: user can configure a project in the portal.

Tasks:

1. Build landing page.
2. Build pricing page.
3. Build auth pages.
4. Build app shell.
5. Build onboarding page.
6. Build GitHub connection page.
7. Build project wizard.
8. Add feature gating UI.
9. Add generated summary page.
10. Add draft save/resume.

Deliverable:

- User can complete the project configuration flow and submit a provisioning request.

### Phase 5: Manifest Renderer

Goal: convert wizard choices into deterministic generated files.

Tasks:

1. Define manifest schema.
2. Add stack catalog.
3. Add action catalog.
4. Add validator.
5. Add workflow renderer.
6. Add README renderer.
7. Add `cicd.config.json` renderer.
8. Add test file renderer for selected checks.
9. Snapshot test every supported stack/action combination.

Deliverable:

- Backend can generate exact file contents without calling GitHub.

### Phase 6: Repository Provisioning

Goal: create real GitHub repositories.

Tasks:

1. Add queue worker.
2. Create repository from template.
3. Commit generated files.
4. Create branches.
5. Configure variables.
6. Create environments.
7. Configure branch protection where allowed.
8. Record required manual secrets.
9. Trigger first workflow if ready.
10. Add idempotency and retry support.
11. Add provisioning logs.

Deliverable:

- A paid user can click `Create project` and get a real GitHub repo.

### Phase 7: Dashboard and Monitoring

Goal: user sees project status after provisioning.

Tasks:

1. Show project list.
2. Show project detail.
3. Show setup checklist.
4. Show latest GitHub Actions runs.
5. Link to repository and workflow runs.
6. Sync workflow run webhooks.
7. Display failures in user-readable form.
8. Add retry provisioning button for retryable failures.

Deliverable:

- User can understand whether the generated project is ready and what still needs action.

### Phase 8: Existing Repository Onboarding

Goal: support users who already have code.

Tasks:

1. Let user select existing installed repository.
2. Run discovery action logic or equivalent backend scanner.
3. Detect stack and existing tests.
4. Generate PR instead of direct commit.
5. Comment with required secrets/variables.
6. Track PR status.

Deliverable:

- Platform can onboard existing repos without overwriting user code.

### Phase 9: Team and Enterprise Features

Goal: make it usable by organizations.

Tasks:

1. Team members.
2. Roles.
3. Audit log UI.
4. Multiple GitHub installations.
5. Usage limits.
6. Plan upgrade prompts.
7. Organization-level template defaults.
8. Central policy presets.

Deliverable:

- Product can support real teams, not only individual users.

## MVP Technical Acceptance Criteria

The MVP is ready when:

1. A new user can register.
2. A user can subscribe through Stripe test mode.
3. Stripe webhook activates the account.
4. A user can install the GitHub App.
5. A user can configure a Next.js project with lint/test/build.
6. A user can configure a NestJS project with lint/test/build.
7. Backend creates the GitHub repository.
8. Generated repository contains working workflow caller.
9. Generated repository contains `test`, `uat`, and `main` branches.
10. Generated dashboard links to the created GitHub repository.
11. Missing secrets are shown clearly.
12. Provisioning failures are visible and retryable.

## Risks and Decisions

### Risk: GitHub Permission Complexity

GitHub App permissions can block repository creation, workflow file writes, or branch settings.

Decision:

- Start with org/personal installs where the app has administration and contents permissions.
- Build permission diagnostics into onboarding.

### Risk: Too Many Pipeline Combinations

Every stack/action combination can create invalid generated files.

Decision:

- Use a manifest schema and snapshot tests.
- Launch with only Next.js and NestJS.
- Add stacks gradually.

### Risk: Secrets Cannot Be Fully Automated

Users must provide Vercel, Render, SonarCloud, and other provider secrets.

Decision:

- Generate the repo and workflow first.
- Show setup checklist.
- Add provider-specific automation later.

### Risk: Billing and Provisioning Race Conditions

Stripe redirect can happen before webhook completion.

Decision:

- The return page polls subscription status.
- Only webhook events activate paid features.

### Risk: Current Docs Use Stale Org Names

Some current files reference `ImplementSprint/central-workflow` while this workspace uses `Tone-Lloyd-Sir-Catubag-CICD/cicd-workflow`.

Decision:

- Normalize before SaaS provisioning begins.
- Use stable release tags.

## Practical Build Order

Do this in order:

1. Stabilize central workflows and tag `v1`.
2. Build backend foundation.
3. Build billing.
4. Build GitHub App installation.
5. Build catalog and manifest renderer.
6. Build wizard UI.
7. Build provisioning worker.
8. Build dashboard.
9. Add existing repo onboarding.
10. Add more stacks and providers.

## First Concrete Milestone

The first milestone should be:

> A subscribed user can create a new private Next.js repository under their GitHub account, with a generated CI workflow that runs install, lint, test, and build on `test`, `uat`, and `main`.

This is the smallest version that proves:

- SaaS auth works.
- Billing works.
- GitHub App works.
- Repository creation works.
- Workflow generation works.
- The current central workflow platform is useful as a service.

After that, add NestJS, deployment, promotion PRs, and advanced checks.

---

## Execution-Grade Blueprint

This section turns the product plan into an implementation blueprint. It assumes the current `cicd-workflow` repository remains the workflow engine, while the SaaS portal and SaaS API are created as new products around it.

## Final Target State

At the end of the full build, the platform should behave like this:

1. A customer opens the SaaS website.
2. The customer signs up and creates an account workspace.
3. The customer selects a subscription plan.
4. Stripe confirms the subscription through webhook events.
5. The customer installs the platform GitHub App.
6. The customer creates a project draft in the wizard.
7. The wizard converts choices into a typed pipeline manifest.
8. The API validates the manifest against plan limits and supported stack rules.
9. A provisioning job creates or configures the GitHub repository.
10. The generated repository receives starter source code, CI/CD caller workflows, test files, config files, branches, environments, variables, and instructions for required secrets.
11. The first workflow run is triggered when the repository is ready.
12. The SaaS dashboard shows project status, setup gaps, latest workflow results, and retry actions.

## Recommended Repository Layout

Keep product concerns separate. Do not put the SaaS backend and frontend inside the workflow engine repo unless you intentionally want a monorepo.

```text
C:\Codes\cicd-ex\
  cicd-workflow\
    Existing central reusable GitHub Actions platform.

  cicd-saas-api\
    New NestJS API and provisioning worker.

  cicd-saas-web\
    New Next.js customer portal.

  cicd-template-nextjs\
    Optional GitHub template repo for Next.js generated projects.

  cicd-template-nestjs\
    Optional GitHub template repo for NestJS generated projects.
```

If you want one repo for the SaaS app instead, use this layout:

```text
cicd-saas\
  apps\
    web\
    api\
    worker\
  packages\
    catalog\
    manifest\
    renderers\
    github-client\
    stripe-shared\
    ui\
  templates\
    nextjs\
    nestjs\
  docs\
```

The split-repo approach is easier to explain and deploy. The monorepo approach is easier to share types. For this project, the split-repo approach is recommended because `cicd-workflow` is already a central product and the SaaS app has a different lifecycle.

## Product Boundaries

### `cicd-workflow`

Responsibility:

- Own reusable GitHub Actions workflows.
- Own reusable GitHub Actions composite actions.
- Own workflow-template files that customers can copy or that the SaaS can generate.
- Own workflow validation.
- Own release tags such as `v1`, `v1.1`, and `v2`.

Must not own:

- Stripe billing.
- User login.
- Customer project records.
- GitHub App installation records.
- Provisioning job database.
- SaaS dashboard UI.

### `cicd-saas-api`

Responsibility:

- Account and user API.
- Stripe Checkout and webhooks.
- GitHub App installation and API wrapper.
- Catalog serving.
- Project draft validation.
- Manifest generation.
- Repository provisioning.
- Workflow run status sync.
- Audit log.

Must not own:

- The actual canonical reusable workflows. It should call `cicd-workflow` release tags.
- Frontend rendering beyond API responses.

### `cicd-saas-web`

Responsibility:

- Landing page.
- Pricing and billing entry points.
- Auth pages.
- GitHub connection flow.
- Project wizard.
- Project dashboard.
- Setup checklist UI.

Must not own:

- GitHub secret values.
- Direct GitHub API writes.
- Subscription truth.
- Workflow YAML generation logic beyond previewing backend-generated YAML.

## MVP Definition in One Sentence

The MVP is complete when a paid user can install the GitHub App, choose `Next.js`, select lint/test/build, click `Create Project`, and receive a GitHub repository with a working CI workflow pinned to `Tone-Lloyd-Sir-Catubag-CICD/cicd-workflow@v1`.

## Implementation Workstreams

Build the system through these workstreams:

1. Workflow Engine Hardening.
2. Catalog and Manifest Design.
3. SaaS API Foundation.
4. Billing.
5. GitHub App Integration.
6. Renderer and Provisioning Worker.
7. SaaS Portal.
8. Dashboard and Status Sync.
9. Existing Repository Onboarding.
10. Production Operations.

Each workstream below includes the concrete files to create, data contracts, test strategy, and success criteria.

---

## Workstream 1: Workflow Engine Hardening

### Goal

Make `cicd-workflow` reliable enough to be referenced by generated customer repositories.

### Files to Create

```text
cicd-workflow\
  catalog\
    stacks.json
    actions.json
    providers.json
    plans.json
    workflow-refs.json
  docs\
    cicd-as-a-service-implementation-plan.md
    generated-project-contract.md
    workflow-release-policy.md
    catalog-schema.md
    customer-secret-setup.md
  examples\
    manifests\
      nextjs-basic.json
      nextjs-pro.json
      nestjs-basic.json
    generated-workflows\
      nextjs-basic.yml
      nestjs-basic.yml
```

### Files to Modify

```text
cicd-workflow\
  workflow-templates\README.md
  workflow-templates\nextjs-service-pipeline.yml
  workflow-templates\nest-service-pipeline.yml
  workflow-templates\react-service-pipeline.yml
  workflow-templates\nodejs-service-pipeline.yml
  templates\fe-pipeline-caller.yml
  templates\be-pipeline-caller.yml
  .github\workflows\workflow-validation.yml
```

### Required Cleanup

Normalize stale references:

- Replace customer-facing `ImplementSprint/central-workflow` references with `Tone-Lloyd-Sir-Catubag-CICD/cicd-workflow`.
- Keep a note if any original ImplementSprint references are historical or examples.
- Change generated workflow examples from `@main` to `@v1`.
- Keep internal development workflows on `@main` only where the workflow repo calls itself.

### `catalog/workflow-refs.json`

```json
{
  "currentStable": "v1",
  "repository": "Tone-Lloyd-Sir-Catubag-CICD/cicd-workflow",
  "workflows": {
    "frontendMaster": ".github/workflows/master-pipeline-fe.yml",
    "backendMaster": ".github/workflows/master-pipeline-be.yml",
    "nextjsService": ".github/workflows/service-nextjs.yml",
    "nestjsService": ".github/workflows/service-nestjs.yml",
    "nodeService": ".github/workflows/service-node.yml",
    "reactService": ".github/workflows/service-react.yml"
  }
}
```

### `catalog/stacks.json`

```json
[
  {
    "key": "nextjs",
    "label": "Next.js",
    "kind": "frontend",
    "runtime": "node",
    "defaultNodeVersion": "22",
    "supportedPackageManagers": ["npm"],
    "templateRepository": "Tone-Lloyd-Sir-Catubag-CICD/cicd-template-nextjs",
    "masterWorkflow": "frontendMaster",
    "serviceWorkflow": "nextjsService",
    "defaultBuildOutput": ".next",
    "defaultCommands": {
      "install": "npm ci",
      "lint": "npm run lint",
      "typecheck": "npx tsc --noEmit",
      "unit": "npm test -- --runInBand",
      "build": "npm run build"
    }
  },
  {
    "key": "nestjs",
    "label": "NestJS",
    "kind": "backend",
    "runtime": "node",
    "defaultNodeVersion": "22",
    "supportedPackageManagers": ["npm"],
    "templateRepository": "Tone-Lloyd-Sir-Catubag-CICD/cicd-template-nestjs",
    "masterWorkflow": "backendMaster",
    "serviceWorkflow": "nestjsService",
    "defaultBuildOutput": "dist",
    "defaultCommands": {
      "install": "npm ci",
      "lint": "npm run lint",
      "typecheck": "npm run typecheck",
      "unit": "npm test -- --runInBand",
      "e2e": "npm run test:e2e",
      "build": "npm run build"
    }
  }
]
```

### `catalog/actions.json`

```json
[
  {
    "key": "quality.lint",
    "label": "Lint",
    "category": "quality",
    "plan": "free",
    "supportedStacks": ["nextjs", "nestjs"],
    "requiresSecrets": [],
    "requiresVariables": [],
    "generatedFiles": []
  },
  {
    "key": "quality.typecheck",
    "label": "TypeScript Typecheck",
    "category": "quality",
    "plan": "free",
    "supportedStacks": ["nextjs", "nestjs"],
    "requiresSecrets": [],
    "requiresVariables": [],
    "generatedFiles": []
  },
  {
    "key": "quality.unit_tests",
    "label": "Unit Tests",
    "category": "quality",
    "plan": "free",
    "supportedStacks": ["nextjs", "nestjs"],
    "requiresSecrets": [],
    "requiresVariables": [],
    "generatedFiles": ["tests/unit/sanity.test.ts"]
  },
  {
    "key": "testing.playwright",
    "label": "Playwright E2E",
    "category": "testing",
    "plan": "pro",
    "supportedStacks": ["nextjs"],
    "requiresSecrets": [],
    "requiresVariables": ["E2E_BASE_URL"],
    "generatedFiles": ["tests/e2e/playwright-e2e.ts"]
  },
  {
    "key": "testing.k6",
    "label": "Grafana k6",
    "category": "testing",
    "plan": "pro",
    "supportedStacks": ["nextjs", "nestjs"],
    "requiresSecrets": ["K6_CLOUD_TOKEN", "K6_CLOUD_PROJECT_ID"],
    "requiresVariables": ["K6_BASE_URL"],
    "generatedFiles": ["tests/performance/k6-smoke.js"]
  },
  {
    "key": "deploy.vercel",
    "label": "Vercel Deploy",
    "category": "deployment",
    "plan": "pro",
    "supportedStacks": ["nextjs"],
    "requiresSecrets": ["VERCEL_TOKEN", "VERCEL_ORG_ID", "VERCEL_PROJECT_ID"],
    "requiresVariables": [],
    "generatedFiles": []
  },
  {
    "key": "deploy.render",
    "label": "Render Deploy",
    "category": "deployment",
    "plan": "pro",
    "supportedStacks": ["nestjs"],
    "requiresSecrets": [
      "RENDER_DEPLOY_HOOK_URL_TEST",
      "RENDER_DEPLOY_HOOK_URL_UAT",
      "RENDER_DEPLOY_HOOK_URL_MAIN",
      "RENDER_HEALTHCHECK_URL_TEST",
      "RENDER_HEALTHCHECK_URL_UAT",
      "RENDER_HEALTHCHECK_URL_MAIN"
    ],
    "requiresVariables": [],
    "generatedFiles": []
  }
]
```

### Engine Validation Commands

Run these after hardening:

```powershell
git diff --check
```

Expected:

```text
No output.
```

If Node dependencies are added for validation scripts:

```powershell
npm test
```

Expected:

```text
All catalog/schema/generator tests pass.
```

### Engine Success Criteria

- All generated customer workflow examples reference `@v1`.
- `catalog/*.json` validates against documented schema.
- Existing workflow validation still passes in GitHub Actions.
- There is a clear release policy for `v1`, `v1.1`, and breaking `v2`.

---

## Workstream 2: Catalog and Manifest Design

### Goal

Create a machine-readable contract that connects the frontend wizard, backend validation, workflow renderer, provisioning worker, and dashboard.

### Manifest Shape

The manifest is the single source of truth for a generated project.

```ts
export type PipelineManifest = {
  schemaVersion: "2026-05-25";
  project: ProjectConfig;
  github: GitHubTargetConfig;
  stack: StackConfig;
  pipeline: PipelineConfig;
  deployment: DeploymentConfig;
  requiredSetup: RequiredSetupItem[];
  generatedFiles: GeneratedFileDescriptor[];
};

export type ProjectConfig = {
  displayName: string;
  slug: string;
  description: string;
  visibility: "public" | "private";
};

export type GitHubTargetConfig = {
  owner: string;
  ownerType: "User" | "Organization";
  repositoryName: string;
  defaultBranch: "main";
  branches: ["test", "uat", "main"];
};

export type StackConfig = {
  key: "nextjs" | "nestjs" | "react" | "nodejs" | "expo" | "react-native" | "kotlin";
  kind: "frontend" | "backend" | "mobile";
  runtime: "node" | "jvm";
  nodeVersion?: "20" | "22" | "24";
  packageManager?: "npm" | "pnpm" | "yarn";
  serviceDirectory: ".";
};

export type PipelineConfig = {
  mode: "single" | "multi";
  quality: QualityConfig;
  security: SecurityConfig;
  testing: TestingConfig;
  packaging: PackagingConfig;
  promotion: PromotionConfig;
  workflowRef: WorkflowRefConfig;
};

export type QualityConfig = {
  lint: boolean;
  typecheck: boolean;
  unitTests: boolean;
  coverageThreshold: number;
  build: boolean;
};

export type SecurityConfig = {
  npmAudit: boolean;
  licenseCheck: boolean;
  trivy: boolean;
  sonarcloud: boolean;
};

export type TestingConfig = {
  playwright: boolean;
  playwrightBrowsers: string[];
  k6: boolean;
  k6RunOnlyOnBranches: string[];
};

export type PackagingConfig = {
  docker: boolean;
  imageName?: string;
};

export type PromotionConfig = {
  enabled: boolean;
  testToUat: boolean;
  uatToMain: boolean;
  productionApproval: boolean;
};

export type WorkflowRefConfig = {
  repository: string;
  ref: string;
  workflowPath: string;
};

export type DeploymentConfig = {
  provider: "none" | "vercel" | "render";
  enabled: boolean;
  environments: DeploymentEnvironment[];
};

export type DeploymentEnvironment = {
  name: "test" | "uat" | "production";
  urlVariable?: string;
  healthcheckSecret?: string;
  deployHookSecret?: string;
};

export type RequiredSetupItem = {
  key: string;
  kind: "secret" | "variable" | "provider_account" | "manual_step";
  target: "repository" | "environment";
  environment?: "test" | "uat" | "production";
  name: string;
  requiredBeforeFirstRun: boolean;
  instructions: string;
};

export type GeneratedFileDescriptor = {
  path: string;
  purpose: string;
  overwritePolicy: "create" | "replace_if_managed" | "never_replace_user_file";
  managedBy: "cicd-saas";
};
```

### Manifest Validation Rules

Repository rules:

- `repositoryName` must match GitHub repository naming rules used by the platform:
  - lower or mixed case allowed.
  - letters, numbers, hyphen, underscore, dot allowed.
  - cannot be empty.
  - cannot start with `.`
  - cannot contain `/`.
- `visibility=private` requires plan `starter` or higher.
- `owner` must belong to an active GitHub App installation for the account.
- `branches` must be exactly `["test", "uat", "main"]` for MVP.

Stack rules:

- `nextjs` supports Vercel deployment, Playwright, k6, Docker, SonarCloud.
- `nestjs` supports Render deployment, k6, Docker, SonarCloud.
- `nodeVersion` defaults to `22`.
- `packageManager` defaults to `npm`.

Plan rules:

- Free: max 1 public project, no deploy, no auto-promotion, no Playwright, no k6.
- Starter: private repos allowed, max 3 projects, no advanced deploy automation.
- Pro: max 10 projects, deploy, Playwright, k6, Docker, auto-promotion.
- Team: max 25 projects, org installs, branch protection, production gates.

Deployment rules:

- `provider=vercel` requires stack `nextjs`.
- `provider=render` requires stack `nestjs` or `nodejs`.
- `deployment.enabled=true` requires plan `pro` or higher.
- If deploy is enabled, required secrets must be added to `requiredSetup`.

Promotion rules:

- `promotion.enabled=true` requires `test`, `uat`, and `main` branches.
- `promotion.productionApproval=true` requires plan `team` or higher unless you decide Pro includes it.

### Manifest Examples

#### Next.js Basic MVP

```json
{
  "schemaVersion": "2026-05-25",
  "project": {
    "displayName": "Student Portal",
    "slug": "student-portal",
    "description": "Generated Next.js project with CI/CD",
    "visibility": "private"
  },
  "github": {
    "owner": "acme-school",
    "ownerType": "Organization",
    "repositoryName": "student-portal",
    "defaultBranch": "main",
    "branches": ["test", "uat", "main"]
  },
  "stack": {
    "key": "nextjs",
    "kind": "frontend",
    "runtime": "node",
    "nodeVersion": "22",
    "packageManager": "npm",
    "serviceDirectory": "."
  },
  "pipeline": {
    "mode": "single",
    "quality": {
      "lint": true,
      "typecheck": true,
      "unitTests": true,
      "coverageThreshold": 80,
      "build": true
    },
    "security": {
      "npmAudit": true,
      "licenseCheck": true,
      "trivy": false,
      "sonarcloud": false
    },
    "testing": {
      "playwright": false,
      "playwrightBrowsers": ["chromium"],
      "k6": false,
      "k6RunOnlyOnBranches": ["test", "uat"]
    },
    "packaging": {
      "docker": false
    },
    "promotion": {
      "enabled": false,
      "testToUat": false,
      "uatToMain": false,
      "productionApproval": false
    },
    "workflowRef": {
      "repository": "Tone-Lloyd-Sir-Catubag-CICD/cicd-workflow",
      "ref": "v1",
      "workflowPath": ".github/workflows/master-pipeline-fe.yml"
    }
  },
  "deployment": {
    "provider": "none",
    "enabled": false,
    "environments": []
  },
  "requiredSetup": [],
  "generatedFiles": [
    {
      "path": ".github/workflows/master-pipeline-fe.yml",
      "purpose": "Thin caller into the central frontend pipeline",
      "overwritePolicy": "replace_if_managed",
      "managedBy": "cicd-saas"
    },
    {
      "path": "cicd.config.json",
      "purpose": "Generated project manifest snapshot",
      "overwritePolicy": "replace_if_managed",
      "managedBy": "cicd-saas"
    }
  ]
}
```

## Workstream 3: SaaS API Foundation

### Goal

Create a backend that can support authenticated users, accounts, subscriptions, GitHub installs, project drafts, and provisioning jobs.

### Project Setup

Create `C:\Codes\cicd-ex\cicd-saas-api`.

Recommended setup:

```powershell
npx @nestjs/cli new cicd-saas-api
```

Use:

- NestJS.
- Prisma.
- PostgreSQL or Supabase Postgres.
- Passport or cookie-session auth.
- `class-validator` for request DTOs.
- `@nestjs/swagger` for API docs.
- Jest for unit/integration tests.

### Environment Variables

```text
NODE_ENV=development
PORT=4000
APP_BASE_URL=http://localhost:3000
API_BASE_URL=http://localhost:4000

DATABASE_URL=postgresql://...

JWT_ACCESS_SECRET=...
JWT_REFRESH_SECRET=...
SESSION_COOKIE_NAME=cicd_session

STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_FREE=
STRIPE_PRICE_STARTER=price_...
STRIPE_PRICE_PRO=price_...
STRIPE_PRICE_TEAM=price_...

GITHUB_APP_ID=...
GITHUB_APP_SLUG=...
GITHUB_APP_PRIVATE_KEY_BASE64=...
GITHUB_APP_WEBHOOK_SECRET=...
GITHUB_APP_INSTALL_URL=https://github.com/apps/<app-slug>/installations/new

CICD_WORKFLOW_REPOSITORY=Tone-Lloyd-Sir-Catubag-CICD/cicd-workflow
CICD_WORKFLOW_REF=v1
```

### Backend Directory Structure

```text
src\
  main.ts
  app.module.ts
  common\
    config\
      env.schema.ts
      app-config.service.ts
    errors\
      app-error.ts
      error-codes.ts
      http-exception.filter.ts
    guards\
      auth.guard.ts
      account-member.guard.ts
      plan.guard.ts
    decorators\
      current-user.decorator.ts
      current-account.decorator.ts
    validation\
      parse-json.pipe.ts
  database\
    prisma.module.ts
    prisma.service.ts
  auth\
    auth.module.ts
    auth.controller.ts
    auth.service.ts
    dto\
      register.dto.ts
      login.dto.ts
    tests\
      auth.service.spec.ts
  accounts\
    accounts.module.ts
    accounts.controller.ts
    accounts.service.ts
    dto\
      create-account.dto.ts
      invite-member.dto.ts
  billing\
    billing.module.ts
    billing.controller.ts
    billing.service.ts
    stripe-webhook.controller.ts
    plan-catalog.ts
    dto\
      create-checkout-session.dto.ts
      create-portal-session.dto.ts
  github\
    github.module.ts
    github.controller.ts
    github.service.ts
    github-app-auth.service.ts
    github-api.service.ts
    github-webhook.controller.ts
    dto\
      github-callback.dto.ts
  catalog\
    catalog.module.ts
    catalog.controller.ts
    catalog.service.ts
    catalog.types.ts
  manifests\
    manifests.module.ts
    manifest.schema.ts
    manifest-builder.service.ts
    manifest-validator.service.ts
  renderers\
    renderers.module.ts
    workflow-renderer.service.ts
    readme-renderer.service.ts
    config-renderer.service.ts
    test-file-renderer.service.ts
  projects\
    projects.module.ts
    projects.controller.ts
    projects.service.ts
    dto\
      create-project-draft.dto.ts
      update-project-draft.dto.ts
      validate-project-draft.dto.ts
      provision-project.dto.ts
  provisioning\
    provisioning.module.ts
    provisioning.controller.ts
    provisioning.service.ts
    provisioning-worker.service.ts
    provisioning-steps\
      validate-subscription.step.ts
      validate-github-installation.step.ts
      create-repository.step.ts
      commit-generated-files.step.ts
      create-branches.step.ts
      configure-repository.step.ts
      trigger-workflow.step.ts
    provisioning.types.ts
  workflows\
    workflows.module.ts
    workflows.controller.ts
    workflows.service.ts
    workflow-run-sync.service.ts
  audit\
    audit.module.ts
    audit.service.ts
```

### Prisma Schema

```prisma
model User {
  id           String   @id @default(cuid())
  email        String   @unique
  passwordHash String
  name         String?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  memberships AccountMember[]
  createdDrafts ProjectDraft[]
  auditEvents AuditEvent[]
}

model Account {
  id        String   @id @default(cuid())
  name      String
  slug      String   @unique
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  members        AccountMember[]
  subscription   Subscription?
  installations  GitHubInstallation[]
  drafts         ProjectDraft[]
  projects       Project[]
  auditEvents    AuditEvent[]
}

model AccountMember {
  id        String   @id @default(cuid())
  accountId String
  userId    String
  role      AccountRole
  createdAt DateTime @default(now())

  account Account @relation(fields: [accountId], references: [id])
  user    User    @relation(fields: [userId], references: [id])

  @@unique([accountId, userId])
}

enum AccountRole {
  OWNER
  ADMIN
  MEMBER
  VIEWER
}

model Subscription {
  id                   String             @id @default(cuid())
  accountId            String             @unique
  stripeCustomerId      String?
  stripeSubscriptionId  String?
  planKey              PlanKey
  status               SubscriptionStatus
  currentPeriodEnd      DateTime?
  featuresJson          Json
  createdAt             DateTime           @default(now())
  updatedAt             DateTime           @updatedAt

  account Account @relation(fields: [accountId], references: [id])
}

enum PlanKey {
  FREE
  STARTER
  PRO
  TEAM
}

enum SubscriptionStatus {
  INCOMPLETE
  TRIALING
  ACTIVE
  PAST_DUE
  CANCELED
  UNPAID
}

model GitHubInstallation {
  id                  String    @id @default(cuid())
  accountId            String
  installationId        BigInt    @unique
  githubAccountLogin    String
  githubAccountType     String
  targetType            String
  permissionsJson       Json
  repositorySelection   String?
  suspendedAt           DateTime?
  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt

  account  Account  @relation(fields: [accountId], references: [id])
  projects Project[]
}

model ProjectDraft {
  id              String             @id @default(cuid())
  accountId        String
  createdByUserId  String
  name            String
  repoOwner        String?
  repoName         String?
  visibility       RepositoryVisibility?
  stackJson        Json
  pipelineJson     Json
  validationJson   Json?
  status           ProjectDraftStatus @default(DRAFT)
  createdAt        DateTime           @default(now())
  updatedAt        DateTime           @updatedAt

  account       Account @relation(fields: [accountId], references: [id])
  createdByUser User    @relation(fields: [createdByUserId], references: [id])
  jobs          ProvisioningJob[]
}

enum RepositoryVisibility {
  PUBLIC
  PRIVATE
}

enum ProjectDraftStatus {
  DRAFT
  VALIDATED
  PROVISIONING
  PROVISIONED
  FAILED
}

model Project {
  id                    String        @id @default(cuid())
  accountId              String
  githubInstallationId    String
  name                  String
  repoOwner              String
  repoName               String
  repoUrl                String
  repositoryId           BigInt?
  defaultBranch          String        @default("main")
  stackKey               String
  manifestJson           Json
  status                 ProjectStatus @default(ACTIVE)
  createdAt              DateTime      @default(now())
  updatedAt              DateTime      @updatedAt

  account             Account            @relation(fields: [accountId], references: [id])
  githubInstallation  GitHubInstallation @relation(fields: [githubInstallationId], references: [id])
  jobs                ProvisioningJob[]
  workflowRuns        WorkflowRun[]
}

enum ProjectStatus {
  ACTIVE
  SETUP_REQUIRED
  SUSPENDED
  ARCHIVED
}

model ProvisioningJob {
  id             String              @id @default(cuid())
  projectDraftId String
  projectId      String?
  status         ProvisioningStatus
  currentStep    String?
  errorCode      String?
  errorMessage   String?
  logsJson       Json
  startedAt      DateTime?
  completedAt    DateTime?
  createdAt      DateTime            @default(now())
  updatedAt      DateTime            @updatedAt

  projectDraft ProjectDraft @relation(fields: [projectDraftId], references: [id])
  project      Project?     @relation(fields: [projectId], references: [id])
}

enum ProvisioningStatus {
  QUEUED
  RUNNING
  WAITING_FOR_USER
  SUCCEEDED
  FAILED_RETRYABLE
  FAILED_TERMINAL
  CANCELLED
}

model WorkflowRun {
  id           String    @id @default(cuid())
  projectId     String
  githubRunId   BigInt
  workflowName  String
  branch        String
  status        String
  conclusion    String?
  htmlUrl       String
  startedAt     DateTime?
  completedAt   DateTime?
  syncedAt      DateTime  @default(now())

  project Project @relation(fields: [projectId], references: [id])

  @@unique([projectId, githubRunId])
}

model AuditEvent {
  id          String   @id @default(cuid())
  accountId    String
  userId       String?
  eventType    String
  subjectType  String
  subjectId    String
  metadataJson Json
  createdAt    DateTime @default(now())

  account Account @relation(fields: [accountId], references: [id])
  user    User?   @relation(fields: [userId], references: [id])
}
```

### Backend Error Codes

Use stable error codes so the frontend can render useful guidance.

```ts
export const ErrorCodes = {
  AUTH_REQUIRED: "AUTH_REQUIRED",
  ACCOUNT_ACCESS_DENIED: "ACCOUNT_ACCESS_DENIED",
  SUBSCRIPTION_REQUIRED: "SUBSCRIPTION_REQUIRED",
  PLAN_LIMIT_PROJECTS_EXCEEDED: "PLAN_LIMIT_PROJECTS_EXCEEDED",
  PLAN_FEATURE_LOCKED: "PLAN_FEATURE_LOCKED",
  GITHUB_INSTALLATION_REQUIRED: "GITHUB_INSTALLATION_REQUIRED",
  GITHUB_INSTALLATION_SUSPENDED: "GITHUB_INSTALLATION_SUSPENDED",
  GITHUB_PERMISSION_MISSING: "GITHUB_PERMISSION_MISSING",
  GITHUB_REPOSITORY_EXISTS: "GITHUB_REPOSITORY_EXISTS",
  GITHUB_REPOSITORY_CREATE_FAILED: "GITHUB_REPOSITORY_CREATE_FAILED",
  MANIFEST_INVALID: "MANIFEST_INVALID",
  PROVISIONING_JOB_NOT_RETRYABLE: "PROVISIONING_JOB_NOT_RETRYABLE",
  STRIPE_WEBHOOK_SIGNATURE_INVALID: "STRIPE_WEBHOOK_SIGNATURE_INVALID"
} as const;
```

### API Response Envelope

```ts
export type ApiSuccess<T> = {
  ok: true;
  data: T;
  requestId: string;
};

export type ApiFailure = {
  ok: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  requestId: string;
};
```

## Workstream 4: Billing Implementation

### Goal

Only subscribed users can create paid project types and advanced pipeline capabilities.

### Stripe Objects

Create these Stripe products:

```text
CI/CD as a Service - Starter
CI/CD as a Service - Pro
CI/CD as a Service - Team
```

Create recurring monthly prices for each product.

Store price IDs in environment variables:

```text
STRIPE_PRICE_STARTER=price_...
STRIPE_PRICE_PRO=price_...
STRIPE_PRICE_TEAM=price_...
```

### Checkout Session Endpoint

Endpoint:

```text
POST /api/billing/checkout-session
```

Request:

```json
{
  "accountId": "acc_123",
  "planKey": "PRO"
}
```

Response:

```json
{
  "url": "https://checkout.stripe.com/c/..."
}
```

Rules:

- User must be an owner or admin of the account.
- `planKey` must be `STARTER`, `PRO`, or `TEAM`.
- Backend creates or reuses a Stripe Customer for the account.
- Checkout Session must use `mode=subscription`.
- Include `client_reference_id=accountId`.
- Include metadata:

```json
{
  "accountId": "acc_123",
  "planKey": "PRO"
}
```

### Billing Webhook Endpoint

Endpoint:

```text
POST /api/billing/webhook
```

Required behavior:

- Use raw request body for Stripe signature validation.
- Reject invalid signatures.
- Idempotently process events by Stripe event ID.
- Update local subscription rows from Stripe webhook events.
- Never activate paid features based only on the frontend success redirect.

Events to handle in MVP:

```text
checkout.session.completed
customer.subscription.created
customer.subscription.updated
customer.subscription.deleted
invoice.paid
invoice.payment_failed
entitlements.active_entitlement_summary.updated
```

Subscription status mapping:

```text
Stripe trialing -> TRIALING
Stripe active -> ACTIVE
Stripe past_due -> PAST_DUE
Stripe canceled -> CANCELED
Stripe unpaid -> UNPAID
Stripe incomplete -> INCOMPLETE
```

Access rule:

```ts
function canUsePaidFeatures(status: SubscriptionStatus): boolean {
  return status === "ACTIVE" || status === "TRIALING";
}
```

### Plan Feature Catalog

```ts
export const PlanFeatures = {
  FREE: {
    maxProjects: 1,
    privateRepos: false,
    allowedStacks: ["nextjs"],
    allowedActions: ["quality.lint", "quality.typecheck", "quality.unit_tests", "quality.build"],
    deployment: false,
    autoPromotion: false,
    branchProtection: false,
    teamMembers: 1
  },
  STARTER: {
    maxProjects: 3,
    privateRepos: true,
    allowedStacks: ["nextjs", "nestjs"],
    allowedActions: ["quality.lint", "quality.typecheck", "quality.unit_tests", "quality.build", "security.npm_audit"],
    deployment: false,
    autoPromotion: false,
    branchProtection: false,
    teamMembers: 2
  },
  PRO: {
    maxProjects: 10,
    privateRepos: true,
    allowedStacks: ["nextjs", "nestjs", "react", "nodejs"],
    allowedActions: [
      "quality.lint",
      "quality.typecheck",
      "quality.unit_tests",
      "quality.build",
      "security.npm_audit",
      "security.license_check",
      "testing.playwright",
      "testing.k6",
      "package.docker",
      "deploy.vercel",
      "deploy.render",
      "promotion.auto_pr",
      "release.version_tags"
    ],
    deployment: true,
    autoPromotion: true,
    branchProtection: false,
    teamMembers: 5
  },
  TEAM: {
    maxProjects: 25,
    privateRepos: true,
    allowedStacks: ["nextjs", "nestjs", "react", "nodejs", "expo", "react-native", "kotlin"],
    allowedActions: ["*"],
    deployment: true,
    autoPromotion: true,
    branchProtection: true,
    teamMembers: 15
  }
} as const;
```

### Billing Tests

Unit tests:

- `PlanFeatures` returns correct limits for every plan.
- Private repo validation fails for Free.
- Playwright validation fails for Starter.
- Project count validation fails when account exceeds max.

Integration tests:

- Checkout session creation persists Stripe customer ID.
- Webhook signature failure returns 400.
- `checkout.session.completed` creates or updates subscription.
- `customer.subscription.deleted` disables paid access.
- Duplicate webhook event is ignored without double-updating.

## Workstream 5: GitHub App Integration

### Goal

Use a GitHub App as the secure automation identity for repository provisioning.

### GitHub App Setup

Create a GitHub App named:

```text
CI/CD as a Service
```

Homepage URL:

```text
https://your-saas-domain.com
```

Callback URL:

```text
https://your-api-domain.com/api/github/callback
```

Webhook URL:

```text
https://your-api-domain.com/api/github/webhook
```

Webhook secret:

```text
GITHUB_APP_WEBHOOK_SECRET
```

### GitHub App Permissions

MVP permissions:

```text
Repository administration: write
Repository contents: write
Repository metadata: read
Repository actions: write
Repository secrets: write
Repository variables: write
Repository workflows: write
Checks: read
```

Later permissions:

```text
Pull requests: write
Issues: write
Deployments: write
Members: read
```

Only request later permissions when the matching feature exists.

### GitHub API Operations Needed

Repository creation:

```text
POST /repos/{template_owner}/{template_repo}/generate
POST /orgs/{org}/repos
POST /user/repos
```

Repository content writes:

```text
PUT /repos/{owner}/{repo}/contents/{path}
```

Branch creation:

```text
GET /repos/{owner}/{repo}/git/ref/heads/main
POST /repos/{owner}/{repo}/git/refs
```

Repository variables:

```text
POST /repos/{owner}/{repo}/actions/variables
PATCH /repos/{owner}/{repo}/actions/variables/{name}
```

Repository secrets:

```text
GET /repos/{owner}/{repo}/actions/secrets/public-key
PUT /repos/{owner}/{repo}/actions/secrets/{secret_name}
```

Branch protection:

```text
PUT /repos/{owner}/{repo}/branches/{branch}/protection
```

Workflow runs:

```text
GET /repos/{owner}/{repo}/actions/runs
POST /repos/{owner}/{repo}/actions/workflows/{workflow_id}/dispatches
```

### GitHub App Token Flow

```text
1. Backend signs a GitHub App JWT with private key.
2. Backend calls GitHub to create an installation access token.
3. Token expires after about one hour.
4. Backend uses token for repository operations.
5. Backend discards token after operation.
```

### GitHub Service Methods

```ts
export interface GitHubApiService {
  createInstallationToken(installationId: bigint): Promise<string>;
  listInstallationRepositories(installationId: bigint): Promise<GitHubRepository[]>;
  createRepositoryFromTemplate(input: CreateRepositoryFromTemplateInput): Promise<GitHubRepository>;
  createUserRepository(input: CreateRepositoryInput): Promise<GitHubRepository>;
  createOrganizationRepository(input: CreateOrganizationRepositoryInput): Promise<GitHubRepository>;
  getRepository(owner: string, repo: string): Promise<GitHubRepository | null>;
  putFile(input: PutFileInput): Promise<void>;
  createBranch(input: CreateBranchInput): Promise<void>;
  createOrUpdateVariable(input: CreateOrUpdateVariableInput): Promise<void>;
  createOrUpdateSecret(input: CreateOrUpdateSecretInput): Promise<void>;
  createEnvironment(input: CreateEnvironmentInput): Promise<void>;
  putBranchProtection(input: PutBranchProtectionInput): Promise<void>;
  dispatchWorkflow(input: DispatchWorkflowInput): Promise<void>;
  listWorkflowRuns(input: ListWorkflowRunsInput): Promise<GitHubWorkflowRun[]>;
}
```

### Secret Handling

The SaaS should not ask users to type sensitive provider secrets into your app for MVP. Instead:

- Generate a checklist.
- Link to GitHub repository secret settings.
- Optionally provide copyable secret names.
- Track whether required secrets exist by listing repository secrets. GitHub returns metadata, not values.

Later, if you add secret entry inside the SaaS:

- Encrypt in transit.
- Do not persist plaintext.
- Fetch repository public key.
- Encrypt with LibSodium.
- Send encrypted value to GitHub.
- Drop plaintext immediately.
- Audit that a secret was set, not the secret value.

## Workstream 6: Renderer and Provisioning Worker

### Goal

Convert a validated project draft into a real GitHub repository.

### Renderer Package Structure

```text
src\renderers\
  workflow-renderer.service.ts
  workflow-renderer.spec.ts
  readme-renderer.service.ts
  readme-renderer.spec.ts
  config-renderer.service.ts
  config-renderer.spec.ts
  test-file-renderer.service.ts
  test-file-renderer.spec.ts
  templates\
    workflows\
      frontend-master.hbs
      backend-master.hbs
    readmes\
      generated-project-readme.hbs
    tests\
      nextjs-sanity-test.hbs
      nextjs-playwright.hbs
      k6-smoke.hbs
```

Use a template engine such as Handlebars only if needed. For YAML, a structured YAML serializer is safer than string concatenation.

### Generated `cicd.config.json`

```json
{
  "managedBy": "cicd-saas",
  "schemaVersion": "2026-05-25",
  "projectId": "proj_123",
  "stack": "nextjs",
  "workflowRef": "Tone-Lloyd-Sir-Catubag-CICD/cicd-workflow/.github/workflows/master-pipeline-fe.yml@v1",
  "generatedAt": "2026-05-25T00:00:00.000Z",
  "features": {
    "lint": true,
    "typecheck": true,
    "unitTests": true,
    "playwright": false,
    "k6": false,
    "deploy": false,
    "autoPromotion": false
  }
}
```

### Generated Next.js Workflow

```yaml
name: "CI/CD Pipeline"

on:
  push:
    branches: [test, uat, main]
  pull_request:
    branches: [test, uat, main]
  workflow_dispatch:

permissions:
  contents: write
  pull-requests: write
  packages: write
  security-events: write

concurrency:
  group: cicd-${{ github.workflow }}-${{ github.head_ref || github.ref_name }}
  cancel-in-progress: false

jobs:
  pipeline:
    uses: Tone-Lloyd-Sir-Catubag-CICD/cicd-workflow/.github/workflows/master-pipeline-fe.yml@v1
    with:
      pipeline_mode: single
      enable_playwright: false
      playwright_browsers: '["chromium"]'
      e2e_base_url: ""
      playwright_run_only_on_branch: "test,uat"
      enable_grafana_k6: false
      k6_script_path: "tests/performance"
      k6_base_url: ""
      k6_run_only_on_branch: "test,uat"
      run_deploy: false
      run_promotion: false
      dry_run: false
    secrets: inherit
```

### Generated NestJS Workflow

```yaml
name: "CI/CD Pipeline"

on:
  push:
    branches: [test, uat, main]
  pull_request:
    branches: [test, uat, main]
  workflow_dispatch:

permissions:
  contents: write
  packages: write
  security-events: write
  pull-requests: write
  id-token: write

concurrency:
  group: cicd-backend-${{ github.event_name }}-${{ github.head_ref || github.ref_name }}
  cancel-in-progress: false

jobs:
  pipeline:
    uses: Tone-Lloyd-Sir-Catubag-CICD/cicd-workflow/.github/workflows/master-pipeline-be.yml@v1
    with:
      pipeline_mode: single
      enable_security_scan: true
      enable_sonar: false
      enable_k6: false
      k6_script_path: "tests/performance"
      k6_base_url: ""
      k6_run_only_on_branch: "test,main"
      run_deploy: false
      run_promotion: false
      dry_run: false
    secrets: inherit
```

### Provisioning Worker Steps

Implement each step as a small class. Every step receives a context and returns an updated context.

```ts
export type ProvisioningContext = {
  jobId: string;
  accountId: string;
  draftId: string;
  manifest: PipelineManifest;
  installationId: bigint;
  token: string;
  repository?: {
    id: bigint;
    owner: string;
    name: string;
    htmlUrl: string;
    defaultBranch: string;
  };
  generatedFiles: Array<{
    path: string;
    content: string;
    message: string;
  }>;
};

export interface ProvisioningStep {
  key: string;
  run(context: ProvisioningContext): Promise<ProvisioningContext>;
}
```

Step order:

```text
validate_subscription
validate_plan_limits
validate_github_installation
validate_repository_availability
build_manifest
render_files
create_repository
commit_generated_files
create_test_branch
create_uat_branch
configure_variables
configure_environments
configure_branch_protection
trigger_initial_workflow
persist_project
finalize_job
```

### Idempotency Rules by Step

`validate_repository_availability`:

- If repo does not exist, continue.
- If repo exists and has matching `cicd.config.json` for this project, treat as resumable.
- If repo exists and is unrelated, fail with `GITHUB_REPOSITORY_EXISTS`.

`create_repository`:

- If repository already exists and is resumable, attach to it.
- Otherwise create from template or create empty repo.

`commit_generated_files`:

- For each generated file, read current file first.
- If missing, create.
- If present and contains `managedBy: cicd-saas`, update.
- If present and not managed, do not overwrite; mark `WAITING_FOR_USER`.

`create_test_branch` and `create_uat_branch`:

- If branch exists, skip.
- If branch is missing, create from `main` SHA.

`configure_variables`:

- Create variable if missing.
- Update variable if managed by platform.
- Do not overwrite user-owned variables unless the wizard requested it.

`configure_branch_protection`:

- Only run for plans that include branch protection.
- If permission missing, mark setup action rather than failing the whole project.

### Provisioning Logs

Store structured logs:

```json
[
  {
    "step": "create_repository",
    "status": "started",
    "timestamp": "2026-05-25T10:00:00.000Z"
  },
  {
    "step": "create_repository",
    "status": "succeeded",
    "timestamp": "2026-05-25T10:00:03.000Z",
    "metadata": {
      "repo": "acme-school/student-portal"
    }
  }
]
```

## Workstream 7: SaaS Portal

### Goal

Build the customer-facing experience for subscription, GitHub connection, project creation, and project monitoring.

### Frontend Project Structure

```text
src\
  app\
    page.tsx
    pricing\
      page.tsx
    login\
      page.tsx
    register\
      page.tsx
    billing\
      return\
        page.tsx
    app\
      layout.tsx
      page.tsx
      onboarding\
        page.tsx
      projects\
        page.tsx
        new\
          page.tsx
        [projectId]\
          page.tsx
      settings\
        billing\
          page.tsx
        github\
          page.tsx
  components\
    app-shell\
      sidebar.tsx
      topbar.tsx
    billing\
      pricing-table.tsx
      plan-card.tsx
      subscription-banner.tsx
    github\
      github-install-card.tsx
      installation-list.tsx
    wizard\
      project-wizard.tsx
      repository-step.tsx
      stack-step.tsx
      quality-step.tsx
      advanced-checks-step.tsx
      deployment-step.tsx
      promotion-step.tsx
      review-step.tsx
    projects\
      project-list.tsx
      project-status-card.tsx
      setup-checklist.tsx
      workflow-run-table.tsx
  lib\
    api-client.ts
    auth.ts
    routes.ts
    plan-features.ts
    wizard-schema.ts
```

### Wizard State

```ts
export type ProjectWizardState = {
  repository: {
    owner: string;
    ownerType: "User" | "Organization";
    name: string;
    description: string;
    visibility: "public" | "private";
  };
  stack: {
    key: "nextjs" | "nestjs";
    packageManager: "npm";
    nodeVersion: "22";
  };
  quality: {
    lint: boolean;
    typecheck: boolean;
    unitTests: boolean;
    coverageThreshold: number;
    build: boolean;
  };
  advanced: {
    npmAudit: boolean;
    licenseCheck: boolean;
    playwright: boolean;
    k6: boolean;
    sonarcloud: boolean;
    docker: boolean;
  };
  deployment: {
    provider: "none" | "vercel" | "render";
  };
  promotion: {
    enabled: boolean;
    productionApproval: boolean;
  };
};
```

### Wizard UX Details

Repository step:

- Owner dropdown only shows connected GitHub installations.
- Repo name validates live.
- Private option disabled if current plan does not allow private repos.

Stack step:

- Show stack choices as cards.
- MVP choices: Next.js and NestJS.
- Disable unsupported stacks with plan/roadmap labels.

Quality step:

- Lint, typecheck, unit test, and build are enabled by default.
- Coverage threshold input defaults to `80`.
- Let user disable typecheck only if they choose JavaScript in a later version. For MVP TypeScript projects, keep it on.

Advanced checks step:

- Playwright visible for Next.js only.
- k6 visible for both Next.js and NestJS.
- Docker visible for Pro plan and above.
- SonarCloud visible but marked as requiring manual Sonar token setup.

Deployment step:

- Vercel visible for Next.js.
- Render visible for NestJS.
- If deployment selected, review step must include required secrets.

Promotion step:

- Explain branch flow as `test -> uat -> main`.
- Auto-promotion disabled unless plan supports it.
- Production approval disabled unless Team plan supports it.

Review step:

- Show generated repo name.
- Show selected stack.
- Show selected actions.
- Show files to be generated.
- Show secrets and variables the user must add.
- Show estimated first workflow behavior.

### Frontend API Client Methods

```ts
export const api = {
  auth: {
    register(input: RegisterInput): Promise<UserSession>;
    login(input: LoginInput): Promise<UserSession>;
    logout(): Promise<void>;
    me(): Promise<CurrentUser>;
  },
  billing: {
    createCheckoutSession(planKey: PlanKey): Promise<{ url: string }>;
    createPortalSession(): Promise<{ url: string }>;
    getSubscription(): Promise<SubscriptionView>;
  },
  github: {
    getInstallUrl(): Promise<{ url: string }>;
    listInstallations(): Promise<GitHubInstallationView[]>;
    listOwners(): Promise<GitHubOwnerView[]>;
  },
  catalog: {
    getStacks(): Promise<StackCatalogItem[]>;
    getActions(): Promise<ActionCatalogItem[]>;
    getDeploymentProviders(): Promise<DeploymentProviderItem[]>;
  },
  projects: {
    createDraft(input: CreateProjectDraftInput): Promise<ProjectDraftView>;
    updateDraft(id: string, input: UpdateProjectDraftInput): Promise<ProjectDraftView>;
    validateDraft(id: string): Promise<ProjectDraftValidationView>;
    provisionDraft(id: string): Promise<ProvisioningJobView>;
    listProjects(): Promise<ProjectListItem[]>;
    getProject(id: string): Promise<ProjectDetailView>;
    getWorkflowRuns(id: string): Promise<WorkflowRunView[]>;
  }
};
```

## Workstream 8: Dashboard and Status Sync

### Goal

Show customers what happened after project creation.

### Project Detail Page Sections

1. Header:
   - Project name.
   - GitHub repo link.
   - Stack badge.
   - Status badge.

2. Setup checklist:
   - Missing secrets.
   - Missing variables.
   - Provider setup links.
   - Branch protection status.

3. Latest workflow runs:
   - Workflow name.
   - Branch.
   - Status.
   - Conclusion.
   - Started time.
   - Link to GitHub Actions run.

4. Generated configuration:
   - Manifest summary.
   - Selected actions.
   - Generated files.

5. Provisioning log:
   - Step timeline.
   - Retry button for retryable jobs.

### Workflow Run Sync Strategy

MVP:

- Poll GitHub API when user opens project detail page.
- Store latest runs in `workflow_runs`.

Better version:

- Subscribe to GitHub webhook events.
- Upsert workflow runs on `workflow_run` event.
- Poll only as fallback.

### Setup Checklist Model

```ts
export type SetupChecklistItem = {
  key: string;
  label: string;
  status: "complete" | "missing" | "manual" | "not_applicable";
  severity: "info" | "warning" | "blocking";
  actionUrl?: string;
  instructions: string;
};
```

Examples:

```json
[
  {
    "key": "secret.VERCEL_TOKEN",
    "label": "Add VERCEL_TOKEN repository secret",
    "status": "missing",
    "severity": "blocking",
    "actionUrl": "https://github.com/acme-school/student-portal/settings/secrets/actions",
    "instructions": "Create a Vercel token and add it as VERCEL_TOKEN in GitHub Actions secrets."
  }
]
```

## Workstream 9: Existing Repository Onboarding

### Goal

Let users add CI/CD to an existing GitHub repository without overwriting their code.

### Flow

1. User chooses `Add CI/CD to existing repository`.
2. User selects one repository from GitHub App installation.
3. Backend scans repository:
   - package files.
   - lock files.
   - framework config.
   - test folders.
   - Dockerfile.
   - existing `.github/workflows`.
4. Backend proposes detected stack and actions.
5. User confirms selections.
6. Backend creates a branch:
   - `cicd-saas/setup`
7. Backend commits generated files to that branch.
8. Backend opens a pull request.
9. PR body lists required secrets and variables.
10. Dashboard tracks PR status.

### Discovery Rules

Next.js:

- `package.json` contains `next`.
- `next.config.js`, `next.config.mjs`, or `next.config.ts` exists.

NestJS:

- `package.json` contains `@nestjs/core`.
- `nest-cli.json` exists.

React:

- `package.json` contains `react`.
- `vite.config.*` exists or `src/App.*` exists.

Node.js:

- `package.json` exists.
- No stronger framework match.

### Existing Repo Safety Rules

- Never push directly to `main`.
- Never overwrite an existing workflow file unless it contains the platform managed marker.
- If `.github/workflows/master-pipeline-fe.yml` exists and is not managed, create `.github/workflows/cicd-saas-pipeline.yml`.
- Always create a PR for existing repo onboarding.

## Workstream 10: Production Operations

### Required Production Services

```text
SaaS Web:
  Vercel or Render static/Node hosting.

SaaS API:
  Render, Fly.io, Railway, AWS ECS, or similar.

Database:
  Supabase Postgres or managed Postgres.

Queue:
  BullMQ with Redis, or database-backed queue for simpler MVP.

Stripe:
  Live products, prices, webhook endpoint.

GitHub:
  GitHub App, webhook endpoint, private key rotation plan.

Observability:
  Structured logs, error tracking, request IDs.
```

### Security Requirements

Authentication:

- HttpOnly secure cookies in production.
- CSRF protection for cookie-authenticated mutating requests.
- Password hashes with Argon2 or bcrypt.

Authorization:

- Every project request must verify account membership.
- Every provisioning request must verify subscription and plan limits.
- Every GitHub operation must verify the installation belongs to the account.

Secrets:

- GitHub App private key stored only in environment/secret manager.
- Stripe webhook secret stored only in environment/secret manager.
- User provider secrets should not be stored in MVP.
- If secret entry is later added, encrypt and forward to GitHub immediately.

Webhooks:

- Verify Stripe signatures.
- Verify GitHub signatures.
- Store event IDs to prevent duplicate processing.
- Return quickly and process heavy work asynchronously.

Audit:

- Record billing plan changes.
- Record GitHub installation changes.
- Record project provisioning.
- Record retries and failures.

### Observability

Log fields:

```json
{
  "requestId": "req_123",
  "accountId": "acc_123",
  "userId": "user_123",
  "projectId": "proj_123",
  "jobId": "job_123",
  "event": "provisioning.step.succeeded",
  "step": "create_repository",
  "durationMs": 1240
}
```

Metrics:

```text
checkout_sessions_created_total
stripe_webhooks_processed_total
github_installations_active_total
project_drafts_created_total
provisioning_jobs_queued_total
provisioning_jobs_failed_total
provisioning_step_duration_ms
workflow_runs_synced_total
```

## Detailed Phase Plan

### Phase 0: Productize the Workflow Engine

#### Task 0.1: Add Catalog Folder

Files:

```text
cicd-workflow\catalog\stacks.json
cicd-workflow\catalog\actions.json
cicd-workflow\catalog\providers.json
cicd-workflow\catalog\plans.json
cicd-workflow\catalog\workflow-refs.json
```

Steps:

1. Create catalog folder.
2. Add stack definitions for `nextjs` and `nestjs`.
3. Add action definitions for lint, typecheck, unit tests, build, Playwright, k6, Vercel, Render.
4. Add plan definitions for Free, Starter, Pro, Team.
5. Add workflow refs pinned to `v1`.
6. Add schema documentation.
7. Validate JSON syntax.

Acceptance:

- Catalog files can be consumed by the SaaS API without reading workflow YAML.

#### Task 0.2: Create Release Policy

Files:

```text
cicd-workflow\docs\workflow-release-policy.md
```

Content:

- `v1` is stable for generated customer repositories.
- Patch changes can be released as `v1.0.1` if tags are used semantically.
- Breaking workflow input changes require `v2`.
- Generated customer workflows must pin to stable tags.
- Internal development can track `main`.

Acceptance:

- Anyone reading the repo knows why generated workflows must not point to `@main`.

#### Task 0.3: Normalize Caller Templates

Files:

```text
cicd-workflow\templates\fe-pipeline-caller.yml
cicd-workflow\templates\be-pipeline-caller.yml
cicd-workflow\workflow-templates\nextjs-service-pipeline.yml
cicd-workflow\workflow-templates\nest-service-pipeline.yml
```

Steps:

1. Replace stale org/repo references with current platform repo.
2. Replace generated customer refs from `@main` to `@v1`.
3. Update comments to explain how SaaS-generated workflows are pinned.
4. Run YAML validation.

Acceptance:

- Generated workflow examples are aligned with the current GitHub organization.

### Phase 1: Build the SaaS API Skeleton

#### Task 1.1: Scaffold API

Files:

```text
cicd-saas-api\package.json
cicd-saas-api\src\main.ts
cicd-saas-api\src\app.module.ts
```

Steps:

1. Create NestJS project.
2. Add config module.
3. Add global validation pipe.
4. Add global exception filter.
5. Add request ID middleware.
6. Add health endpoint.

Acceptance:

- `GET /api/health` returns service status.
- API starts locally on port `4000`.

#### Task 1.2: Add Database

Files:

```text
cicd-saas-api\prisma\schema.prisma
cicd-saas-api\src\database\prisma.module.ts
cicd-saas-api\src\database\prisma.service.ts
```

Steps:

1. Add Prisma.
2. Add schema from this plan.
3. Create migration.
4. Add database service.
5. Add integration test that inserts and reads a user.

Acceptance:

- Database migration applies cleanly.
- Prisma client can read/write.

#### Task 1.3: Add Auth and Accounts

Files:

```text
cicd-saas-api\src\auth\*
cicd-saas-api\src\accounts\*
```

Steps:

1. Implement register.
2. Implement login.
3. Implement logout.
4. Create account automatically on register.
5. Add account membership guard.
6. Add tests for login and account access.

Acceptance:

- Registered user gets an account.
- Only members can access account resources.

### Phase 2: Add Billing

#### Task 2.1: Stripe Checkout

Files:

```text
cicd-saas-api\src\billing\billing.controller.ts
cicd-saas-api\src\billing\billing.service.ts
cicd-saas-api\src\billing\plan-catalog.ts
```

Steps:

1. Add plan catalog.
2. Add checkout session endpoint.
3. Add Stripe Customer creation/reuse.
4. Add success and cancel URLs.
5. Add metadata with `accountId` and `planKey`.

Acceptance:

- A logged-in account owner can receive a Stripe Checkout URL.

#### Task 2.2: Stripe Webhooks

Files:

```text
cicd-saas-api\src\billing\stripe-webhook.controller.ts
cicd-saas-api\src\billing\stripe-event.service.ts
```

Steps:

1. Add raw body parsing for webhook route.
2. Verify webhook signature.
3. Store processed Stripe event IDs.
4. Handle subscription events.
5. Update local subscription rows.
6. Add tests for active, canceled, duplicate, and invalid signature events.

Acceptance:

- Paid access changes only after verified webhook processing.

### Phase 3: Add GitHub App

#### Task 3.1: Installation Flow

Files:

```text
cicd-saas-api\src\github\github.controller.ts
cicd-saas-api\src\github\github.service.ts
```

Steps:

1. Add install URL endpoint.
2. Add callback endpoint.
3. Store installation ID and GitHub account login.
4. Add installation list endpoint.
5. Add account ownership checks.

Acceptance:

- User can connect GitHub and see the installation in the portal.

#### Task 3.2: GitHub API Wrapper

Files:

```text
cicd-saas-api\src\github\github-app-auth.service.ts
cicd-saas-api\src\github\github-api.service.ts
```

Steps:

1. Decode GitHub App private key from env.
2. Sign GitHub App JWT.
3. Create installation access token.
4. Add repository creation method.
5. Add file write method.
6. Add branch creation method.
7. Add variable and secret metadata methods.
8. Add workflow run methods.

Acceptance:

- Integration test can mock GitHub and verify correct API calls.
- Manual smoke can list installation repositories.

### Phase 4: Add Manifest and Renderer

#### Task 4.1: Manifest Schema

Files:

```text
cicd-saas-api\src\manifests\manifest.schema.ts
cicd-saas-api\src\manifests\manifest-validator.service.ts
```

Steps:

1. Add TypeScript types.
2. Add Zod or class-validator schema.
3. Validate repository rules.
4. Validate stack/action compatibility.
5. Validate plan access.
6. Add tests for valid and invalid combinations.

Acceptance:

- Invalid wizard choices fail before provisioning starts.

#### Task 4.2: Workflow Renderer

Files:

```text
cicd-saas-api\src\renderers\workflow-renderer.service.ts
cicd-saas-api\src\renderers\workflow-renderer.spec.ts
```

Steps:

1. Render Next.js caller workflow.
2. Render NestJS caller workflow.
3. Use stable workflow ref from manifest.
4. Snapshot generated YAML.
5. Parse generated YAML in tests.

Acceptance:

- Renderer output is deterministic.
- Generated YAML parses.

#### Task 4.3: Project File Renderers

Files:

```text
cicd-saas-api\src\renderers\readme-renderer.service.ts
cicd-saas-api\src\renderers\config-renderer.service.ts
cicd-saas-api\src\renderers\test-file-renderer.service.ts
```

Steps:

1. Render `README.md` setup instructions.
2. Render `cicd.config.json`.
3. Render optional Playwright test.
4. Render optional k6 smoke test.
5. Add snapshot tests.

Acceptance:

- Every selected action maps to generated files or required setup items.

### Phase 5: Add Provisioning

#### Task 5.1: Provisioning Queue

Files:

```text
cicd-saas-api\src\provisioning\provisioning.module.ts
cicd-saas-api\src\provisioning\provisioning.service.ts
cicd-saas-api\src\provisioning\provisioning-worker.service.ts
```

Steps:

1. Add provisioning job creation.
2. Add job status endpoint.
3. Add worker processor.
4. Add structured logs.
5. Add retry support for retryable failures.

Acceptance:

- Submitting a valid draft creates a queued job.

#### Task 5.2: GitHub Repository Provisioning

Files:

```text
cicd-saas-api\src\provisioning\provisioning-steps\*.ts
```

Steps:

1. Validate subscription.
2. Validate GitHub installation.
3. Validate repository availability.
4. Create repository from template.
5. Commit generated files.
6. Create `test` and `uat` branches from `main`.
7. Configure variables.
8. Record missing secrets.
9. Trigger first workflow if no blocking setup is missing.
10. Persist project row.

Acceptance:

- Real GitHub repo is created from a paid account flow.

### Phase 6: Build Portal

#### Task 6.1: Landing and Pricing

Files:

```text
cicd-saas-web\src\app\page.tsx
cicd-saas-web\src\app\pricing\page.tsx
cicd-saas-web\src\components\billing\pricing-table.tsx
```

Acceptance:

- Visitor understands product and can start subscription flow.

#### Task 6.2: Auth and App Shell

Files:

```text
cicd-saas-web\src\app\login\page.tsx
cicd-saas-web\src\app\register\page.tsx
cicd-saas-web\src\app\app\layout.tsx
```

Acceptance:

- User can register, log in, and enter dashboard.

#### Task 6.3: GitHub Onboarding

Files:

```text
cicd-saas-web\src\app\app\onboarding\page.tsx
cicd-saas-web\src\app\app\settings\github\page.tsx
cicd-saas-web\src\components\github\github-install-card.tsx
```

Acceptance:

- User can install GitHub App and see connected installation.

#### Task 6.4: Project Wizard

Files:

```text
cicd-saas-web\src\app\app\projects\new\page.tsx
cicd-saas-web\src\components\wizard\*.tsx
```

Acceptance:

- User can create and validate a project draft.
- Locked plan features are visible but disabled.
- Review page shows generated setup requirements.

### Phase 7: Dashboard

#### Task 7.1: Project List and Detail

Files:

```text
cicd-saas-web\src\app\app\projects\page.tsx
cicd-saas-web\src\app\app\projects\[projectId]\page.tsx
cicd-saas-web\src\components\projects\*.tsx
```

Acceptance:

- User can see all provisioned projects and open one.

#### Task 7.2: Workflow Status

Files:

```text
cicd-saas-api\src\workflows\*
cicd-saas-web\src\components\projects\workflow-run-table.tsx
```

Acceptance:

- Project detail shows recent GitHub Actions runs.

## Testing Strategy

### Unit Tests

Test:

- Plan feature gate logic.
- Manifest validation.
- Workflow rendering.
- Required setup item generation.
- GitHub API wrapper request construction.
- Stripe webhook event handling.

### Integration Tests

Test:

- Register -> account created.
- Checkout session -> Stripe customer stored.
- Stripe webhook -> subscription active.
- GitHub callback -> installation stored.
- Draft validation -> manifest generated.
- Provisioning job -> mocked GitHub operations executed in order.

### End-to-End Tests

Use Playwright against local web/API:

1. Register user.
2. Select Pro plan using Stripe test mode or mocked billing active state.
3. Connect mocked GitHub installation.
4. Create Next.js project draft.
5. Submit provisioning.
6. See project detail and setup checklist.

### Manual Smoke Test

Before calling MVP done:

1. Use Stripe test card.
2. Install real GitHub App into a test GitHub account.
3. Create a real private Next.js repo.
4. Confirm generated workflow exists.
5. Add required secrets if any.
6. Trigger workflow.
7. Confirm dashboard links to workflow run.

## Definition of Done by Milestone

### Milestone A: Engine Ready

- Catalog exists.
- Workflow refs are stable.
- Generated examples reference `@v1`.
- Docs explain customer setup.

### Milestone B: SaaS API Ready

- Auth works.
- Accounts work.
- Billing webhook activates plans.
- GitHub installation records work.
- Catalog endpoints work.

### Milestone C: Generation Ready

- Manifest validator works.
- Workflow renderer works.
- Generated file snapshots pass.
- Provisioning worker can run against mocked GitHub.

### Milestone D: MVP Live

- Real Stripe test subscription works.
- Real GitHub App install works.
- Real Next.js repository generation works.
- Dashboard shows project and setup checklist.

### Milestone E: Pro Features

- NestJS generation works.
- Playwright generation works.
- k6 generation works.
- Deploy provider checklist works.
- Auto-promotion can be enabled.

## Exact Build Order for the Next Coding Session

Start here:

1. In `cicd-workflow`, create `catalog/`.
2. Add `stacks.json`, `actions.json`, `providers.json`, `plans.json`, and `workflow-refs.json`.
3. Update workflow-template docs to reference `Tone-Lloyd-Sir-Catubag-CICD/cicd-workflow`.
4. Add `docs/workflow-release-policy.md`.
5. Add `examples/manifests/nextjs-basic.json`.
6. Add `examples/generated-workflows/nextjs-basic.yml`.
7. Validate JSON/YAML.
8. Commit workflow engine hardening.
9. Scaffold `cicd-saas-api`.
10. Implement auth, accounts, billing, GitHub App, manifest validation, renderer, provisioning in that order.

Do not start with the landing page. The landing page is easy to build later, but the product is only real once billing, GitHub App installation, and repository provisioning work end to end.
