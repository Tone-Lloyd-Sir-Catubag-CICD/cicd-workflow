# validate-subscription.yml

## Role
Access gate.

## Purpose
Validates CI subscription access before paid workflow execution.

## Public Contract
- Source workflow: `.github/workflows/validate-subscription.yml`
- Inputs: none
- Secrets: `CI_TOKEN`
- Outputs: none

## Usage
Add as the first job in consumer workflows when subscription enforcement is required.
Downstream paid jobs must declare `needs: validate-access` so subscription failure stops the workflow before lint, test, build, or deploy work begins.

```yaml
jobs:
  validate-access:
    uses: Tone-Lloyd-Sir-Catubag-CICD/central-workflow/.github/workflows/validate-subscription.yml@v1
    secrets:
      CI_TOKEN: ${{ secrets.CI_TOKEN }}

  unit-tests:
    needs: validate-access
    uses: Tone-Lloyd-Sir-Catubag-CICD/central-workflow/.github/workflows/frontend-tests.yml@v1
```
