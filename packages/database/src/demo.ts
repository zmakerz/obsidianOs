import type { DashboardSnapshot } from "./types.ts";

export function createDemoDashboardSnapshot(now = new Date()): DashboardSnapshot {
  const iso = now.toISOString();
  return {
    identity: { organizationName: "Business OS Demo", workspaceName: "Company Control Tower" },
    generatedAt: iso,
    dataSource: "demo",
    kpis: [
      { key: "pending_approvals", label: "승인 대기", value: 2, unit: "건", deltaPercentage: 0, tone: "warning" },
      { key: "active_loops", label: "활성 루프", value: 3, unit: "개", deltaPercentage: 50, tone: "positive" },
      { key: "execution_success_rate", label: "실행 성공률", value: 92, unit: "%", deltaPercentage: 4.5, tone: "positive" },
      { key: "promoted_learnings", label: "승격된 학습", value: 6, unit: "개", deltaPercentage: 20, tone: "positive" }
    ],
    approvals: [
      { id: "approval-content", actionType: "content_publish", summary: "GEO/AEO 핵심 질문 페이지 초안 발행", riskLevel: "medium", status: "preview", requestedBy: "marketing-agent", createdAt: iso },
      { id: "approval-budget", actionType: "advertising_budget_change", summary: "테스트 캠페인 일 예산 조정", riskLevel: "high", status: "preview", requestedBy: "analyst-agent", createdAt: iso }
    ],
    loops: [
      { id: "loop-geo", name: "GEO/AEO 주간 개선", packId: "marketing", phase: "approve", cycle: 2, status: "active", scorecardMetric: "ai_citation_share", scorecardValue: 18, updatedAt: iso },
      { id: "loop-reference", name: "YouTube 레퍼런스 분석", packId: "marketing", phase: "measure", cycle: 1, status: "active", scorecardMetric: "references_reviewed", scorecardValue: 12, updatedAt: iso },
      { id: "loop-knowledge", name: "주간 Knowledge 승격", packId: "knowledge", phase: "learn", cycle: 3, status: "active", scorecardMetric: "patterns_promoted", scorecardValue: 4, updatedAt: iso }
    ],
    recommendations: [
      { id: "recommendation-entity", title: "브랜드 Entity 설명을 한 문장으로 통일", rationale: "웹사이트와 외부 프로필의 카테고리 표현을 맞출 준비가 필요합니다.", priority: "high", source: "geo-aeo-analyzer" },
      { id: "recommendation-loop", title: "GEO/AEO 변경 전후 지표를 한 개로 고정", rationale: "승인 전에 성적표 기준을 확정해야 학습 루프가 닫힙니다.", priority: "medium", source: "loop-monitor" }
    ],
    activities: [
      { id: "1", eventType: "approval_requested", title: "콘텐츠 발행 승인이 요청되었습니다.", detail: "GEO/AEO 핵심 질문 페이지", severity: "warning", createdAt: iso },
      { id: "2", eventType: "loop_measured", title: "YouTube 레퍼런스 루프가 측정 단계에 도달했습니다.", detail: "12개 레퍼런스 검토", severity: "success", createdAt: iso },
      { id: "3", eventType: "knowledge_promoted", title: "반복 패턴이 Company Wiki로 승격되었습니다.", detail: "Answer-ready 콘텐츠 구조", severity: "info", createdAt: iso }
    ]
  };
}
