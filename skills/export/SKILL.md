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

**If "Copy to clipboard" is chosen** → go to Step 2 (Clipboard).

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

## Step 2 — Run Export Script

Use the conversation UUID (current conversation ID).

### If "Copy to clipboard":
Run the following command and output whatever it returns:
```
node $home\agy-tools\dist\src\export\ {uuid} clipboard
```

### If "Save as file":
Run the following command with the chosen/provided file path, and output whatever it returns:
```
node $home\agy-tools\dist\src\export\ {uuid} {path}
```