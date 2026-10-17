# 인수인계 (HANDOFF)

> `/handoff` 가 쓰는 문서. 대화를 새로 시작하거나 다른 PC 로 옮길 때 **이 문서 한 장**으로 이어간다 (긴 대화를 다시 읽지 않아 토큰을 아낌).
> 항상 **최신 상태 하나만** 둔다. 지난 기록은 CHANGELOG·docs/PLANS·git log 에 있다. 회원 실명·연락처는 쓰지 않는다.

상태: 배포 완료 (v301 · main = 33b6958)
갱신: 2026-10-17

## 지금 하던 일
- v301 '저장하지 않은 측정이 있어요' 오탐 수정(회원을 바꿔도 저장된 상태 유지 sigKeep) + 확인창에 저장 안 된 것 목록 배포 직후. 아요가 TESTING #99·100 확인하는 단계.
- 다음 후보(privacy-guard 권장, BACKLOG): 회원을 바꿔도 이전 회원 체형 사진이 남은 채 [측정 저장] 하면 다른 사람 사진이 새 회원 기록으로 저장될 수 있음 → saveMeasurement 에서 photoMid ≠ 회원이면 막기.
- 같은 날 앞선 배포: v300 격자 배경 남색 옷(#98) · v299 회원 탭에서 고른 회원으로 전환(#97) · v298 비운 ROM 기록 'null°'(#95·96) · v297 각도 표시칸(#93·94) · v296 체형 회차 밀림(#90~92) · v295 방침 5번 · v294 고관절 기준선(ADR-016) · v293 목 세로선 · v292 문서형 리포트.
- 알림: 예전 커밋 03dfc18(v251, 2026-10-14) 설명에 실제 회원 이름 1건 — 지우려면 기록 다시 쓰기(되돌릴 수 없음)라 아요 결정 대기.

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
