# Business OS · obsidianOs

[English](README.md) | **한국어**

Obsidian, Markdown, AI를 연결하는 로컬 우선 지식·업무 운영 기반.

자료와 회사 지식을 업무·승인·측정으로 연결하는 초기 오픈소스 프로젝트입니다. 개인 KnowledgeOS와 회사 지식의 소유 영역을 구분하며, 첫 목표는 **자료 → 충실한 Article → 필요한 경우만 Wiki → 다음 업무에서 재사용**입니다.

**개발 초기 / 로컬 데모.** 현재는 Kernel·Vault 골격, Control Tower Demo와 초기 PostgreSQL 코드가 있습니다. M2.1 첫 단계로 로컬 CLI의 Raw 보존·AI Article 생성이 연결됐습니다. Obsidian 처리 명령, PostgreSQL 작업 큐·복구, 지속 Worker와 전체 승인·실행 연결은 아직 완성되지 않았습니다. 운영용·공개 서버용 완성 제품으로 사용하지 마세요.

## 프로젝트가 만드는 흐름

```text
자료 → Raw 원본 보존 → 충실한 Article → 필요한 경우만 Wiki → 다음 업무에서 재사용
```

원문은 보존하고, 사례·수치·코드를 살린 정리글을 먼저 만듭니다. Wiki는 재사용 가치가 있을 때만 보강합니다. 장기적으로는 이 지식을 업무 계획·승인·실행·측정에 연결합니다.

| 현재 사용 가능 | 다음 구현 대상 |
|---|---|
| 로컬 CLI의 Raw 보존·제공 초안 저장·AI Article 생성 | PostgreSQL 작업 기록·중단 복구 |
| 같은 요청의 기존 결과 반환·수동 수정 충돌 감지 | 구간별 결과 저장·실사용 글 품질 검증 |
| 공개 Obsidian 샘플 Vault와 구조/링크 검사 | Obsidian 처리 명령·웹 공통 작업 화면 |
| Control Tower Demo와 초기 DB 조회 | 실제 변경 내용 검토·승인 후 선택적 Wiki 반영·부분 검색 |

**언어 범위:** 이 README는 영어·한국어를 제공합니다. 현재 AI Article 작성 정책은 한국어이며, 상세 설계 문서와 샘플 Vault도 대부분 한국어입니다. README의 언어 선택은 앱이나 생성 글의 언어를 변경하지 않습니다.

