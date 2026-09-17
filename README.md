# Business OS · obsidianOs

A local-first knowledge and operations foundation for Obsidian, Markdown and AI-assisted workflows.

자료와 회사 지식을 업무·승인·측정으로 연결하는 초기 오픈소스 프로젝트입니다. 개인 KnowledgeOS와 회사 지식의 소유 영역을 구분하며, 첫 목표는 **자료 → 충실한 Article → 필요한 경우만 Wiki → 다음 업무에서 재사용**입니다.

**Early development / local demo.** 현재는 Kernel·Vault 골격, Control Tower Demo와 초기 PostgreSQL 코드가 있습니다. AI Article 생성, Obsidian 처리 명령, 지속 Worker와 전체 승인·실행 연결은 아직 완성되지 않았습니다. 운영용·공개 서버용 완성 제품으로 사용하지 마세요.

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
corepack pnpm typecheck
corepack pnpm build
```

CI는 같은 명령과 demo를 실행합니다. 기존 테스트는 Kernel/승격 정책/DB repository를 검증하며 DB 테스트는 FakeDatabase를 사용합니다. 실제 PostgreSQL·AI·Obsidian end-to-end는 별도 완료 조건입니다. CLI 입력·경로 경계의 회귀 테스트를 포함합니다. 엄격한 YAML·헤딩·HOME 도달성 lint는 M2.0의 후속 작업입니다.

## 코드 구성

| 경로 | 현재 역할 |
|---|---|
| packages/kernel | 승인·운영 루프 기초 모델 |
| packages/knowledge | 지식 참조·승격 정책; 실제 처리 서비스로 확장 예정 |
| packages/database | 초기 PostgreSQL schema/repository와 Demo snapshot |
| apps/control-tower | Demo/DB 조회 웹 화면 |
| apps/worker | 메모리 Loop 예제; 운영 Worker는 미구현 |
| packs/marketing | 후속 GEO/AEO 업무 모델 |
| vault | Obsidian에서 별도로 열 수 있는 공개 샘플·템플릿 Vault |

## Obsidian과 회사 지식

복제한 저장소의 vault 폴더를 열고 40_navigation/HOME.md에서 시작합니다. Core Templates 폴더는 00_system/templates입니다. HOME 링크는 실제 파일 경로와 표시명을 구분합니다.

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

M2.0 사용성 복구 → M2.1 자료/Article → M2.2 Obsidian·웹·선택적 Wiki → M3 실제 업무 Loop → M4 B2B 제공 준비 순서입니다.
진행률이나 성능 절감 수치를 추정해서 주장하지 않고, 실제 검증한 시나리오와 제한을 기록합니다.

## License

[MIT](LICENSE). Copyright (c) 2026 zmakerz and contributors.
프로젝트가 작성한 코드·문서·템플릿에 적용합니다. 의존성·외부 원문·링크된 자료의 권리를 대체하지 않습니다.
