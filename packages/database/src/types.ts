export type DashboardDataSource = "postgres" | "demo";
export type Tone = "neutral" | "positive" | "warning" | "critical";
export interface WorkspaceIdentity { organizationName: string; workspaceName: string }
export interface KpiCard { key: string; label: string; value: number; unit: string; deltaPercentage: number | null; tone: Tone }
export interface ApprovalListItem {
  id: string; actionType: string; summary: string; riskLevel: "low" | "medium" | "high" | "critical";
  status: string; requestedBy: string; createdAt: string;
}
export interface LoopListItem {
  id: string; name: string; packId: string | null; phase: string; cycle: number; status: string;
  scorecardMetric: string | null; scorecardValue: number | null; updatedAt: string;
}
export interface RecommendationListItem { id: string; title: string; rationale: string; priority: string; source: string }
export interface ActivityListItem {
  id: string; eventType: string; title: string; detail: string | null;
  severity: "info" | "success" | "warning" | "error"; createdAt: string;
}
export interface DashboardSnapshot {
  identity: WorkspaceIdentity; generatedAt: string; dataSource: DashboardDataSource; kpis: KpiCard[];
  approvals: ApprovalListItem[]; loops: LoopListItem[]; recommendations: RecommendationListItem[]; activities: ActivityListItem[];
}
export interface QueryResult<Row> { rows: Row[] }
export interface QueryExecutor {
  query<Row extends Record<string, unknown>>(text: string, values?: readonly unknown[]): Promise<QueryResult<Row>>;
}
export interface TransactionalDatabase extends QueryExecutor {
  transaction<T>(operation: (executor: QueryExecutor) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}
