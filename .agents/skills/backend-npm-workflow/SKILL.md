---
name: Backend NPM & Proto Workflow
description: Strict workflow for modifying npm-packages and proto-registry.
---

# NPM Packages Workflow

## `npm-packages`
- The `npm-packages` repository always represents a definitive version.
- **Modification Rule**: If you modify ANY package in `npm-packages`, you **MUST** push to git and **WAIT for the CI to pass**.
- **Versioning**: 
  - If CI passes on a PR -> you get a temporary version.
  - If CI passes on `main` -> you get a definitive version.
- **Dependencies**: You CANNOT run `yarn up` in other repositories to apply changes until the CI has completely passed and generated the new version.
- **Changesets**: 
  - After modifications, you MUST run `yarn changeset add message`.
  - Then run `yarn changeset version` to bump all inherited/dependent packages.
  - **CRITICAL**: Never bump the same package twice on the same branch (e.g., do not go from 3.1 -> 3.3).

## `proto-registry`
- All protobuf definitions reside in the `proto-registry` repository.
- Merging on `main` requires `buf lint` to succeed.
- Successful merges automatically update the `contract` and `contract-nest` packages via a PR to deploy a temporary version.
