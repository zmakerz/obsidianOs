import type { ApprovalStatus, OperatingLoopRun, OperatingPhase } from "./types.ts";

const nextPhase: Record<OperatingPhase, OperatingPhase> = {
  observe: "analyze", analyze: "plan", plan: "approve", approve: "execute",
  execute: "measure", measure: "learn", learn: "observe",
};

export function createOperatingLoop(input: { id: string; workspaceId: string; name: string; at?: string }): OperatingLoopRun {
  const at = input.at ?? new Date().toISOString();
  return {
    id: input.id, workspaceId: input.workspaceId, name: input.name,
    phase: "observe", cycle: 1, history: [{ from: null, to: "observe", at }],
  };
}

export function advanceOperatingLoop(
  run: OperatingLoopRun,
  options: { approvalStatus?: ApprovalStatus; at?: string } = {},
): OperatingLoopRun {
  const to = nextPhase[run.phase];
  if (run.phase === "approve" && options.approvalStatus !== "approved") {
    throw new Error("The loop cannot execute without an approved action");
  }
  return {
    ...run,
    phase: to,
    cycle: run.phase === "learn" ? run.cycle + 1 : run.cycle,
    history: [...run.history, { from: run.phase, to, at: options.at ?? new Date().toISOString() }],
  };
}
