import type { ApprovalRecord, ApprovalStatus, Identifier } from "./types.ts";

const transitions: Record<ApprovalStatus, ReadonlySet<ApprovalStatus>> = {
  draft: new Set(["preview"]),
  preview: new Set(["draft", "approved", "rejected"]),
  approved: new Set(["executed", "failed"]),
  executed: new Set(["verified", "failed"]),
  verified: new Set(),
  rejected: new Set(["draft"]),
  failed: new Set(["draft"]),
};

export function createApproval(input: {
  id: Identifier; workspaceId: Identifier; actionType: string; summary: string; actorId: Identifier; at?: string;
}): ApprovalRecord {
  const at = input.at ?? new Date().toISOString();
  return {
    id: input.id,
    workspaceId: input.workspaceId,
    actionType: input.actionType,
    summary: input.summary,
    status: "draft",
    events: [{ from: null, to: "draft", actorId: input.actorId, at }],
  };
}

export function transitionApproval(
  approval: ApprovalRecord,
  to: ApprovalStatus,
  actorId: Identifier,
  options: { at?: string; note?: string } = {},
): ApprovalRecord {
  if (!transitions[approval.status].has(to)) {
    throw new Error(`Invalid approval transition: ${approval.status} -> ${to}`);
  }
  if ((to === "approved" || to === "rejected") && actorId === "system") {
    throw new Error(`${to} requires a human actor`);
  }
  return {
    ...approval,
    status: to,
    events: [...approval.events, {
      from: approval.status,
      to,
      actorId,
      at: options.at ?? new Date().toISOString(),
      ...(options.note ? { note: options.note } : {}),
    }],
  };
}
