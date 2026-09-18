// export/file.ts
import * as fs from "fs";
import * as path from "path";
import { getConversation } from "../utils/conversation";
import { formatConversation } from "../utils/format";
import { detectCliVersion, cliVersionLabel } from "../utils/meta";

/**
 * Read the conversation identified by `uuid`, decode it via protobuf,
 * format it to match the AGY UI layout, and write it as a UTF-8 file
 * to `outputPath`.
 *
 * CLI version is auto-detected via `agy --version`.
 * Any intermediate directories in `outputPath` are created automatically.
 * Pass `meta` to override any header field.
 */
export async function createFileAndWriteContent(
  uuid: string,
  outputPath: string,
  meta?: { cliVersion?: string; modelName?: string; exportDate?: string }
): Promise<void> {
  const conversation = await getConversation(uuid);

  const resolvedMeta = {
    cliVersion: meta?.cliVersion ?? cliVersionLabel(detectCliVersion()),
    modelName: meta?.modelName,
    exportDate: meta?.exportDate,
  };

  const content = formatConversation(conversation, resolvedMeta);

  // Ensure parent directories exist
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });

  // Write UTF-8 encoded file
  fs.writeFileSync(outputPath, content, { encoding: "utf8" });

  console.log(
    `✅ Conversation ${uuid} (${conversation.messages.length} messages) saved to: ${outputPath}`
  );
}
