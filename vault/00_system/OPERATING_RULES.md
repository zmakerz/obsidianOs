---
kind: system-rule
status: active
created: 2026-09-01
updated: 2026-09-02
---

# Company Vault 운영 규칙

## 기본 원칙

- 전체 Vault를 선제적으로 읽지 않습니다.
- 원본과 증거는 `20_raw`에서 보존합니다.
- 읽기 좋은 단일 정리글만 필요하면 `80_outputs`로 끝냅니다.
- 여러 출처를 연결하거나 반복 사용하는 지식만 `30_wiki`로 승격합니다.
- 반복해서 품질이 확인된 방법만 `60_sop`로 승격합니다.
- 개인 KnowledgeOS 자료는 검토와 승인 후 필요한 항목만 가져옵니다.
- 외부 실행과 비가역적 변경은 Approval Gate를 거칩니다.
- 로그는 `90_logs/YYYY-MM-DD.md` 한 파일에 추가합니다.

## 최소 Frontmatter

README와 템플릿을 제외한 운영 문서는 다음 속성을 사용합니다.

```yaml
---
kind: wiki
domain: marketing
status: draft
created: YYYY-MM-DD
updated: YYYY-MM-DD
source_refs:
  - "원본 파일 경로 또는 source URI"
---
```

- 필수: `kind`, `status`, `created`, `updated`
- Wiki·SOP·Output 필수: `domain`, `source_refs`
- `status`: `pending`, `draft`, `active`, `deprecated`, `archived`
- 원본에서 만든 문서는 `source_refs`에 출처를 한 번만 기록합니다. 문단마다 출처 ID를 반복하지 않습니다.

## 지식 승격

1. 한 자료를 읽기 좋게 정리하는 목적이면 `80_outputs` Article로 끝냅니다.
2. 기존 Wiki를 확장하거나, 출처가 둘 이상이거나, 여러 업무에서 반복 사용할 때만 `30_wiki`로 승격합니다.
3. 같은 절차가 실제 업무에서 반복 검토되어 재사용 가능할 때만 `60_sop`로 승격합니다.
4. 향후 업무 기준을 바꾸는 결정은 `50_company/decisions.md` 한 파일에 날짜별로 추가합니다.
5. 새 파일보다 기존 문서 확장을 우선합니다.

개인 KnowledgeOS에서 가져올 때는 먼저 `10_inbox`에 승격 제안을 만들고 다음을 확인합니다.

- 원본 경로 또는 대화 URI
- 회사에서 사용할 목적
- 기존 문서 수정 여부
- 새로 만들 파일과 대상 폴더
- 사람의 승인

승인 전에는 원문을 회사 Vault로 자동 복사하거나 개인 Vault를 수정하지 않습니다.

## 링크와 탐색

- 사람의 시작점은 `40_navigation/HOME.md`입니다.
- 새 Wiki·SOP는 HOME 또는 관련 Map에서 한 번 이상 찾을 수 있어야 합니다.
- 문서 관계는 본문 끝 `Related`에 Wiki Link로 연결합니다.
- 링크 수를 늘리는 것보다 실제 재사용 관계를 명확히 하는 것을 우선합니다.

## 작성 스타일

- 원문의 정보와 표현을 최대한 살리고, 불필요한 관찰자 말투나 반복적인 검증 문구를 자동으로 덧붙이지 않습니다.
- 요약 때문에 사례·수치·절차·조건을 임의로 제거하지 않습니다.
- 사실 확인이나 위험 검토가 필요한 작업은 원문 정리와 분리하여 요청받았을 때 수행합니다.

## 템플릿

`00_system/templates`에는 Capture, Knowledge, SOP, Daily Log 네 가지만 유지합니다. Obsidian의 Templates 폴더를 이 경로로 지정합니다.
