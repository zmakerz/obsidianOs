# Project

Business OS는 회사의 사람·업무·데이터·지식·SOP·외부 서비스를 연결하고, AI가 운영 루프를 보조하며 사람이 중요한 실행을 승인하는 B2B 운영 플랫폼입니다.

## 제품 계층

1. Platform Kernel: Organization, Workspace, Task, Workflow, Approval, Audit, Metrics
2. Business Pack: Marketing, CRM, Sales, Operations
3. Industry Pack: 교육, 에이전시, 커머스 등 업종별 조합

## 데이터 경계

- PostgreSQL 예정: 리드, 주문, 캠페인, 작업, 승인, 실행 이력, KPI
- `vault/`: 회사 전략, 개념, SOP, 결정, 회고
- `E:/Project/wiki`: 개인 연구 원본과 개인 지식
- 환경변수/Secret Manager: API 키와 OAuth 토큰

## 운영 원칙

- `Observe → Analyze → Plan → Approve → Execute → Measure → Learn`
- 외부 실행은 `DRAFT → PREVIEW → APPROVED → EXECUTED → VERIFIED`
- Article을 우선하고, 여러 출처 연결·반복 재사용 때만 Wiki로 승격
- 자동화는 Manual → AI Assist → Recorder → Decision Assist → Reversible Automation → Learning Loop 순으로 승격
- 특정 모델, SaaS, 업종을 Platform Kernel에 직접 결합하지 않음

상세 기준은 `docs/PRODUCT.md`, `docs/ARCHITECTURE.md`, 현재 상태는 `ACTIVE.md`를 확인합니다.
