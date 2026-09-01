---
kind: system-rule
status: active
updated: 2026-09-01
---

# Company Vault 운영 규칙

- 전체 Vault를 선제적으로 읽지 않습니다.
- 원본과 증거는 `20_raw`에서 보존합니다.
- 읽기 좋은 단일 정리글만 필요하면 `80_outputs`로 끝냅니다.
- 여러 출처를 연결하거나 반복 사용하는 지식만 `30_wiki`로 승격합니다.
- 반복해서 품질이 확인된 방법만 `60_sop`로 승격합니다.
- 개인 KnowledgeOS 자료는 검토와 승인 후 필요한 항목만 가져옵니다.
- 외부 실행과 비가역적 변경은 Approval Gate를 거칩니다.
- 로그는 `90_logs/YYYY-MM-DD.md` 한 파일에 추가합니다.
