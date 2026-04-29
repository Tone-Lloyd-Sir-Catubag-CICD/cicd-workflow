# Granular Workflow Templates

These templates are the consumer-facing entrypoints for new repositories.

- Copy the closest `*.yml` file into `.github/workflows/` in the consumer repo.
- Keep ordering in the copied workflow with `needs`.
- Call central reusable workflows directly from `Tone-Lloyd-Sir-Catubag-CICD/central-workflow/.github/workflows/*.yml@v1`.
- Every template starts with `validate-access`, which requires the platform-provisioned `CI_TOKEN` repository secret.
- Do not use old long-pipeline caller files for new granular workflows.
- Keep runtime and action versions current. Default Node.js to the current Active LTS release, and update reusable workflow action pins when new stable major versions are released.

Each workflow template has a paired `*.properties.json` file for catalog metadata.
