import assert from "node:assert/strict";
import test from "node:test";
import { Ajv } from "ajv";
import { CAPABILITIES, exposedToolName } from "../src/capabilities.js";
import { ROUTE_COVERAGE } from "../src/route-coverage.js";
import { toolDefinitions } from "../src/server.js";

test("capability names, exposed tool names, and route keys are unique", () => {
  const names = CAPABILITIES.map((capability) => capability.name);
  const tools = CAPABILITIES.map(exposedToolName);
  const routes = ROUTE_COVERAGE.map((route) => `${route.method} ${route.path}`);
  assert.equal(new Set(names).size, names.length);
  assert.equal(new Set(tools).size, tools.length);
  assert.equal(new Set(routes).size, routes.length);
});

test("every input schema compiles and every MCP mapping resolves", () => {
  const ajv = new Ajv({ strict: false });
  for (const capability of CAPABILITIES) assert.doesNotThrow(() => ajv.compile(capability.inputSchema));
  const names = new Set(CAPABILITIES.map((capability) => capability.name));
  for (const route of ROUTE_COVERAGE.filter((entry) => entry.disposition === "mcp")) {
    assert.ok(route.capability === "get_status" || names.has(route.capability ?? ""), `${route.method} ${route.path}`);
  }
});

test("tool definitions include meta tools and every executable capability", () => {
  const names = new Set(toolDefinitions().map((tool) => String(tool.name)));
  assert.ok(names.has("get_status"));
  assert.ok(names.has("get_capabilities"));
  assert.ok(names.has("confirm_action"));
  assert.ok(names.has("cancel_action"));
  for (const capability of CAPABILITIES) assert.ok(names.has(exposedToolName(capability)));
});

test("all persistent writes use the prepare/confirm gate", () => {
  const disclosedStatefulReads = new Set([
    "get_recommendations",
    "get_personalized_recommendations",
    "get_product_quality",
  ]);
  for (const capability of CAPABILITIES) {
    if (capability.annotations.destructiveHint || !capability.annotations.readOnlyHint) {
      if (disclosedStatefulReads.has(capability.name)) {
        assert.equal(capability.execution, "immediate", capability.name);
        continue;
      }
      assert.equal(capability.execution, "prepare", capability.name);
    }
  }
});

test("marketplace hints describe the current tool call rather than a later confirmation", () => {
  for (const capability of CAPABILITIES.filter((entry) => entry.execution === "prepare")) {
    assert.equal(capability.annotations.readOnlyHint, false, capability.name);
    assert.equal(capability.annotations.openWorldHint, false, capability.name);
    assert.equal(capability.annotations.destructiveHint, false, capability.name);
  }

  const definitions = new Map(toolDefinitions().map((tool) => [String(tool.name), tool]));
  assert.deepEqual(definitions.get("cancel_action")?.annotations, {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  });
  assert.deepEqual(definitions.get("confirm_action")?.annotations, {
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: false,
    openWorldHint: true,
  });
});

test("recipe sharing exposes account-scoped reads and confirmed writes", () => {
  const expected = [
    ["get_recipe_sharing", "GET", "/recipe-library/preferences", "immediate"],
    ["set_recipe_sharing", "PUT", "/recipe-library/preferences", "prepare"],
    ["withdraw_recipe_contributions", "DELETE", "/recipe-library/preferences", "prepare"],
    ["get_recipe_contribution", "GET", "/meal-requests/{meal_request_id}/contribution", "immediate"],
    ["contribute_recipe", "POST", "/meal-requests/{meal_request_id}/contribution", "prepare"],
    ["withdraw_recipe_contribution", "DELETE", "/meal-requests/{meal_request_id}/contribution", "prepare"],
  ] as const;
  for (const [name, method, path, execution] of expected) {
    const capability = CAPABILITIES.find(c => c.name === name);
    assert.ok(capability, name);
    assert.equal(capability.execution, execution);
    assert.equal(capability.transport.kind, "http");
    if (capability.transport.kind === "http") {
      assert.equal(capability.transport.method, method);
      assert.equal(capability.transport.path, path);
      assert.equal(capability.transport.api, "v2");
    }
    if (execution === "prepare") assert.ok(capability.confirmationPrompt);
  }
});
