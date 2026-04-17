# Central Workflow Template Setup Docs

This folder documents how to set up each ImplementSprint template with the central reusable pipelines.

Scope covered:
- Local templates in this workspace
- Central workflow caller templates
- Remote-sourced templates from ImplementSprint org (default branch, verified 2026-04-10)

## Canonical Repository Variable Names

Use these canonical names when configuring repositories:
- `FE_SINGLE_SYSTEMS_JSON`
- `FE_MULTI_SYSTEMS_JSON`
- `BACKEND_SINGLE_SYSTEMS_JSON`
- `BACKEND_MULTI_SYSTEMS_JSON`
- `MOBILE_SINGLE_SYSTEMS_JSON`
- `MOBILE_MULTI_SYSTEMS_JSON`

## Document Index

Local templates:
- [template-fe-single.md](template-fe-single.md)
- [template-fe-multi.md](template-fe-multi.md)
- [template-be-nest.md](template-be-nest.md)
- [template-be-node.md](template-be-node.md)
- [template-mobile-expo-single.md](template-mobile-expo-single.md)
- [template-mobile-react-native.md](template-mobile-react-native.md)
- [template-mobile-react-native-fix-e2e-policy.md](template-mobile-react-native-fix-e2e-policy.md)

Central caller templates:
- [template-callers.md](template-callers.md)
- [stack-onboarding-templates.md](stack-onboarding-templates.md)

Remote-sourced templates:
- [template-mobile-multi-remote.md](template-mobile-multi-remote.md)
- [template-mobile-kotlin-remote.md](template-mobile-kotlin-remote.md)
- [template-fe-react-remote.md](template-fe-react-remote.md)

Advanced setup:
- [mobile-release-signing-advanced.md](mobile-release-signing-advanced.md)

Migration and adoption:
- [migration-existing-repository.md](migration-existing-repository.md)

## Provider Source Paths

Use these source paths to obtain credentials:

Vercel:
- Token: Vercel Dashboard -> Settings -> Tokens
- Org ID: Team Settings -> General -> Team ID
- Project ID: Project Settings -> General -> Project ID

SonarCloud:
- Token: My Account -> Security -> Generate Token
- Organization key: Organization Settings
- Project key: Project Information / Project Settings

Grafana Cloud k6:
- Cloud token: k6 Cloud -> Project Settings -> API tokens
- Project ID: k6 Cloud project details page

GitHub PAT (`GH_PR_TOKEN`):
- GitHub -> Settings -> Developer settings -> Personal access tokens
- Minimum recommended scopes:
  - Fine-grained: Contents (read/write), Pull requests (read/write), Metadata (read)
  - Classic PAT fallback: `repo`

Supabase:
- URL + keys: Project Settings -> API
- `SUPABASE_SERVICE_ROLE_KEY` is high sensitivity and must stay in secrets manager only

Internal API Center:
- `API_CENTER_BASE_URL` and `API_CENTER_API_KEY` are organization-managed values
- Obtain from platform owners / API Center admin

## Branch Policy Baseline

All template callers are designed for:
- `test`
- `uat`
- `main`

Promotion intent is linear:
- `test` -> `uat` -> `main`

## Notes

- Current workflow refs are documented exactly as observed at verification time.
- Canonical variable names are enforced in this docs set, even if some template READMEs still show older naming.
- Repositories without workflow files should use the migration runbook for first-time caller onboarding.
