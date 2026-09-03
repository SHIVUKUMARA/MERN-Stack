# CI/CD with GitHub Actions, Docker, GHCR and Render

This document explains the complete CI/CD setup used in this project.

## Technologies

- GitHub Actions — CI/CD automation
- Node.js 24 — backend runtime
- npm ci — reproducible dependency installation
- ESLint — code-quality checks
- Jest — automated tests
- Docker — production container image
- GitHub Container Registry (GHCR) — Docker image registry
- Render Deploy Hook — deployment trigger
- GitHub Actions `GITHUB_TOKEN` — GHCR authentication

The pipeline is currently being tested on `feature/CICD`. After testing, change the workflow to `main`.

---

## 1. What is CI/CD?

### Continuous Integration (CI)

CI automatically checks code after changes are pushed or a pull request is created.

This project runs:

```text
Checkout
   ↓
Node.js 24
   ↓
npm ci
   ↓
ESLint
   ↓
Jest
```

### Continuous Deployment (CD)

CD deploys code after CI succeeds.

This project runs:

```text
CI succeeds
   ↓
Build Docker image
   ↓
Push image to GHCR
   ↓
Trigger Render Deploy Hook
   ↓
Render deployment
```

The CD job depends on CI through:

```yaml
needs: ci
```

---

## 2. Architecture

```text
Developer
   ↓
Git push / Pull Request
   ↓
GitHub Actions
   ↓
CI
 ├── Checkout
 ├── Node.js 24
 ├── npm ci
 ├── ESLint
 └── Jest
   ↓
CI SUCCESS
   ↓
CD
 ├── Login to GHCR
 ├── Build Docker image
 ├── Push image to GHCR
 └── Trigger Render Deploy Hook
                    ↓
                 Render
                    ↓
             Deployed Backend
```

---

## 3. Project Structure

Relevant files:

```text
MERN-Stack/
├── .github/
│   └── workflows/
│       └── ci-cd.yml
│
├── server/
│   ├── docker/
│   │   └── production/
│   │       └── Dockerfile
│   ├── tests/
│   │   └── example.test.js
│   ├── package.json
│   └── package-lock.json
└── ...
```

GitHub automatically detects workflow files inside:

```text
.github/workflows/
```

---

## 4. Prerequisites

Make sure the project has:

- A GitHub repository
- Node.js backend
- `package.json`
- `package-lock.json`
- ESLint
- Jest
- Production Dockerfile
- Working Docker setup
- Render service
- Render Deploy Hook

The Node.js backend is inside:

```text
server/
```

---

## 5. package.json Scripts

The CI pipeline uses npm scripts.

Example:

```json
{
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "lint": "eslint .",
    "test": "jest"
  }
}
```

CI executes:

```bash
npm run lint
npm test
```

Run these locally before pushing:

```bash
npm run lint
npm test
```

---

# 6. GitHub Actions Workflow

The current combined workflow is:

```yaml
name: CI/CD

on:
  push:
    branches:
      - feature/CICD

  pull_request:
    branches:
      - feature/CICD

permissions:
  contents: read
  packages: write

jobs:
  ci:
    runs-on: ubuntu-latest

    defaults:
      run:
        working-directory: server

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: npm
          cache-dependency-path: server/package-lock.json

      - name: Install dependencies
        run: npm ci

      - name: Lint
        run: npm run lint

      - name: Run tests
        run: npm test

  cd:
    needs: ci
    if: github.event_name == 'push' && github.ref == 'refs/heads/feature/CICD'

    runs-on: ubuntu-latest

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Login to GHCR
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Build Docker image
        run: |
          docker build             -f server/docker/production/Dockerfile             -t ghcr.io/shivukumara/mern-backend:${{ github.sha }}             server

      - name: Push Docker image
        run: |
          docker push             ghcr.io/shivukumara/mern-backend:${{ github.sha }}

      - name: Deploy to Render
        run: curl -X POST "${{ secrets.RENDER_DEPLOY_HOOK }}"
```

