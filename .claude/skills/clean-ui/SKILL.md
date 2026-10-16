---
name: clean-ui
description: 화면(UI)을 새로 만들거나 고칠 때 심플하고 깔끔한 디자인을 적용하는 방법. 글꼴(Pretendard)·색·글자·여백·버튼·카드의 기본값(design-system/tokens.css)과 금지 패턴, 견본 페이지 사용법을 담고 있다. 웹앱 화면, 폼, 목록, 리포트, 팝업 작업 시 사용한다.
---

# 심플·깔끔 UI

기준 문서는 `docs/UI_GUIDE.md`다. 계정에 있는 다른 디자인 스킬(design-taste-frontend, frontend-taste, ui-ux-pro-max 등)은 이 저장소에서 쓰지 않는다 — 이 스킬과 `ui-polish` 만 쓴다. 이 스킬은 그 규칙을 코드로 옮기는 방법이다. 둘이 다르면 UI_GUIDE를 따른다.

## 원칙 3가지
1. **덜어낸다** — 장식보다 여백. 한 화면에 강조는 하나.
2. **색은 네이비 하나** — 나머지는 흰색·회색. 빨강·초록은 상태(오류·정상) 표시에만 쓴다.
3. **같은 것은 같게** — 같은 뜻의 버튼은 모든 화면에서 같은 이름·모양·위치.

## 시작하기 — 글꼴 + 토큰 + 견본
먼저 앱이 어느 쪽인지 본다.
- **새 앱** (틀에서 만든 앱, 자기 CSS 가 아직 없음) → 아래 1~4 그대로.
- **기존 앱** (이미 자기 CSS·클래스가 있음, 예: posture-check) → `tokens.css` 를 **통째로 걸지 않는다.** `.btn` `.card` 같은 이름이 겹쳐 앱 전체 모양이 바뀐다. 대신 ① 앱의 기존 모양을 따르고 ② 새로 쓰는 값만 아래 `:root` 변수를 앱 CSS 에 옮겨 쓰고 ③ 전체 통일이 필요하면 BACKLOG 에 "화면별로 토큰 적용" 을 남겨 ADR 과 함께 한 화면씩 옮긴다. 견본(styleguide)은 참고만 한다.

1. `<head>` 에 Pretendard 와 토큰 파일을 건다 (토큰 파일은 `design-system/tokens.css`. 앱 구조상 한 파일에 넣어야 하면 내용을 `<style>` 로 복사):
```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css">
<link rel="stylesheet" href="design-system/tokens.css">
```
2. 버튼·입력·카드·목록·배지·상태·팝업·측정 막대는 `design-system/styleguide.html` 에서 **HTML 을 그대로 복사**한다 (파일이 없으면 아래 변수와 UI_GUIDE 5번 표대로). 클래스(`.btn-primary`, `.list-item`, `.state` …)를 새로 만들지 않는다.
3. `docs/TASTE.md` (사용자 취향)를 읽는다.
4. 다 만들면 `ui-polish` 스킬의 마감 점검 10가지.

## 핵심 변수 요약 (전체는 tokens.css — 값은 이 변수로만 쓴다)
```css
:root {
  --ink: #1E2A4A;        /* 포인트(네이비): 주 버튼, 선택 상태, 제목 */
  --text: #1F2328;       /* 본문 글자 */
  --muted: #6B7280;      /* 보조 글자 */
  --line: #E5E7EB;       /* 테두리, 구분선 */
  --bg: #FFFFFF;         /* 카드, 입력칸 */
  --page: #F7F7F5;       /* 페이지 배경 */
  --ok: #15803D;  --warn: #B45309;  --bad: #B91C1C;   /* 상태 표시 전용 */
  --radius: 10px;
  --space: 8px;          /* 여백은 8의 배수만: 8, 16, 24, 32 */
  --font: "Pretendard Variable", "Pretendard", "Noto Sans KR", system-ui, sans-serif;
}
/* 버튼·카드·입력칸 같은 컴포넌트 CSS 는 design-system/tokens.css 에 있다. 여기서 다시 만들지 않는다. */
```

## 화면 구성 습관 (컴포넌트 CSS 는 tokens.css 에만 있다 — 여기서 따로 만들지 않는다)
- 모바일 390px 폭에서 먼저 만든다. 가로 스크롤이 생기면 안 된다.
- 제목은 화면당 1개. 글자 크기는 5단계(제목 20 · 소제목 16 · 본문 15 · 보조 13 · 숫자 강조 28) + 아주 작은 11(탭 바·그래프 축·제작자 표기만)만 쓴다.
- 주 버튼(네이비 채움)은 화면당 1개. 나머지는 테두리 버튼이나 글자 버튼.
- 팝업(모달)은 흰 카드 + 반투명 검정 배경(`rgba(0,0,0,.45)`). 블러는 쓰지 않는다.
- 아이콘은 선 아이콘 한 종류로 통일한다. 이모지를 아이콘 대신 쓰지 않는다.
- 빈 상태(데이터 없음)에는 한 줄 안내와 다음 행동 버튼 하나만 둔다.

## 하지 말 것
그라데이션 글씨 · 글래스 블러 · 네온 그림자 · 보라색 · 배경 원형 블러 · 과한 애니메이션 · 모든 요소 가운데 정렬 · 버튼마다 다른 색.

## 끝나고 확인
1. `python scripts/screenshot.py {화면 파일}` 로 390px 사진을 찍어 직접 본다 (Playwright 없으면 건너뜀).
2. `ui-checker`(규칙 위반) → `ui-designer`(개선안) 순서로 점검한다.
3. 사용자가 디자인에 대해 한 말은 `docs/TASTE.md` 에 기록한다.
