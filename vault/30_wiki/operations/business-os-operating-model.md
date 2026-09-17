---
kind: wiki
domain: operations
status: active
created: 2026-09-02
updated: 2026-09-02
aliases:
  - Business OS 운영 모델
source_refs:
  - "https://github.com/zmakerz/obsidianOs/blob/main/PROJECT.md"
  - "https://github.com/zmakerz/obsidianOs/blob/main/docs/ARCHITECTURE.md"
---

# Business OS 운영 모델

> 공개용 설계 예제입니다. 실제 회사 자료나 운영 성과가 아니며, 위 출처는 이 프로젝트의 설계·코드 참조입니다.

## Capsule

Business OS는 회사의 지식과 운영 상태를 분리하면서 하나의 운영 루프로 연결합니다. Obsidian은 전략·SOP·결정과 재사용 지식을 맡고, PostgreSQL은 고객·작업·승인·KPI 같은 변하는 상태를 맡습니다. Control Tower는 사람이 현황을 보고 중요한 실행을 승인하는 제어면입니다.

## Core

- Platform Kernel은 Organization, Workspace, Task, Workflow, Approval, Audit, Metrics를 담당합니다.
- Business Pack은 Marketing, CRM, Sales, Operations 같은 실제 업무를 추가합니다.
- Industry Pack은 업종별 Business Pack 조합과 기본 설정을 제공합니다.
- AI 모델과 외부 SaaS는 Adapter와 중앙 설정을 통해 교체할 수 있어야 합니다.
- 외부 효과가 있는 행동은 `DRAFT → PREVIEW → APPROVED → EXECUTED → VERIFIED`를 거칩니다.

## Operating Loop

`Observe → Analyze → Plan → Approve → Execute → Measure → Learn`

한 바퀴의 결과는 운영 DB의 상태와 측정값으로 남고, 반복 사용할 배움만 Wiki·SOP·Decision으로 승격됩니다.

## Relationships

- [[30_wiki/operations/loop-engineering|Loop Engineering]]
- [[60_sop/knowledge/company-knowledge-promotion|회사 지식 승격 SOP]]
- [[70_context/ACTIVE|현재 회사 컨텍스트]]
