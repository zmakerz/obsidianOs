# Control Tower

기본 `/`는 로컬 Markdown Vault 자료실입니다. 기존 업무 KPI·승인·Loop Demo/DB 조회는 `/operations`에 보존했습니다.

## 현재 동작

- 설정에서 기존 Vault 절대 경로·읽을 상대 폴더·원문 저장 허용을 선택. 합성 노트 3개의 테스트 보관함으로도 시작 가능.
- 파일 선택/드래그 앤 드롭(.md/.txt), 본문 붙여넣기 → 공통 Raw 서비스 → `20_raw/document` 저장. 같은 내용은 재사용하고 수동 수정한 Raw는 충돌로 반환.
- 목록의 제목·태그·경로·본문 미리보기 검색, 분류/정렬, 카드/목록, 기본 Markdown/원문 읽기·본문 다운로드·Obsidian URI.
- 연결/자료는 재실행 뒤 유지. 외부 편집은 자료 새로고침으로 재조회. 기존 노트를 연결만으로 수정하지 않음.
- 연결 전에는 샘플 3개의 탭 미리보기. 이때 추가한 자료만 제목/태그 편집·목록 제외/되돌리기를 지원하며 새로고침하면 사라짐.
- 모바일 배치, 키보드 포커스, native dialog, 연결/오류/범위 제한 안내·글 간격 변경. 웹 AI·URL 수집·키 설정·DB 작업 생성은 아직 없음.

목록 상한은 300문서/3,000항목/깊이12입니다. 파일마다 최대 8 KB를 읽고 본문 1,200자 미리보기를 반환합니다. 문서를 선택할 때 전체를 읽으며 화면은 앞 50,000자, 다운로드는 메타데이터 제외 전체 본문입니다. HTML은 실행하지 않습니다. 가져오기는 파일당 2 MB·한 번에 20개/10 MB, 읽기는 메타데이터 포함 2.1 MB까지입니다.

## 실행과 로컬 설정

저장소 루트에서 `corepack pnpm dev`. 기본 주소는 127.0.0.1:3000이며 다른 앱이 사용 중이면 다음처럼 별도 포트를 지정합니다.

```sh
corepack pnpm --filter @business-os/control-tower exec next dev --hostname 127.0.0.1 --port 3107
```

기본 명령의 실행 디렉터리는 이 앱 폴더입니다. `.business-os/vault.json`은 로컬 연결 설정, `.business-os/demo-vault/`는 테스트 보관함이며 모두 Git 제외입니다. API 키를 저장하지 않습니다. `/api/vault`는 loopback host·custom header·origin을 확인하고 쓰기에는 HttpOnly/SameSite 로컬 세션을 요구합니다. 재시작하면 GET bootstrap으로 세션을 다시 받습니다. 네트워크/다중 사용자 인증으로 간주하지 않습니다.

## 코드와 검증

운영 화면의 `DATABASE_URL`이 있으면 `lib/dashboard.ts`에서 프로세스별 공유 PostgreSQL pool을 재사용합니다. 연결 대기는 5초, SQL/idle transaction은 60초 제한입니다. 접속 설정을 바꾼 뒤에는 서버를 재시작합니다. DB 설치는 `db:migrate`, 합성 자료 추가는 별도의 `db:seed`이며 기존 이력 없는 schema는 자동 채택하지 않습니다. 실제 DB 통합 테스트와 준비 방법은 [CONTRIBUTING](../../CONTRIBUTING.md#live-database-verification)을 참고하세요. Vault 읽기·Raw 저장에는 여전히 DB가 필요하지 않습니다.

- UI: `components/knowledge-workspace.tsx`, `workspace.css`, `lib/library.ts`.
- 로컬 설정·세션·테스트 Vault: `lib/vault-server.ts`. HTTP: `app/api/vault/route.ts`.
- 범위/목록/본문: `packages/knowledge/src/vault-library.ts`. Raw 저장: 같은 패키지 `source-article.ts`의 `captureSource`.
- 자동 검증: `scripts/test/library-ui.test.mjs`, `vault-web.test.mjs`. 루트 `test`, `typecheck`, `build`에 포함.

합성 자료로 실제 브라우저 파일/본문 저장·새로고침 후 읽기·원문 일치를 확인했습니다. 기존 임시 자료 관리와 작은 화면도 확인했습니다. Safari에서 웹 버튼 → Obsidian 1.13.7의 동일 파일 열기 → 편집 → 웹 새로고침을 이 맥북에서 검증했습니다. 내부 브라우저에서는 외부 앱이 열리지 않아 일반 브라우저 사용을 안내합니다. 드롭 제스처 자체는 별도 미검증입니다. 로컬 요청은 `lib/vault-client.ts`에서 30초로 제한하며, 저장 응답 손실은 결과 미확인으로 안내하고 자동 재전송하지 않습니다. 서비스 재시작 뒤 연결과 5개 합성 문서 복원도 확인했습니다.

현재 원문 저장은 동기 동작입니다. 지속 AI 작업·복구/취소, URL 수집, Wiki 승인은 다음 단계입니다. [PRODUCT](../../docs/PRODUCT.md#웹-중심의-첫-사용과-일상-흐름), [ARCHITECTURE](../../docs/ARCHITECTURE.md#웹과-obsidian의-연결-방식), [ACTIVE](../../ACTIVE.md)를 기준으로 이어갑니다.
