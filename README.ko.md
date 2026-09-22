# Business OS · obsidianOs

[English](README.md) | **한국어**

Obsidian, Markdown, AI를 연결하는 로컬 우선 지식·업무 운영 기반.

자료와 회사 지식을 업무·승인·측정으로 연결하는 초기 오픈소스 프로젝트입니다. 개인 KnowledgeOS와 회사 지식의 소유 영역을 구분하며, 첫 목표는 **자료 → 충실한 Article → 필요한 경우만 Wiki → 다음 업무에서 재사용**입니다.

**개발 초기 / 로컬 데모.** 웹 자료실에서 로컬 Markdown Vault를 연결하고, 기존 노트를 읽고, 파일·붙여넣은 본문을 Raw 원문으로 저장할 수 있습니다. 연결 설정과 저장된 문서는 새로고침·서비스 재시작 후에도 유지됩니다. Kernel·Vault 골격, 운영 Demo와 초기 PostgreSQL 코드도 있습니다. 로컬 CLI의 Raw 보존·AI Article 생성과 선택적 PostgreSQL 작업·시도·이벤트·호출별 사용량 저장이 연결됐습니다. 저장 구간을 재사용하는 명시적 로컬 복구도 지원합니다. Obsidian 처리 명령, 백그라운드 작업 큐, 지속 Worker와 전체 승인·실행 연결은 아직 완성되지 않았습니다. 운영용·공개 서버용 완성 제품으로 사용하지 마세요.

![테스트 보관함에 연결된 실제 웹 자료실](docs/images/web-library.jpg)

*2026년 9월 17일, 합성 자료로 촬영한 실제 로컬 웹 화면입니다. 현재 앱은 한국어 UI이며 앞으로 구성이 달라질 수 있습니다.*

## 프로젝트가 만드는 흐름

```text
자료 → Raw 원본 보존 → 충실한 Article → 필요한 경우만 Wiki → 다음 업무에서 재사용
```

원문은 보존하고, 사례·수치·코드를 살린 정리글을 먼저 만듭니다. Wiki는 재사용 가치가 있을 때만 보강합니다. 장기적으로는 이 지식을 업무 계획·승인·실행·측정에 연결합니다.

| 현재 사용 가능 | 다음 구현 대상 |
|---|---|
| 로컬 CLI의 Raw 보존·제공 초안 저장·AI Article 생성 | 백그라운드 Worker·웹 처리 |
| 같은 요청의 기존 결과 반환·수동 수정 충돌 감지 | 구간별 결과 저장·실사용 글 품질 검증 |
| 공개 Obsidian 샘플 Vault와 구조/링크 검사 | Obsidian 처리 명령·웹 공통 작업 화면 |
| 로컬 Vault 연결·파일/본문 영속 저장·검색·읽기·Obsidian 링크 | 웹 AI 처리·URL 수집·실시간 파일 변경 감지 |
| `/operations`의 운영 Demo와 초기 DB 조회 | 실제 변경 내용 검토·승인 후 선택적 Wiki 반영·부분 검색 |

**언어 범위:** 이 README는 영어·한국어를 제공합니다. 현재 AI Article 작성 정책은 한국어이며, 상세 설계 문서와 샘플 Vault도 대부분 한국어입니다. README의 언어 선택은 앱이나 생성 글의 언어를 변경하지 않습니다.

