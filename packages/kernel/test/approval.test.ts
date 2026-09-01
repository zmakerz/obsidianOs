import assert from "node:assert/strict";
import test from "node:test";
import { createApproval, transitionApproval } from "../src/approval.ts";

test("approval follows preview, human approval, execution and verification", () => {
  let item = createApproval({ id: "a1", workspaceId: "w1", actionType: "external_message", summary: "Send", actorId: "system" });
  item = transitionApproval(item, "preview", "system");
  item = transitionApproval(item, "approved", "human-1");
  item = transitionApproval(item, "executed", "system");
  item = transitionApproval(item, "verified", "verifier");
  assert.equal(item.status, "verified");
  assert.equal(item.events.length, 5);
});

test("system cannot approve its own external action", () => {
  let item = createApproval({ id: "a2", workspaceId: "w1", actionType: "budget", summary: "Increase", actorId: "system" });
  item = transitionApproval(item, "preview", "system");
  assert.throws(() => transitionApproval(item, "approved", "system"), /requires a human actor/);
});

test("execution cannot skip preview and approval", () => {
  const item = createApproval({ id: "a3", workspaceId: "w1", actionType: "payment", summary: "Pay", actorId: "system" });
  assert.throws(() => transitionApproval(item, "executed", "system"), /Invalid approval transition/);
});
