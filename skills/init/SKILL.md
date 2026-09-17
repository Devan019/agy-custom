---
name: init
description: Initialize or Update context file
---

# Project Initialization Workflow (`/init`)

This skill defines the autonomous initialization and project context discovery workflow for Antigravity CLI (AGY).

The goal is to analyze the repository, determine its architecture, technology stack, configuration, and developer workflows, and produce or update a high-signal `GEMINI.md` file at the root of the project to guide future AGY pair-programming sessions.

---

## Operating Principles & Key Differences

- **Direct Execution**: Do NOT ask the user what setup they want (e.g. do NOT ask if skills, rules, hooks, or context files should be created). Proceed directly with project exploration and documentation.
- **Strict Scope**: Work exclusively within the current project/workspace root.
- **Safety First**: Non-destructive analysis only. Never modify source code, never run install/build scripts that alter state, never modify Git state, and never expose secrets.

---

## Workflow Phases

### Phase 1 — Direct Project Exploration Setup

When `/init` is invoked:
1. **Locate Workspace Root**: Identify the active project/workspace root directory.
2. **Confine Boundary**: Work ONLY inside the current workspace. Do not traverse into user home directories, sibling projects, or parent directories unless explicitly directed.
3. **Safety Guardrails**:
   - Do NOT modify source code.
   - Do NOT install or update dependencies (no `npm install`, `pip install`, `cargo build`, etc.).
   - Do NOT delete files.
   - Do NOT modify Git state (no commit, checkout, push, pull, rebase, stash).
   - Do NOT log, print, or store secrets, tokens, keys, or passwords.

---

### Phase 2 — Explore the Codebase

Intelligently examine project structure and key configuration files rather than reading every single file recursively.

#### Files to Inspect (when present):
- **Package Manifests & Locks**: `package.json`, `pnpm-lock.yaml`, `package-lock.json`, `yarn.lock`, `bun.lockb`, `bun.lock`, `requirements.txt`, `pyproject.toml`, `Pipfile`, `Cargo.toml`, `go.mod`, `pom.xml`, `build.gradle`
- **Containers & Orchestration**: `Dockerfile`, `docker-compose.yml`, `compose.yaml`, `Containerfile`
- **Build & Task Runners**: `Makefile`, `Taskfile.yml`, `Justfile`, `CMakeLists.txt`, `Rakefile`
- **Compiler & Framework Configs**: `tsconfig.json`, `vite.config.*`, `next.config.*`, `svelte.config.*`, `angular.json`, `webpack.config.*`, `tailwind.config.*`
- **Documentation & Instructions**: `README.md`, `CONTRIBUTING.md`, `docs/`, `AGENTS.md`, existing `GEMINI.md`
- **Assistant & Agent Rules**: `.cursor/rules/`, `.cursorrules`, `.github/copilot-instructions.md`, `.windsurfrules`, `.clinerules`, `.mcp.json`, `.agy/`
- **CI/CD Pipelines**: `.github/workflows/`, `.gitlab-ci.yml`, `azure-pipelines.yml`, Jenkinsfile

#### Directories & Patterns to Ignore:
- VCS and caches: `.git`, `__pycache__`, `.pytest_cache`, `.turbo`, `.cache`
- Dependencies: `node_modules`, `.venv`, `venv`, `env`, `vendor`
- Build artifacts: `dist`, `build`, `out`, `target`, `bin`, `obj`
- Large media/assets: image files, video files, binaries, archives, bundled minified JS/CSS

#### Key Attributes to Determine:
- **Languages & Frameworks**: Primary languages, runtimes, UI libraries, backend frameworks.
- **Package Manager & Toolchain**: Detected lockfiles, runtimes (Node, Bun, Python, Rust, Go, JVM).
- **Architecture & Topography**: Monorepo (pnpm/turborepo/nx) vs. single package, frontend/backend separation, microservices, entry points.
- **Databases & ORMs**: Database engines, migration systems (Prisma, Drizzle, Alembic, Diesel).
- **Auth & External Services**: Authentication providers, APIs, cloud infrastructure, third-party integrations.
- **Commands**: Build, test, lint, format, dev server, and non-obvious operational commands.
- **Environment & Config**: Required `.env` variables (from `.env.example`, `.env.template`), configuration schemas.
- **Conventions & Gotchas**: Project-specific patterns, testing quirks, unusual build requirements.

*Rule: Do not invent or assume information. If something cannot be verified from the codebase, explicitly record it as unknown.*

---

### Phase 3 — Fill Critical Gaps

Only ask the user questions if critical information cannot be determined from the repository.

- **Do NOT ask generic setup questions.**
- **Valid Question Criteria**:
  - A required development/build command is ambiguous or undocumented.
  - A required environment variable's purpose is not discernible from templates or code.
  - A proprietary or undocumented workflow is referenced in scripts without instructions.
- If everything important can be determined from the codebase, ask zero questions and proceed immediately.

---

### Phase 4 — Create or Update Project Context (`GEMINI.md`)

