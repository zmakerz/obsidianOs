---
kind: system-rule
status: active
created: 2026-09-01
updated: 2026-09-17
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
- kind는 wiki, sop, article 같은 영문 소문자 식별자입니다. 새로운 kind도 공통 속성을 갖추면 허용합니다.
- Wiki·SOP·Article·Output 필수: `domain`, 비어 있지 않은 문자열 목록 `source_refs`
- capture-request 필수: `domain`; promotion-request 필수: `domain`, `source_refs`, `proposed_kind`(article/wiki/sop)
- 날짜는 실제 존재하는 YYYY-MM-DD 형식입니다. id는 선택 사항이지만 작성하면 공백 없이 고유한 문자열을 사용합니다.
- aliases는 문자열 목록이며 파일 경로를 대신하지 않습니다. 템플릿의 빈 값·자리표시자는 허용하되 YAML 문법 오류는 검사합니다.
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
- 사용 중인 Wiki·SOP는 HOME에서 실제 링크를 따라 찾아갈 수 있어야 합니다. 자기 링크나 고립된 문서끼리의 순환 링크만으로는 충족되지 않습니다.
- Article·Output과 archived/deprecated 문서에 HOME 연결을 강제하지 않습니다.
- 링크는 `[[30_wiki/operations/loop-engineering|Loop Engineering]]`처럼 실제 경로와 표시명을 구분합니다. 이름이 같은 파일이 둘 이상이면 전체 경로를 사용합니다.
- 문서 관계는 본문 끝 `Related`에 Wiki Link로 연결합니다.
- 링크 수를 늘리는 것보다 실제 재사용 관계를 명확히 하는 것을 우선합니다.

## 작성 스타일

- 원문의 정보와 표현을 최대한 살리고, 불필요한 관찰자 말투나 반복적인 검증 문구를 자동으로 덧붙이지 않습니다.
- 요약 때문에 사례·수치·절차·조건을 임의로 제거하지 않습니다.
- 사실 확인이나 위험 검토가 필요한 작업은 원문 정리와 분리하여 요청받았을 때 수행합니다.

## 템플릿

`00_system/templates`에는 Capture, Knowledge, SOP, Daily Log 네 가지만 유지합니다. Obsidian의 Templates 폴더를 이 경로로 지정합니다.

## 읽기 전용 구조 검사

저장소 루트에서 `pnpm check:vault`, 별도 Vault는 `node scripts/vault-lint.mjs --vault "/absolute/vault"`로 검사합니다.

- 본문과 source_refs의 Wikilink/임베드, 파일·헤딩·블록·첨부 존재와 HOME 도달성을 검사합니다.
- 일반 Markdown 링크, 외부 URL의 접속 여부, PDF의 실제 페이지 수, Obsidian 플러그인 동작은 검사하지 않습니다.
- 코드 블록·인라인 코드·주석의 예제 링크는 제외합니다. .obsidian/.git/.trash/node_modules를 읽지 않고 심볼릭 링크·Vault 밖의 경로는 거부합니다.
- 파일 읽기 실패를 성공으로 숨기지 않습니다. 일부 인증 토큰 패턴도 확인하지만 완전한 보안 감사는 아닙니다.
- 문서를 수정하지 않으며 원문의 주장·문체·내용을 판정하거나 자동 축약하지 않습니다.
- 키 중복, 과도한 YAML 별칭 확장, 64 KiB를 넘는 frontmatter는 오류입니다. 본문 분량 제한은 아닙니다.
