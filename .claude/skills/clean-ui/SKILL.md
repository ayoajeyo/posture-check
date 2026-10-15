---
name: clean-ui
description: 화면(UI)을 새로 만들거나 고칠 때 심플하고 깔끔한 디자인을 적용하는 방법. 색·글자·여백·버튼·카드의 기본값(CSS 변수)과 금지 패턴을 담고 있다. 웹앱 화면, 폼, 목록, 리포트, 팝업 작업 시 사용한다.
---

# 심플·깔끔 UI

기준 문서는 `docs/UI_GUIDE.md`다. 이 스킬은 그 규칙을 코드로 옮기는 방법이다. 둘이 다르면 UI_GUIDE를 따른다.

## 원칙 3가지
1. **덜어낸다** — 장식보다 여백. 한 화면에 강조는 하나.
2. **색은 네이비 하나** — 나머지는 흰색·회색. 빨강·초록은 상태(오류·정상) 표시에만 쓴다.
3. **같은 것은 같게** — 같은 뜻의 버튼은 모든 화면에서 같은 이름·모양·위치.

## 시작 CSS (그대로 복사해 쓰고, 값은 이 변수로만 쓴다)
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
  --font: "Pretendard", "Noto Sans KR", system-ui, sans-serif;
}
body { margin: 0; background: var(--page); color: var(--text); font: 15px/1.6 var(--font); }
.card { background: var(--bg); border: 1px solid var(--line); border-radius: var(--radius); padding: calc(var(--space) * 2); }
.btn { min-height: 44px; padding: 0 calc(var(--space) * 2); border-radius: var(--radius); font-weight: 600; border: 1px solid var(--line); background: var(--bg); color: var(--text); }
.btn-primary { background: var(--ink); border-color: var(--ink); color: #fff; }
input, select, textarea { min-height: 44px; border: 1px solid var(--line); border-radius: var(--radius); padding: 0 12px; font: inherit; background: var(--bg); }
input:focus, select:focus, textarea:focus { outline: 2px solid var(--ink); outline-offset: 1px; }
```

## 화면 구성 습관
- 모바일 390px 폭에서 먼저 만든다. 가로 스크롤이 생기면 안 된다.
- 제목은 화면당 1개. 크기 단계는 3개(제목 20px · 소제목 16px · 본문 15px)만 쓴다.
- 주 버튼(네이비 채움)은 화면당 1개. 나머지는 테두리 버튼이나 글자 버튼.
- 팝업(모달)은 흰 카드 + 반투명 검정 배경(`rgba(0,0,0,.4)`). 블러는 쓰지 않는다.
- 아이콘은 선 아이콘 한 종류로 통일한다. 이모지를 아이콘 대신 쓰지 않는다.
- 빈 상태(데이터 없음)에는 한 줄 안내와 다음 행동 버튼 하나만 둔다.

## 하지 말 것
그라데이션 글씨 · 글래스 블러 · 네온 그림자 · 보라색 · 배경 원형 블러 · 과한 애니메이션 · 모든 요소 가운데 정렬 · 버튼마다 다른 색.

## 끝나고 확인
`ui-checker` 에이전트로 점검한다.
