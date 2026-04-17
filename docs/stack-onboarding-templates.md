# Stack Onboarding Templates

This layer turns the reusable stack workflows into a user-facing product flow.

## What it adds

- `workflow-templates/`
  - Stack-specific GitHub workflow templates for Node.js, NestJS, React, Next.js, React Native, and Expo.
- `.github/actions/discover-service`
  - A reusable discovery action that scans a target repository, detects the most likely service folder for the selected stack, inspects package scripts, and emits safe defaults for the caller workflow.

## Intended product flow

1. Publish the files in `workflow-templates/` from the organization `.github` repository.
2. A customer chooses the stack-specific template in GitHub's "New workflow" UI.
3. The generated caller workflow runs the discovery action first.
4. The discovery action:
   - scans the repo for matching stack candidates
   - narrows to the changed service when possible
   - infers the package manager
   - infers lint, typecheck, build, test, Playwright, and k6 defaults where they are safely detectable
5. The caller workflow invokes the matching reusable stack workflow from `ImplementSprint/central-workflow`.

## Current assumptions

- Central workflow repository reference is currently `ImplementSprint/central-workflow@main`
- Branch baseline is `test`, `uat`, and `main`
- Optional deployment and approval wiring can be driven by repository variables such as:
  - `UAT_BASE_URL`
  - `UAT_HEALTHCHECK_URL`
  - `UAT_COMMAND`
  - `UAT_DEPLOY_COMMAND`
  - `REQUIRE_UAT_APPROVAL`
  - `REQUIRE_PRODUCTION_APPROVAL`
  - `PRODUCTION_STAGING_URL`
  - `EAS_BUILD_COMMAND`

## Important constraints

- GitHub workflow templates only appear in the GitHub UI when they live in the organization `.github` repository under `workflow-templates/`.
- The templates in this repo are publishable assets, not UI-active by themselves until moved or mirrored there.
- Multi-service repos with more than one candidate of the same stack may still need an explicit `service_path` override in the generated workflow.

## Recommended release step

- Replace `@main` refs in the templates with a version tag before publishing broadly.
