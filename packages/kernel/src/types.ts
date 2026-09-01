export type Identifier = string;
export interface Organization { id: Identifier; name: string; createdAt: string }
export interface Workspace { id: Identifier; organizationId: Identifier; name: string; enabledPacks: string[] }

export type ApprovalStatus = "draft" | "preview" | "approved" | "executed" | "verified" | "rejected" | "failed";
export interface ApprovalEvent { from: ApprovalStatus | null; to: ApprovalStatus; actorId: Identifier; at: string; note?: string }
export interface ApprovalRecord {
  id: Identifier;
  workspaceId: Identifier;
  actionType: string;
  summary: string;
  status: ApprovalStatus;
  events: ApprovalEvent[];
}

export type OperatingPhase = "observe" | "analyze" | "plan" | "approve" | "execute" | "measure" | "learn";
export interface OperatingLoopRun {
  id: Identifier;
  workspaceId: Identifier;
  name: string;
  phase: OperatingPhase;
  cycle: number;
  approvalId?: Identifier;
  history: Array<{ from: OperatingPhase | null; to: OperatingPhase; at: string }>;
}
