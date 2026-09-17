import assert from "node:assert/strict";
import test from "node:test";
import { createDemoDashboardSnapshot } from "../src/demo.ts";

test("demo snapshot exposes every Control Tower block", () => {
  const snapshot = createDemoDashboardSnapshot(new Date("2026-09-01T00:00:00.000Z"));
  assert.equal(snapshot.dataSource, "demo");
  assert.equal(snapshot.kpis.length, 4);
  assert.ok(snapshot.approvals.length > 0);
  assert.ok(snapshot.loops.length > 0);
  assert.ok(snapshot.recommendations.length > 0);
  assert.ok(snapshot.activities.length > 0);
});

test("demo snapshot keeps all external actions in preview", () => {
  const snapshot = createDemoDashboardSnapshot();
  assert.ok(snapshot.approvals.every((approval) => approval.status === "preview"));
});
