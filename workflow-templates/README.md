# Granular Workflow Templates

These templates are the consumer-facing entrypoints for new repositories.

- Copy the closest `*.yml` file into `.github/workflows/` in the consumer repo.
- Keep ordering in the copied workflow with `needs`.
- Call central reusable workflows directly from `Tone-Lloyd-Sir-Catubag-CICD/central-workflow/.github/workflows/*.yml@v1`.
- Every template starts with `validate-access`, which requires the platform-provisioned `CI_TOKEN` repository secret.
- Do not use old long-pipeline caller files for new granular workflows.
- Keep runtime and action versions current. Default Node.js to the current Active LTS release, and update reusable workflow action pins when new stable major versions are released.

Each workflow template has a paired `*.properties.json` file for catalog metadata.

The platform catalog should choose templates through a composed model:

```text
repoShape -> projectTypeId -> workflowRecipeId -> options
```

Workflow templates are renderable recipe targets, not one-off files for every
possible option combination. Project types and workflow recipes should declare
which options they support, and the backend should remove or configure optional
jobs while keeping `validate-access` first.
