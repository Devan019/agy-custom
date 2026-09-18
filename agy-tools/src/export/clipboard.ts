// export/clipboard.ts
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { execSync } from "child_process";
import { getConversation } from "../utils/conversation";
import { formatConversation } from "../utils/format";
import { detectCliVersion, cliVersionLabel } from "../utils/meta";

/**
 * Copy text to the Windows clipboard with full Unicode support.
 *
 * clip.exe reads stdin as the system ANSI code page (CP1252), which
 * corrupts any non-ASCII characters (▸ · ● ↳ ▄▀ etc.).
 * Solution: write a UTF-8 temp file, then use PowerShell's
 *   Get-Content -Encoding UTF8 | Set-Clipboard
 * which preserves full Unicode on the clipboard.
 */
function copyTextToWindowsClipboard(content: string): void {
  const tmpFile = path.join(os.tmpdir(), `agy-export-${Date.now()}.txt`);
  try {
    fs.writeFileSync(tmpFile, content, { encoding: "utf8" });
    execSync(
      `powershell -NoProfile -NonInteractive -Command ` +
        `"Get-Content -Path '${tmpFile}' -Raw -Encoding UTF8 | Set-Clipboard"`,
      { stdio: "pipe" }
    );
  } finally {
    try { fs.unlinkSync(tmpFile); } catch { /* ignore */ }
  }
}

/**
 * Read the conversation identified by `uuid`, decode it via protobuf,
 * format it to match the AGY UI layout, and copy to the Windows clipboard.
 *
 * CLI version is auto-detected via `agy --version`.
 * Pass `meta` to override any header field.
 */
export async function copyToClipboard(
  uuid: string,
  meta?: { cliVersion?: string; modelName?: string; exportDate?: string }
): Promise<void> {
  const conversation = await getConversation(uuid);

  const resolvedMeta = {
    cliVersion: meta?.cliVersion ?? cliVersionLabel(detectCliVersion()),
    modelName: meta?.modelName,
    exportDate: meta?.exportDate,
  };

  const content = formatConversation(conversation, resolvedMeta);
  copyTextToWindowsClipboard(content);

  console.log(
    `✅ Conversation ${uuid} (${conversation.messages.length} messages) copied to clipboard.`
  );
}
