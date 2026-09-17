import { createDemoDashboardSnapshot, type DashboardSnapshot } from "@business-os/database";

const workspaceId = process.env.BUSINESS_OS_WORKSPACE_ID ?? "workspace-demo";

export function isPostgresConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

export async function loadDashboard(): Promise<DashboardSnapshot> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) return createDemoDashboardSnapshot();

  const { getSharedPostgresControlTowerRepository } = await import("@business-os/database/postgres");
  const { repository } = getSharedPostgresControlTowerRepository(connectionString);
  return repository.getDashboardSnapshot(workspaceId);
}

export async function reviewApproval(input: {
  approvalId: string; decision: "approved" | "rejected"; note?: string;
}): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("Approval changes require PostgreSQL mode");

  const { getSharedPostgresControlTowerRepository } = await import("@business-os/database/postgres");
  const { repository } = getSharedPostgresControlTowerRepository(connectionString);
  await repository.reviewApproval({
    workspaceId,
    approvalId: input.approvalId,
    decision: input.decision,
    actorId: process.env.BUSINESS_OS_OPERATOR_ID ?? "local-owner",
    note: input.note,
  });
}
