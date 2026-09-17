# Control Tower

초기 Next.js Demo/DB 조회 화면입니다. KPI·승인 대기·Loop·추천·활동의 UI 골격을 보여줍니다.

- DB와 API 키 없이 실행: 저장소 루트에서 corepack pnpm dev.
- 기본 바인딩: 127.0.0.1:3000. Demo 수치는 합성 자료이며 승인 버튼은 비활성화.
- typecheck는 next typegen 후 TypeScript 검사를 실행합니다.
- DB 연결은 별도 테스트 DB에서만 수행합니다. 현재 actor 문자열은 인증이 아니며 승인 diff/revision 결합과 회사 격리가 미완료입니다.
- 실제 운영 서버·고객 데이터·외부 발행에 사용하지 마세요.

현재 상태와 실행 방법은 루트 README.md, 다음 개발은 docs/MILESTONES.md를 따릅니다.
