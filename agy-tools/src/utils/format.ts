// utils/format.ts
//
// Shared conversation → text formatter.
// Matches the layout visible in the Antigravity CLI/IDE:
//
//   > first line of user message
//     continuation lines (2-space indent)
//
//   ▸ Thought for Xs
//     First sentence of thinking (collapsed summary)
//
//   ● DisplayName(primary arg) (ctrl+o to expand)
//
//   ? Question text               ← ask_question prompt
//     > Answer                    ← ask_question result
//     (skipped)                   ← ask_question skipped
//
//   · First line of AI response
//     Continuation lines (2-space indent)
//
//   ↳ Tool result (first line)

import * as os from "os";
import {
  Conversation,
  ConversationMessage,
  ModelMessage,
  ToolCall,
  ToolResultMessage,
} from "./conversation";

// ---------------------------------------------------------------------------
// Tool name display mapping  (internal name → UI display name)
// ---------------------------------------------------------------------------
const TOOL_DISPLAY_NAME: Record<string, string> = {
  write_to_file:        "Create",
  replace_file_content: "Edit",
  view_file:            "Read",
  run_command:          "Bash",
  find_by_name:         "Search",
  grep_search:          "Search",
  list_dir:             "List",
  read_url_content:     "Read",
  search_web:           "Search",
  invoke_subagent:      "Spawn",
  define_subagent:      "Define",
  manage_subagents:     "Subagents",
  manage_task:          "Task",
  generate_image:       "Image",
  send_message:         "Message",
  schedule:             "Schedule",
  ask_question:         "?",      // rendered differently, not as ●
};

function displayName(internalName: string): string {
  return TOOL_DISPLAY_NAME[internalName] ?? internalName;
}

// ---------------------------------------------------------------------------
// Path normalizer  (C:\Users\username\... → ~\...)
// ---------------------------------------------------------------------------
const HOME = os.homedir();

function normalizePath(p: string): string {
  // Windows paths (backslash or forward slash)
  if (p.startsWith(HOME)) {
    return "~" + p.slice(HOME.length);
  }
  // Unix-style home
  const unixHome = HOME.replace(/\\/g, "/");
  const unixP = p.replace(/\\/g, "/");
  if (unixP.startsWith(unixHome)) {
    return "~" + unixP.slice(unixHome.length);
  }
  return p;
}

// ---------------------------------------------------------------------------
// Primary-arg extractor — picks the most meaningful display arg per tool
// ---------------------------------------------------------------------------
function primaryArg(toolName: string, args: Record<string, unknown>): string {
  const str = (v: unknown): string =>
    typeof v === "string" ? normalizePath(v) : JSON.stringify(v);

  switch (toolName) {
    case "write_to_file":
      return str(args["TargetFile"] ?? args["targetFile"] ?? "");
    case "replace_file_content":
      // Show file path + brief instruction
      return [
        str(args["TargetFile"] ?? args["targetFile"] ?? ""),
        args["Instruction"] ?? args["instruction"] ?? "",
      ]
        .filter(Boolean)
        .join(" — ")
        .trim();
    case "view_file":
      return str(args["AbsolutePath"] ?? args["absolutePath"] ?? "");
    case "run_command":
      return str(args["CommandLine"] ?? args["commandLine"] ?? "");
    case "find_by_name":
      return [
        str(args["SearchDirectory"] ?? args["searchDirectory"] ?? ""),
        args["Pattern"] ?? args["pattern"] ?? "",
      ]
        .filter(Boolean)
        .join("/")
        .trim();
    case "grep_search":
      return str(args["Query"] ?? args["query"] ?? "");
    case "list_dir":
      return str(args["DirectoryPath"] ?? args["directoryPath"] ?? "");
    case "read_url_content":
      return str(args["Url"] ?? args["url"] ?? "");
    case "search_web":
      return str(args["query"] ?? args["Query"] ?? "");
    case "ask_question": {
      // Extract first question text
      const qs = args["questions"] as Array<{ question?: string }> | undefined;
      return qs?.[0]?.question ?? "";
    }
    default: {
      // Generic: first non-meta string value
      for (const key of Object.keys(args)) {
        if (key === "toolAction" || key === "toolSummary") continue;
        const v = args[key];
        if (typeof v === "string" && v.trim()) return normalizePath(v.trim());
      }
      return "";
    }
  }
}

// ---------------------------------------------------------------------------
// Per-message-type formatters
// ---------------------------------------------------------------------------

/** User message: first line `> text`, remaining lines `  text` (2-sp indent) */
function formatUser(text: string): string[] {
  const lines = text.split("\n");
  return lines.map((line, i) => (i === 0 ? `> ${line}` : `  ${line}`));
}

/** Render one tool call line. ask_question is handled separately. */
function formatToolCall(tc: ToolCall): string {
  const name = displayName(tc.name);
  const arg = primaryArg(tc.name, tc.args);

  if (!arg) return `● ${name}()`;

  const MAX = 80;
  if (arg.length > MAX) {
    return `● ${name}(${arg.slice(0, MAX)}…) (ctrl+o to expand)`;
  }
  return `● ${name}(${arg})`;
}

