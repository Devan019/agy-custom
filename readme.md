# AGY Custom Skills & Slash Commands

A curated collection of custom skills, slash commands, and workflows for **Antigravity CLI (AGY)**.

---

## 📦 Available Skills & Commands

| Command / Skill | Path | Description |
| :--- | :--- | :--- |
| `/export` | [~/skills/export/SKILL.md](skills/export) | Export full conversation history to file or clipboard with high fidelity. |

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

## 🛠️ Installation & Setup

To use this skill in your Antigravity setup:

1. **Workspace Level (Project-specific)**:
   Copy the skill into your project's `.agents/skills/` directory:
   ```bash
   mkdir -p .agents/skills/export
   cp skills/export/SKILL.md .agents/skills/export/SKILL.md
   ```

2. **Global / User Level (All projects)**:
   Copy the skill into your user-level skills directory:
   ```bash
   cp -r skills/export ~/.gemini/skills/
   ```