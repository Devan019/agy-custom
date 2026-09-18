// probuf.ts
//
// Hand-rolled protobuf wire-format decoder.
//
// Wire types supported:
//   0  = VARINT    (int32, int64, bool, enum)
//   1  = FIXED64   (double, sfixed64, fixed64)
//   2  = LEN       (string, bytes, embedded messages, repeated)
//   5  = FIXED32   (float, sfixed32, fixed32)
//   3,4 = deprecated group types — skipped gracefully
//
// For wire type 2 (LEN), resolution order:
//   1. Try UTF-8 decode (clean string → string value)
//   2. Try nested protobuf decode
//   3. Fall back to raw Buffer

import { Buffer } from "node:buffer";

export interface ProtoField {
  fieldNumber: number;
  wireType: number;

  /**
   * Decoded value:
   *   string  → valid UTF-8 text
   *   array   → nested ProtoField[] (embedded proto message)
   *   Buffer  → opaque binary data
   *   bigint  → varint (wire type 0)
   */
  value: string | ProtoField[] | Buffer | bigint;

  /**
   * Original raw bytes for wire-type-2 fields.
   * Preserved so callers can re-decode with a different strategy.
   */
  raw?: Buffer;
}

// ---------------------------------------------------------------------------
// Varint reader
// ---------------------------------------------------------------------------

function readVarint(
  buffer: Buffer,
  offset: number
): { value: bigint; offset: number } {
  let value = 0n;
  let shift = 0n;

  while (offset < buffer.length) {
    const byte = buffer[offset++]!;

    value |= BigInt(byte & 0x7f) << shift;

    if ((byte & 0x80) === 0) {
      return { value, offset };
    }

    shift += 7n;

    if (shift > 63n) {
      // Protobuf varints are at most 10 bytes (70 bits encoded, 64 bits value)
      throw new Error("Varint exceeds 64 bits — malformed protobuf");
    }
  }

  throw new Error("Unexpected end of buffer inside varint");
}

// ---------------------------------------------------------------------------
// String detection
// ---------------------------------------------------------------------------

/**
 * Attempt to decode `buffer` as UTF-8.
 *
 * Returns the decoded string if it contains no replacement characters
 * (U+FFFD) AND has a reasonable ratio of printable code points.
 * Returns null if the buffer looks like binary data.
 *
 * This runs BEFORE nested proto decoding because many valid proto strings
 * (e.g. "ask_question") are also accidentally parseable as proto bytes.
 */
function tryDecodeString(buffer: Buffer): string | null {
  if (buffer.length === 0) return null;

  const text = buffer.toString("utf8");

  // Reject if UTF-8 decode produced replacement characters
  if (text.includes("\uFFFD")) return null;

  // Count printable characters (printable ASCII + common whitespace + non-ASCII unicode)
  let printable = 0;
  for (const ch of text) {
    const cp = ch.codePointAt(0)!;
    if (
      cp === 0x09 || // tab
      cp === 0x0a || // newline
      cp === 0x0d || // CR
      (cp >= 0x20 && cp <= 0x7e) || // printable ASCII
      cp > 0x7f // any valid non-ASCII unicode code point
    ) {
      printable++;
    }
  }

  const ratio = printable / [...text].length;
  return ratio >= 0.70 ? text : null;
}

// ---------------------------------------------------------------------------
// Nested proto decoder
// ---------------------------------------------------------------------------

function tryDecodeNested(
  buffer: Buffer,
  depth: number
): ProtoField[] | null {
  // Hard cap to prevent infinite recursion on pathological inputs
  if (depth >= 8 || buffer.length < 2) return null;

  try {
    const fields = decodeProto(buffer, depth + 1);
    return fields.length > 0 ? fields : null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Main decoder
// ---------------------------------------------------------------------------

/**
 * Decode a protobuf-encoded `buffer` into an array of `ProtoField` objects.
 *
 * `depth` is used internally to cap nested message recursion.
 * Callers should always use the default (0).
 */
export function decodeProto(
  buffer: Buffer,
  depth = 0
): ProtoField[] {
  const fields: ProtoField[] = [];
  let offset = 0;

  while (offset < buffer.length) {
    // ── Tag (field number + wire type) ────────────────────────────────────
    const key = readVarint(buffer, offset);
    offset = key.offset;

    const fieldNumber = Number(key.value >> 3n);
    const wireType = Number(key.value & 7n);

    if (fieldNumber <= 0) {
      throw new Error(`Invalid field number ${fieldNumber}`);
    }

    // ── Dispatch by wire type ─────────────────────────────────────────────
    switch (wireType) {

      // ── VARINT ────────────────────────────────────────────────────────
      case 0: {
        const result = readVarint(buffer, offset);
        offset = result.offset;
        fields.push({ fieldNumber, wireType, value: result.value });
        break;
      }

      // ── FIXED 64 ──────────────────────────────────────────────────────
      case 1: {
        if (offset + 8 > buffer.length) {
          throw new Error(`Fixed64 field ${fieldNumber} truncated`);
        }
        const value = Buffer.from(buffer.subarray(offset, offset + 8));
        offset += 8;
        fields.push({ fieldNumber, wireType, value });
        break;
      }

      // ── LENGTH-DELIMITED ──────────────────────────────────────────────
      case 2: {
        const lengthResult = readVarint(buffer, offset);
        offset = lengthResult.offset;

        const length = Number(lengthResult.value);
        if (length < 0 || offset + length > buffer.length) {
          throw new Error(
            `Length-delimited field ${fieldNumber}: length ${length} exceeds buffer`
          );
        }

        const raw = Buffer.from(buffer.subarray(offset, offset + length));
        offset += length;

        // Resolution order:
        //  1. Try UTF-8 string first — avoids misinterpreting strings as protos
        //  2. Try nested proto
        //  3. Raw bytes fallback

        const str = tryDecodeString(raw);
        if (str !== null) {
          fields.push({ fieldNumber, wireType, value: str, raw });
          break;
        }

        const nested = tryDecodeNested(raw, depth);
        if (nested !== null) {
          fields.push({ fieldNumber, wireType, value: nested, raw });
          break;
        }

        fields.push({ fieldNumber, wireType, value: raw, raw });
        break;
      }

      // ── Deprecated group start (proto2) ───────────────────────────────
      // Skip gracefully — we don't know the end tag, so abort this level.
      case 3: {
        return fields;
      }

      // ── Deprecated group end (proto2) ─────────────────────────────────
      case 4: {
        return fields;
      }

      // ── FIXED 32 ──────────────────────────────────────────────────────
      case 5: {
        if (offset + 4 > buffer.length) {
          throw new Error(`Fixed32 field ${fieldNumber} truncated`);
        }
        const value = Buffer.from(buffer.subarray(offset, offset + 4));
        offset += 4;
        fields.push({ fieldNumber, wireType, value });
        break;
      }

      // ── Unknown wire type — skip the whole message to avoid data loss ─
      default: {
        throw new Error(
          `Unknown wire type ${wireType} at field ${fieldNumber}`
        );
      }
    }
  }

  return fields;
}