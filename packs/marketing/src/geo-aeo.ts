export interface MarketingWorkstream { id: string; name: string; purpose: string; defaultMetrics: string[] }

export const geoAeoWorkstreams: MarketingWorkstream[] = [
  { id: "onsite", name: "On-site clarity", purpose: "메인·제품·솔루션·리소스 페이지가 브랜드와 고객 문제를 명확히 설명하게 합니다.", defaultMetrics: ["priority_pages_reviewed", "answer_ready_sections"] },
  { id: "entity-schema", name: "Entity and schema", purpose: "브랜드명, 설명, 카테고리와 구조화 데이터를 일관되게 관리합니다.", defaultMetrics: ["entity_consistency_rate", "schema_coverage_rate"] },
  { id: "answer-content", name: "Answer-ready content", purpose: "질문에 바로 답하고 AI가 인용하기 쉬운 콘텐츠를 작성·갱신합니다.", defaultMetrics: ["published_assets", "content_refresh_rate"] },
  { id: "offsite-authority", name: "Off-site authority", purpose: "외부 언급, 리뷰, 디렉터리, 파트너 콘텐츠의 일관성과 권위를 관리합니다.", defaultMetrics: ["qualified_mentions", "citation_domains"] },
  { id: "measurement", name: "AI visibility measurement", purpose: "AI 답변 내 브랜드 언급·인용과 유입·전환을 추적합니다.", defaultMetrics: ["ai_citation_share", "assisted_leads", "qualified_conversion_rate"] },
  { id: "reference-intelligence", name: "Reference intelligence", purpose: "검색·웹·유튜브 레퍼런스의 주제, 형식, 성과 패턴을 축적합니다.", defaultMetrics: ["references_reviewed", "patterns_promoted"] },
];

export const geoAeoOperatingLoop = {
  name: "GEO/AEO weekly improvement",
  oneCycle: "우선순위 질문 또는 페이지 1개를 개선하고 결과를 측정",
  phases: {
    observe: "브랜드 언급, 인용, 유입, 기존 자산 상태를 수집",
    analyze: "누락된 답변, 엔티티 불일치, 근거 부족을 찾음",
    plan: "이번 주 개선 대상 1개와 합격 기준을 작성",
    approve: "발행·스키마·외부 변경 Preview를 사람이 확인",
    execute: "승인된 변경만 반영",
    measure: "노출, 인용, 참여, 전환 변화를 기록",
    learn: "재사용할 패턴을 Wiki 또는 SOP로 승격",
  },
} as const;
