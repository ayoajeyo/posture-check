---
description: DATA.md·PRIVACY.md 를 바탕으로 개인정보처리방침 페이지(privacy.html)와 앱 내 동의 문구를 생성
---

`korean-privacy` 스킬을 따라 다음을 만든다. 법적 조언이 아니며 최종 확인을 전문가에게 받도록 마지막에 안내한다.

1. `docs/DATA.md` 와 `docs/PRIVACY.md`, `docs/ARCHITECTURE.md`(외부 서비스) 를 읽는다. 빈칸이 있으면 먼저 사용자에게 묻는다(책임자 이름·이메일·시행일은 필수).
2. `privacy.html` 생성 — `clean-ui` 스타일, 한 페이지, 목차 없이 8개 항목, 시행일, 하단 `made by AYOAJEYO`.
3. 앱 설정 화면(또는 푸터)에 "개인정보처리방침" 링크가 있는지 확인, 없으면 추가 제안.
4. `docs/RELEASE.md` 의 "개인정보처리방침 URL" 을 GitHub Pages 주소로 채운다.
5. Play Console "데이터 안전" 에 체크할 항목을 표로 정리해 보여 준다.