[빠른 시작](#빠른-시작--api-키와-db-없이) · [자료 처리](#자료--raw--article--m21-첫-구현) · [Obsidian](#obsidian과-회사-지식) · [처음 사용하기](#처음-사용하기) · [로드맵](#방향과-기여)

## 빠른 시작 — API 키와 DB 없이

Node.js 24 이상, Git, package.json에 지정된 pnpm을 사용합니다. 아래 명령은 저장소 루트에서 실행합니다.

```sh
git clone https://github.com/zmakerz/obsidianOs.git
cd obsidianOs
corepack pnpm install --frozen-lockfile
corepack pnpm test
corepack pnpm demo
corepack pnpm dev
```

Corepack이 없는 환경에서는 pnpm 11.19.0을 설치한 뒤 명령의 corepack 접두사를 빼고 실행합니다. Demo에는 .env 파일이 필요하지 않습니다. DATABASE_URL을 설정하면 `/operations`가 실제 DB 모드로 전환되므로 첫 실행에서는 비워둡니다. Vault 읽기와 Raw 저장에는 PostgreSQL과 API 키가 필요하지 않습니다.

자료실은 [로컬 웹](http://127.0.0.1:3000)에서 열립니다. dev/start는 로컬 loopback에 바인딩합니다. 기존 [운영 Demo](http://127.0.0.1:3000/operations)는 별도 경로에 보존했습니다. Demo KPI·추천·활동은 합성 자료이고 승인 버튼은 비활성화됩니다.

## 처음 사용하기

위 명령으로 소스에서 실행하는 단계입니다. 설치 프로그램과 DB 자동 준비는 아직 없습니다.

1. **설정 → 테스트 보관함으로 시작**을 누릅니다. 합성 노트 3개가 있는 별도 로컬 보관함을 만들고 원문 저장을 활성화합니다. API 키와 DB가 없어도 됩니다.
2. **자료 추가**에서 UTF-8 `.md`·`.txt` 파일을 선택하거나 제목·본문을 붙여넣습니다. 원문은 `20_raw/document/`의 Markdown 파일로 저장되며 AI는 자동 실행하지 않습니다.
3. 브라우저를 새로고침합니다. 연결과 저장된 자료가 그대로 남는지 확인합니다. 검색·카드/목록 전환·문서 선택 후 **읽기 / 원문** 보기를 사용해보세요.
4. Obsidian의 **보관함으로 폴더 열기**에서 설정 화면에 표시된 동일한 폴더를 선택합니다. 이후 웹의 **Obsidian에서 열기**가 그 파일을 엽니다. Obsidian 설치와 브라우저의 외부 앱 링크 허용이 필요합니다. 앱 내부 브라우저에서 반응이 없으면 같은 웹 주소를 Safari나 Chrome에서 열고 외부 앱 실행을 허용하세요.
5. Obsidian에서 일반 테스트 노트를 수정한 뒤 웹의 **자료 새로고침**을 누르면 파일 변경을 다시 읽습니다. 가져온 Raw 원문은 그대로 보존하는 용도입니다.

![원문 보기·다운로드·Obsidian 열기를 제공하는 문서 읽기 화면](docs/images/web-reader.jpg)

*웹과 Obsidian은 같은 Markdown 파일을 사용합니다. 위 코드는 화면 검증용 합성 노트이며 AI 생성 결과가 아닙니다.*

![웹에서 연 동일한 테스트 노트를 Obsidian에서 편집](docs/images/obsidian-roundtrip.jpg)

*Obsidian에서 추가한 연결 확인 문장을 웹 자료실에서도 다시 읽었습니다.*

### 내 보관함 연결하기

설정에서 기존 보관함의 **절대 경로**와 `30_wiki, 80_outputs/articles`처럼 쉼표로 구분한 **상대 폴더 경로**를 입력합니다. 보관함 전체를 읽으려는 경우에만 `.`을 사용합니다. 숨김 폴더·심볼릭 링크는 제외합니다. 프로젝트 전용 ID/frontmatter가 없는 기존 노트도 읽으며, 연결만으로 내용을 변경하지 않습니다.

**새 자료를 20_raw/document에 원문으로 저장하도록 허용**을 선택하지 않으면 읽기 전용입니다. 허용하면 해당 폴더에 새 Raw를 저장하고 자료실에도 포함합니다. 기존 문서는 웹에서 덮어쓰거나 삭제하지 않습니다. 같은 원문을 반복해서 넣으면 기존 Raw를 재사용하며, 이미 수동 수정한 Raw는 충돌로 표시합니다. 연결 해제는 설정만 해제하고 파일은 남깁니다.

기본 실행 명령에서는 연결 설정이 `apps/control-tower/.business-os/vault.json`, 테스트 보관함은 `apps/control-tower/.business-os/demo-vault/`에 생깁니다. 모두 로컬 전용이며 Git에서 제외합니다. 직접 실행 위치를 바꾸면 `.business-os/` 위치도 달라집니다. 실제 자료는 공개 샘플 `vault/` 대신 비공개 보관함에 넣으세요.

### 현재 범위와 검증

- 로컬 단일 운영자용입니다. 쓰기는 loopback host·동일 origin·로컬 세션을 확인합니다. 다중 사용자 인증 기능은 아닙니다.
- 목록은 깊이 12, 문서 300개·항목 3,000개까지 확인합니다. 파일별 앞 8 KB를 읽어 본문 1,200자 미리보기를 반환합니다. 검색 대상은 조회된 제목·태그·경로·미리보기이며 전체 Vault 의미 검색이 아닙니다. 상한에 도달하면 읽을 폴더 범위를 좁혀주세요.
- 문서를 선택하면 전체 본문을 읽습니다(메타데이터 포함 파일 2.1 MB까지). 화면은 앞 50,000자, 다운로드는 Vault frontmatter를 제외한 **전체 본문**입니다. 기본 제목·목록·코드를 표시하고 HTML은 실행하지 않습니다. Obsidian 전용 문법과 첨부는 완전히 렌더링하지 않습니다.
- 가져오기는 UTF-8 파일당 2 MB, 한 번에 20개·합계 10 MB까지입니다. 연결한 자료는 파일로 남습니다. **연결 전** 샘플 화면은 탭 미리보기이므로 추가 자료가 새로고침하면 사라집니다. 제목/태그 편집과 목록 제외/되돌리기는 이 임시 자료에만 적용합니다.
- 로컬 요청은 30초 후 대기를 끝내고 오류를 안내합니다. 저장 요청의 응답이 끊겼다면 저장 결과는 미확인 상태이므로 자료 새로고침으로 확인한 뒤 재시도하세요. 자동으로 다시 쓰지 않습니다.
- 외부 편집은 수동 새로고침으로 반영합니다. 웹 AI 생성·키 설정·URL/PDF 수집·지속 작업 복구·Wiki 승인은 남은 구현입니다. AI Article 생성은 아래 별도 CLI에서 가능합니다.

합성 자료로 **웹 파일 업로드·본문 붙여넣기 → 실제 Raw 저장 → 새로고침 → 전체 본문 읽기**를 확인했습니다. 자동 테스트는 읽기 전용/폴더 경계, 중복 방지, 외부 편집 재조회, 새 프로세스의 설정 복원을 포함합니다. macOS에서 Safari → Obsidian 열기 → 합성 노트 편집 → 웹 새로고침 왕복도 Obsidian 1.13.7로 확인했습니다. 검증한 앱 내부 브라우저는 외부 앱이 열리지 않아 이 단계에서는 일반 브라우저를 사용합니다. 서비스 재시작 후 연결과 테스트 문서 5개도 복원됐습니다.

남은 방향은 [제품 사용 흐름](docs/PRODUCT.md#웹-중심의-첫-사용과-일상-흐름)과 [구현 순서](docs/MILESTONES.md#m22--웹-설정자료실--obsidian-연결--선택적-wiki)에 정리했습니다.

## 자료 → Raw → Article — M2.1 첫 구현

개인/회사 실제 자료는 공개 샘플 vault에 넣지 않고 별도 비공개 Vault나 Git에서 제외된 local-vault/를 지정합니다. 아래 예제의 절대 경로를 본인 경로로 바꾸세요. 대상 Vault 폴더는 미리 존재해야 합니다.

키 없이 사용자가 작성한 초안을 저장하는 예입니다. 원본과 초안 파일 모두 지정한 `--source-root` 안에 있어야 합니다.

```sh
corepack pnpm knowledge:process -- --vault "/absolute/private-vault" --source-root "/absolute/input" --source "/absolute/input/source.md" --title "자료 제목" --source-type web --url "https://example.com/article" --domain general --draft "/absolute/input/draft.md"
```

AI로 정리할 때는 [.env.example](.env.example)을 참고해 루트 `.env.local`에 `OPENAI_API_KEY`를 설정하고 같은 명령에서 `--draft ...` 대신 `--ai`를 사용합니다. `--ai`는 선택한 본문을 OpenAI로 전송하고 API 비용이 발생하는 명시적 실행 옵션입니다. 기본 모델은 gpt-5.6-terra이며 OPENAI_MODEL로 변경할 수 있습니다. 모델별 reasoning 옵션 호환성은 별도 확인이 필요합니다.

```sh
# 짧은 OK 응답을 요청하는 유료 연결 검사. 일반 테스트에는 포함되지 않습니다.
corepack pnpm check:openai
```

- 입력은 UTF-8 .md/.txt 파일입니다. 파일 전체를 원본으로 보존하며 Capture 템플릿의 frontmatter 자동 해석이나 웹/YouTube 본문 수집은 아직 하지 않습니다.
- Raw: 20_raw/<source_type>/날짜-제목-hash.md. 원문 본문·줄바꿈을 그대로 보존하고 SHA-256으로 비교합니다.
- Article: 80_outputs/articles/날짜-제목-hash.md. 출처 ID·실제 Raw 링크·생성 정책과 사용량을 보관합니다. 항상 검토 대기 초안이며 제공 초안과 AI 결과를 구분합니다.
- 파일명과 ID는 분리합니다. 같은 출처·내용·처리 정책의 재실행은 기존 결과를 반환하고 AI를 다시 호출하지 않습니다. 내용이나 모델/정책이 바뀌면 별도 결과입니다.
- Raw/Article의 기존 내용은 덮어쓰지 않습니다. 수동 수정이나 Raw 이동으로 생긴 출처 링크 불일치는 검토가 필요한 충돌로 반환합니다. Inbox 삭제와 Wiki 생성은 하지 않습니다.
- 결과 요약은 90_logs/YYYY-MM-DD.md 한 파일에 추가합니다. 작업 상태 DB를 대체하는 로그는 아닙니다.
- URL만 있거나 본문이 비면 needs-input. 모델 오류·응답 잘림·코드 누락은 실패로 반환하고 Raw를 유지합니다. 사실/문체의 전체 품질을 자동 보장하는 검사는 아닙니다.
- AI 입력은 문단·코드 블록을 유지하며 구간당 최대 12,000자, 최대 8회, 응답당 최대 8,192 출력 토큰입니다. 자동 재시도는 없습니다. 나눌 수 없는 긴 문단/코드나 총량 초과는 명시적으로 실패하며 잘라내지 않습니다.

현재는 단일 로컬 실행용입니다. 동시 쓰기는 .business-os-write.lock으로 거부합니다. 정상 오류/취소 시 잠금은 해제되지만 강제 종료 후 남은 잠금은 자동으로 훔치지 않습니다. 실행 중인 프로세스가 없는지 확인한 뒤 수동 복구가 필요합니다. 아래 DB 추적 모드에서는 구간 결과 재사용과 명시적 복구를 지원합니다. 파일 기반 모드만 사용할 때는 남은 잠금을 자동 회수하지 않습니다. 이 상태를 M2.1 전체 완료나 운영 Worker로 간주하지 않습니다.

API 계약: [OpenAI Responses](https://developers.openai.com/api/reference/responses/create), [GPT-5.6 Terra](https://developers.openai.com/api/docs/models/gpt-5.6-terra). 테스트는 합성 자료와 모의 API로 실행하며 사용자 자료나 API 키가 필요하지 않습니다.

### PostgreSQL에 처리 작업 기록하기

별도의 로컬 DB에서 `corepack pnpm db:migrate`를 실행하고 기존 workspace를 지정합니다. 합성 시험에는 `corepack pnpm db:seed`가 만드는 `workspace-demo`를 사용할 수 있습니다. `DATABASE_URL`은 셸 환경이나 Git에서 제외된 `apps/control-tower/.env.local`에 설정합니다. 처리 명령은 AI 설정용 루트 `.env.local`도 읽습니다(루트 파일이 앱 파일보다 우선, 셸 환경이 최우선). 실제 접속 정보는 커밋하지 않습니다.

기존 처리 명령에 `--track-job --workspace workspace-demo`를 추가합니다. API를 호출하지 않는 제공 초안 예시입니다.

```sh
corepack pnpm knowledge:process -- --vault "/absolute/private-vault" --source-root "/absolute/input" --source "/absolute/input/source.md" --title "자료 제목" --draft "/absolute/input/draft.md" --track-job --workspace workspace-demo
corepack pnpm knowledge:job --workspace workspace-demo
corepack pnpm knowledge:job --workspace workspace-demo --job JOB_ID
corepack pnpm knowledge:job --workspace workspace-demo --job JOB_ID --cancel
```

- workspace·실제 Vault 경로 hash·원문·생성 정책으로 중복 요청을 찾습니다. 완료된 같은 요청은 파일 재조회나 AI 호출 없이 저장된 작업/결과를 반환합니다. 과거 처리 기록이므로 현재 파일 경로·revision은 달라졌을 수 있습니다.
- 재시도 가능한 실패 작업은 같은 처리 명령에 `--retry`를 붙입니다. 첫 요청의 `--max-attempts`(기본 3, 허용 1~5)가 유지되며 나중에 늘릴 수 없습니다. 자동 재시도는 없습니다. 입력/정책 변경 또는 Vault 이동은 새 요청입니다.
- CLI를 다시 실행해도 조회됩니다. 목록은 최근 50개, 개별 조회는 시도·이벤트·모델 호출별 기록을 제공합니다. 앞 구간의 사용량은 뒤 구간 실패에도 남고, 모르는 토큰은 0이 아닌 `null`입니다. 금액 환산 기능은 아닙니다.
- 대기 작업은 바로 취소하고 실행 중에는 처리 프로세스가 생성 도중·파일 게시 전에 취소 요청을 확인합니다. 이미 게시한 파일은 유지하며 게시 후 도착한 취소보다 성공 결과가 우선할 수 있습니다.
- 중단된 추적 작업은 원래 처리 명령에 `--resume`을 붙여 재개합니다. 기존 CLI를 종료한 상태에서 `db:migrate`로 먼저 갱신합니다. 30초 실행 기한이 만료돼야 하며, Vault별 DB 세션 잠금과 기록된 시도/종료 프로세스를 확인합니다. 같은 기기의 확인 가능한 종료 소유자만 회수합니다. 살아 있거나, 다른 기기이거나, 복구 도입 전 형식이거나, 소유자를 확인할 수 없는 잠금은 검토 대상입니다.
- 저장한 구간과 완성 초안은 재사용합니다. Raw/Article 게시 hash를 대조하고, 부분 로그는 기록한 원본과 추가 문자열의 접두 바이트가 일치할 때만 나머지를 씁니다. 사용자 수정은 보존합니다. 원래 날짜·입력·정책·Vault 경로를 사용하며 복구도 최초 시도 상한 안에서 실행합니다.
- 응답 손실 또는 사용량만 있고 생성 결과는 저장하지 못한 호출은 검토 필요입니다. `--retry`/`--resume`으로 재호출하지 않으며 모르는 토큰을 0으로 만들지 않습니다. 게시 파일 유실·사용자 편집 충돌·불명 잠금을 강제로 복구하지 않습니다. 검토 후 강제 재개 도구와 백그라운드 복구는 아직 없습니다.
- 구간/초안 본문과 로그 이전 내용은 DB의 임시 복구 자료입니다. 성공 결과를 확정하는 transaction에서 이 본문 캐시를 제거하고 hash·이벤트·사용량은 남깁니다. 미완료/검토 자료는 유지합니다. 기록 하나의 JSON 크기는 최대 4.5 MB이므로 매우 큰 일일 로그는 검토가 필요할 수 있습니다.

이 모드는 현재 CLI에서 한 번의 시도를 실행합니다. 백그라운드 Worker·웹 AI 처리를 시작하지 않습니다. `--track-job` 없이 쓰면 기존 파일 기반 CLI가 그대로 동작합니다.

## 실행 가능한 최소 예제

```sh
corepack pnpm demo
```

메모리 안에서 샘플 Loop를 계획·승인 단계로 진행시킵니다. 출력에는 다음 값이 포함됩니다.

```json
{ "phase": "execute", "cycle": 1, "approval": "approved" }
```

이 예제는 상태 전이만 보여주며 실제 글 발행·API 호출·파일 수정·DB 기록을 하지 않습니다.

## 검증

```sh
corepack pnpm test
corepack pnpm demo
corepack pnpm typecheck
corepack pnpm build
```

CI에는 위 명령과 별도의 PostgreSQL 18 통합 테스트가 설정돼 있습니다. 기본 테스트에는 DB와 API 키가 필요하지 않습니다. 실제 DB 검사는 버전 migration·rollback·동시 승인·workspace 제약·웹 서버 연결을 검증합니다. 격리 환경과 `corepack pnpm test:database:integration` 사용법은 [DB 검증 안내](CONTRIBUTING.md#live-database-verification)를 참고하세요. AI 처리와 Obsidian end-to-end 검증은 별도입니다. CLI 입력·경로 경계, YAML/kind별 속성·중복 ID·Wikilink 목적지/헤딩/첨부·HOME 도달성도 검사합니다. 일반 Markdown 링크와 외부 URL의 유효성은 이 검사 범위가 아닙니다.

## 코드 구성

| 경로 | 현재 역할 |
|---|---|
| packages/kernel | 승인·운영 루프 기초 모델 |
| packages/knowledge | 지식 참조·승격 정책, 로컬 Raw/Article 서비스와 Markdown/OpenAI Adapter |
| packages/database | 초기 PostgreSQL schema/repository와 Demo snapshot |
| apps/control-tower | 로컬 Vault 자료실·Raw 가져오기 + 운영 Demo/DB 조회 |
| apps/worker | 메모리 Loop 예제; 운영 Worker는 미구현 |
| packs/marketing | 후속 GEO/AEO 업무 모델 |
| vault | Obsidian에서 별도로 열 수 있는 공개 샘플·템플릿 Vault |

## Obsidian과 회사 지식

Obsidian에서는 개발 저장소 전체가 아니라 **그 안의 vault 폴더만** 열고 40_navigation/HOME.md에서 시작합니다. 왼쪽 최상위에 00_system, 10_inbox, 30_wiki 등이 보이면 맞습니다. apps나 node_modules가 보이면 개발 루트를 연 것입니다.

개발 폴더 이름은 바꿔도 되지만 저장소 내부의 vault 이름은 유지합니다. Obsidian에서 보관함 이름을 바꾸면 실제 폴더명도 바뀌므로, 이름만 꾸미려고 변경하지 마세요. 자세한 동작은 [Obsidian 보관함 관리](https://obsidian.md/help/manage-vaults)를 참고하세요.

Core Templates 폴더는 00_system/templates입니다. HOME 링크는 실제 파일 경로와 표시명을 구분합니다.

읽기 전용 구조 검사(저장소 루트에서 실행):

```sh
corepack pnpm check:vault
node scripts/vault-lint.mjs --vault "/absolute/company-vault"
```

검사는 내용을 수정하지 않으며 Article에 Wiki나 Map 생성을 강제하지 않습니다. 현재 규칙과 검사 범위는 [Vault 운영 규칙](vault/00_system/OPERATING_RULES.md)을 따릅니다.

개인 자료의 회사 사용을 검토하는 기존 명령은 수동 제안서만 생성합니다. 경로는 본인의 개인 Vault 자료로 바꿉니다. --source-root로 읽기 허용 경계를, --vault로 제안서를 기록할 비공개 회사 Vault를 명시합니다. 대상 Vault에는 10_inbox 폴더가 있어야 합니다. PowerShell에서는 C:/... 같은 절대 경로를 사용합니다.

```sh
node scripts/propose-knowledge-promotion.mjs --vault "/absolute/company-vault" --source-root "/absolute/personal-vault" --source "/absolute/personal-vault/source.md" --title "회사에서 사용할 지식" --domain general --kind article
```

제안서 생성은 AI 처리·원문 복사·Wiki 반영이 아닙니다.

## 데이터와 운영 한계

- Markdown은 원본·정리글·지식, PostgreSQL은 작업·승인·실행 상태의 정본으로 설계합니다.
- 실제 회사 설명·목표는 회사별 업무 적용 전에 입력합니다. 범용 처리 개발의 선행 조건은 아닙니다.
- 이 공개 저장소의 vault는 샘플입니다. 실제 회사/개인 자료는 저장소 밖이나 Git에서 제외한 local-vault/에 보관하세요. 이미 추적 중인 파일은 .gitignore만으로 보호되지 않습니다.
- API 키·토큰·.env.local·Obsidian 플러그인 설정·사적 원문은 커밋하지 않습니다.
- DB 시험에는 별도의 빈 DB를 사용합니다. migration은 버전·checksum·동시 실행을 관리하고 실패 시 되돌립니다. 변경 이력 없는 기존 DB의 자동 채택은 미지원이며 별도 baseline 검토가 필요합니다.
- DB 모드의 actor 문자열은 사용자 인증이 아닙니다. 로그인·회사 격리·승인 payload 결합 전에는 네트워크/팀 서비스로 공개하지 않습니다.
- PostgreSQL 설정 예시는 apps/control-tower/.env.example, 명령은 pnpm db:migrate / pnpm db:seed입니다. seed는 합성 자료입니다.

## 방향과 기여

[현재 상태](ACTIVE.md) · [제품 범위](docs/PRODUCT.md) · [목표 구조](docs/ARCHITECTURE.md) · [로드맵](docs/MILESTONES.md) · [기여 안내](CONTRIBUTING.md)

| 단계 | 범위 | 상태 |
|---|---|---|
| M2.0 | 기준선과 Obsidian 사용성 복구 | 정의한 범위에서 완료 |
| M2.1 | 자료 → Raw → Article, 지속 가능한 처리 | 진행 중; 로컬 CLI 구현 |
| M2.2 | Obsidian·웹 연결, 선택적 Wiki, 검색 | Vault 연결·읽기·Raw 저장 첫 구현; 전체 단계 미완료 |
| M3 | 측정과 피드백을 포함한 실제 회사 업무 한 종류 | 예정 |
| M4 | 인증·회사 격리·백업 복구·운영 등 B2B 제공 준비 | 예정 |

진행률이나 성능 절감 수치를 추정해서 주장하지 않고, 실제 검증한 시나리오와 제한을 기록합니다.
설정·명령·범위·상태가 바뀌면 영어와 한국어 README를 함께 갱신합니다. 상세 프로젝트 문서는 현재 대부분 한국어입니다.

## 라이선스

[MIT](LICENSE). Copyright (c) 2026 zmakerz and contributors.
프로젝트가 작성한 코드·문서·템플릿에 적용합니다. 의존성·외부 원문·링크된 자료의 권리를 대체하지 않습니다.
