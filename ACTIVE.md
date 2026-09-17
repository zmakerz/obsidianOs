# Active

updated_at: 2026-09-17
milestone: M2.1 — 로컬 Capture/Raw/Article 이후 지속 작업 연결
status: in-progress

## 현재 위치

- 맥북 작업 기준: upstream M2.0 `7e634f69142e52ed674213154f45361f32693ad0`, 브랜치 `codex/m21-source-article`. M2.0 완료, M2.1 첫 로컬 CLI/서비스 구현. **M2.1 전체는 미완료**입니다.
- 데스크톱 설계 대화를 초기 KnowledgeOS부터 GitHub/API 설정 인계까지 확인했습니다. 지속할 결정과 이유는 [PRODUCT](docs/PRODUCT.md#설계-이력과-확정-기준)에 반영했습니다. 과거 대화·임시 파일·stash를 다시 읽어야만 개발할 수 있는 상태로 두지 않습니다.
- 기본 방향은 충실한 Raw + 대표 Article, 선택적 Wiki, 날짜별 통합 로그, 필요한 맥락만 읽기입니다. 개인 지식과 회사 Vault를 합치지 않습니다.
- 이번 작업은 GitHub용 README 정비입니다. 기본 `README.md`는 영어, `README.ko.md`는 한국어로 구성하고 상단에 상호 언어 선택 링크를 연결했습니다. 소개·현재 기능·실행 방법·로드맵을 정리했으며 서비스 코드와 글 생성 언어는 변경하지 않았습니다.
- M2.1 첫 로컬 구현, 설계 인계 문서와 영문/한국어 README를 `codex/m21-source-article` 브랜치의 로컬 커밋으로 함께 기록합니다. **GitHub push는 미실행**이며 다른 기기에 전달된 상태가 아닙니다. 정확한 커밋은 `git log -1`로 확인합니다.

## 구현된 범위와 코드 진입점

| 현재 기능 | 확인할 코드 |
|---|---|
| 입력 검증, 출처/내용/정책 기반 ID, 중복 반환, 제공 초안 또는 AI 생성, 수동 수정·출처 충돌 | [source-article.ts](packages/knowledge/src/source-article.ts) |
| 원문 본문/줄바꿈/hash 보존, 제한된 header 탐색, 읽기 좋은 파일명, 신규 파일 배타적 게시, 잠금, 일일 로그 | [markdown-vault.ts](packages/knowledge/src/markdown-vault.ts) |
| 중앙 Responses Adapter, 문단/코드 보존 분할, 호출·출력 상한, 사용량, 오류·거부·잘림 검사 | [openai-article.ts](packages/knowledge/src/openai-article.ts) |
| 명시적 Vault/입력 경로, UTF-8 .md/.txt, --draft 또는 --ai, 취소 처리 | [process-source.ts](scripts/process-source.ts), [실행 예시](README.ko.md#자료--raw--article--m21-첫-구현) |
| 키를 출력하지 않는 별도 유료 연결 검사 | [check-openai.ts](scripts/check-openai.ts) |

완성 결과의 같은 요청은 생성기를 재호출하지 않습니다. Raw만 남은 실패는 재시도할 수 있고 Article 생성 후 로그 추가 실패는 기존 글을 재사용합니다. Inbox 삭제·Wiki 생성·기존 글 덮어쓰기는 이 서비스에 없습니다. 루트 typecheck에 새 서비스/CLI 검사를 연결했고 Mac의 중첩 pnpm 버전 충돌도 실행 래퍼로 처리했습니다.

## 검증 증거 — 2026-09-17 맥북

- 사용자가 루트 `.env.local`에 키를 입력하고 연결 검사를 요청했습니다. Git 제외 파일이며 값은 출력하거나 문서에 복사하지 않았습니다. 기본 모델 gpt-5.6-terra에서 HTTP 200 / completed / OK 확인: 입력 11 + 출력 5 토큰.
- 비공개 실험 경로 `local-vault/m21-demo`의 합성 자료로 실제 Article 생성: 입력 481 + 출력 164 토큰. 같은 요청 재실행은 existing, 추가 호출 없음. 실제 검증 총 2회 / 661토큰. 일정·수치·코드 보존을 확인했지만 실사용 원문에 대한 사용자 품질 승인은 아닙니다.
- 자동 테스트 87개 통과, 실패·skip 없음: core/knowledge 39 + scripts/Vault 48. 원본 보존, 중복·수정·출처 충돌, 경로/심볼릭 링크, 동시 실행·취소, 로그 복구, CLI, 분할 및 API 실패를 합성 fixture와 모의 API로 검증합니다.
- 서비스 구현 후 루트 TypeScript 검사·production build·frozen lockfile 설치·diff 검사 통과. 공개 샘플 Vault: Markdown 21개 / Wikilink 22개 / HOME 도달 Wiki·SOP 5개.
- 이번 README 언어 분리 후 자동 테스트 87개를 다시 실행해 모두 통과했습니다. 관련 문서 9개의 로컬 링크/헤딩 62개, 양방향 언어 선택, 두 README의 실행 명령 13종 일치, 코드 블록과 diff 검사도 통과했습니다. 유료 API 검증과 build는 반복하지 않았습니다.
- 실제 PostgreSQL 통합·재시작 검증은 아직 없습니다. 당시 맥북 PATH에서 PostgreSQL/psql/Docker 실행 파일을 찾지 못했습니다. 다른 기기나 다음 세션에서는 환경을 새로 확인합니다.

## 알려진 한계

- 파일 잠금은 지속 작업 큐가 아닙니다. 강제 종료 후 잠금은 수동 확인이 필요하며 자동으로 탈취하지 않습니다. DB job/attempt/event, lease, write intent, 구간 checkpoint와 부분 로그 복구가 남아 있습니다.
- 중간 실패한 긴 입력은 모델 재호출이 발생할 수 있습니다. 코드 블록/분할 검사는 의미적 누락·수치 충실성·문체 품질을 보장하지 않습니다.
- CLI는 입력 파일 전체를 보존합니다. Capture frontmatter 분리, 웹/YouTube 본문 수집, PDF 등 바이너리 입력은 아직 미지원입니다. URL만 있으면 needs-input입니다.
- Raw/Article 폴더 내 ID 조회는 되지만, Raw 이동 뒤 자동 링크 복구는 없습니다. 불일치는 검토할 충돌로 반환합니다.
- Control Tower는 Demo/초기 DB 조회이며 worker/demo.ts는 상태 전이 예제입니다. Obsidian 처리 명령·웹 공통 처리·revision 결합 Wiki 승인·부분 검색은 M2.2입니다.

## 바로 다음 행동

[Milestones의 M2.1 남은 실행 순서](docs/MILESTONES.md#m21의-남은-실행-순서) 1번부터 진행합니다. 먼저 `packages/database/src/migrate.ts`, `repository.ts`, `postgres.ts`, SQL과 테스트, `apps/control-tower/lib/dashboard.ts`를 읽고 실제 격리 DB 검증 기반을 연결합니다. 이어 지속 작업 상태 → 중단 복구 → 입력/품질 검증 → 완료 판정 순입니다. Company Profile 공란은 이를 막지 않으며 M3 회사별 업무 전에 입력합니다.

새 세션은 PROJECT → ACTIVE → 관련 PRODUCT 결정/MILESTONES/코드 순으로 필요한 범위만 읽습니다. 개선 후보와 채택 근거는 [Architecture](docs/ARCHITECTURE.md#개선-순서와-채택-기준)에 있습니다. 시작할 때 현재 branch/diff와 해당 기기의 설정을 확인하고, 종료할 때 변경·검증·남은 작업·공유 상태를 이 문서에 갱신합니다. `.env.local`, 실제 자료, 로컬 Obsidian 설정은 공개 Git/Vault에 넣지 않습니다.
