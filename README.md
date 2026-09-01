# Business OS

Business OS는 회사의 운영 상태, 재사용 지식, AI 보조 업무와 사람의 승인을 연결하는 기업 운영 플랫폼입니다.

`Observe → Analyze → Plan → Approve → Execute → Measure → Learn` 루프를 Platform Kernel, Business Pack, 회사용 Obsidian Vault로 구현합니다.

## 구성

- `packages/kernel`: 조직·작업공간·승인·운영 루프
- `packages/knowledge`: Raw·Article·Wiki·SOP 경계와 승격 규칙
- `packs/marketing`: 첫 Business Pack인 GEO/AEO
- `apps/control-tower`: M2에서 구현할 회사 제어 화면
- `apps/worker`: 승인된 루프 실행기
- `vault`: 별도로 열 수 있는 회사 전용 Obsidian Vault

개인 KnowledgeOS `E:/Project/wiki`는 원본 지식 저장소로 유지하며, 필요한 지식만 검토 후 회사 Vault로 승격합니다.

## 검증

```powershell
node scripts/verify-structure.mjs
node --test packages/kernel/test/approval.test.ts packages/kernel/test/operating-loop.test.ts
node --test packages/knowledge/test/promotion.test.ts
node apps/worker/src/demo.ts
```

현재 범위는 Phase 0와 M1 Platform Foundation입니다. 실제 DB, 외부 SaaS, 고객 데이터, 광고·결제 실행은 아직 연결하지 않습니다.
