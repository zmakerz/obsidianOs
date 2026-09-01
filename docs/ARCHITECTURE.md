# Architecture

```text
Personal KnowledgeOS (E:/Project/wiki)
             │ selected promotion
             ▼
Company Vault ─── Knowledge Port ─── Control Tower
                                         │
Operational DB ─── Kernel / Workflows ───┤
                                         │
External SaaS ─── Integration Adapters ──┘
                         │
                    Approval Gate
```

## 역할

- **Company Vault**: 전략, 개념, SOP, 결정, 회고. 실시간 거래 상태는 저장하지 않습니다.
- **Operational DB**: 리드, 고객, 주문, 캠페인, 작업, 승인, 이벤트, KPI.
- **Control Tower**: 현황, 병목, 승인 대기, 실행 결과를 보여주는 사람의 제어면.
- **Agent/Workflow**: AI 초안과 검증을 Kernel 상태 전이와 승인 경계 안에서 실행.
- **Integrations**: n8n과 외부 API는 검증된 루프를 연결하는 Transport/Execution Layer.

## 운영 루프

`Observe → Analyze → Plan → Approve → Execute → Measure → Learn ↺`

외부 효과가 있는 실행은 `DRAFT → PREVIEW → APPROVED → EXECUTED → VERIFIED`를 따르고, 거절·실패 분기를 가집니다.

## 지식 생명주기

연구·콘텐츠는 `Inbox → Raw → Article → 선택적 Wiki → SOP/Context`로 처리합니다. Article은 원문을 살린 읽기 좋은 정리글이고, Wiki는 여러 출처를 연결하거나 반복 사용하는 개념만 짧게 유지합니다.

회사 운영은 `Evidence → Decision/Wiki → 검증된 절차 → SOP → Workflow`로 승격합니다. 업무 기록 전부를 Wiki로 만들지 않습니다.
