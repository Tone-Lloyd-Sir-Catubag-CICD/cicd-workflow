# Basic Workflow Catalog

This reset keeps only the baseline GitHub Actions workflow library. New repositories should start from `workflow-templates/` and call these reusable workflows directly.

## Remaining Reusable Workflows

| Workflow | Role | Purpose |
| --- | --- | --- |
| [validate-subscription.yml](validate-subscription.md) | access gate | Validate CI subscription access before paid workflow execution. |
| [lint-check.yml](lint-check.md) | primitive check | Run lint and optional format checks. |
| [frontend-tests.yml](frontend-tests.md) | primitive check | Run frontend unit tests with coverage. |
| [backend-tests.yml](backend-tests.md) | primitive check | Run backend unit and optional integration tests with coverage. |
| [mobile-tests.yml](mobile-tests.md) | primitive check | Run mobile unit tests with coverage. |
| [security-scan.yml](security-scan.md) | primitive check | Run dependency and source security scans. |
| [docker-build.yml](docker-build.md) | build | Build, optionally push, and scan Docker images. |
| [workflow-validation.yml](workflow-validation.md) | maintenance | Validate GitHub Actions workflow shape, contract docs, and templates. |

## Consumer Templates

| Template | Purpose |
| --- | --- |
| `workflow-templates/standalone-lint.yml` | Lint-only workflow. |
| `workflow-templates/fe-react.yml` | React frontend baseline: tests, lint, security, build. |
| `workflow-templates/fe-nextjs.yml` | Next.js frontend baseline: tests, lint, security, build. |
| `workflow-templates/be-nodejs.yml` | Node.js backend baseline: tests, lint, security, optional Docker. |
| `workflow-templates/be-nestjs.yml` | NestJS backend baseline: tests, lint, security, optional Docker. |

## Rules

- `.yml` files are GitHub Actions workflows or reusable workflow templates.
- `.md` files document workflow contracts only.
- Keep ordering in consumer workflows with `needs`.
- Keep all workflow runtime dependencies current. Node.js defaults should track the current Active LTS release, and GitHub Action pins should move to current stable major versions after checking runner compatibility.
- Do not reintroduce deploy, promotion, release, E2E, performance, or stack-composition workflows until the baseline is stable.