---

# 7. Workflow Trigger

```yaml
on:
```

Defines when GitHub starts the workflow.

### Push

```yaml
push:
  branches:
    - feature/CICD
```

Runs when code is pushed to `feature/CICD`.

Example:

```bash
git push origin feature/CICD
```

### Pull Request

```yaml
pull_request:
  branches:
    - feature/CICD
```

Runs when a pull request targets `feature/CICD`.

For production, these branches can later become `main`.

---

# 8. Permissions

```yaml
permissions:
  contents: read
  packages: write
```

### `contents: read`

Allows the workflow to read repository contents.

### `packages: write`

Allows the workflow to publish the Docker image to GHCR.

---

# 9. CI Job

```yaml
ci:
```

`ci` is the job ID.

```yaml
runs-on: ubuntu-latest
```

GitHub creates a temporary Ubuntu runner for the job.

---

## Working Directory

```yaml
defaults:
  run:
    working-directory: server
```

All `run:` commands in this job execute inside:

```text
server/
```

Therefore:

```yaml
run: npm ci
```

uses:

```text
server/package.json
server/package-lock.json
```

---

# 10. Checkout

```yaml
- name: Checkout repository
  uses: actions/checkout@v4
```

Downloads the repository source code onto the GitHub runner.

---

# 11. Node.js Setup

```yaml
- name: Setup Node.js
  uses: actions/setup-node@v4
```

Configures Node.js on the runner.

```yaml
node-version: 24
```

Uses Node.js 24.

```yaml
cache: npm
```

Enables npm dependency caching.

```yaml
cache-dependency-path: server/package-lock.json
```

Uses the backend lockfile when determining the npm cache state.

---

# 12. Install Dependencies

```yaml
- name: Install dependencies
  run: npm ci
```

`npm ci` performs a clean, lockfile-based installation.

It is preferred for CI because the dependency installation is reproducible.

---

# 13. Lint

```yaml
- name: Lint
  run: npm run lint
```

Runs the project's ESLint script.

If lint exits with an error:

```text
CI fails
↓
CD does not run
```

Warnings do not necessarily fail the workflow unless the ESLint configuration treats them as errors.

---

# 14. Tests

```yaml
- name: Run tests
  run: npm test
```

Runs Jest.

If tests fail:

```text
CI fails
↓
CD does not run
```

---

# 15. CD Job

```yaml
cd:
```

The CD job builds and publishes the Docker image and triggers Render.

---

# 16. CI → CD Dependency

```yaml
needs: ci
```

This is the dependency between the jobs.

```text
CI
 ↓
must succeed
 ↓
CD
```

If CI fails, CD is skipped.

---

# 17. CD Condition

```yaml
if: github.event_name == 'push' && github.ref == 'refs/heads/feature/CICD'
```

CD runs only when:

1. The workflow was triggered by a push.
2. The push was to `feature/CICD`.
3. CI succeeded because of `needs: ci`.

Therefore:

| Event                        |     CI |            CD |
| ---------------------------- | -----: | ------------: |
| Push to feature/CICD         |    Yes | Yes, after CI |
| Pull request to feature/CICD |    Yes |            No |
| CI fails                     | Failed |       Skipped |
| CI succeeds                  | Passed |          Runs |

---

# 18. Login to GHCR

```yaml
- name: Login to GHCR
  uses: docker/login-action@v3
```

Uses Docker's login action.

```yaml
registry: ghcr.io
```

Selects GitHub Container Registry.

```yaml
username: ${{ github.actor }}
```

Uses the GitHub account that triggered the workflow.

```yaml
password: ${{ secrets.GITHUB_TOKEN }}
```

Uses GitHub's automatically generated workflow token.

A Personal Access Token is not required just for this basic GHCR publishing setup.

---

# 19. Build Docker Image

```yaml
docker build   -f server/docker/production/Dockerfile   -t ghcr.io/shivukumara/mern-backend:${{ github.sha }}   server
```

