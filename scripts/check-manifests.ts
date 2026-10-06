import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
async function json(path: string): Promise<Record<string, unknown>> {
  return JSON.parse(await readFile(resolve(root, path), "utf8")) as Record<string, unknown>;
}

const [packageManifest, codexManifest, claudeManifest, mcpManifest] = await Promise.all([
  json("package.json"),
  json(".codex-plugin/plugin.json"),
  json(".claude-plugin/plugin.json"),
  json(".mcp.json"),
]);

assert.equal(
  packageManifest.version,
  String(codexManifest.version).split("+", 1)[0],
  "Codex manifest base version differs from package version",
);
assert.equal(packageManifest.version, claudeManifest.version, "Claude manifest version differs from package version");
assert.equal(codexManifest.name, "receiptcal");
assert.equal(claudeManifest.name, "receiptcal");
const servers = mcpManifest.mcpServers as Record<string, { type?: unknown; url?: unknown }>;
assert.ok(servers.receiptcal, "MCP manifest is missing the receiptcal server");
assert.equal(servers.receiptcal.type, "http", "ReceiptCal must use the hosted MCP transport");
assert.equal(servers.receiptcal.url, "https://mcp.receiptcal.com/mcp", "ReceiptCal MCP URL differs from production");
await access(resolve(root, "dist", "src", "stdio.js"));
console.log("ReceiptCal Codex, Claude, package, and MCP manifests are synchronized.");
