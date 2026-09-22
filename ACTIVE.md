# Active

updated_at: 2026-09-22
milestone: M2.1 — 로컬 Capture/Raw/Article 이후 지속 작업 연결
status: in-progress

## 현재 위치

- 맥북 작업 기준: M2.0 `7e634f6` 이후 M2.1 첫 로컬 CLI/서비스와 문서를 `aac1c72`에 커밋했습니다. 개발 브랜치 `codex/m21-source-article`에서 `main`으로 fast-forward 반영했으며 현재 공유 브랜치는 `main`입니다. **M2.1 전체는 미완료**입니다.
- 데스크톱 설계 대화를 초기 KnowledgeOS부터 GitHub/API 설정 인계까지 확인했습니다. 지속할 결정과 이유는 [PRODUCT](docs/PRODUCT.md#설계-이력과-확정-기준)에 반영했습니다. 과거 대화·임시 파일·stash를 다시 읽어야만 개발할 수 있는 상태로 두지 않습니다.
- 기본 방향은 충실한 Raw + 대표 Article, 선택적 Wiki, 날짜별 통합 로그, 필요한 맥락만 읽기입니다. 개인 지식과 회사 Vault를 합치지 않습니다.
- 기본 `README.md`는 영어, `README.ko.md`는 한국어이며 상단에서 언어를 선택합니다. 현재 기능·실행 방법·로드맵을 정리했고 글 생성 정책은 한국어를 유지합니다.
- 웹/Vault 연결·DB 작업 기록은 `b90c157`, 중단 복구 기능은 `eb13a15`로 `origin/main`에 push 완료했습니다. 이 기록은 복구 기능의 원격 검증 결과를 남기는 후속 문서 변경입니다. 새 기기에서는 최신 main을 받아 Git HEAD/origin/main을 확인합니다. 비밀키와 비공개 실험 자료는 계속 Git 제외 상태입니다.
- 사용자가 설치 후 설정·자료 관리를 웹에서 쉽게 수행하고 Obsidian과 연결하는 방향을 제안했습니다. [PRODUCT](docs/PRODUCT.md#웹-중심의-첫-사용과-일상-흐름)에 최초 설정과 화면별 동작, [ARCHITECTURE](docs/ARCHITECTURE.md#웹과-obsidian의-연결-방식)에 같은 Vault를 사용하는 로컬 서비스 경계를 반영했습니다. 새 컴퓨터/에이전트 인계 안내는 양쪽 README에서 CONTRIBUTING으로 옮겼습니다.
- 웹 `/`를 실제 로컬 Vault에 연결했습니다. 설정에서 기존 절대 경로/읽을 폴더/원문 저장 허용을 선택하거나 별도 합성 테스트 Vault를 만들 수 있습니다. 파일·붙여넣기 → 공통 `captureSource` → `20_raw/document` 영속 저장, 목록·본문 읽기·수동 갱신·Obsidian URI를 제공합니다. 연결 전만 탭 미리보기이고 제목/태그 편집·목록 제외/되돌리기는 임시 자료에만 적용합니다. AI/Article/DB 작업은 자동 생성하지 않습니다. 운영 Demo는 `/operations`에 보존했습니다.
- 영어/한국어 README에 실제 자료실·읽기 화면(`docs/images/web-library.jpg`, `web-reader.jpg`)과 키/DB 없는 테스트 절차를 추가했습니다. 캡처는 합성 자료만 사용합니다.
- 2026-09-17에 확인한 미리보기 주소: `http://127.0.0.1:3107`. 2026-09-22 작업에서는 실행 상태를 다시 확인하지 않았습니다. 3000 포트는 다른 앱이 사용 중이어서 별도 포트에서 실행했습니다. 서버 종료 뒤에는 별도로 다시 시작해야 합니다.

- M2.1의 두 번째 단계로 `--track-job` 선택 모드를 연결했습니다. 요청/job·attempt·event·호출별 사용량을 PostgreSQL에 저장하고 CLI 목록/상세 조회·취소와 제한된 명시적 재시도를 제공합니다. 2026-09-22에는 세 번째 단계인 명시적 로컬 중단 재개까지 연결했습니다. 웹 AI와 백그라운드 자동 복구는 후속입니다.

## 구현된 범위와 코드 진입점

| 현재 기능 | 확인할 코드 |
|---|---|
| 입력 검증, 출처/내용/정책 기반 ID, 중복 반환, 제공 초안 또는 AI 생성, 수동 수정·출처 충돌 | [source-article.ts](packages/knowledge/src/source-article.ts) |
| 원문 본문/줄바꿈/hash 보존, 제한된 header 탐색, 읽기 좋은 파일명, 신규 파일 배타적 게시, 잠금, 일일 로그 | [markdown-vault.ts](packages/knowledge/src/markdown-vault.ts) |
| 중앙 Responses Adapter, 문단/코드 보존 분할, 호출·출력 상한, 사용량, 오류·거부·잘림 검사 | [openai-article.ts](packages/knowledge/src/openai-article.ts) |
| 명시적 Vault/입력 경로, UTF-8 .md/.txt, --draft 또는 --ai, 취소 처리 | [process-source.ts](scripts/process-source.ts), [실행 예시](README.ko.md#자료--raw--article--m21-첫-구현) |
| 키를 출력하지 않는 별도 유료 연결 검사 | [check-openai.ts](scripts/check-openai.ts) |
| 웹 자료실·추가 dialog·읽기·관리와 모바일 배치 | [knowledge-workspace.tsx](apps/control-tower/components/knowledge-workspace.tsx), [workspace.css](apps/control-tower/components/workspace.css) |
| 웹 입력 형식·UTF-8·검색과 합성 샘플 | [library.ts](apps/control-tower/lib/library.ts), [입력 테스트](scripts/test/library-ui.test.mjs) |
| Vault 범위/부분 목록·전체 본문·Raw 저장 | [vault-library.ts](packages/knowledge/src/vault-library.ts) |
| 로컬 연결 설정·세션·합성 테스트 Vault와 API | [vault-server.ts](apps/control-tower/lib/vault-server.ts), [route.ts](apps/control-tower/app/api/vault/route.ts) |
| 웹 응답 제한·저장 결과 미확인 안내 | [vault-client.ts](apps/control-tower/lib/vault-client.ts), [요청 테스트](scripts/test/vault-client.test.mjs) |
| 연결/읽기/Raw/세션/재시작 회귀 검증 | [vault-web.test.mjs](scripts/test/vault-web.test.mjs) |
| DB 버전·checksum·동시 migration / 웹 공유 pool | [migrations.ts](packages/database/src/migrations.ts), [postgres.ts](packages/database/src/postgres.ts), [dashboard.ts](apps/control-tower/lib/dashboard.ts) |
| 처리 작업 공통 서비스·DB 저장·조회/취소 CLI | [process-job.ts](packages/knowledge/src/process-job.ts), [processing-jobs.ts](packages/database/src/processing-jobs.ts), [processing-job.ts](scripts/processing-job.ts) |
| 중단 재개·구간 checkpoint·파일 intent·부분 로그 복구 | [recovery-types.ts](packages/knowledge/src/recovery-types.ts), [005 migration](packages/database/sql/005_processing_recovery.sql), [SIGKILL 자식 프로세스](packages/database/test/recovery-child.ts) |
| 실제 DB 설치·rollback·workspace·승인·웹 서버 연결 | [integration.test.ts](packages/database/test/integration.test.ts), [재현 절차](CONTRIBUTING.md#live-database-verification) |

완성 결과의 같은 요청은 생성기를 재호출하지 않습니다. Raw만 남은 실패는 재시도할 수 있고 Article 생성 후 로그 추가 실패는 기존 글을 재사용합니다. Inbox 삭제·Wiki 생성·기존 글 덮어쓰기는 이 서비스에 없습니다. 루트 typecheck에 새 서비스/CLI 검사를 연결했고 Mac의 중첩 pnpm 버전 충돌도 실행 래퍼로 처리했습니다.

## 검증 증거 — 2026-09-17 맥북

- 사용자가 루트 `.env.local`에 키를 입력하고 연결 검사를 요청했습니다. Git 제외 파일이며 값은 출력하거나 문서에 복사하지 않았습니다. 기본 모델 gpt-5.6-terra에서 HTTP 200 / completed / OK 확인: 입력 11 + 출력 5 토큰.
- 비공개 실험 경로 `local-vault/m21-demo`의 합성 자료로 실제 Article 생성: 입력 481 + 출력 164 토큰. 같은 요청 재실행은 existing, 추가 호출 없음. 실제 검증 총 2회 / 661토큰. 일정·수치·코드 보존을 확인했지만 실사용 원문에 대한 사용자 품질 승인은 아닙니다.
- 직전 Vault 연결 구현의 자동 테스트 95개 통과: core/knowledge 39 + scripts/Vault/UI/helper 56. 이번 왕복 후 98개 결과는 아래 별도 기록합니다. 기존 원본·충돌·경로·CLI/API 테스트에 파일 형식/용량, UTF-8 원문 보존/잘못된 인코딩, 검색/분류 검사를 추가했습니다.
- 서비스 구현 후 루트 TypeScript 검사·production build·frozen lockfile 설치·diff 검사 통과. 공개 샘플 Vault: Markdown 21개 / Wikilink 22개 / HOME 도달 Wiki·SOP 5개.
- 이번 웹 변경은 TypeScript 검사와 production build 통과. 실제 브라우저에서 합성 Markdown 파일 추가, 붙여넣기, 본문/태그 검색, 읽기/코드 표시, 제목/태그 수정, 목록 제외/복원, 글 간격 설정을 확인했습니다. HTML은 실행되지 않고 텍스트로 표시되며 console error는 없었습니다. 390px 화면에서 가로 넘침 없음도 확인했습니다. 드래그 동작 자체의 브라우저 자동화는 별도 미검증입니다. 유료 API를 호출하지 않았습니다.
- 이번 Vault 연결: 브라우저에서 테스트 Vault 생성 → 본문 붙여넣기·Markdown 파일 업로드 → 실제 Raw 파일 생성 → 새로고침 후 5개 문서 유지 → 전체 본문/코드 읽기를 확인했습니다. 업로드한 원문과 디스크 Raw 본문이 줄바꿈까지 일치합니다. UI에서 저장 권한 해제 → 본문 저장 차단 → 저장 권한 복원 후 기존 5개 문서 유지도 확인했습니다. 브라우저 console error 없음, TypeScript·production build 통과. 자동 테스트는 범위/숨김/심볼릭 링크, 읽기 전용 거부, Raw 중복/수동 수정 보호, CRLF/외부 편집 재조회, 로컬 요청 경계, 새 프로세스 설정 복원과 연결 해제 시 파일 보존을 검증합니다. 이번에는 AI 비용이 발생하지 않았습니다.
- 제어 권한 재확인 후 **이 맥북에서 Obsidian 1.13.7 왕복 검증 완료**: 기존 합성 `demo-vault`를 앱에 등록 → Safari의 웹 자료실에서 코드 노트 선택 → `Obsidian에서 열기` → 일회성 앱 열기 허용 → 정확한 `30_wiki/코드와-설명-함께-보관하기.md` 열림. Obsidian에서 연결 확인 문장을 추가·저장하고 웹 새로고침 후 본문이 187자→232자로 바뀌며 해당 문장이 표시됨을 확인했습니다. 개인 Vault 문서는 검증에 사용하지 않았습니다. 실제 앱 캡처는 `docs/images/obsidian-roundtrip.jpg`이며 양쪽 README에 추가했습니다.
- 내부 브라우저에서는 URI 클릭이 외부 앱을 열지 않았으나 Safari에서는 정상 동작했습니다. 웹 읽기/설정/저장은 내부 브라우저에서도 정상입니다. 문서 읽기 안내와 README에 일반 브라우저에서 같은 웹 주소를 여는 경로를 추가했습니다. Chrome은 대안 안내이며 이 기기에서 직접 검증한 브라우저는 Safari입니다.
- 이전 개발 서버는 EPIPE 오류 후 종료 신호에 응답하지 않고 잠금을 보유했습니다. 해당 3107 서버만 종료하고 파일 로그(`/private/tmp/obsidianos-dev-3107.log`)로 다시 시작했습니다. 새 서버에서 연결 설정과 5개 문서·본문 읽기가 복원됐습니다. 현재 exec 서버 세션은 83854이며 새 세션에서는 실제 프로세스를 다시 확인합니다.
- 응답 정지 시 무한 대기를 막도록 `lib/vault-client.ts`에 30초 요청/본문 읽기 제한을 추가했습니다. 쓰기 응답 손실은 성공/실패를 추측하지 않고 저장 여부를 다시 확인하도록 안내하며 자동 재전송하지 않습니다. 이 회귀 테스트 3개를 포함해 **98개 통과(39+59)**, 타입 검사·production build 통과.
- **DB 기반 검증 완료:** 기존 PATH에는 PostgreSQL이 없었고 Homebrew로 PostgreSQL 18.6을 설치했습니다. Homebrew가 기본 cluster를 만들었지만 실행/서비스 등록하지 않았습니다. 검증은 별도 private 임시 cluster와 Unix socket으로만 실행했고 TCP는 비활성화했습니다. 기존 `.env.local`·개인 Vault·운영 DB를 변경하지 않았습니다.
- `test:database:integration`의 실제 DB **11개 시나리오 통과(Node 결과는 부모 포함 12개)**: 빈 설치/동시 migration/재실행, checksum·버전·순서 차단, 첫 설치·업그레이드 실패 rollback, 이력 없는 schema 보존, workspace FK/기존 잘못된 참조 차단, scoped 조회·승인, 동시 승인 1회, 감사 기록 실패 시 승인/이벤트 rollback, pool 재사용·새 Node 프로세스에서 저장 결과 조회, Control Tower 서버 Adapter 실제 조회/승인. 테스트는 case별 생성한 DB만 정리합니다.
- migration CLI 첫 적용 → 두 번째 up-to-date → 명시적 합성 seed를 확인했습니다. 이어 PostgreSQL 서버 자체를 fast restart하고 backend PID 변경, 기존 pool 재연결, migration 이력·Demo identity/승인/KPI 보존을 별도로 확인했습니다. 이 서버 재시작 검사는 자동 통합 명령에 포함되지 않습니다.
- 이번 변경 후 기존 **98개 테스트(39+59)**, 타입 검사·production build 통과. database 패키지의 src/test도 루트 typecheck에 포함했습니다. CI에 PostgreSQL 18 서비스와 통합 테스트를 설정했지만 원격 CI 실행 결과는 아직 없습니다. 유료 AI 호출은 하지 않았습니다.
- 통합 테스트 명령에 URL 누락·운영 이름·원격 host·중복 host를 넣으면 연결 전에 거부되는 것도 확인했습니다. 검증 후 이번 임시 PostgreSQL 서버는 종료했습니다. PostgreSQL 바이너리 설치는 유지되며 다음 실행은 CONTRIBUTING의 격리 환경 절차를 따릅니다. 웹의 기존 DB 설정은 바꾸지 않았습니다.

## 이번 지속 작업 구현 검증 — 2026-09-17 맥북

- `004_processing_jobs.sql`, `ProcessingJobRepository`, `processSourceJob`, `knowledge:process --track-job`와 `knowledge:job`을 연결했습니다. 원문·초안 전문과 키는 DB 이벤트에 저장하지 않습니다.
- 기본 자동 테스트 **98개(39+59)**와 실제 PostgreSQL **24개 시나리오(Node 결과는 부모 2개 포함 26개)** 통과. DB의 기존 003 이력에서 004로 업그레이드할 때 workspace/승인이 보존되는 것도 확인했습니다.
- 새 검증: 동시 요청/claim 1회, workspace FK와 조회/목록/취소 경계, stale attempt 거부, 완료 이벤트 실패 시 transaction rollback, 입력/정책/Vault 구분, 중복 생성 방지, 고정 재시도 상한과 재시도 성공/Raw 재사용, 대기/실행 취소, needs-input, 모의 API 성공·부분 실패·거부·잘못된 응답의 알려진/불명 사용량, DB 기록 실패 시 호출 중단, 서로 다른 CLI 프로세스의 동일 작업·이력 조회.
- `pnpm typecheck`, `pnpm build`, `pnpm demo` 통과. 모델은 테스트 응답으로 주입했으며 실제 API 호출/비용은 추가하지 않았습니다. 앞선 DB 서버 재시작 검증과 이번 CLI 프로세스 재시작 검증을 구분합니다. 강제 종료 자동 복구는 아직 테스트 합격 대상으로 구현하지 않았습니다.
- README 영어/한국어에 선택적 DB 처리·조회·취소·재시도 사용법과 한계를 추가했습니다. 앞선 웹/Obsidian 합성 캡처 3장의 공개 범위도 다시 확인했습니다. 스테이징한 47개 파일에서 키·비공개 로컬 자료가 없는지 확인한 뒤 커밋했습니다.

- **원격 검증:** 기능 커밋 `b90c157`의 [GitHub CI](https://github.com/zmakerz/obsidianOs/actions/runs/35237193982)가 성공했습니다. Ubuntu + Node 24 + PostgreSQL 18에서 frozen install·기본/DB 통합 테스트·demo·typecheck·build가 통과했습니다. 검증용 로컬 PostgreSQL은 종료했고 자동 서비스로 등록하지 않았습니다.

## 이번 중단 복구 구현 검증 — 2026-09-22 맥북

- `005_processing_recovery.sql`과 CLI `--track-job --resume`을 연결했습니다. 30초 lease와 heartbeat, 같은 실행의 DB 쓰기 검사, Vault별 DB 세션 잠금으로 재개를 제어합니다. 파일 잠금은 같은 job의 이전 attempt·같은 hostname·종료된 PID를 확인한 경우만 회수합니다. 살아 있는 프로세스나 출처 불명 잠금은 보존합니다.
- 검증된 생성 구간과 완성 초안은 재사용하고, Raw/Article 게시 전 hash intent와 일일 로그의 이전/추가 바이트로 중단 지점을 대조합니다. 기존 파일 수정은 보존하며 결과나 과금이 불명인 호출은 재호출하지 않고 needs-review로 남깁니다. 성공 시 임시 생성 본문과 로그 before-image는 DB에서 제거하고 문서 hash·사용량·시도 이력을 유지합니다. 재개를 위해 같은 입력/옵션을 다시 제공해야 합니다.
- 이 기기의 새 격리 PostgreSQL 18.6 cluster에서 **48개 시나리오(Node 부모 테스트 3개 포함 51개) 통과**했습니다. 기존 24개에 복구 시나리오 24개를 추가했습니다. 실제 자식 프로세스를 SIGKILL하고 폐기용 DB에서만 lease 만료를 재현했습니다. 원문/호출/구간/초안/Article/로그/완료 기록 전후, 부분 로그, 중복 재개, 수정본 보존, DB 세션 연결 손실 후 살아 있는 파일 소유자 보호, 이전 시도의 쓰기 거부와 공개 CLI --resume을 검증했습니다. 테스트용 DB 외 backend를 종료하지 않도록 대상 DB 범위를 제한합니다.
- 기본 테스트 **98개(39+59)**, TypeScript 검사·production build·demo 통과. 모델 응답은 테스트에서 주입했고 **실제 API 호출·추가 비용은 없습니다**. `.env.local`·개인 Vault·기존 운영 DB를 변경하지 않았습니다. 검증 후 이번 임시 PostgreSQL 서버는 종료했습니다. 9월 17일의 실제 API·Obsidian 왕복·DB 서버 재시작 검증은 과거 증거이며 이번에 다시 수행한 것으로 표시하지 않습니다.
- 영문/한글 README, PRODUCT, ARCHITECTURE, MILESTONES와 CONTRIBUTING에 명시적 재개 사용법·한계·임시 본문 보관을 반영했습니다. M2.1 전체 완료는 아니며 다음은 입력 계약과 자료별 품질 검증입니다. 기능 커밋 `eb13a15`를 origin/main에 push했고 [GitHub CI](https://github.com/zmakerz/obsidianOs/actions/runs/35720262360)가 성공했습니다. Ubuntu + Node 24 + PostgreSQL 18에서 frozen install·기본/DB 통합 테스트·demo·typecheck·build가 통과했습니다. 후속 문서 커밋은 이 결과를 기록합니다.

## 알려진 한계

- DB migration/pool/승인과 선택적 CLI job/attempt/event·사용량 저장은 연결했습니다. 웹 AI·작업 상태 화면·백그라운드 Worker는 아직 없습니다. 이력 없는 기존 DB의 자동 baseline, 수동 DDL drift 검사와 일반 사용자 DB 자동 설치는 미지원입니다. DB 제약 검증을 로그인·다중 회사 권한 격리 완료로 해석하지 않습니다.
- 파일 잠금은 지속 작업 큐가 아닙니다. 중단 후 --resume은 만료된 실행과 같은 기기의 확인된 종료 소유자에 한정됩니다. 구형 lease 없는 running, 다른 기기/불명 잠금, 결과 불명 호출, 취소/시도 상한으로 종료된 작업의 남은 잠금은 별도 검토가 필요하며 강제 초기화 도구는 없습니다. 백그라운드 자동 재개·전원 손실/파일시스템 손상·모든 외부 편집 경쟁은 검증 범위 밖입니다. 완료 중복 조회는 저장된 처리 결과이며 현재 파일 revision 재검증이 아닙니다.
- 저장된 생성 구간은 재사용하지만, 결과를 확보하지 못한 호출은 안전하게 재호출할 수 있다고 추측하지 않습니다. 복구 레코드는 4.5 MB 입력 상한이 있으며 미완료/검토 자료의 장기 정리 정책은 후속입니다. 코드 블록/분할 검사는 의미적 누락·수치 충실성·문체 품질을 보장하지 않습니다.
- CLI는 입력 파일 전체를 보존합니다. Capture frontmatter 분리, 웹/YouTube 본문 수집, PDF 등 바이너리 입력은 아직 미지원입니다. URL만 있으면 needs-input입니다.
- Raw/Article 폴더 내 ID 조회는 되지만, Raw 이동 뒤 자동 링크 복구는 없습니다. 불일치는 검토할 충돌로 반환합니다.
- 웹은 단일 로컬 연결만 제공합니다. 최대 300문서·3,000항목·깊이12, 파일별 앞 8 KB/본문 1,200자 목록이므로 검색은 미리보기 범위입니다. 변경 감지·전체 검색 인덱스는 없으며 수동 새로고침합니다. 이름 변경은 새 목록 ID입니다. 업로드 파일당 2 MB·배치 20개/10 MB, 전체 읽기는 메타데이터 포함 2.1 MB, 화면 50,000자·다운로드는 frontmatter 제외 전체 본문입니다.
- URL/PDF/Obsidian 전용 문법·첨부·웹 AI/키 설정·지속 Worker·설치 패키지는 미지원입니다. 연결 전 임시 자료는 새로고침하면 사라집니다. 연결 후 저장된 문서의 웹 편집/삭제는 제공하지 않습니다. worker/demo.ts는 상태 전이 예제이며 Obsidian 처리·revision 결합 Wiki 승인·단계적 지식 검색은 남아 있습니다.

## 바로 다음 행동

[Milestones의 M2.1 남은 실행 순서](docs/MILESTONES.md#m21의-남은-실행-순서) **4번 입력 계약과 품질 검증부터 진행합니다.** Capture frontmatter와 실제 본문을 분리하는 Adapter를 기존 Raw/Article 공통 서비스에 연결합니다. 마케팅·코드·긴 일반 자료에서 앞/중간/끝, 수치·조건·사례·코드 보존과 합본 중복/문체를 평가합니다. 구조 검사만으로 의미적 누락이 없다고 판정하지 않고, 사용자가 선택한 실사용 자료 최소 한 건의 Article 검토까지 이어갑니다. Company Profile 공란은 이를 막지 않습니다. 기존 API 연결 검사를 이유 없이 반복하지 않습니다.

Obsidian 열기/편집 → 웹 새로고침 왕복은 확인했습니다. 다음 구현은 M2.1 지속 작업 기반에 웹 AI 처리·설정·작업 상태를 연결하고 URL 수집·Wiki 검토를 추가합니다. 대규모 Vault에 대해서는 검색 범위/인덱스·변경 감지와 중단 복구를 검증합니다. 탭 메모리 기능을 별도 영구 문서 저장소로 확장하지 않습니다. 로컬 실행기와 DB 준비까지 연결돼야 일반 사용자 설치 완료로 판단합니다.

새 세션은 PROJECT → ACTIVE → 관련 PRODUCT 결정/MILESTONES/코드 순으로 필요한 범위만 읽습니다. 개선 후보와 채택 근거는 [Architecture](docs/ARCHITECTURE.md#개선-순서와-채택-기준)에 있습니다. 시작할 때 현재 branch/diff와 해당 기기의 설정을 확인하고, 종료할 때 변경·검증·남은 작업·공유 상태를 이 문서에 갱신합니다. `.env.local`, 실제 자료, 로컬 Obsidian 설정은 공개 Git/Vault에 넣지 않습니다.