[빠른 시작](#빠른-시작--api-키와-db-없이) · [자료 처리](#자료--raw--article--m21-첫-구현) · [Obsidian](#obsidian과-회사-지식) · [개발 이어가기](#새-컴퓨터에서-이어가기) · [로드맵](#방향과-기여)

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

Corepack이 없는 환경에서는 pnpm 11.19.0을 설치한 뒤 명령의 corepack 접두사를 빼고 실행합니다. Demo에는 .env 파일이 필요하지 않습니다. DATABASE_URL을 설정하면 실제 DB 모드로 전환되므로 첫 실행에서는 비워둡니다.

웹은 http://127.0.0.1:3000 에서 열립니다. dev/start는 로컬 loopback에 바인딩합니다. Demo KPI·추천·활동은 합성 자료이고 승인 버튼은 비활성화됩니다.

## 새 컴퓨터에서 이어가기

위 빠른 시작 명령으로 복제·설치·검증합니다. 이미 복제한 저장소가 있고 로컬 변경이 없다면 `git pull --ff-only`로 갱신합니다.

- 개발 도구에서는 저장소 루트를 열고 AGENTS.md → PROJECT.md → ACTIVE.md 순서로 현재 상태를 확인합니다. M2.0은 완료했고 M2.1은 진행 중입니다. 로컬 자료 → Raw → Article CLI 이후 PostgreSQL 작업 상태·복구를 연결합니다.
- Obsidian에서는 저장소 안의 vault 폴더만 열고 40_navigation/HOME.md에서 시작합니다.
- GitHub에는 공개 코드·샘플만 있습니다. API 키(.env 파일), 개인/회사 실제 자료, Obsidian 설정·플러그인, 의존성 설치본과 DB 데이터는 함께 내려오지 않습니다. 필요한 항목은 별도로 설정하거나 안전하게 옮깁니다.
- 현재 Demo·테스트에는 키가 필요하지 않습니다. 자료 처리 CLI는 루트 .env.local을 읽습니다. 키 파일 존재와 실제 API 연결 성공은 별도로 확인합니다.

설계가 바뀐 이유와 확정된 사용자 기준은 [Product](docs/PRODUCT.md#설계-이력과-확정-기준), 문서별 역할은 [PROJECT](PROJECT.md#대화-없이-이어가는-문서-지도)에 있습니다. 과거 대화 링크를 다시 읽지 않아도 여기서 개발을 이어갈 수 있도록 유지합니다. 단, 다른 컴퓨터에는 **커밋하고 push한 문서·코드만** 전달됩니다. ACTIVE에 적힌 이전 컴퓨터의 검증은 현재 기기의 설치·설정 확인을 대신하지 않습니다.

새 세션에서 사용할 요청 예시:

> PROJECT.md와 ACTIVE.md를 먼저 읽고, 관련 PRODUCT 결정과 MILESTONES의 다음 미완료 항목을 확인해 이어가자. 현재 코드와 검증 결과로 구현 상태를 확인하고, 이번 변경과 남은 일을 기존 문서에 갱신해줘.

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

현재는 단일 로컬 실행용입니다. 동시 쓰기는 .business-os-write.lock으로 거부합니다. 정상 오류/취소 시 잠금은 해제되지만 강제 종료 후 남은 잠금은 자동으로 훔치지 않습니다. 실행 중인 프로세스가 없는지 확인한 뒤 수동 복구가 필요합니다. 부분 생성 구간의 재호출 방지, 강제 종료 자동 복구, DB 작업·시도·이벤트 저장은 다음 구현 대상입니다. 이 상태를 M2.1 전체 완료나 운영 Worker로 간주하지 않습니다.

API 계약: [OpenAI Responses](https://developers.openai.com/api/reference/responses/create), [GPT-5.6 Terra](https://developers.openai.com/api/docs/models/gpt-5.6-terra). 테스트는 합성 자료와 모의 API로 실행하며 사용자 자료나 API 키가 필요하지 않습니다.

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

CI는 같은 명령과 demo를 실행합니다. 기존 테스트는 Kernel/승격 정책/DB repository를 검증하며 DB 테스트는 FakeDatabase를 사용합니다. 실제 PostgreSQL·AI·Obsidian end-to-end는 별도 완료 조건입니다. CLI 입력·경로 경계의 회귀 테스트를 포함합니다. YAML/kind별 속성·중복 ID·Wikilink 목적지/헤딩/첨부·HOME 도달성을 읽기 전용으로 검사합니다. 일반 Markdown 링크와 외부 URL의 유효성은 이 검사 범위가 아닙니다.

## 코드 구성

| 경로 | 현재 역할 |
|---|---|
| packages/kernel | 승인·운영 루프 기초 모델 |
| packages/knowledge | 지식 참조·승격 정책, 로컬 Raw/Article 서비스와 Markdown/OpenAI Adapter |
| packages/database | 초기 PostgreSQL schema/repository와 Demo snapshot |
| apps/control-tower | Demo/DB 조회 웹 화면 |
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
- DB 사용은 별도 테스트 DB로 제한합니다. 초기 migration은 버전 관리/업그레이드 검증이 아직 없습니다.
- DB 모드의 actor 문자열은 사용자 인증이 아닙니다. 로그인·회사 격리·승인 payload 결합 전에는 네트워크/팀 서비스로 공개하지 않습니다.
- PostgreSQL 설정 예시는 apps/control-tower/.env.example, 명령은 pnpm db:migrate / pnpm db:seed입니다. seed는 합성 자료입니다.

## 방향과 기여

[현재 상태](ACTIVE.md) · [제품 범위](docs/PRODUCT.md) · [목표 구조](docs/ARCHITECTURE.md) · [로드맵](docs/MILESTONES.md) · [기여 안내](CONTRIBUTING.md)

| 단계 | 범위 | 상태 |
|---|---|---|
| M2.0 | 기준선과 Obsidian 사용성 복구 | 정의한 범위에서 완료 |
| M2.1 | 자료 → Raw → Article, 지속 가능한 처리 | 진행 중; 로컬 CLI 구현 |
| M2.2 | Obsidian·웹 연결, 선택적 Wiki, 검색 | 예정 |
| M3 | 측정과 피드백을 포함한 실제 회사 업무 한 종류 | 예정 |
| M4 | 인증·회사 격리·백업 복구·운영 등 B2B 제공 준비 | 예정 |

진행률이나 성능 절감 수치를 추정해서 주장하지 않고, 실제 검증한 시나리오와 제한을 기록합니다.
설정·명령·범위·상태가 바뀌면 영어와 한국어 README를 함께 갱신합니다. 상세 프로젝트 문서는 현재 대부분 한국어입니다.

## 라이선스

[MIT](LICENSE). Copyright (c) 2026 zmakerz and contributors.
프로젝트가 작성한 코드·문서·템플릿에 적용합니다. 의존성·외부 원문·링크된 자료의 권리를 대체하지 않습니다.
