import assert from "node:assert/strict";
import test from "node:test";
import { ReceiptCalApiClient } from "../src/api-client.js";
import { CAPABILITIES } from "../src/capabilities.js";
import type { PluginConfig } from "../src/config.js";
import type { StoredSession } from "../src/types.js";

const config: PluginConfig = {
  apiBaseUrl: "https://example.test/api/v1",
  v2ApiBaseUrl: "https://v2.example.test/api/v2",
  v3ApiBaseUrl: "https://v3.example.test/api/v3",
  healthUrl: "https://example.test/api/health",
  allowedFileRoots: [process.cwd()],
  maxReceiptBytes: 8 * 1024 * 1024,
  requestTimeoutMs: 1_000,
};
const session: StoredSession = {
  token: "x".repeat(43),
  installationId: "test-installation",
  savedAt: "test",
};

test("V1 query requests carry authentication without leaking the token into the URL", async () => {
  let capturedUrl = "";
  let capturedInit: RequestInit | undefined;
  const fetchMock: typeof fetch = async (input, init) => {
    capturedUrl = String(input);
    capturedInit = init;
    return Response.json({ meals: [] });
  };
  const client = new ReceiptCalApiClient(config, fetchMock);
  const capability = CAPABILITIES.find((entry) => entry.name === "list_meals")!;
  await client.execute(capability, { since: "2026-09-01T00:00:00.000Z" }, session);
  assert.equal(capturedUrl, "https://example.test/api/v1/meals?since=2026-09-01T00%3A00%3A00.000Z");
  assert.equal(new Headers(capturedInit?.headers).get("authorization"), `Bearer ${session.token}`);
  assert.ok(!capturedUrl.includes(session.token));
});

test("path parameters are encoded and excluded from JSON request bodies", async () => {
  let capturedUrl = "";
  let capturedBody = "";
  const fetchMock: typeof fetch = async (input, init) => {
    capturedUrl = String(input);
    capturedBody = String(init?.body);
    return Response.json({ ok: true });
  };
  const client = new ReceiptCalApiClient(config, fetchMock);
  const capability = CAPABILITIES.find((entry) => entry.name === "consume_meal")!;
  const id = "123e4567-e89b-42d3-a456-426614174000";
  await client.execute(capability, { meal_intention_id: id, servings: 1.5 }, session);
  assert.equal(capturedUrl, `https://v2.example.test/api/v2/meal-intentions/${id}/consume`);
  assert.deepEqual(JSON.parse(capturedBody), { servings: 1.5 });
});

test("V3 capabilities use the V3 host and version-gated V2 tools send the client header", async () => {
  const calls: Array<{ url: string; headers: Headers }> = [];
  const fetchMock: typeof fetch = async (input, init) => {
    calls.push({ url: String(input), headers: new Headers(init?.headers) });
    return Response.json({ ok: true });
  };
  const client = new ReceiptCalApiClient(config, fetchMock);
  await client.execute(CAPABILITIES.find((entry) => entry.name === "get_food_profile")!, {}, session);
  await client.execute(CAPABILITIES.find((entry) => entry.name === "get_nutrition_summary")!, { period: "today" }, session);
  assert.equal(calls[0]?.url, "https://v3.example.test/api/v3/profile");
  assert.equal(calls[1]?.headers.get("x-receiptcal-client-version"), "3");
});

test("API error messages are returned without exposing response internals", async () => {
  const fetchMock: typeof fetch = async () => Response.json({ error: "Not found", secret: "hidden" }, { status: 404 });
  const client = new ReceiptCalApiClient(config, fetchMock);
  const capability = CAPABILITIES.find((entry) => entry.name === "get_inventory")!;
  await assert.rejects(() => client.execute(capability, {}, session), /Not found/);
});
