import assert from "node:assert/strict";
import test from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { AuthStore } from "../src/auth-store.js";
import { createReceiptCalServer } from "../src/server.js";
import { ReceiptCalApiClient } from "../src/api-client.js";
import { loadConfig } from "../src/config.js";

test("MCP handshake exposes tools and safe unauthenticated status", async () => {
  const authStore = new AuthStore({});
  const fetchMock: typeof fetch = async () => Response.json({ ok: true });
  const apiClient = new ReceiptCalApiClient(loadConfig({}), fetchMock);
  const server = createReceiptCalServer({ authStore, apiClient });
  const client = new Client({ name: "receiptcal-test", version: "1.0.0" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  try {
    const tools = await client.listTools();
    assert.ok(tools.tools.length > 25);
    assert.ok(tools.tools.some((tool) => tool.name === "list_meals"));
    assert.ok(tools.tools.some((tool) => tool.name === "prepare_delete_account"));
    const status = await client.callTool({ name: "get_status", arguments: {} });
    assert.equal(status.isError, undefined);
    assert.match(JSON.stringify(status.structuredContent), /"authenticated":false/);
    assert.ok(!JSON.stringify(status).includes("Bearer"));
  } finally {
    await client.close();
    await server.close();
  }
});

test("write tools do not call ReceiptCal until a separate confirmation", async () => {
  let calls = 0;
  let requestBody = "";
  const authStore = new AuthStore({ RECEIPTCAL_TOKEN: "t".repeat(43), RECEIPTCAL_INBOX_ADDRESS: "test@receiptcal.com" });
  const fetchMock: typeof fetch = async (_input, init) => {
    calls += 1;
    requestBody = String(init?.body ?? "");
    return Response.json({ profile: { household_size: 3 } });
  };
  const apiClient = new ReceiptCalApiClient(loadConfig({}), fetchMock);
  const server = createReceiptCalServer({ authStore, apiClient });
  const client = new Client({ name: "receiptcal-confirmation-test", version: "1.0.0" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  try {
    const prepared = await client.callTool({
      name: "prepare_update_profile",
      arguments: { household_size: 3 },
    });
    assert.equal(calls, 0);
    const actionId = (prepared.structuredContent as Record<string, unknown>).action_id;
    assert.equal(typeof actionId, "string");
    const confirmed = await client.callTool({
      name: "confirm_action",
      arguments: { action_id: actionId, user_confirmed: true },
    });
    assert.equal(confirmed.isError, undefined);
    assert.equal(calls, 1);
    assert.deepEqual(JSON.parse(requestBody), { household_size: 3 });
    const replay = await client.callTool({
      name: "confirm_action",
      arguments: { action_id: actionId, user_confirmed: true },
    });
    assert.equal(replay.isError, true);
    assert.equal(calls, 1);
  } finally {
    await client.close();
    await server.close();
  }
});
