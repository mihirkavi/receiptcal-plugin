import assert from "node:assert/strict";
import test from "node:test";
import { PreparedActionStore } from "../src/action-store.js";
import { CAPABILITIES } from "../src/capabilities.js";

const capability = CAPABILITIES.find((entry) => entry.name === "update_profile")!;

test("prepared actions are single-use", () => {
  const store = new PreparedActionStore();
  const action = store.prepare(capability, { household_size: 2 });
  assert.deepEqual(store.take(action.id).arguments, { household_size: 2 });
  assert.throws(() => store.take(action.id), /not found or expired/i);
});

test("prepared actions expire and can be cancelled", () => {
  let now = 1_000;
  const store = new PreparedActionStore(100, 2, () => now);
  const expired = store.prepare(capability, {});
  now = 1_101;
  assert.throws(() => store.take(expired.id), /expired/i);
  const cancelled = store.prepare(capability, {});
  assert.equal(store.cancel(cancelled.id), true);
  assert.equal(store.cancel(cancelled.id), false);
});
