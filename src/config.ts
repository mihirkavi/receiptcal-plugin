import { delimiter, resolve } from "node:path";
import { homedir } from "node:os";

export type PluginConfig = {
  apiBaseUrl: string;
  v2ApiBaseUrl: string;
  v3ApiBaseUrl: string;
  healthUrl: string;
  allowedFileRoots: string[];
  maxReceiptBytes: number;
  requestTimeoutMs: number;
};

function normalizedBase(value: string): string {
  return value.trim().replace(/\/+$/, "");
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): PluginConfig {
  const apiBaseUrl = normalizedBase(env.RECEIPTCAL_API_BASE_URL ?? "https://receiptcal.com/api/v1");
  const v2ApiBaseUrl = normalizedBase(env.RECEIPTCAL_V2_API_BASE_URL ?? "https://v2.receiptcal.com/api/v2");
  const v3ApiBaseUrl = normalizedBase(env.RECEIPTCAL_V3_API_BASE_URL ?? "https://v3.receiptcal.com/api/v3");
  const configuredRoots = env.RECEIPTCAL_ALLOWED_FILE_ROOTS
    ?.split(delimiter)
    .map((entry) => entry.trim())
    .filter(Boolean);
  const allowedFileRoots = (configuredRoots?.length
    ? configuredRoots
    : [process.cwd(), resolve(homedir(), "Downloads")]
  ).map((entry) => resolve(entry));

  return {
    apiBaseUrl,
    v2ApiBaseUrl,
    v3ApiBaseUrl,
    healthUrl: new URL("/api/health", `${apiBaseUrl}/`).toString(),
    allowedFileRoots,
    maxReceiptBytes: 8 * 1024 * 1024,
    requestTimeoutMs: 30_000,
  };
}