### `docker build`

Builds a Docker image.

### `-f`

Specifies the Dockerfile:

```text
server/docker/production/Dockerfile
```

### `-t`

Assigns the image name and tag.

The image name is:

```text
ghcr.io/shivukumara/mern-backend
```

The tag is:

```text
${{ github.sha }}
```

`github.sha` is the commit SHA that triggered the workflow.

Example:

```text
ghcr.io/shivukumara/mern-backend:a5dda2977ff57da7cc77f016b89a4dae67324edc
```

### `server`

This is the Docker build context.

---

# 20. Push Docker Image

```yaml
docker push ghcr.io/shivukumara/mern-backend:${{ github.sha }}
```

Uploads the image to GitHub Container Registry.

The flow is:

```text
Docker build
   ↓
Local runner image
   ↓
docker push
   ↓
GHCR
```

---

# 21. Why GHCR?

GHCR stores the Docker image created by the CI/CD pipeline.

Instead of keeping the image only on the GitHub Actions runner, it is published to a registry.

The image is identified by its commit SHA:

```text
commit
  ↓
Docker image
  ↓
GHCR
```

This provides traceability between source code and the container image.

---

# 22. Render Deploy Hook

```yaml
- name: Deploy to Render
  run: curl -X POST "${{ secrets.RENDER_DEPLOY_HOOK }}"
```

`curl` sends an HTTP request.

```text
-X POST
```

means use the HTTP POST method.

The URL is stored in:

```text
RENDER_DEPLOY_HOOK
```

as a GitHub Actions secret.

Calling the hook tells Render to start the configured deployment.

---

# 23. Creating a Render Deploy Hook

In Render:

1. Open the backend service.
2. Open the service settings.
3. Find the Deploy Hook option.
4. Create/copy the deploy hook.
5. Keep the URL private.

Do not commit the URL into Git.

---

# 24. Adding the Render Secret to GitHub

Open:

```text
GitHub Repository
→ Settings
→ Secrets and variables
→ Actions
→ New repository secret
```

Create:

```text
Name:
RENDER_DEPLOY_HOOK
```

Set the value to the Render deploy hook URL.

The workflow accesses it with:

```yaml
${{ secrets.RENDER_DEPLOY_HOOK }}
```

---

# 25. GitHub GITHUB_TOKEN

The workflow uses:

```yaml
${{ secrets.GITHUB_TOKEN }}
```

GitHub automatically creates this token for the workflow.

It is used here to authenticate with GHCR.

The workflow grants:

```yaml
packages: write
```

so the token can publish the Docker image.

Do not print the token or hard-code it into the workflow.

---

# 26. Secrets and Security

Never commit sensitive values such as:

```text
MongoDB credentials
JWT secrets
Cloudinary secrets
Redis credentials
Render deploy hook
API keys
```

Use environment variables/secrets instead.

For GitHub Actions:

```text
GitHub Repository
→ Settings
→ Secrets and variables
→ Actions
```

---

# 27. Complete Execution Example

When this command is executed:

```bash
git push origin feature/CICD
```

the pipeline performs:

```text
Push
 ↓
GitHub receives commit
 ↓
CI starts
 ↓
Checkout
 ↓
Setup Node.js 24
 ↓
npm ci
 ↓
npm run lint
 ↓
npm test
 ↓
CI SUCCESS
 ↓
CD starts
 ↓
Login to GHCR
 ↓
Docker build
 ↓
Docker image created
 ↓
Docker push
 ↓
Image stored in GHCR
 ↓
Render Deploy Hook called
 ↓
Render starts deployment
```

---

# 28. Pull Request Behavior

For a pull request:

```text
Pull Request
     ↓
    CI
     ↓
npm ci
     ↓
lint
     ↓
test
```

CD does not run.

This is intentional.

We do not want every pull request to deploy the application.

---

# 29. Failed CI Behavior

If lint fails:

