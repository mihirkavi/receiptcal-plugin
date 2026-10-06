import { readFile, realpath, stat } from "node:fs/promises";
import { extname, isAbsolute, relative, resolve } from "node:path";
import type { PluginConfig } from "./config.js";
import type { Capability, HttpTransport, JsonObject, StoredSession } from "./types.js";

type Fetch = typeof globalThis.fetch;

export class ReceiptCalApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code = "receiptcal_api_error",
  ) {
    super(message);
  }
}

const FILE_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".heic": "image/heic",
  ".webp": "image/webp",
};

function isInside(path: string, root: string): boolean {
  const child = relative(root, path);
  return child === "" || (!child.startsWith("..") && !isAbsolute(child));
}

function withoutKeys(args: JsonObject, keys: string[]): JsonObject {
  return Object.fromEntries(Object.entries(args).filter(([key]) => !keys.includes(key)));
}

async function responseBody(response: Response): Promise<unknown> {
  if (response.status === 204) return { ok: true, status: 204 };
  const text = await response.text();
  if (!text) return { ok: response.ok, status: response.status };
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return { text: text.slice(0, 20_000) };
  }
}

export class ReceiptCalApiClient {
  constructor(
    private readonly config: PluginConfig,
    private readonly fetchImpl: Fetch = globalThis.fetch,
  ) {}

  async health(): Promise<{ ok: boolean; status: number }> {
    const response = await this.fetchWithTimeout(this.config.healthUrl, { method: "GET" });
    return { ok: response.ok, status: response.status };
  }

  async execute(
    capability: Capability,
    args: JsonObject,
    session: StoredSession,
  ): Promise<unknown> {
    if (capability.transport.kind === "receipt_text") {
      return this.send(
        `${this.config.apiBaseUrl}/receipts/analyze`,
        { method: "POST", headers: this.headers(session, "text/plain; charset=utf-8"), body: String(args.text) },
      );
    }
    if (capability.transport.kind === "receipt_file") {
      const { bytes, contentType } = await this.loadReceiptFile(String(args.file_path));
      return this.send(
        `${this.config.apiBaseUrl}/receipts/analyze`,
        { method: "POST", headers: this.headers(session, contentType), body: Buffer.from(bytes) },
      );
    }
    return this.executeHttp(capability.transport, args, session);
  }

  private async executeHttp(
    transport: HttpTransport,
    args: JsonObject,
    session: StoredSession,
  ): Promise<unknown> {
    let path = transport.path;
    for (const parameter of transport.pathParameters ?? []) {
      path = path.replace(`{${parameter}}`, encodeURIComponent(String(args[parameter])));
    }
    const base = transport.api === "v1"
      ? this.config.apiBaseUrl
      : transport.api === "v2"
        ? this.config.v2ApiBaseUrl
        : this.config.v3ApiBaseUrl;
    const url = new URL(`${base}${path}`);
    for (const parameter of transport.queryParameters ?? []) {
      const value = args[parameter];
      if (value !== undefined) url.searchParams.set(parameter, String(value));
    }
    const excluded = [...(transport.pathParameters ?? []), ...(transport.queryParameters ?? [])];
    const body = withoutKeys(args, excluded);
    const init: RequestInit = {
      method: transport.method,
      headers: {
        ...this.headers(session, transport.body === "json" ? "application/json" : undefined),
        ...(transport.clientVersion ? { "X-ReceiptCal-Client-Version": transport.clientVersion } : {}),
      },
      ...(transport.body === "json" ? { body: JSON.stringify(body) } : {}),
    };
    return this.send(url.toString(), init);
  }

  private headers(session: StoredSession, contentType?: string): Record<string, string> {
    return {
      Authorization: `Bearer ${session.token}`,
      Accept: "application/json",
      ...(contentType ? { "Content-Type": contentType } : {}),
    };
  }

  private async send(url: string, init: RequestInit): Promise<unknown> {
    const response = await this.fetchWithTimeout(url, init);
    const body = await responseBody(response);
    if (!response.ok) {
      const message = body && typeof body === "object" && "error" in body && typeof body.error === "string"
        ? body.error
        : `ReceiptCal request failed with status ${response.status}`;
      throw new ReceiptCalApiError(message, response.status);
    }
    return body;
  }

  private async fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.config.requestTimeoutMs);
    try {
      return await this.fetchImpl(url, { ...init, signal: controller.signal });
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new ReceiptCalApiError("ReceiptCal request timed out.", 504, "timeout");
      }
      throw new ReceiptCalApiError("ReceiptCal is unavailable.", 503, "unavailable");
    } finally {
      clearTimeout(timer);
    }
  }

  private async loadReceiptFile(input: string): Promise<{ bytes: Uint8Array; contentType: string }> {
    const candidate = await realpath(resolve(input));
    const allowed = await Promise.all(this.config.allowedFileRoots.map(async (root) => {
      try { return await realpath(root); } catch { return resolve(root); }
    }));
    if (!allowed.some((root) => isInside(candidate, root))) {
      throw new Error("Receipt file is outside the configured allowed directories.");
    }
    const contentType = FILE_TYPES[extname(candidate).toLowerCase()];
    if (!contentType) throw new Error("Receipt file must be PNG, JPEG, HEIC, or WebP.");
    const details = await stat(candidate);
    if (!details.isFile()) throw new Error("Receipt path is not a file.");
    if (details.size > this.config.maxReceiptBytes) throw new Error("Receipt image exceeds the 8 MB limit.");
    return { bytes: await readFile(candidate), contentType };
  }
}
