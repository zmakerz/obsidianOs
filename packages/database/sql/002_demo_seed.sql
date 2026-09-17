BEGIN;

INSERT INTO organizations (id, name) VALUES ('org-demo', 'Business OS Demo') ON CONFLICT (id) DO NOTHING;
INSERT INTO workspaces (id, organization_id, name) VALUES ('workspace-demo', 'org-demo', 'Company Control Tower') ON CONFLICT (id) DO NOTHING;

INSERT INTO approval_requests (id, workspace_id, action_type, summary, preview, risk_level, status, requested_by)
VALUES
  ('approval-content', 'workspace-demo', 'content_publish', 'GEO/AEO 핵심 질문 페이지 초안 발행', '{"channel":"website","asset":"answer-page"}', 'medium', 'preview', 'marketing-agent'),
  ('approval-budget', 'workspace-demo', 'advertising_budget_change', '테스트 캠페인 일 예산 조정', '{"before":50000,"after":65000,"currency":"KRW"}', 'high', 'preview', 'analyst-agent')
ON CONFLICT (id) DO NOTHING;

INSERT INTO operating_loop_runs (id, workspace_id, name, pack_id, phase, cycle, status, scorecard_metric, scorecard_value)
VALUES
  ('loop-geo', 'workspace-demo', 'GEO/AEO 주간 개선', 'marketing', 'approve', 2, 'active', 'ai_citation_share', 18),
  ('loop-reference', 'workspace-demo', 'YouTube 레퍼런스 분석', 'marketing', 'measure', 1, 'active', 'references_reviewed', 12),
  ('loop-knowledge', 'workspace-demo', '주간 Knowledge 승격', 'knowledge', 'learn', 3, 'active', 'patterns_promoted', 4)
ON CONFLICT (id) DO NOTHING;

INSERT INTO metric_definitions (id, workspace_id, metric_key, label, unit, display_order)
VALUES
  ('metric-approvals', 'workspace-demo', 'pending_approvals', '승인 대기', '건', 1),
  ('metric-loops', 'workspace-demo', 'active_loops', '활성 루프', '개', 2),
  ('metric-success', 'workspace-demo', 'execution_success_rate', '실행 성공률', '%', 3),
  ('metric-learning', 'workspace-demo', 'promoted_learnings', '승격된 학습', '개', 4)
ON CONFLICT (id) DO NOTHING;

INSERT INTO metric_observations (metric_id, value, delta_percentage, source)
SELECT seed.metric_id, seed.value, seed.delta, 'demo-seed'
FROM (VALUES
  ('metric-approvals'::text, 2::numeric, 0::numeric),
  ('metric-loops'::text, 3::numeric, 50::numeric),
  ('metric-success'::text, 92::numeric, 4.5::numeric),
  ('metric-learning'::text, 6::numeric, 20::numeric)
) AS seed(metric_id, value, delta)
WHERE NOT EXISTS (SELECT 1 FROM metric_observations existing WHERE existing.metric_id = seed.metric_id);

INSERT INTO recommendations (id, workspace_id, title, rationale, priority, status, source)
VALUES
  ('recommendation-entity', 'workspace-demo', '브랜드 Entity 설명을 한 문장으로 통일', '웹사이트와 외부 프로필의 카테고리 표현을 맞출 준비가 필요합니다.', 'high', 'pending', 'geo-aeo-analyzer'),
  ('recommendation-loop', 'workspace-demo', 'GEO/AEO 변경 전후 지표를 한 개로 고정', '승인 단계 전에 성적표 기준을 확정해야 합니다.', 'medium', 'pending', 'loop-monitor')
ON CONFLICT (id) DO NOTHING;

INSERT INTO activity_events (workspace_id, event_type, title, detail, severity, created_at)
SELECT 'workspace-demo', seed.event_type, seed.title, seed.detail, seed.severity, seed.created_at
FROM (VALUES
  ('approval_requested', '콘텐츠 발행 승인이 요청되었습니다.', 'GEO/AEO 핵심 질문 페이지', 'warning', now() - interval '12 minutes'),
  ('loop_measured', 'YouTube 레퍼런스 루프가 측정 단계에 도달했습니다.', '12개 레퍼런스 검토', 'success', now() - interval '2 hours'),
  ('knowledge_promoted', '반복 패턴이 Company Wiki로 승격되었습니다.', 'Answer-ready 콘텐츠 구조', 'info', now() - interval '1 day')
) AS seed(event_type, title, detail, severity, created_at)
WHERE NOT EXISTS (SELECT 1 FROM activity_events WHERE workspace_id = 'workspace-demo');

COMMIT;
