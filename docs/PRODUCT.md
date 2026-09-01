# Product baseline

Business OS는 회사의 사람·업무·데이터·지식·SOP·외부 서비스를 연결하고, AI가 운영 루프를 보조하며 사람이 중요한 실행을 승인하는 기업 운영 플랫폼입니다.

## 제품 계층

1. **Platform Kernel**: Organization, Workspace, Role, Task, Workflow, Approval, Audit, Metrics
2. **Business Pack**: Marketing, CRM, Sales, Operations 등 업무 모듈
3. **Industry Pack**: 교육, 에이전시, 커머스 등 업종별 조합

## 데이터 경계

| 데이터 | 저장 위치 | 예시 |
|---|---|---|
| 운영 상태 | PostgreSQL 예정 | 리드, 주문, 캠페인, 작업, 승인, 실행 이력, KPI |
| 회사 지식 | `vault/` | 전략, 개념, SOP, 의사결정, 회고 |
| 개인 지식 | `E:/Project/wiki` | 개인 연구 원본, 건강, 코딩, 유튜브 자료 |
| 실행 설정 | `config/` | 모델 역할, 라우팅, 기능 플래그 |
| 비밀정보 | 환경변수/Secret Manager | API 키, OAuth 토큰 |

자동화는 Manual → AI Assist → Recorder → Decision Assist → Reversible Automation → Learning Loop 순으로 승격합니다. 제품 코어는 특정 AI 모델, SaaS, 업종에 종속되지 않습니다.

현재는 실제 고객 데이터, 무인 외부 실행, 복잡한 Multi-Agent, Vector DB와 고급 RAG를 제외합니다.
