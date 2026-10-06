import { execFile, spawn } from "node:child_process";
import { chmod, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { homedir, platform } from "node:os";
import { dirname, resolve } from "node:path";
import { promisify } from "node:util";
import type { StoredSession } from "./types.js";

const execFileAsync = promisify(execFile);
const KEYCHAIN_SERVICE = "com.receiptcal.mcp";
const KEYCHAIN_ACCOUNT = "default";
const FALLBACK_PATH = resolve(homedir(), ".config", "receiptcal-mcp", "session.json");

function isSession(value: unknown): value is StoredSession {
  if (!value || typeof value !== "object") return false;
  const session = value as Partial<StoredSession>;
  return typeof session.token === "string"
    && session.token.length >= 32
    && typeof session.installationId === "string"
    && session.installationId.length >= 8
    && typeof session.savedAt === "string";
}

function parseSession(raw: string): StoredSession | null {
  try {
    const value: unknown = JSON.parse(raw);
    return isSession(value) ? value : null;
  } catch {
    return null;
  }
}

async function saveToKeychain(serialized: string): Promise<void> {
  await new Promise<void>((resolveSave, reject) => {
    const child = spawn("security", [
      "add-generic-password", "-U", "-s", KEYCHAIN_SERVICE, "-a", KEYCHAIN_ACCOUNT, "-w",
    ], { stdio: ["pipe", "ignore", "pipe"] });
    let errorText = "";
    child.stderr.on("data", (chunk: Buffer) => {
      if (errorText.length < 4_096) errorText += chunk.toString("utf8");
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolveSave();
      else reject(new Error(errorText.trim() || "Keychain write failed"));
    });
    child.stdin.end(`${serialized}\n`);
  });
}

export class AuthStore {
  constructor(private readonly env: NodeJS.ProcessEnv = process.env) {}

  async load(): Promise<StoredSession | null> {
    const envToken = this.env.RECEIPTCAL_TOKEN?.trim();
    if (envToken && envToken.length >= 32) {
      return {
        token: envToken,
        ...(this.env.RECEIPTCAL_INBOX_ADDRESS?.trim()
          ? { inboxAddress: this.env.RECEIPTCAL_INBOX_ADDRESS.trim() }
          : {}),
        installationId: this.env.RECEIPTCAL_INSTALLATION_ID?.trim() || "environment-session",
        savedAt: "environment",
      };
    }

    if (platform() === "darwin") {
      try {
        const { stdout } = await execFileAsync("security", [
          "find-generic-password", "-s", KEYCHAIN_SERVICE, "-a", KEYCHAIN_ACCOUNT, "-w",
        ], { encoding: "utf8", maxBuffer: 16 * 1024 });
        const parsed = parseSession(stdout.trim());
        if (parsed) return parsed;
      } catch {
        // Fall through to the portable user-only file.
      }
    }

    try {
      return parseSession(await readFile(FALLBACK_PATH, "utf8"));
    } catch {
      return null;
    }
  }

  async save(session: StoredSession): Promise<"keychain" | "file"> {
    const serialized = JSON.stringify(session);
    if (platform() === "darwin") {
      try {
        await saveToKeychain(serialized);
        await rm(FALLBACK_PATH, { force: true });
        return "keychain";
      } catch {
        // Fall back only when Keychain is unavailable.
      }
    }

    await mkdir(dirname(FALLBACK_PATH), { recursive: true, mode: 0o700 });
    await writeFile(FALLBACK_PATH, `${serialized}\n`, { encoding: "utf8", mode: 0o600 });
    await chmod(FALLBACK_PATH, 0o600);
    return "file";
  }

  async clear(): Promise<void> {
    if (platform() === "darwin") {
      try {
        await execFileAsync("security", [
          "delete-generic-password", "-s", KEYCHAIN_SERVICE, "-a", KEYCHAIN_ACCOUNT,
        ], { encoding: "utf8", maxBuffer: 16 * 1024 });
      } catch {
        // Missing records are already cleared.
      }
    }
    await rm(FALLBACK_PATH, { force: true });
  }
}
