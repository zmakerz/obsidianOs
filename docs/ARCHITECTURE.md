# Architecture — 2026-09-17 목표 설계

기존 Next.js/TypeScript/PostgreSQL/Vault를 유지합니다. 아래 서비스 경계는 목표이며 현재 구현 상태는 ACTIVE.md를 확인합니다.

## 한 엔진, 여러 사용 화면

```text
Obsidian 명령 / CLI / Control Tower
                 │ 동일한 작업 요청·결과 계약
                 ▼
        Knowledge Application Service
        Capture → Article → 선택적 Wiki
          │          │             │
      File Adapter  Model Adapter  Approval / Apply
          │          │             │
   Markdown Vault    AI       PostgreSQL 작업 상태
          └──── 필요한 부분 검색 → 다음 작업 ────┘
```

- packages/knowledge: 처리 유스케이스, 문서·출처·변경계획 계약과 파일 검색/저장 Adapter. 기존 인터페이스에서 실제 구현으로 확장합니다.
- packages/kernel: 공통 식별·승인·상태 전이. 특정 주제의 프롬프트를 넣지 않습니다.
- packages/database: migration과 repository, 작업/승인/이벤트 저장.
- apps/worker: 지속 가능한 작업 실행. 현재 demo.ts는 데모이며 운영 Worker가 아닙니다.
- apps/control-tower: 조회와 요청·검토 화면. 별도 AI 처리 로직을 중복 구현하지 않습니다.
- Obsidian: 작성·탐색 UI와 얇은 명령 Adapter. API 키·모델 호출을 플러그인마다 중복 관리하지 않습니다.
- packs/marketing: 동일 서비스를 사용하는 GEO/AEO 업무 규칙. 공통 Kernel과 독립적입니다.

개인 KnowledgeOS의 원문 보존, 중복 감지, 글쓰기 규칙, 날짜별 로그, 단계적 검색을 재사용합니다. 개인의 데이터·경로·주제 분기와 거대한 QuickAdd 스크립트를 그대로 복제하지 않고 계약과 테스트 사례부터 옮깁니다.

## 정본과 소유권

| 데이터 | 정본 | 다른 계층의 역할 |
|---|---|---|
| Raw/Article/Wiki/SOP/회사 목표 | Markdown 파일 | DB는 ID·경로·revision·검색용 투영 |
| 작업·시도·승인·이벤트·사용량 | PostgreSQL | 웹 조회, 선택적 일일 로그 요약 |
| 모델 역할·라우팅·처리 정책 | config와 코드 | UI에서 유효 설정 표시 |
| 제품 개발 설계·상태 | docs와 루트 ACTIVE.md | 회사 Vault에 복제하지 않음 |
| 회사 업무용 현재 맥락 | vault/70_context | 작업에 필요한 경우만 로드 |
| API 비밀정보 | 환경/비밀 저장소 | Vault·Git·로그에 기록하지 않음 |

정리글의 전문을 파일과 DB 두 곳에서 편집 가능한 정본으로 관리하지 않습니다. 승인 대기 초안/변경 패치는 DB 작업 산출물이며 반영 이후 정본은 파일입니다. 검색 인덱스는 파일에서 재생성할 수 있어야 합니다.

Vault 경로는 배포 설정으로 분리하고, 저장소 안 vault는 현재 로컬 배치입니다. 유료 고객의 비공개 자료를 코드 저장소에 함께 배포하지 않습니다. 새 Vault 복제는 공통 템플릿·버전만 공유하며 API 키·개인 데이터·작업 DB는 복제하지 않습니다.

## 문서와 입력 계약

- 문서 identity: vault_id + doc_id. 파일명은 날짜-제목을 사용해도 ID는 바뀌지 않습니다.
- content_hash는 내용 중복 확인용, revision_hash는 동시 편집 확인용으로 구분합니다.
- 공통 속성: kind, title, domain, source_refs, created/updated, 필요한 처리 상태. 모든 종류에 같은 속성을 강제하지 않습니다.
- Raw 추가 속성: source_type, source_url(있을 때), capture_method, captured_at, content_mode(full/excerpt/pointer), source hash.
- source_type과 domain은 서로 독립입니다. 매체마다 핵심 처리 엔진을 새로 만들지 않습니다.
- 날짜는 수집일과 게시일을 구분하며 모르는 게시일은 채우지 않습니다.
- 원문 추적 링크는 사람이 읽을 제목을 표시하고 내부 참조는 stable ID로 해석합니다.
- 파일 이동 시 링크와 ID 인덱스를 함께 검사합니다. Raw 본문은 수정하지 않고 새 자료 버전은 새 snapshot으로 보존합니다.
- 아직 확보하지 않은 URL/대화 참조를 읽은 본문처럼 처리하지 않습니다. ChatGPT 참조는 별도 가져오기 절차가 필요합니다.
- 모델 입력에 들어온 문서의 명령문은 처리 대상 데이터이지 실행 권한이 아닙니다.

## 첫 처리 경로

1. Capture: 입력 범위·파일 형식·본문 유무 확인. 동일 입력 재시도는 기존 결과로 연결.
2. Raw: 입력 원형과 출처를 보존. Raw가 안전하게 보존되기 전 Inbox를 제거하지 않음.
3. Article: 글쓰기 프로필을 적용. 긴 자료는 분할 처리와 합본 대조; 사례·수치·코드·원문 유의점 누락 검사.
4. Write: 신규 Article은 요청한 작업 범위로 생성. 같은 문서의 수동 변경은 보존.
5. Wiki: Article로 충분하면 생성 0개. 필요한 경우 기존 문서 검색 후 좁은 변경 계획을 제시.
6. Apply: 승인한 파일·내용·기준 revision만 적용. 승인 뒤 문서가 바뀌면 재검토.
7. Retrieve: Article/Wiki에서 관련 구간을 가져와 실제 후속 질문에 사용.

