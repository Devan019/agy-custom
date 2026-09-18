// utils/meta.ts
//
// Helpers for gathering CLI/session metadata to embed in the export header.

import { execSync } from "child_process";

/**
 * Try to determine the Antigravity CLI version by running `agy --version`.
 *
 * Returns a string like "1.2.6" on success, or null if the command fails
 * (e.g. `agy` not on PATH, or run from an unrelated context).
 */
export function detectCliVersion(): string | null {
  try {
    const raw = execSync("agy --version", {
      encoding: "utf8",
      timeout: 4000,
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();

    // Typical output: "Antigravity CLI 1.2.6" or just "1.2.6"
    const match = raw.match(/(\d+\.\d+\.\d+)/);
    return match ? match[1]! : null;
  } catch {
    return null;
  }
}

/**
 * Build the full header label for the CLI version.
 * Returns e.g. "Antigravity CLI 1.2.6" or "Antigravity CLI" if unknown.
 */
export function cliVersionLabel(version: string | null): string {
  return version ? `Antigravity CLI ${version}` : "Antigravity CLI";
}
