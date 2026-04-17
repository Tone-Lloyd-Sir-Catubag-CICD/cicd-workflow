# Workflow Templates

These files are the user-facing onboarding layer for the reusable microservice workflows.

How they are intended to be used:

- Publish them from the organization `.github` repository inside `workflow-templates/`.
- A user chooses the stack-specific template in GitHub's "New workflow" UI.
- The generated workflow runs a discovery step first to detect the correct service folder and infer safe defaults.
- The caller workflow then invokes the matching reusable stack workflow from `ImplementSprint/central-workflow`.

Each template currently assumes:

- Central workflow repository: `ImplementSprint/central-workflow`
- Branch policy: `test`, `uat`, `main`
- Optional environment wiring through repository variables such as `UAT_BASE_URL`, `UAT_COMMAND`, `REQUIRE_UAT_APPROVAL`, and `REQUIRE_PRODUCTION_APPROVAL`

Before publishing:

- Pin `@main` references to a release tag.
- Move this folder into the org-level `.github` repository if you want GitHub's template picker UI.
