# TBDocs

[![GitHub Super-Linter](https://github.com/actions/typescript-action/actions/workflows/linter.yml/badge.svg)](https://github.com/super-linter/super-linter)
![CI](https://github.com/actions/typescript-action/actions/workflows/ci.yml/badge.svg)

Tool for automating docs generation from source codes docs annotations (like
TSDocs, JavaDocs, JsDocs etc.) to SSG websites that supports markdown (like
Docusaurus, Hugo, Jekyll etc.).

We are in the MVP phase testing **TSDocs -> Docusaurus only**.

## Overview

TBDocs has two main components:

- **docs-report**: scan your codebase to find docs annotations errors or
  accidental apis exposures, undocumented apis, forgotten apis that should be
  exposed.
- **docs-generator**: scan your codebase to extract all the docs annotations and
  generate markdown files.

**Regular PRs against main branch:**

```mermaid
flowchart TD
   A[Source Code] --> PR[New PR]
  PR --> DR[docs-report]
```

**Cutting new Releases Automated Docs generated to target Docs repo:**

```mermaid
flowchart TD
  B[New Release] --> DG[docs-generator]
  DG --> SSG[New PR with auto-generated md docs]
```

### Supported Pipelines

**Typescript**

- docs standard: [TSDoc](https://tsdoc.org/)
- docs-report: [api-extractor](https://api-extractor.com/pages/overview/intro/)
- docs-generator:
  [typedoc-plugin-markdown](https://github.com/tgreyuk/typedoc-plugin-markdown)

## Initial Setup

After you've cloned the repository to your local machine or codespace, you'll
need to perform some initial setup steps before you can develop your action.

> [!NOTE]
>
> You'll need to have a reasonably modern version of
> [Node.js](https://nodejs.org) handy. If you are using a version manager like
> [`nvm`](https://github.com/nvm-sh/nvm), you can run `nvm use` in the root of
> the repository. Otherwise, 20.x or later should work!

1. :hammer_and_wrench: Install the dependencies

   ```bash
   npm install
   ```

1. :building_construction: Package the TypeScript for distribution

   ```bash
   npm run bundle
   ```

1. :white_check_mark: Run the tests

   ```bash
   $ npm test

   PASS  ./index.test.js
     ✓ throws invalid number (3ms)
     ✓ wait 500 ms (504ms)
     ✓ test runs (95ms)

   ...
   ```

## Running locally

```sh
export GITHUB_REPOSITORY=test/test
export INPUT_DOCS_REPORT=api-extractor
export INPUT_DOCS_GENERATOR=typedoc-markdown
node scripts/main.js
```

## Testing with Docker

```sh
docker build -f Dockerfile . --tag tbdocs-app:latest

# now from the repo you want to analyze & generate docs
docker run -v $(pwd):/github/workspace/ \
   --workdir /github/workspace          \
   -e "GITHUB_REPOSITORY=org/repo"      \
   -e "INPUT_PROJECT_PATH=."            \
   -e "INPUT_DOCS_REPORT=api-extractor" \
   -e "INPUT_DOCS_GENERATOR=typedoc-markdown" \
   tbdocs-app

# to test opening a PR with the generated docs
docker run -v $(pwd):/github/workspace/ \
   --workdir /github/workspace          \
   -e "GITHUB_REPOSITORY=TBD54566975/tbdex-js" \
   -e "INPUT_PROJECT_PATH=packages/protocol"   \
   -e "INPUT_DOCS_GENERATOR=typedoc-markdown"  \
   -e "INPUT_DOCS_TARGET_OWNER_REPO=TBD54566975/developer.tbd.website" \
   -e "INPUT_DOCS_TARGET_BRANCH=tbdocs_tbdex-js_protocol_v0.1.2" \
   -e "INPUT_DOCS_TARGET_PR_BASE_BRANCH=main" \
   -e "INPUT_DOCS_TARGET_REPO_PATH=site/docs/tbdex-js/api-reference/protocol" \
   -e "INPUT_TOKEN=<gh-token>" \
   tbdocs-app
```

## Update the Action Code

1. Create a new branch

   ```bash
   git checkout -b <new-branch-name>
   ```

1. Replace the contents of `src/` with your action code
1. Add tests to `__tests__/` for your source code
1. Format, test, and build the action

   ```bash
   npm run all
   ```

1. Commit your changes

   ```bash
   git add .
   git commit -m "My first action is ready!"
   ```

1. Push them to your repository

   ```bash
   git push -u origin <new-branch-name>
   ```

1. Create a pull request and get feedback on your action
1. Merge the pull request into the `main` branch

Your action is now published! :rocket:

For information about versioning the action, see
[Versioning](https://github.com/actions/toolkit/blob/master/docs/action-versioning.md)
in the GitHub Actions toolkit.