```text
CI
 ↓
Lint ❌
 ↓
CI FAILED
 ↓
CD SKIPPED
```

If tests fail:

```text
CI
 ↓
Tests ❌
 ↓
CI FAILED
 ↓
CD SKIPPED
```

This protects deployment from code that failed the project's quality checks.

---

# 30. Failed Docker Build

If CI succeeds but Docker build fails:

```text
CI ✅
 ↓
CD
 ↓
Docker Build ❌
```

The following steps are not executed successfully.

The image is not pushed and the Render deployment step is not reached.

---

# 31. Failed GHCR Push

If the Docker image builds but the push fails:

```text
Docker Build ✅
 ↓
GHCR Push ❌
 ↓
Render deployment is not reached
```

---

# 32. Render Deployment Verification

Triggering the Render deploy hook means Render was instructed to deploy.

It does not by itself prove that the application became healthy.

If deployment has a problem, check the Render deployment logs.

---

# 33. Docker Image Tagging

This workflow uses:

```yaml
${{ github.sha }}
```

instead of only:

```text
latest
```

Example:

```text
Commit A → image:A
Commit B → image:B
Commit C → image:C
```

This makes each image traceable to a Git commit.

---

# 34. Moving to main

The current branch is:

```text
feature/CICD
```

This is temporary while building/testing the pipeline.

After the pipeline is finalized, change:

```yaml
branches:
  - feature/CICD
```

to:

```yaml
branches:
  - main
```

And change:

```yaml
if: github.event_name == 'push' && github.ref == 'refs/heads/feature/CICD'
```

to:

```yaml
if: github.event_name == 'push' && github.ref == 'refs/heads/main'
```

The intended production flow becomes:

```text
Feature branch
      ↓
Pull Request
      ↓
CI
      ↓
Code review
      ↓
Merge to main
      ↓
CI
      ↓
CD
      ↓
Docker
      ↓
GHCR
      ↓
Render
```

---

# 35. Useful Git Commands

Check changes:

```bash
git status
```

Stage files:

```bash
git add .
```

Commit:

```bash
git commit -m "Update CI/CD pipeline"
```

Push:

```bash
git push origin feature/CICD
```

---

# 36. Checking GitHub Actions

Open:

```text
GitHub Repository
→ Actions
→ CI/CD
```

You should see:

```text
CI
 ↓
CD
```

CI steps:

```text
Checkout repository
Setup Node.js
Install dependencies
Lint
Run tests
```

CD steps:

```text
Checkout repository
Login to GHCR
Build Docker image
Push Docker image
Deploy to Render
```

---

# 37. Final Checklist

Before considering the current pipeline complete:

- [x] GitHub repository configured
- [x] GitHub Actions workflow created
- [x] Push trigger configured
- [x] Pull request trigger configured
- [x] Node.js 24 configured
- [x] npm cache configured
- [x] `npm ci` configured
- [x] ESLint configured
- [x] Jest configured
- [x] CI → CD dependency configured
- [x] Docker production image builds
- [x] GHCR authentication configured
- [x] GHCR `packages: write` permission configured
- [x] Docker image pushed to GHCR
- [x] Render Deploy Hook configured
- [x] `RENDER_DEPLOY_HOOK` stored as a GitHub Secret
- [x] Render deployment successfully tested
- [x] End-to-end pipeline verified

---

# 38. Final Result

The implemented pipeline is:

```text
                    Git Push
                       │
                       ▼
                GitHub Actions
                       │
                       ▼
                     CI
                       │
             ┌─────────┼─────────┐
             ▼         ▼         ▼
           npm ci    ESLint     Jest
             │         │         │
             └─────────┼─────────┘
                       │
                    SUCCESS
                       │
                       ▼
                      CD
                       │
                       ▼
                 Docker Build
                       │
                       ▼
                     GHCR
                       │
                       ▼
              Render Deploy Hook
                       │
                       ▼
                    Render
                       │
                       ▼
               Deployed Backend
```

This is the current CI/CD implementation for the backend project.
