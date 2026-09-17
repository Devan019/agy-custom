---
name: export
description: Export the current conversation
---

# Export Conversation

When the user invokes `/export`, follow the exact decision flow below.

---

## Step 1 — Determine Output Target

### If the user provides a filename (e.g. `/export my-chat.txt`)
- Skip Step 1 questions and go directly to **Step 2**.
- Use the provided filename and respect its extension.
- If no extension is given, default to `.txt`.

### If the user does NOT provide a filename
Prompt the user for the export destination with **exactly two options**:

```
Where would you like to export the conversation?
  1. Copy to clipboard
  2. Save as file
```

- If `ask_question` is used, supply only these two choices: `["Copy to clipboard", "Save as file"]`. The prompt title should just be `Where would you like to export the conversation?` (avoid prefixes like `Question 1/1:` in any generated text). Do not offer write-in responses.

**If "Copy to clipboard" is chosen** → go to Step 2, then Step 3 (Clipboard).

**If "Save as file" is chosen** → prompt the user with filename choices:

```
Choose a filename: (.txt is recommended)
  1. chat-{conversation-id}.txt
  2. {YYYY-MM-DD-HHmmss}-{conversation-title}.txt
  3. Custom filename
```

Options explanation:
- **Option 1**: `chat-{conversation-id}.txt` (e.g. `chat-320f3112-d98d-4c40-b70c-985ff7354df6.txt`) — one-click default name.
- **Option 2**: `{YYYY-MM-DD-HHmmss}-{conversation-title}.txt` (e.g. `2026-09-17-114100-hey-bro-tell-me-about-what-is-api.txt`), where timestamp is export time and title is the slugified first user prompt.
- **Option 3**: `Custom filename` — if selected, ask the user for their desired filename (defaulting to `.txt` if no extension is supplied).

> Note: `.txt` is recommended. Other extensions (`.md`, `.log`, etc.) are supported if specified in custom filename or direct `/export filename` invocation.

---

## Step 2 — Format the Conversation

Build the exported content following the **exact** layout below. Reproduce all content faithfully — do NOT summarize, rewrite, or skip any part of the AI responses.

### Header Block

Begin with the Antigravity ASCII art logo and session metadata:

```
      ▄▀▀▄        Antigravity CLI <version>
     ▀▀▀▀▀▀       <Model name and version>
    ▀▀▀▀▀▀▀▀      <Export date and time>
   ▄▀▀    ▀▀▄
  ▄▀▀      ▀▀▄
```

Header rules:
- **CLI Version**: Read the version number from the **Antigravity CLI banner** that appears at the start of every session (e.g. `Antigravity CLI 1.2.5`). Extract the version string from there (e.g. `1.4.2`). **Never ask the user for it.** If the banner was not visible in context, write `Antigravity CLI` without a version number.
- **Model**: Use the active model name and version (e.g. `Claude Sonnet 4.6 (Thinking)`).
- **Date/Time**: Use the current local date and time at the moment of export (e.g. `2026-09-17 10:40`).
- Do **NOT** include folder paths, usernames, or any private system details in the header.

After the header block, add a blank line, then `---`, then another blank line.

---

### Conversation Body

Format every turn in strict chronological order. Apply the following rules for each type of content:

---

#### User messages — prefix with `>`

```
> user message text here
```

Multi-line user messages: each line gets its own `>` prefix.

---

#### AI thinking — prefix with `▸`

When the AI had a thinking/reasoning phase, include it exactly as shown:

```
▸ Thought for 57s
  [thinking content, indented 2 spaces]
```

- `▸` followed by `Thought for Xs` on the same line.
- The thinking content goes on the next line(s), indented by 2 spaces.
- Include the thinking duration (e.g. `57s`) as it appeared.

---

#### AI tool calls — prefix with `●`

Each tool call (Create, Bash, Edit, Read, etc.) gets its own `●` line:

```
● Create(C:/path/to/file.cpp)
● Bash(command here)
● Edit(C:/path/to/file.cpp)
● Bash(long command here) (ctrl+o to expand)
```

- One `●` per tool call, on its own line.
- Include the tool name and its argument exactly as shown.
- If a command was collapsed in the UI, include the `(ctrl+o to expand)` note as-is.

---

#### AI main response — prefix with `·` (middle dot, U+00B7)

```
· First line of the AI's main response text

  All continuation lines indented by 2 spaces.

  Code blocks also indented:

  ```python
  def example():
      pass
  ```

  Command output also indented:

  ```
  result line 1
  result line 2
  ```
```

- Use `·` (middle dot, **NOT** a period `.`).
- First line of the response is on the same line as `·`.
- All subsequent lines indented by 2 spaces.

---

#### Order within a single AI turn

A single AI turn may contain multiple types of content. Render them in this order, if present:

```
▸ Thought for Xs
  [thinking content]
● ToolCall(args)
● ToolCall(args)
· Main response text

  Continuation...
```

---

### Content Fidelity Rules

- Reproduce **all** AI response content exactly — thinking, tool calls, code blocks, command output, bullet lists, tables.
- Do **NOT** summarize, shorten, or rewrite anything.
- Do **NOT** skip tool calls or thinking phases — they must appear in the export.
- Preserve original wording, symbols, and formatting as accurately as possible.
- Separate each turn (user or AI) with a **blank line**.
- Skip only raw internal system metadata (e.g. step indices, JSON payloads) — never visible conversation content.

---

### Full Format Example

```
      ▄▀▀▄        Antigravity CLI 1.2.5
     ▀▀▀▀▀▀       Claude Sonnet 4.6 (Thinking)
    ▀▀▀▀▀▀▀▀      2026-09-17 10:40
   ▄▀▀    ▀▀▄
  ▄▀▀      ▀▀▄

---

> hey bro
> here create a *.cpp file for explaining a* algorithm write proper comment

▸ Thought for 57s
  The user wants a C++ file implementing the A* algorithm with proper comments.
  Let me create a well-commented A* algorithm implementation.

● Create(C:/test-claude/astar.cpp)
● Bash(g++ -o astar astar.cpp && ./astar)
● Bash(g++ -o astar astar.cpp; if ($LASTEXITCODE -eq 0) { ./astar })
● Edit(C:/test-claude/astar.cpp)
● Bash(g++ -o astar astar.cpp; if ($LASTEXITCODE -eq 0) { ./astar }) (ctrl+o to expand)

· Created astar.cpp with a full A* algorithm implementation.

  The file includes:
  - Priority queue-based open set
  - Heuristic: Manhattan distance
  - Full comments on every function

> ls

· Directory listing:

  astar.cpp  (3412 bytes, 2026-09-17)
  astar.exe  (89432 bytes, 2026-09-17)
```

---

## Step 3 — Output

### Copy to Clipboard
- Copy the fully formatted content to the user's clipboard.
- Confirm: `✓ Conversation copied to clipboard.`

### Save to File
- Save the file in the current working directory.
- After saving, confirm with the exact file path: `✓ Saved to <path>`

---

## Quick Reference

```
/export
```
→ Ask: "Copy to clipboard" or "Save as file?"
→ If clipboard → format & copy → confirm
→ If file → choose: `chat-{id}.txt`, `{timestamp}-{title}.txt`, or `Custom filename` → save → confirm

```
/export my-notes
```
→ Save as `my-notes.txt` (default .txt)

```
/export session.md
```
→ Save as `session.md`