import assert from "node:assert/strict";
import test from "node:test";
import { advanceOperatingLoop, createOperatingLoop } from "../src/operating-loop.ts";

test("operating loop completes one cycle", () => {
  let run = createOperatingLoop({ id: "l1", workspaceId: "w1", name: "Weekly GEO" });
  run = advanceOperatingLoop(run);
  run = advanceOperatingLoop(run);
  run = advanceOperatingLoop(run);
  run = advanceOperatingLoop(run, { approvalStatus: "approved" });
  run = advanceOperatingLoop(run);
  run = advanceOperatingLoop(run);
  run = advanceOperatingLoop(run);
  assert.equal(run.phase, "observe");
  assert.equal(run.cycle, 2);
});

test("execution is blocked without approval", () => {
  let run = createOperatingLoop({ id: "l2", workspaceId: "w1", name: "Publish" });
  run = advanceOperatingLoop(run);
  run = advanceOperatingLoop(run);
  run = advanceOperatingLoop(run);
  assert.equal(run.phase, "approve");
  assert.throws(() => advanceOperatingLoop(run), /without an approved action/);
});
