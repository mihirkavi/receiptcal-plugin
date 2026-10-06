#!/usr/bin/env node
import { randomBytes, randomUUID } from "node:crypto";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { AuthStore } from "./auth-store.js";
import { loadConfig } from "./config.js";
import type { JsonObject, StoredSession } from "./types.js";

const store = new AuthStore();
const config = loadConfig();

async function visibleQuestion(prompt: string): Promise<string> {
  const rl = createInterface({ input, output });
  try { return (await rl.question(prompt)).trim(); } finally { rl.close(); }
}

async function hiddenQuestion(prompt: string): Promise<string> {
  if (!input.isTTY || !output.isTTY || typeof input.setRawMode !== "function") {
    throw new Error("Password entry requires an interactive terminal.");
  }
  output.write(prompt);
  input.setRawMode(true);
  input.resume();
  return await new Promise<string>((resolvePassword, reject) => {
    let value = "";
    const onData = (buffer: Buffer) => {
      const text = buffer.toString("utf8");
      if (text === "\u0003") {
        cleanup();
        reject(new Error("Cancelled."));
        return;
      }
      if (text === "\r" || text === "\n") {
        cleanup();
        output.write("\n");
        resolvePassword(value);
        return;
      }
      if (text === "\u007f" || text === "\b") {
        value = value.slice(0, -1);
        return;
      }
      if (/^[\x20-\x7e]+$/.test(text)) value += text;
    };
    const cleanup = () => {
      input.off("data", onData);
      input.setRawMode(false);
      input.pause();
    };
    input.on("data", onData);
  });
}

function newToken(): string {
  return randomBytes(32).toString("base64url");
}

async function request(path: string, body: JsonObject, token?: string): Promise<unknown> {
  const response = await fetch(`${config.apiBaseUrl}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) as unknown : { ok: true };
  if (!response.ok) {
    const message = data && typeof data === "object" && "error" in data && typeof data.error === "string"
      ? data.error
      : `ReceiptCal returned status ${response.status}`;
    throw new Error(message);
  }
  return data;
}

function inboxFrom(value: unknown): string | undefined {
  return value && typeof value === "object" && "inbox_address" in value && typeof value.inbox_address === "string"
    ? value.inbox_address
    : undefined;
}

async function saveSession(token: string, installationId: string, response: unknown): Promise<void> {
  const inboxAddress = inboxFrom(response);
  const session: StoredSession = {
    token,
    ...(inboxAddress ? { inboxAddress } : {}),
    installationId,
    savedAt: new Date().toISOString(),
  };
  const destination = await store.save(session);
  output.write(`ReceiptCal connected${inboxAddress ? ` as ${inboxAddress}` : ""}. Session saved to ${destination}.\n`);
}

async function login(): Promise<void> {
  const inboxAddress = await visibleQuestion("ReceiptCal address: ");
  const password = await hiddenQuestion("Password: ");
  const token = newToken();
  const installationId = randomUUID();
  const response = await request("/auth/login", {
    inbox_address: inboxAddress, password, token, installation_id: installationId,
  });
  await saveSession(token, installationId, response);
}

async function register(): Promise<void> {
  const inboxLocal = await visibleQuestion("Choose the part before @receiptcal.com: ");
  const recoveryEmail = await visibleQuestion("Recovery email: ");
  const password = await hiddenQuestion("Password (at least 12 characters): ");
  if (password.length < 12) throw new Error("Password must be at least 12 characters.");
  const token = newToken();
  const installationId = randomUUID();
  const response = await request("/register", {
    inbox_local: inboxLocal, recovery_email: recoveryEmail, password, token, installation_id: installationId,
  });
  await saveSession(token, installationId, response);
}

async function addCredentials(): Promise<void> {
  const session = await store.load();
  if (!session) throw new Error("ReceiptCal is not connected. Run the login or register command first.");
  const recoveryEmail = await visibleQuestion("Recovery email: ");
  const password = await hiddenQuestion("Password (at least 12 characters): ");
  if (password.length < 12) throw new Error("Password must be at least 12 characters.");
  await request("/auth/credentials", { recovery_email: recoveryEmail, password }, session.token);
  output.write("Recovery credentials added.\n");
}

async function forgotPassword(): Promise<void> {
  const inboxAddress = await visibleQuestion("ReceiptCal address: ");
  await request("/auth/forgot-password", { inbox_address: inboxAddress });
  output.write("If the account can be recovered, ReceiptCal sent a reset code.\n");
}

async function resetPassword(): Promise<void> {
  const inboxAddress = await visibleQuestion("ReceiptCal address: ");
  const code = await hiddenQuestion("Reset code: ");
  const password = await hiddenQuestion("New password (at least 12 characters): ");
  if (password.length < 12) throw new Error("Password must be at least 12 characters.");
  await request("/auth/reset-password", { inbox_address: inboxAddress, code, new_password: password });
  await store.clear();
  output.write("Password reset. Existing sessions were cleared; run login next.\n");
}

async function logout(): Promise<void> {
  const session = await store.load();
  if (session) await request("/auth/logout", {}, session.token).catch(() => undefined);
  await store.clear();
  output.write("ReceiptCal local session cleared.\n");
}

async function status(): Promise<void> {
  const session = await store.load();
  output.write(session
    ? `Connected${session.inboxAddress ? ` as ${session.inboxAddress}` : ""}.\n`
    : "Not connected. Run login or register.\n");
}

const commands: Record<string, () => Promise<void>> = {
  login, register, "add-credentials": addCredentials,
  "forgot-password": forgotPassword, "reset-password": resetPassword,
  logout, status,
};

const command = process.argv[2] ?? "status";
const run = commands[command];
if (!run) {
  output.write("Usage: receiptcal-auth <login|register|add-credentials|forgot-password|reset-password|logout|status>\n");
  process.exitCode = 2;
} else {
  try { await run(); } catch (error) {
    output.write(`${error instanceof Error ? error.message : "ReceiptCal authentication failed."}\n`);
    process.exitCode = 1;
  }
}
