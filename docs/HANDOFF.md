# 인수인계 (HANDOFF)

> `/handoff` 가 쓰는 문서. 대화를 새로 시작하거나 다른 PC 로 옮길 때 **이 문서 한 장**으로 이어간다 (긴 대화를 다시 읽지 않아 토큰을 아낌).
> 항상 **최신 상태 하나만** 둔다. 지난 기록은 CHANGELOG·docs/PLANS·git log 에 있다. 회원 실명·연락처는 쓰지 않는다.

상태: 배포 완료 (v296 · main = dc1fcfa)
갱신: 2026-10-17

## 지금 하던 일
- v296 체형 회차 번호 밀림 수정 배포 직후(1차 기록이 3차로 보이던 회원). 아요가 폰에서 TESTING #90~92 를 확인하고, 그 회원의 1차 기록을 한 번 다시 저장해 저장 번호까지 바로잡는 단계.
- 그 전: v292 문서형 리포트 · v293 목 세로 기준선 · v294 고관절 가로 기준선(ADR-016) · v295 방침 5번 보관 기간.

## 다음 할 일 (순서대로, 바로 입력할 명령 포함)
1. 아요 폰 확인 결과 받기 → 어색한 곳은 `docs/TASTE.md` 기록 후 `/fix`
2. Supabase 가입 메일 Gmail SMTP — 2026-10-23 이후 재시도 (`supabase/SETUP.md` 3번 4, ADR-015). 앱 비밀번호는 Supabase 대시보드에만 입력
3. Play Console: 데이터 보안 양식 · 스토어 연락처 이메일(ayobodyyo@gmail.com) · 개인정보처리방침 URL (BACKLOG). 방침은 v295 로 보관 기간까지 다 적혀 있어 양식 근거로 그대로 쓰면 된다

## 이번에 끝낸 것
- 리포트를 검사 결과지형 문서(머리글 → 01~08 → 바닥글)로 재설계 — 화면·이미지·PDF·공유 링크 한 양식 (`docs/PLANS/2026-10-16-리포트-문서형-재설계.md` 완료)
- `js/logic/report-model.js`(데이터 모델·소견 문장·판정 기준 문장) + `report-charts.js` 좌표 4개, 테스트 135개
- 옛 대시보드(v283)·점수 카드·회차별 비교(repPair*)·buildReportCanvas 삭제

## 정해진 것 / 결정 대기
- 정해짐: 리포트는 문서형, 색은 네이비 하나, 좌/우는 줄로 구분, 전→후는 ○→● (TASTE.md)
- 대기: 소견 문장 직접 수정칸 · 두 회차 골라 비교 복원 여부 · 얼굴 모자이크 죽은 코드(faceBody·REP_FACE) 정리 (BACKLOG)

## 주의할 점
- 리포트 데이터는 `repDoc.doc` 하나 — 화면(`renderRepDoc`)과 이미지(`buildReportPages`)가 같이 쓴다. 수치·문장은 `report-model.js` 에서만 고친다
- 저장 전 '지금 측정 중' 체형은 가짜 회차(`__live`)로 붙어 그려진다(삭제 버튼 숨김, 06 체형 쌍 제외)
- 이 환경(클라우드)엔 pytest 가 없어 `python -m pytest scripts/` 는 PC 에서 돌릴 것

## 관련 파일
- `index.html` `renderRepDoc`~`rdHist`(화면) · `repDocBlocks`·`buildReportPages`·`repDocPhotos`·`repGoOut`(이미지) · `.rdoc` CSS
- `js/logic/report-model.js` · `tests/report-model.test.js` · `docs/TESTING.md` #71~78 · `docs/CHANGELOG.md` v292
