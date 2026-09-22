# Project

Business OS는 자료와 회사 지식을 실제 업무·승인·측정으로 연결하는 운영 플랫폼입니다. 최종 제품은 B2B를 지향하지만, 첫 릴리스는 로컬 단일 운영자의 지식 작업 흐름을 완성합니다.

## 현재 우선순위

첫 릴리스: **범용 기반 + 자료 → 정리글 → 회사 지식 흐름부터 완성**.

- 연구 자료: Inbox → 불변 Raw → Article → 필요한 경우만 Wiki 반영 → 다음 작업에서 검색·재사용
- 운영 기록: 근거 → 결정 → 반복 가능한 절차 → SOP. 모든 기록에 Article을 만들지 않음
- 웹은 최초 설정·Vault 연결·자료 가져오기·읽기·처리·검토의 기본 진입점. Obsidian은 같은 Markdown을 탐색·편집하며 CLI는 개발·진단용으로 유지
- Company Profile은 회사별 전략·GEO/AEO 적용 전에 필요하며, 범용 자료 처리의 선행 조건은 아님

## 유지하는 경계

- Markdown Vault: 원본, 정리글, 재사용 지식, 회사 원칙·결정·SOP의 정본
- PostgreSQL: 작업 상태, 실행, 승인, 이벤트, 측정과 재생성 가능한 검색 인덱스
- 코드·config·docs: 제품 실행 규칙, 모델 역할 설정, 개발 설계와 진행 상태
- 개인 KnowledgeOS는 별도 소유 영역. 명시적으로 선택한 자료만 회사로 반영
- 외부 발송·비용 변경·삭제·배포와 기존 지식 변경은 해당 범위의 승인을 확인
- 특정 업종·모델·SaaS는 공통 엔진 밖의 설정 또는 Adapter로 연결

Kernel → Business Pack → Industry Pack 방향은 유지하되, 필요해진 기능만 구현합니다. 현재 로컬 CLI가 공통 Raw/Article 서비스를 사용하고, 웹은 같은 서비스의 Raw 저장과 로컬 Vault 읽기에 연결돼 있습니다. 선택적 CLI 모드로 처리 작업·시도·이벤트·사용량을 PostgreSQL에 저장합니다. 추적 CLI의 --resume은 확인된 로컬 중단을 저장 구간부터 이어 처리합니다. 다음은 입력 계약·실사용 품질 검증이며 웹 AI·Obsidian 처리 명령은 후속입니다.

현재 구현/검증 상태는 [ACTIVE](ACTIVE.md), 다음 완료 기준은 [Milestones](docs/MILESTONES.md)를 확인합니다.

## 대화 없이 이어가는 문서 지도

처음에는 이 문서와 ACTIVE만 읽고, 작업에 따라 아래 문서의 관련 절을 추가합니다. 과거 대화에서 합의한 제품 결정은 저장소 문서에 요약하며, 대화 전문·개인 자료는 공개 저장소에 복사하지 않습니다.

| 확인할 내용 | 기준 문서 |
|---|---|
| 왜 이 방향인가, 사용자가 원하는 글과 지식 축적 방식 | [Product — 설계 이력과 확정 기준](docs/PRODUCT.md#설계-이력과-확정-기준) |
| 정본·권한·서비스 경계와 개선 방향 | [Architecture](docs/ARCHITECTURE.md) |
| 바로 다음 작업과 단계별 합격 조건 | [Milestones](docs/MILESTONES.md) |
| 이 컴퓨터에서 실행·설정하는 방법 | [README — English](README.md) · [한국어](README.ko.md) |
| 개발 환경 이전·Git 동기화·새 에이전트 세션 인계 | [Contributing](CONTRIBUTING.md#resume-development-on-another-computer) |

현재 동작은 코드와 테스트로 확인합니다. 목표 문서에 적혀 있다는 이유로 구현됐다고 판단하지 않습니다. 설계를 개선할 때는 해결할 실제 문제·검증 방법을 정하고 관련 결정을 갱신합니다.