Write or update `GEMINI.md` at the root of the project using the relevant sections from this structural outline:

```markdown
# Project Context

## Overview
<!-- 2-4 sentences describing the project purpose and domain -->

## Technology Stack
<!-- Core languages, runtimes, frameworks, and key libraries -->

## Project Structure
<!-- High-level layout of key directories and monorepo packages -->

## Architecture
<!-- System design, component communication, patterns, data flow -->

## Application Entry Points
<!-- Main executable files, server entry points, CLI handlers, app bootstrap -->

## Frontend
<!-- Frameworks, styling approach, state management, client routing (OMIT IF N/A) -->

## Backend
<!-- Server framework, routing patterns, controllers/handlers, business logic (OMIT IF N/A) -->

## Database
<!-- Database engine, ORM/query builder, migration strategy, schema location (OMIT IF N/A) -->

## Authentication & Authorization
<!-- Auth mechanisms, session/token management, roles/permissions (OMIT IF N/A) -->

## External Services
<!-- Third-party APIs, cloud providers, messaging queues, external integrations (OMIT IF N/A) -->

## Development Commands
<!-- Essential scripts: dev, build, test, lint, format, migrations, custom tasks -->

## Environment Configuration
<!-- Required environment variables (.env.example reference), configuration files, secrets setup (OMIT IF N/A) -->

## Testing
<!-- Test frameworks, test runner commands, test types (unit, e2e, integration), mock strategies -->

## Git
<!-- Branching conventions, worktrees, remote tracking details (OMIT IF N/A) -->

## Important Files
<!-- Table or list of high-leverage files that define project behavior and architecture -->

## Conventions
<!-- Code style rules, naming conventions, error-handling patterns, architectural rules -->

## Known Issues / TODOs
<!-- Known gotchas, active migration items, edge cases to watch out for (OMIT IF N/A) -->
```

#### Section Filtering & Omission Rules (Strict "No N/A" Policy):
- **Completely Omit Inapplicable Sections**: If a section does not apply to the project (e.g., a CLI tool, library, or standalone script that has no Frontend, Backend, Database, Authentication, or External Services), **DO NOT include that section heading in `GEMINI.md`**.
- **Never Output Placeholder N/A Text**: Never write entries such as `*N/A*`, `*None*`, `*Not Applicable*`, or `*N/A — In-memory data structures*`. If a component is absent or not applicable, omit the entire section heading and body altogether.
- **Dynamic Tailoring**: The generated `GEMINI.md` must only contain sections that hold real, concrete project data.

#### Content Guardrails:
- Do NOT dump the entire file tree.
- Do NOT list every component or mundane utility file.
- Do NOT copy raw secrets, API tokens, passwords, or credentials under any circumstances.

---

### Phase 5 — The Minimality Rule

Every piece of information added to `GEMINI.md` must pass this test:

> *"Would removing this information make a future AGY session more likely to make a mistake?"*

- If **NO**, omit it.
- **Include**: Non-obvious commands, architecture, important conventions, project-specific behavior, important dependencies, unusual configuration, testing quirks, important integration details, known gotchas.
- **Exclude**:
  - Sections marked as "N/A", "None", or "Not Applicable" (omit the whole section entirely).
  - Generic programming advice and tutorials.
  - Obvious language conventions and standard syntax rules.
  - Obvious commands already readily visible in package manifests.
  - Exhaustive file/component catalogs.

---

### Phase 6 — Existing Context Handling

If `GEMINI.md` already exists at the project root:
1. **Read & Compare**: Inspect the existing content and compare it against the current codebase state.
2. **Detect Drift**: Identify outdated commands, superseded architectures, or newly introduced components.
3. **Surgical Update**: Update only stale or incomplete sections.
4. **Preserve Human Knowledge**: Retain manually authored notes, tribal knowledge, and custom developer instructions that remain valid.

---

### Phase 7 — Git Context Inspection

Inspect Git metadata strictly via non-destructive commands (e.g. `git status`, `git branch -a`, `git log -n 5`, `git remote -v`):
- Determine current branch and tracking status.
- Determine if worktrees are active.
- Note any recurring merge/commit conventions.
- Never alter Git state (no commit, reset, stash, checkout, push, pull).
- Only include Git context in `GEMINI.md` if it directly aids future development sessions.

---

### Phase 8 — Final Report

Upon completing the exploration and updating `GEMINI.md`, output a concise summary to the user:
- **Project Type**: (e.g., Monorepo, Single-Page App, CLI tool, Microservice backend)
- **Detected Stack**: Core languages, frameworks, runtime, and package manager
- **High-Level Architecture**: Brief description of system components
- **Key Commands Discovered**: Primary dev, test, build, and lint commands
- **File Status**: Confirmation that `GEMINI.md` was created or updated at the project root
- **Important Unknowns / Next Steps**: Any unresolved questions or missing environment configurations

*Do NOT print or dump the full `GEMINI.md` content into the final chat response.*
