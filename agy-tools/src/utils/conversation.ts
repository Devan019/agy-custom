// utils/conversation.ts

import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { decodeProto, ProtoField } from "./probuf";

// ---------------------------------------------------------------------------
// Step type constants (field=1 in step_payload protobuf)
// ---------------------------------------------------------------------------
export const STEP_TYPE_USER = 14;
export const STEP_TYPE_MODEL = 15;
export const STEP_TYPE_TOOL_RESULT = 132;

// ---------------------------------------------------------------------------
// Public message types
// ---------------------------------------------------------------------------
export interface UserMessage {
  type: "user";
  text: string;
}

export interface ToolCall {
  /** Call ID for matching with tool results (field=20>field=7>field=1) */
  callId: string | null;
  /** Raw internal tool name, e.g. "ask_question", "run_command" */
  name: string;
  /** Parsed JSON args */
  args: Record<string, unknown>;
  /** Original raw JSON string from protobuf (for debugging / fallback display) */
  rawArgs: string;
}

export interface ModelMessage {
  type: "model";
  /** AI chain-of-thought (field=20>field=3) — internal, not shown verbatim */
  thinking: string | null;
  /** One entry per tool call (field=20>field=7, repeated) */
  toolCalls: ToolCall[];
  /** Main visible response text (field=20>field=1) */
  text: string | null;
}

export interface ToolResultMessage {
  type: "tool_result";
  /** Call ID matching the ToolCall that triggered this result */
  callId: string | null;
  /** Name of the tool that produced this result */
  toolName: string | null;
  /** Result text returned to the model (field=140>field=2>field=1) */
  result: string | null;
}

export type ConversationMessage =
  | UserMessage
  | ModelMessage
  | ToolResultMessage;

export interface Conversation {
  uuid: string;
  messages: ConversationMessage[];
}

// ---------------------------------------------------------------------------
// Raw step type (for inspect / debugging)
// ---------------------------------------------------------------------------
export interface ConversationStep {
  idx: number;
  stepType: number;
  status: number;
  stepFormat: number;
  stepPayload: Buffer;
  metadata: Buffer | null;
  errorDetails: Buffer | null;
  permissions: Buffer | null;
  taskDetails: Buffer | null;
  renderInfo: Buffer | null;
}

// ---------------------------------------------------------------------------
// Protobuf navigation helpers
// ---------------------------------------------------------------------------

function findField(fields: ProtoField[], num: number): ProtoField | undefined {
  return fields.find((f) => f.fieldNumber === num);
}

function findFields(fields: ProtoField[], num: number): ProtoField[] {
  return fields.filter((f) => f.fieldNumber === num);
}

