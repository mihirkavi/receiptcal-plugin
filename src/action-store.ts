import { randomUUID } from "node:crypto";
import type { Capability, JsonObject } from "./types.js";

export type PreparedAction = {
  id: string;
  capability: Capability;
  arguments: JsonObject;
  createdAt: number;
  expiresAt: number;
};

export class PreparedActionStore {
  private readonly actions = new Map<string, PreparedAction>();

  constructor(
    private readonly ttlMs = 10 * 60 * 1_000,
    private readonly maximum = 25,
    private readonly now: () => number = Date.now,
  ) {}

  prepare(capability: Capability, args: JsonObject): PreparedAction {
    this.prune();
    if (this.actions.size >= this.maximum) {
      throw new Error("Too many pending ReceiptCal actions. Confirm or cancel an existing action first.");
    }
    const createdAt = this.now();
    const action: PreparedAction = {
      id: randomUUID(),
      capability,
      arguments: structuredClone(args),
      createdAt,
      expiresAt: createdAt + this.ttlMs,
    };
    this.actions.set(action.id, action);
    return action;
  }

  take(id: string): PreparedAction {
    this.prune();
    const action = this.actions.get(id);
    if (!action) throw new Error("Prepared ReceiptCal action not found or expired.");
    this.actions.delete(id);
    return action;
  }

  cancel(id: string): boolean {
    this.prune();
    return this.actions.delete(id);
  }

  private prune(): void {
    const current = this.now();
    for (const [id, action] of this.actions) {
      if (action.expiresAt <= current) this.actions.delete(id);
    }
  }
}
