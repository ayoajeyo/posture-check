---
description: 변경 사항 규칙 준수 점검 (reviewer + privacy-guard + ui-checker 를 한 번에)
---

변경된 파일(`git diff`, 미커밋 포함)을 세 에이전트로 점검하고 결과를 한 표로 합친다. 수정은 하지 않는다.

1. `reviewer` — 버그·CLAUDE.md CRITICAL·ARCHITECTURE·ADR·테스트.
2. 변경에 개인정보·저장·네트워크가 있으면 `privacy-guard`.
3. 변경에 html/css 또는 화면 js 가 있으면 `ui-checker`.

| 항목 | 결과 | 비고 |
|------|------|------|
| 동작·버그 | ✅/🔴/🟡 | |
| 아키텍처·ADR 준수 | | |
| 테스트 존재 | | |
| CRITICAL 규칙 | | |
| 개인정보 | | |
| 디자인 표준 | | |
| 문서 동기화(DATA·CHANGELOG) | | |

🔴 가 있으면 고치는 방법을 구체적으로 제시하고 "고칠까요?" 라고 묻는다.
