---
description: 새 프로젝트 시작 — 대화로 PRD·ARCHITECTURE·DATA·ADR·CLAUDE.md 빈칸을 채운다
argument-hint: [만들 앱 한 줄 설명]
---

새 프로젝트의 기획 문서를 사용자와 대화하며 채운다. 사용자는 코딩 초보다.

만들 것: $ARGUMENTS

## 진행 순서
1. `CLAUDE.md`, `docs/PRD.md`, `docs/ARCHITECTURE.md`, `docs/DATA.md`, `docs/ADR.md`, `docs/RELEASE.md`, `docs/PRIVACY.md` 를 읽고 `{ }` 빈칸 목록을 파악한다. `docs/UI_GUIDE.md` 와 `docs/TESTING.md` 는 기본값이 있으니 건드리지 않는다.
2. 설명만으로 채울 수 있는 칸은 합리적인 기본값으로 먼저 채운 초안을 만든다.
   - 기술 스택은 `mobile-webapp` 스킬 기본(HTML/JS + GitHub Pages, 서버는 "없음" 으로 시작). ADR 은 공통 ADR-000 시리즈를 그대로 두고, 이 프로젝트 ADR-001 은 "서버 저장 여부" 로 시작한다.
   - DATA.md 는 이 앱이 다룰 데이터를 **추정해서 표를 채우고**, 민감도 등급을 매긴다. 사진·이름·연락처가 있으면 PRIVACY.md 동의 문구도 맞춘다.
3. 기본값으로 정할 수 없는 것만 **한 번에 최대 3개** 질문한다. 각 질문에 추천 답을 함께 제시해 "추천대로" 라고만 답해도 되게 한다. 보통 필요한 질문: ① 누가 어떤 상황에서 쓰나 ② 꼭 있어야 할 기능 3개 ③ 다루는 개인정보(사진·연락처)가 있나.
4. 답을 받으면 문서를 채우고, 무엇을 정했는지 표로 보여준다 (항목 | 정한 내용 | 이유).
5. `{ }` 빈칸이 남아 있는지 확인한다(`grep -rn "{" CLAUDE.md docs/PRD.md docs/ARCHITECTURE.md docs/DATA.md`). CLAUDE.md 의 "AYOAJEYO 공통 규칙" 은 수정하지 않는다. RELEASE.md 의 스토어 정보처럼 지금 모르는 것은 `{나중에: …}` 로 남겨도 된다(실행기 점검 대상 아님).
6. `docs/CHANGELOG.md` 에 `## 미출시` 항목, `docs/BACKLOG.md` "다음" 에 PRD 의 "중요·나중" 기능을 옮긴다.
7. 다음 단계를 안내한다: "작은 앱이면 `/feature` 로 기능마다, 큰 앱이면 `/harness` 로 계획을 세웁니다. 먼저 `git add -A && git commit -m "docs: 기획 문서"` 로 저장하세요."

## 금지
- 코드를 작성하지 마라. 이 단계는 기획 문서만 정한다.
- 한 번에 4개 이상 질문하지 마라.