/** Return a string value or null. */
function asString(field: ProtoField | undefined): string | null {
  if (!field || typeof field.value !== "string") return null;
  const trimmed = field.value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/** Return child fields (wire-type 2 decoded as nested proto). */
function asChildren(field: ProtoField | undefined): ProtoField[] {
  if (!field || !Array.isArray(field.value)) return [];
  return field.value as ProtoField[];
}

// ---------------------------------------------------------------------------
// Message extractors
// ---------------------------------------------------------------------------

/**
 * USER step (step_type = 14)
 * User text: field=19 > field=2
 */
function extractUserMessage(fields: ProtoField[]): UserMessage | null {
  const f19 = findField(fields, 19);
  const text = asString(findField(asChildren(f19), 2));
  if (!text) return null;
  return { type: "user", text };
}

/**
 * MODEL step (step_type = 15)
 * - thinking  : field=20 > field=3
 * - tool calls: field=20 > field=7 (repeated)
 *     callId  : > field=1
 *     name    : > field=2
 *     args    : > field=3 (JSON string)
 * - response  : field=20 > field=1
 */
function extractModelMessage(fields: ProtoField[]): ModelMessage {
  const f20 = findField(fields, 20);
  const children = asChildren(f20);

  const thinking = asString(findField(children, 3));
  const text = asString(findField(children, 1));

  const toolCalls: ToolCall[] = findFields(children, 7).flatMap((tc) => {
    const tcChildren = asChildren(tc);
    const callId = asString(findField(tcChildren, 1));
    const name = asString(findField(tcChildren, 2));
    if (!name) return [];

    const rawArgs = asString(findField(tcChildren, 3)) ?? "{}";
    let parsed: Record<string, unknown> = {};
    try {
      parsed = JSON.parse(rawArgs) as Record<string, unknown>;
    } catch {
      /* leave empty */
    }

    return [{ callId, name, args: parsed, rawArgs }];
  });

  return { type: "model", thinking, toolCalls, text };
}

/**
 * TOOL_RESULT step (step_type = 132)
 * - toolName : field=5 > field=4 > field=2
 * - callId   : field=5 > field=4 > field=1
 * - result   : field=140 > field=2 > field=1
 */
function extractToolResult(fields: ProtoField[]): ToolResultMessage {
  // Tool identity from metadata
  const f5 = findField(fields, 5);
  const f4 = findField(asChildren(f5), 4);
  const f4c = asChildren(f4);
  const callId = asString(findField(f4c, 1));
  const toolName = asString(findField(f4c, 2));

  // Result text
  const f140 = findField(fields, 140);
  const f2 = findField(asChildren(f140), 2);
  const result = asString(findField(asChildren(f2), 1));

  return { type: "tool_result", callId, toolName, result };
}

// ---------------------------------------------------------------------------
// DB path helper
// ---------------------------------------------------------------------------

function getConversationDbPath(uuid: string): string {
  return path.join(
    os.homedir(),
    ".gemini",
    "antigravity-cli",
    "conversations",
    `${uuid}.db`
  );
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Read and decode a conversation from the AGY SQLite DB.
 *
 * Steps are classified by step_type and decoded into typed messages:
 *   14  → UserMessage
 *   15  → ModelMessage  (thinking + tool calls + response text)
 *   132 → ToolResultMessage
 */
export async function getConversation(uuid: string): Promise<Conversation> {
  const dbPath = getConversationDbPath(uuid);

  if (!fs.existsSync(dbPath)) {
    throw new Error(`Conversation DB not found: ${dbPath}`);
  }

  const Database = (await import("better-sqlite3")).default;
  const db = new Database(dbPath, { readonly: true });

  try {
    const rows = db
      .prepare(
        `SELECT idx, step_type, status, step_format, step_payload
         FROM steps
         ORDER BY idx ASC`
      )
      .all() as Array<{
        idx: number;
        step_type: number;
        status: number;
        step_format: number;
        step_payload: Buffer;
      }>;

    const messages: ConversationMessage[] = [];

    for (const row of rows) {
      if (!row.step_payload || row.step_payload.length === 0) continue;

      let fields: ProtoField[];
      try {
        fields = decodeProto(row.step_payload);
      } catch {
        continue;
      }

      switch (row.step_type) {
        case STEP_TYPE_USER: {
          const msg = extractUserMessage(fields);
          if (msg) messages.push(msg);
          break;
        }
        case STEP_TYPE_MODEL: {
          const msg = extractModelMessage(fields);
          if (msg.thinking || msg.toolCalls.length > 0 || msg.text) {
            messages.push(msg);
          }
          break;
        }
        case STEP_TYPE_TOOL_RESULT: {
          const msg = extractToolResult(fields);
          // Include even if result is null — ask_question "skipped" has no result text
          messages.push(msg);
          break;
        }
        default:
          break;
      }
    }

    return { uuid, messages };
  } finally {
    db.close();
  }
}

/**
 * Read raw DB rows without protobuf decoding.
 * Used by inspect.ts for debugging.
 */
export async function getConversationRaw(uuid: string): Promise<{
  uuid: string;
  steps: ConversationStep[];
}> {
  const dbPath = getConversationDbPath(uuid);

  if (!fs.existsSync(dbPath)) {
    throw new Error(`Conversation DB not found: ${dbPath}`);
  }

  const Database = (await import("better-sqlite3")).default;
  const db = new Database(dbPath, { readonly: true });

  try {
    const rows = db
      .prepare(
        `SELECT idx, step_type, status, step_format, step_payload,
                metadata, error_details, permissions, task_details, render_info
         FROM steps
         ORDER BY idx ASC`
      )
      .all() as Array<{
        idx: number;
        step_type: number;
        status: number;
        step_format: number;
        step_payload: Buffer;
        metadata: Buffer | null;
        error_details: Buffer | null;
        permissions: Buffer | null;
        task_details: Buffer | null;
        render_info: Buffer | null;
      }>;

    return {
      uuid,
      steps: rows.map((row) => ({
        idx: row.idx,
        stepType: row.step_type,
        status: row.status,
        stepFormat: row.step_format,
        stepPayload: row.step_payload,
        metadata: row.metadata,
        errorDetails: row.error_details,
        permissions: row.permissions,
        taskDetails: row.task_details,
        renderInfo: row.render_info,
      })),
    };
  } finally {
    db.close();
  }
}