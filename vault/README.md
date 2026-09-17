# Business OS Company Vault

이 폴더는 공개 예제입니다. 실제 회사 자료는 저장소 밖의 비공개 Vault에 보관합니다. 예제를 보려면 이 폴더를 별도 Obsidian Vault로 엽니다. 회사에서 사용할 원본·정리글·재사용 지식과 결정·SOP를 관리하며, 개인 KnowledgeOS와 소유 영역을 구분합니다.

```text
00_system      운영 규칙과 템플릿
10_inbox       미분류 회사 자료
20_raw         보존할 원본과 출처
30_wiki        반복 사용하는 개념·관계
40_navigation  HOME과 탐색 문서
50_company     회사 정체성, 목표, 역할, 결정
60_sop         재사용 가능한 업무 절차
70_context     회사 업무용 압축 맥락
80_outputs     Article과 전달 산출물
90_logs        날짜별 한 파일의 요약 로그
99_archive     사용 종료 자료
```

실시간 작업·승인·고객·주문·측정 상태는 운영 DB의 책임입니다. 상세 구현 계획은 저장소 docs에 두며 이 Vault에 중복하지 않습니다.

## 현재 상태와 처음 열기

2026-09-17 기준: 폴더·템플릿과 수동 승격 제안서가 있습니다. 자동 Raw/Article 처리와 Wiki 반영 명령은 아직 연결되지 않았습니다. HOME 링크는 실제 파일 경로를 사용합니다. 엄격한 YAML·헤딩·도달성 검사는 M2.0의 후속 작업입니다.

1. Obsidian에서 복제한 저장소의 vault 폴더를 Vault로 엽니다.
2. Core plugin Templates를 켜고 폴더를 00_system/templates로 지정합니다.
3. 파일 탐색기에서 40_navigation/HOME.md를 열어 Bookmark에 추가합니다.

QuickAdd/Templater는 선택 사항입니다. 개인 Vault에서 작동하는 명령이 이 회사 Vault에도 설치되었다고 가정하지 않습니다. 플러그인 API 키나 plugins/**/data.json은 Git에 저장하지 않습니다.

## 지식 흐름

새 자료 → Inbox → Raw 보존 → Article → 필요한 경우만 Wiki → 다음 업무에 재사용.

주제는 general에서 시작해 필요한 domain을 추가합니다. YouTube는 주제가 아니라 source_type입니다. Article은 원문을 살린 정보 전달 글, Wiki는 반복 사용하는 개념과 관계입니다. 상세 내용을 두 문서에 반복 복제하지 않습니다.

현재 개인 자료 검토용 명령은 제안서만 만듭니다. 실제 파일 경로를 사용합니다.

```powershell
node scripts/propose-knowledge-promotion.mjs --source-root "/absolute/personal-vault" --source "/absolute/personal-vault/source.md" --title "회사에서 사용할 지식" --domain general --kind article
```

승격 제안은 10_inbox에 생성되며 승인 전 원문과 대상 문서를 수정하지 않습니다. 이것은 AI 처리/반영 자동화가 아닙니다. 향후 공통 서비스의 변경 preview와 승인 경로로 연결하며 실제 적용 전 운영 규칙·템플릿도 함께 갱신합니다.
