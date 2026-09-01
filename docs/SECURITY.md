# Security baseline

- 비밀키는 환경변수 또는 Secret Manager에서만 읽습니다.
- Vault와 로그에 인증 토큰, 고객 개인정보, 결제정보를 기록하지 않습니다.
- 외부 발송, 광고비, 결제, 삭제, 배포는 승인과 감사 이력을 남깁니다.
- 과거 자료에 노출된 Apify 토큰은 폐기·재발급 대상으로 취급하고 가져오지 않습니다.
- Integration Adapter는 최소 권한을 사용합니다.
