---
description: 계획·아이디어를 질문으로 끝까지 다듬으면서, 정해진 용어는 용어집에·중요한 결정은 ADR 에 바로 적는다 (원본 mattpocock/skills grill-with-docs)
argument-hint: [다듬을 계획·아이디어 — 예: 회원 삭제 시 서버 데이터도 지우기]
---

`doc-grilling` 스킬을 읽고 그대로 진행한다. 사용자는 코딩 초보다.

대상: $ARGUMENTS

- 시작 전에 `docs/GLOSSARY.md`, `docs/ADR.md`, `docs/PRD.md`, 관련 코드를 읽어 **이미 정해진 것은 묻지 않는다**.
- 개인정보·서버·삭제·결제가 걸린 주제면 `plan-gate` 스킬 1번 표도 함께 본다 — 질문 끝에 계획서(`/plan`)로 이어진다.
- 코드는 고치지 않는다. 이 명령이 쓰는 파일은 `docs/GLOSSARY.md`, `docs/ADR.md` 뿐이다(사용자 확인 후). 끝나면 `docs: 용어·결정 정리 — {주제}` 로 커밋(push 안 함).