새로운 개념 파일을 모든 키워드마다 만들지 않습니다. 생성 범위는 preview에 표시하고 예상보다 확장되면 재승인합니다. TXT·별도 검증 보고서·별도 실행 MD는 요청이 있을 때만 만듭니다. 일상 로그는 작업공간 시간대의 날짜별 한 파일에 append하고 event ID로 중복을 방지합니다. 세부 실행 이력은 DB에서 관리합니다.

## 작업 지속성과 파일 반영

첫 버전은 단일 Worker로 충분합니다. 분산 큐 서비스나 다중 Agent부터 넣지 않습니다.

- 작업 요청은 workspace + 입력 ID/hash + 처리 목적/설정 버전을 포함한 idempotency key로 중복을 제어합니다.
- 작업과 개별 시도를 구분합니다. 재시도는 실패 구간부터 이어가고 무조건 AI 재호출하지 않습니다.
- 대기/실행/사용자 확인 필요/성공/실패/취소 상태와 실패 이유를 영속화합니다. 장시간 실행의 중단 여부를 확인할 수 있도록 lease 또는 heartbeat를 둡니다.
- 예산·시간·시도 횟수 상한을 설정합니다. 본문 없음/권한 오류/충돌을 무한 재시도하지 않습니다.
- 모델 결과는 구조·경로·길이·참조를 검사한 뒤 저장합니다. 모델에게 임의 파일 쓰기 권한을 주지 않습니다.

파일 변경과 DB transaction은 하나의 원자적 commit이 아닙니다. 처음에는 소규모 write-intent 기록과 복구 절차로 해결합니다.

1. DB에 목표 파일, 기준/결과 hash, 승인 ID, 작업 ID를 기록.
2. 허용 Vault 내부의 실제 경로를 확인하고, 같은 파일시스템의 임시 파일로 준비.
3. 수동 변경을 감지하고 보호된 교체 수행. Vault 내 자체 쓰기는 직렬화하고 Obsidian 외부 편집과의 충돌은 재검토로 처리.
4. 결과 hash를 확인한 뒤 DB에서 완료 처리.
5. 중간 종료 시 intent와 실제 파일을 비교해 완료·재시도·사용자 확인으로 복구. 다중 파일은 단계별 상태와 필요한 before-image를 보존.

hash 확인만으로 모든 외부 편집 경쟁을 제거했다고 주장하지 않습니다. 장애 주입·동시 편집 테스트로 무손실 조건을 검증하고 충돌 시 자동 덮어쓰지 않습니다. '정확히 한 번' 실행을 약속하기보다 반복 실행해도 결과가 중복되지 않는 것을 검증합니다.

## PostgreSQL과 승인

- LLM·네트워크 호출 동안 DB transaction/row lock을 유지하지 않습니다.
- 프로세스별 재사용 pool을 두고 요청마다 만들고 닫지 않습니다.
- migration ledger, 순서·checksum·동시 실행 보호를 두며 'CREATE IF NOT EXISTS'만으로 버전 변경을 처리하지 않습니다.
- workspace 범위는 repository뿐 아니라 관련 외래키/unique 제약에서도 일관되게 유지합니다.
- 승인은 actor, workspace, 대상 작업, 변경 payload hash, 기준 문서 revision에 연결합니다. 단순 approved 문자열은 실행 권한이 아닙니다.
- 승인 UI는 실제 diff·영향 범위를 보여줍니다. 변경·만료·반려된 계획은 실행할 수 없습니다.
- 로컬 쓰기 UI도 loopback 노출 범위·origin·로컬 세션/페어링을 확인합니다. env의 actor 이름을 인증으로 취급하지 않습니다.
- 원격/팀 배포 전 로그인, 소속·권한, 비공개 Vault 격리, 교차 workspace 테스트를 추가합니다. RLS를 쓰면 DB owner/bypass 역할과 실제 앱 역할의 차이도 검증합니다.

운영 DB의 트랜잭션 rollback·동시 승인·제약·재시작은 실제 PostgreSQL에서 테스트합니다. 메모리 FakeDatabase 테스트만으로 완료 판정하지 않습니다.

## Context와 AI 비용

기본 로드는 짧은 Router/관련 작업 규칙이며, 검색은 metadata → capsule → 관련 section → 필요한 Raw 순입니다. 회사 목표도 회사별 판단에 필요한 때만 읽습니다.

작업별 모델 호출은 하나의 중앙 Adapter를 통합니다. 초기에는 검증된 모델 하나로 시작하고, deep/execution/check 역할별 분리는 품질·비용 비교 후 적용합니다. 특정 모델의 표시 이름을 API ID라고 가정하지 않습니다.

입력/출력 토큰·소요 시간·성공/재시도·사용한 모델/정책 버전을 기록합니다. 비교 가능한 동일 자료·품질 기준 없이 토큰 절감률을 주장하지 않습니다. Context는 기본적으로 일시적이며 사용자가 저장·전달할 때만 파일을 만듭니다. 원문·전체 prompt·키를 실행 로그에 무조건 복사하지 않습니다.

## 현재에서 전환

기존 승격 스크립트는 Inbox의 수동 제안서를 만들 뿐입니다. 새 승인 흐름이 구현되기 전까지 이를 자동 반영 기능으로 설명하지 않습니다. 구현 때 기존 수동 제안을 import할 수 있게 하되, Markdown 체크박스와 DB 승인 상태를 동시에 권한의 정본으로 삼지 않습니다.

공개 Vault는 합성 예제·템플릿입니다. 실제 회사 지식은 저장소 밖의 별도 Vault에 보관하고 제품 설계와 구별합니다.
