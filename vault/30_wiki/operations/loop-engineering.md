---
kind: wiki
domain: operations
status: active
created: 2026-09-02
updated: 2026-09-02
aliases:
  - Loop Engineering
source_refs:
  - "https://github.com/zmakerz/obsidianOs/blob/main/docs/ARCHITECTURE.md"
---

# Loop Engineering

> 공개용 설계 예제입니다. 실제 회사 자료나 운영 성과가 아니며, 위 출처는 이 프로젝트의 설계·코드 참조입니다.

## Capsule

Loop Engineering은 반복 업무를 자동 실행하는 것만이 아니라, 한 바퀴의 성과가 다음 바퀴의 규칙과 입력을 바꾸게 만드는 방식입니다. 매번 감으로 정하는 값은 기록과 규칙으로 고정하고, 한 번 정한 뒤 바뀌지 않는 값은 실제 성과 데이터로 계속 갱신합니다.

## 한 바퀴의 부품

1. **Input**: 이번 바퀴에 처리할 자료나 사건
2. **Machine**: 반복 가능한 SOP·규칙·프롬프트
3. **Output**: 실제로 만들어진 결과
4. **Scorecard**: 다음 바퀴를 바꿀 성과 숫자 하나

Scorecard를 기록하는 것만으로는 Loop가 닫히지 않습니다. 결과를 검토하여 Machine, 우선순위 또는 다음 Input이 실제로 바뀌어야 합니다.

## 승격 순서

`Manual → AI Assist → Recorder → Decision Assist → Reversible Automation → Learning Loop`

- 초기에는 한 바퀴를 손으로 돌리며 입력·판단·결과를 확인합니다.
- 기록 부담은 한 바퀴당 핵심 항목과 Scorecard 하나로 제한합니다.
- 데이터가 쌓이기 전에는 판단 자동화를 켜지 않습니다.
- 외부 발송·비용·삭제처럼 영향이 큰 실행은 자동화 수준과 무관하게 사람의 승인을 받습니다.

## Relationships

- [[30_wiki/operations/business-os-operating-model|Business OS 운영 모델]]
- [[60_sop/marketing/GEO-AEO-weekly-improvement|GEO-AEO 주간 개선 SOP]]
- [[60_sop/knowledge/company-knowledge-promotion|회사 지식 승격 SOP]]
