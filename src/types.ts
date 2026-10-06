export type JsonObject = Record<string, unknown>;

export type ToolAnnotations = {
  readOnlyHint: boolean;
  destructiveHint: boolean;
  idempotentHint: boolean;
  openWorldHint: boolean;
};

export type ApiVersion = "v1" | "v2" | "v3";

export type HttpTransport = {
  kind: "http";
  api: ApiVersion;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  pathParameters?: string[];
  queryParameters?: string[];
  body: "json" | "none";
  clientVersion?: "3";
};

export type ReceiptTextTransport = {
  kind: "receipt_text";
};

export type ReceiptFileTransport = {
  kind: "receipt_file";
};

export type Capability = {
  name: string;
  title: string;
  description: string;
  inputSchema: JsonObject;
  annotations: ToolAnnotations;
  execution: "immediate" | "prepare";
  confirmationPrompt?: string;
  transport: HttpTransport | ReceiptTextTransport | ReceiptFileTransport;
};

export type RouteDisposition = "mcp" | "auth_cli" | "device_only" | "browser_handoff";

export type RouteCoverage = {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  disposition: RouteDisposition;
  capability?: string;
  reason?: string;
};

export type StoredSession = {
  token: string;
  inboxAddress?: string;
  installationId: string;
  savedAt: string;
};
