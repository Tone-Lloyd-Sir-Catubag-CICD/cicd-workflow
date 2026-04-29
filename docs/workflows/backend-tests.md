# backend-tests.yml Contract

This Markdown file is documentation only. GitHub Actions does not execute this file.

The executable reusable workflow is:

```text
central-workflow/.github/workflows/backend-tests.yml
```

## Role
Primitive reusable workflow.

## Purpose
Runs backend unit tests and optional integration tests with coverage.

## Public Contract
- Source workflow: `.github/workflows/backend-tests.yml`
- Trigger: `workflow_call`
- Required inputs: `system-name`
- Optional inputs: `working-directory`, `backend-stack`, `node-version`, `test-command`, `integration-test-command`, `coverage-threshold`, `run-parallel`, `upload-artifact`
- Secrets: none
- Outputs: `unit-test-result`, `integration-test-result`, `coverage-percent`

## Usage
Call this from a real GitHub Actions workflow in a consumer repository, such as `.github/workflows/backend-ci.yml`.

```yaml
name: Backend CI

on:
  push:
    branches: [test, uat, main]
  pull_request:
    branches: [test, uat, main]
  workflow_dispatch:

jobs:
  unit-tests:
    uses: Tone-Lloyd-Sir-Catubag-CICD/central-workflow/.github/workflows/backend-tests.yml@v1
    with:
      working-directory: .
      system-name: backend
      backend-stack: nestjs
      node-version: 24
      test-command: npm test
      run-parallel: false
```

Ordering belongs in the caller workflow with `needs`. For example, a Docker build should wait for backend tests like this:

```yaml
jobs:
  unit-tests:
    uses: Tone-Lloyd-Sir-Catubag-CICD/central-workflow/.github/workflows/backend-tests.yml@v1
    with:
      system-name: backend

  docker:
    needs: [unit-tests]
    uses: Tone-Lloyd-Sir-Catubag-CICD/central-workflow/.github/workflows/docker-build.yml@v1
    with:
      working-directory: .
      image-name: backend
```

## Notes
- This workflow is safe to run standalone.
- It does not call lint, security, Docker, deploy, or promotion internally.
- If `integration-test-command` is empty, integration tests are skipped.
- If the test command does not create `coverage/coverage-summary.json`, the workflow reports coverage as `unknown` instead of failing only because coverage is missing.
