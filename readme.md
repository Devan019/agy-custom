# AGY Custom Skills & Slash Commands

A curated collection of custom skills, slash commands, and workflows for **Antigravity CLI (AGY)**.

---

## 📦 Available Skills & Commands

| Command / Skill | Path | Description |
| :--- | :--- | :--- |
| `/export` | [~/skills/export/SKILL.md](skills/export) | Export full conversation history to file or clipboard with high fidelity. |
| `/init` | [~/skills/init/SKILL.md](skills/init) | Analyze repository and generate/update project context (`GEMINI.md`). |

---

## 🚀 `/export` Slash Command

The `/export` skill [SKILL.md](skills/export/SKILL.md) allows you to export the active conversation session faithfully — capturing user prompts, thinking/reasoning phases, tool calls, and model responses without summarizing, truncating, or omitting details.

### ✨ Key Features

- **High Fidelity**: Preserves all conversation turns verbatim, including thoughts (`▸`), tool executions (`●`), and AI responses (`·`).
- **Clean Formatting**: Generates a structured header with the Antigravity ASCII logo, CLI version, active model name, and export timestamp.
- **Multiple Destinations**: Export directly to clipboard or save to a file.
- **Flexible Naming**: Choose between ID-based filenames, timestamped titles, or custom filenames (`.txt`, `.md`, `.log`, etc.).

---

### 💻 Usage

#### 1. Interactive Mode
Run the command by itself to be prompted for destination and filename:

```bash
/export
```

**Step 1: Choose destination:**
1. **Copy to clipboard** — Copies formatted chat directly to your clipboard.
2. **Save as file** — Prompts for filename selection.

**Step 2 (if file selected): Choose filename pattern:**
- `chat-{conversation-id}.txt` (e.g., `chat-320f3112-d98d-4c40-b70c-985ff7354df6.txt`)
- `{YYYY-MM-DD-HHmmss}-{conversation-title}.txt` (e.g., `2026-09-17-114100-api-guide.txt`)
- `Custom filename` (enter your desired filename and extension)

---

#### 2. Direct File Export
Provide a filename directly to bypass interactive prompts and save immediately:

```bash
# Export with default .txt extension
/export my-notes

# Export to a markdown file
/export session.md

# Export to custom path/extension
/export logs/chat-2026-09-17.txt
```

---

### 📄 Export Format Sample

The exported output follows a standardized layout:

```text
      ▄▀▀▄        Antigravity CLI 1.2.5
     ▀▀▀▀▀▀       Gemini 3.8 Flash
    ▀▀▀▀▀▀▀▀      2026-09-17 18:30
   ▄▀▀    ▀▀▄
  ▄▀▀      ▀▀▄

---

> Explain the A* pathfinding algorithm and create an implementation

▸ Thought for 12s
  Planning implementation with priority queue and Manhattan distance heuristic...

● Create(astar.py)
● Run(python astar.py)

· Created astar.py with full comments and test cases.
```

| Symbol | Turn / Content Type |
| :---: | :--- |
| `>` | User message |
| `▸` | Agent thought / reasoning phase (includes duration) |
| `●` | Tool invocations (`Create`, `Edit`, `Run`, `Bash`, etc.) |
| `·` | Agent final response |

---

## 🔍 `/init` Slash Command

The `/init` skill [SKILL.md](skills/init/SKILL.md) provides an autonomous initialization and codebase discovery workflow. It examines your repository structure, technology stack, architectures, and operational workflows to create or update a high-signal `GEMINI.md` context file at the root of your project.

### ✨ Key Features

- **Autonomous Discovery**: Direct execution without asking unnecessary setup questions; inspects package manifests, configurations, containers, task runners, and CI/CD pipelines.
- **Strict "No N/A" Policy**: Inapplicable sections (e.g., Frontend, Backend, Database, Auth, or External Services for a CLI tool or standalone script) are completely omitted. Never generates placeholder `*N/A*` text.
- **The Minimality Rule**: Prioritizes high-leverage architectural details, non-obvious commands, conventions, and gotchas while omitting noisy file listings and generic boilerplate.
- **Surgical Updates**: If `GEMINI.md` already exists, detects drift and updates outdated sections while preserving custom developer notes and tribal knowledge.
- **Safety First**: Strictly non-destructive analysis. Never modifies code, never runs install/build scripts, never modifies Git state, and never exposes credentials or secrets.

---

### 💻 Usage

Run the initialization command at the root of your workspace:

```bash
/init
```

Antigravity will:
1. Confine exploration strictly to the workspace root.
2. Inspect package manifests (`package.json`, `Cargo.toml`, `pyproject.toml`, `go.mod`, etc.), build configs, and entry points.
3. Generate or update `GEMINI.md` at the project root.
4. Output a concise summary (Project Type, Stack, Architecture, Key Commands, and Status) without dumping the full markdown file in chat.

---

## 🛠️ Installation & Setup

To use these skills in your Antigravity setup:

### 1. Workspace Level (Project-specific)
Copy the desired skill into your project's `.agents/skills/` directory:

```bash
# Install /export
mkdir -p .agents/skills/export
cp skills/export/SKILL.md .agents/skills/export/SKILL.md

# Install /init
mkdir -p .agents/skills/init
cp skills/init/SKILL.md .agents/skills/init/SKILL.md
```

### 2. Global / User Level (Available across all projects)
Copy skills into your user-level skills directory:

```bash
# Install all skills
cp -r skills/* ~/.gemini/skills/
```