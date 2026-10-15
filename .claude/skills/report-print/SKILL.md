---
name: report-print
description: A4 여러 장으로 인쇄·PDF 저장되는 리포트를 HTML+CSS 로 만드는 패턴 — 페이지 나눔, 머리글·바닥글, 사진+수치 배치, 정상/주의/위험 색, 폰에서 PDF 저장 흐름. 측정 리포트, 기록지, 증명서, 카카오톡으로 보낼 결과지에 사용한다.
---

# A4 리포트

## 구조
```html
<section class="page">   <!-- 페이지 1 -->
  <header class="page-head">앱 이름 · 회원 · 2026.10.14 · No.2471</header>
  <main>…</main>
  <footer class="page-foot">made by AYOAJEYO · 1 / 3</footer>
</section>
<section class="page">…</section>
```
리포트는 별도 화면(`report.html` 또는 숨겨진 섹션)에 그리고, `window.print()` 로 PDF 저장.

## CSS 핵심
```css
@page { size: A4 portrait; margin: 14mm; }
.page { width: 182mm; min-height: 269mm; margin: 0 auto 16px; background: #fff; display: flex; flex-direction: column; }
@media print {
  body { background: #fff; }
  .page { margin: 0; min-height: auto; break-after: page; }
  .page:last-child { break-after: auto; }
  .no-print { display: none !important; }
  * { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
}
.card, table, figure { break-inside: avoid; }
.page-head { display: flex; justify-content: space-between; font-size: 11pt; color: #6B7280; border-bottom: 1px solid #E5E7EB; padding-bottom: 6px; }
.page-foot { margin-top: auto; font-size: 9pt; color: #6B7280; text-align: right; }
```
- 본문 11pt, 표 10pt, 수치 강조 18pt. 화면 글꼴과 같은 Pretendard.
- 상태색: 정상 `#15803D`/`#ECFDF3`, 주의 `#B45309`/`#FFF7E6`, 개선 필요 `#B91C1C`/`#FEF2F2`. 색만으로 구분하지 말고 글자도 함께("주의").

## 사진 + 수치 배치
- 2단: 왼쪽 사진(최대 폭 80mm), 오른쪽 수치 카드 세로 나열. 사진은 `object-fit: contain`, 가이드선은 사진 위 SVG 로 겹침(인쇄에도 그대로).
- 사진 개수가 많으면 페이지당 2장(정면·측면)까지.

## 페이지 번호
인쇄 전에 JS 로 `.page` 개수를 세어 `n / 전체` 를 바닥글에 써 넣는다(CSS counter 는 폰 브라우저 지원이 고르지 않음).

## 폰에서 PDF 저장 흐름
1. [PDF 저장] 버튼 → `window.print()`
2. 안드로이드 Chrome: 공유 시트에서 "PDF로 저장" → 카카오톡 공유. 첫 사용 시 안내 팝업 1회("오른쪽 위 ⋮ → 인쇄 → PDF 저장").
3. iOS Safari: 공유 → 프린트 → 미리보기 핀치 → 공유.
4. PC: Ctrl+P → PDF 저장.

## 카카오톡 전송용 이미지가 더 편할 때
페이지를 `html2canvas` 류 없이 직접 캔버스에 그리는 건 비용이 크다. **PDF 를 기본**으로 하고, 이미지가 꼭 필요하면 1페이지 요약만 캔버스로 만든다.

## 점검
- 390px 화면에서 미리보기가 가로 스크롤 없이 축소되어 보이는가(`transform: scale`).
- 표가 페이지 경계에서 잘리지 않는가.
- 머리글의 회원 이름 아래에 동의 서명(있으면)을 높이 8mm 로 작게.
