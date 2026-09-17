---
kind: sop
domain: knowledge
status: draft
created: 2026-09-02
updated: 2026-09-02
aliases:
  - 회사 지식 승격 SOP
source_refs:
  - "[[00_system/OPERATING_RULES]]"
  - "https://github.com/zmakerz/obsidianOs/blob/main/packages/knowledge/src/promotion.ts"
---

# 회사 지식 승격 SOP

> 공개용 설계 예제입니다. 실제 회사 자료나 운영 성과가 아니며, 위 출처는 이 프로젝트의 설계·코드 참조입니다.

## 한 바퀴

개인 지식 또는 외부 자료 한 건을 검토하여 회사 Vault에서 재사용할 형태로 승인·반영합니다.

## Input

- 원본 파일 경로 또는 대화 URI
- 회사에서 사용할 목적
- 원하는 결과물 또는 해결할 업무

## Process

1. `10_inbox`에 승격 제안을 만듭니다.
2. 원본을 읽고 기존 Wiki·SOP·Output을 먼저 검색합니다.
3. Article로 끝낼지, 기존 Wiki를 확장할지, 새 Wiki가 필요한지 판단합니다.
4. 수정 문서, 신규 문서, 연결할 Map과 출처를 계획으로 보여줍니다.
5. 사람의 승인을 받은 뒤 회사 Vault만 수정합니다.
6. `source_refs`와 Related Link를 기록하고 HOME에서 찾을 수 있게 연결합니다.
7. 같은 날짜의 운영 로그에 결과를 한 항목으로 추가합니다.

## Quality Gate

- [ ] 개인 KnowledgeOS 원본을 이동·삭제·수정하지 않았습니다.
- [ ] 기존 문서를 먼저 검색했습니다.
- [ ] 원문의 사례·수치·절차를 임의로 약화하지 않았습니다.
- [ ] 문단마다 출처 ID를 반복하지 않고 `source_refs`에 모았습니다.
- [ ] 새 Wiki가 실제로 반복 사용할 지식인지 확인했습니다.
- [ ] 승인받은 계획 범위만 수정했습니다.

## 현재 자동화 수준

Proposal / Human Approval. 승격 제안 생성만 보조하며 승인과 실제 반영은 사람이 통제합니다.

## Related

- [[30_wiki/operations/business-os-operating-model|Business OS 운영 모델]]
- [[30_wiki/operations/loop-engineering|Loop Engineering]]
