import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
const json = async (path: string) => JSON.parse(await readFile(new URL(`../${path}`, import.meta.url), "utf8"));

test("portable and compatibility distributions agree on version, license and endpoint", async () => {
  const pkg = await json("package.json");
  for (const path of ["plugin.json", ".codex-plugin/plugin.json", ".claude-plugin/plugin.json"]) {
    const manifest = await json(path);
    assert.equal(manifest.version, pkg.version);
    assert.equal(manifest.license, "MIT");
    assert.equal(manifest.repository, "https://github.com/mihirkavi/receiptcal-plugin");
  }
  const portable = (await json("mcp.json")).mcpServers.receiptcal;
  const legacy = (await json(".mcp.json")).mcpServers.receiptcal;
  assert.equal(portable.type, "streamable-http");
  assert.equal(legacy.type, "http");
  assert.equal(portable.url, "https://mcp.receiptcal.com/mcp");
  assert.equal(legacy.url, portable.url);
  assert.deepEqual(Object.keys(portable).sort(), ["type", "url"]);
  assert.deepEqual(Object.keys(legacy).sort(), ["type", "url"]);
});

test("marketplace entries resolve to this standalone plugin", async () => {
  const codex = await json(".agents/plugins/marketplace.json");
  const claude = await json(".claude-plugin/marketplace.json");
  assert.equal(codex.name, "receiptcal-plugins");
  assert.equal(claude.name, codex.name);
  assert.equal(codex.plugins[0].source.path, "./");
  assert.equal(claude.plugins[0].source, "./");
  assert.equal(codex.plugins[0].name, "receiptcal");
  assert.equal(claude.plugins[0].name, "receiptcal");
});