/**
 * Render a model message block.
 *
 * Thinking     → `▸ Thinking` + first paragraph (collapsed indicator)
 * ask_question → `? question text` (answer comes from the next tool_result step)
 * Other tools  → `● DisplayName(arg)`
 * Response     → `· first line` then `  continuation`
 */
function formatModel(msg: ModelMessage): string[] {
  const lines: string[] = [];

  // ── Thinking (collapsed — show just the first paragraph as a hint) ──────
  if (msg.thinking) {
    // First paragraph = text before the first blank line
    const firstPara = msg.thinking.split(/\n\n+/)[0]?.trim() ?? "";
    // Cap at 200 chars and strip internal newlines for a single summary line
    const summary = firstPara.replace(/\n/g, " ").slice(0, 200);
    lines.push("▸ Thinking");
    if (summary) lines.push(`  ${summary}`);
    lines.push("");
  }

  // ── Tool calls ──────────────────────────────────────────────────────────
  for (const tc of msg.toolCalls) {
    if (tc.name === "ask_question") {
      // Render as a UI prompt line; the answer comes from the subsequent tool_result
      const question = primaryArg("ask_question", tc.args);
      lines.push(question ? `? ${question}` : "? (question)");
    } else {
      lines.push(formatToolCall(tc));
    }
  }
  if (msg.toolCalls.length > 0) lines.push("");

  // ── Main response text ──────────────────────────────────────────────────
  if (msg.text) {
    const responseLines = msg.text.split("\n");
    lines.push(`· ${responseLines[0]!}`);
    for (const line of responseLines.slice(1)) {
      lines.push(`  ${line}`);
    }
  }

  return lines;
}

/**
 * Render a tool result.
 *
 * ask_question results → `  > answer` or `  (skipped)`
 * Other results        → `  ↳ first line of output`
 */
function formatToolResult(msg: ToolResultMessage): string[] {
  const isQuestion = msg.toolName === "ask_question";

  if (isQuestion) {
    if (!msg.result) return ["  (skipped)"];
    // Result format is "A1: answer text" — strip the "A1: " prefix
    const answer = msg.result.replace(/^A\d+:\s*/i, "").trim();
    if (!answer || answer.toLowerCase() === "user skipped") return ["  (skipped)"];
    return [`  > ${answer}`];
  }

  if (!msg.result) return [];

  // Other tool results — first line only as an ↳ note
  const firstLine = msg.result.split("\n")[0]!.trim();
  return firstLine ? [`  ↳ ${firstLine}`] : [];
}

// ---------------------------------------------------------------------------
// Public formatter
// ---------------------------------------------------------------------------

export interface FormatMeta {
  /** e.g. "Antigravity CLI 1.2.6" or just "1.2.6" */
  cliVersion?: string;
  /** e.g. "Claude Sonnet 4.6 (Thinking)" */
  modelName?: string;
  /** e.g. "2026-09-18 16:55" — defaults to current local time */
  exportDate?: string;
}

/**
 * Render a decoded `Conversation` as a plain-text transcript matching
 * the layout visible in the Antigravity CLI/IDE.
 */
export function formatConversation(
  conversation: Conversation,
  meta?: FormatMeta
): string {
  // ── Header metadata ─────────────────────────────────────────────────────
  const versionLabel = meta?.cliVersion
    ? (meta.cliVersion.startsWith("Antigravity")
        ? meta.cliVersion
        : `Antigravity CLI ${meta.cliVersion}`)
    : "Antigravity CLI";

  const date =
    meta?.exportDate ??
    new Date().toLocaleString("en-CA", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

  // Logo lines paired with metadata (version, model, date)
  const logo = [
    "      ▄▀▀▄",
    "     ▀▀▀▀▀▀",
    "    ▀▀▀▀▀▀▀▀",
    "   ▄▀▀    ▀▀▄",
    "  ▄▀▀      ▀▀▄",
  ];
  // Only non-empty values, no email
  const metaLines = [versionLabel, meta?.modelName ?? "", date].filter(Boolean);

  const output: string[] = [];
  for (let i = 0; i < logo.length; i++) {
    const m = metaLines[i];
    output.push(m ? `${logo[i]!}       ${m}` : logo[i]!);
  }
  output.push("");
  output.push("────────────────────────────────────────────────────────────");
  output.push("");

  // ── Body ────────────────────────────────────────────────────────────────
  for (const msg of conversation.messages) {
    let lines: string[];

    switch (msg.type) {
      case "user":
        lines = formatUser(msg.text);
        // Separator after each user turn
        output.push(...lines);
        output.push("");
        continue;

      case "model":
        lines = formatModel(msg as ModelMessage);
        break;

      case "tool_result":
        lines = formatToolResult(msg as ToolResultMessage);
        break;
    }

    if (lines.length > 0) {
      output.push(...lines);
      // Blank line after model response text or tool result
      if ((msg as ConversationMessage).type !== "tool_result") {
        output.push("");
      }
    }
  }

  return output.join("\n").trimEnd() + "\n";
}
