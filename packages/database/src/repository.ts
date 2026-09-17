import type {
  ActivityListItem, ApprovalListItem, DashboardSnapshot, KpiCard, LoopListItem,
  QueryExecutor, RecommendationListItem, TransactionalDatabase, WorkspaceIdentity,
} from "./types.ts";

function numeric(value: unknown): number {
  return typeof value === "number" ? value : Number(value ?? 0);
}

function iso(value: unknown): string {
  return value instanceof Date ? value.toISOString() : String(value);
}

function toneFor(key: string, value: number): KpiCard["tone"] {
  if (key === "pending_approvals") return value > 0 ? "warning" : "positive";
  if (key.includes("failure")) return value > 0 ? "critical" : "positive";
  return "positive";
}

export class ControlTowerRepository {
  private readonly database: TransactionalDatabase;

  constructor(database: TransactionalDatabase) {
    this.database = database;
  }

  async getDashboardSnapshot(workspaceId: string): Promise<DashboardSnapshot> {
    const [identityResult, kpiResult, approvalResult, loopResult, recommendationResult, activityResult] = await Promise.all([
      this.database.query<Record<string, unknown>>(
        `SELECT o.name AS organization_name, w.name AS workspace_name
         FROM workspaces w JOIN organizations o ON o.id = w.organization_id
         WHERE w.id = $1`, [workspaceId]),
      this.database.query<Record<string, unknown>>(
        `SELECT DISTINCT ON (d.id) d.metric_key, d.label, d.unit, o.value, o.delta_percentage, d.display_order
         FROM metric_definitions d
         LEFT JOIN metric_observations o ON o.metric_id = d.id
         WHERE d.workspace_id = $1 AND d.enabled = true
         ORDER BY d.id, o.observed_at DESC`, [workspaceId]),
      this.database.query<Record<string, unknown>>(
        `SELECT id, action_type, summary, risk_level, status, requested_by, created_at
         FROM approval_requests WHERE workspace_id = $1 AND status = 'preview'
         ORDER BY CASE risk_level WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END, created_at`, [workspaceId]),
      this.database.query<Record<string, unknown>>(
        `SELECT id, name, pack_id, phase, cycle, status, scorecard_metric, scorecard_value, updated_at
         FROM operating_loop_runs WHERE workspace_id = $1 AND status = 'active'
         ORDER BY updated_at DESC`, [workspaceId]),
      this.database.query<Record<string, unknown>>(
        `SELECT id, title, rationale, priority, source FROM recommendations
         WHERE workspace_id = $1 AND status = 'pending'
         ORDER BY CASE priority WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END, created_at
         LIMIT 3`, [workspaceId]),
      this.database.query<Record<string, unknown>>(
        `SELECT id::text, event_type, title, detail, severity, created_at FROM activity_events
         WHERE workspace_id = $1 ORDER BY created_at DESC LIMIT 8`, [workspaceId]),
    ]);

    const identityRow = identityResult.rows[0];
    if (!identityRow) throw new Error(`Workspace not found: ${workspaceId}`);
    const identity: WorkspaceIdentity = {
      organizationName: String(identityRow.organization_name),
      workspaceName: String(identityRow.workspace_name),
    };
    const kpis: KpiCard[] = kpiResult.rows
      .sort((a, b) => numeric(a.display_order) - numeric(b.display_order))
      .map((row) => {
        const key = String(row.metric_key);
        const value = numeric(row.value);
        return {
          key, label: String(row.label), value, unit: String(row.unit),
          deltaPercentage: row.delta_percentage == null ? null : numeric(row.delta_percentage),
          tone: toneFor(key, value),
        };
      });
    const approvals: ApprovalListItem[] = approvalResult.rows.map((row) => ({
      id: String(row.id), actionType: String(row.action_type), summary: String(row.summary),
      riskLevel: row.risk_level as ApprovalListItem["riskLevel"], status: String(row.status),
      requestedBy: String(row.requested_by), createdAt: iso(row.created_at),
    }));
    const loops: LoopListItem[] = loopResult.rows.map((row) => ({
      id: String(row.id), name: String(row.name), packId: row.pack_id == null ? null : String(row.pack_id),
      phase: String(row.phase), cycle: numeric(row.cycle), status: String(row.status),
      scorecardMetric: row.scorecard_metric == null ? null : String(row.scorecard_metric),
      scorecardValue: row.scorecard_value == null ? null : numeric(row.scorecard_value), updatedAt: iso(row.updated_at),
    }));
    const recommendations: RecommendationListItem[] = recommendationResult.rows.map((row) => ({
      id: String(row.id), title: String(row.title), rationale: String(row.rationale),
      priority: String(row.priority), source: String(row.source),
    }));
    const activities: ActivityListItem[] = activityResult.rows.map((row) => ({
      id: String(row.id), eventType: String(row.event_type), title: String(row.title),
      detail: row.detail == null ? null : String(row.detail),
      severity: row.severity as ActivityListItem["severity"], createdAt: iso(row.created_at),
    }));

    return {
      identity, generatedAt: new Date().toISOString(), dataSource: "postgres",
      kpis, approvals, loops, recommendations, activities,
    };
  }

  async reviewApproval(input: {
    workspaceId: string; approvalId: string; decision: "approved" | "rejected"; actorId: string; note?: string;
  }): Promise<void> {
    if (!input.actorId || input.actorId === "system") throw new Error("A human actor is required");
    await this.database.transaction(async (executor: QueryExecutor) => {
      const updated = await executor.query<Record<string, unknown>>(
        `UPDATE approval_requests
         SET status = $1, reviewed_by = $2, reviewed_at = now(), updated_at = now()
         WHERE id = $3 AND workspace_id = $4 AND status = 'preview'
         RETURNING id`,
        [input.decision, input.actorId, input.approvalId, input.workspaceId],
      );
      if (updated.rows.length !== 1) throw new Error("Approval is missing or no longer in preview");
      await executor.query(
        `INSERT INTO approval_events (approval_id, from_status, to_status, actor_id, note)
         VALUES ($1, 'preview', $2, $3, $4)`,
        [input.approvalId, input.decision, input.actorId, input.note ?? null],
      );
      await executor.query(
        `INSERT INTO activity_events (workspace_id, event_type, title, detail, severity)
         VALUES ($1, 'approval_reviewed', $2, $3, $4)`,
        [input.workspaceId,
          input.decision === "approved" ? "작업이 승인되었습니다." : "작업이 반려되었습니다.",
          input.approvalId, input.decision === "approved" ? "success" : "warning"],
      );
    });
  }
}
