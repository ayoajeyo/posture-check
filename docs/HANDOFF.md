# 인수인계 (HANDOFF)

> `/handoff` 가 쓰는 문서. 대화를 새로 시작하거나 다른 PC 로 옮길 때 **이 문서 한 장**으로 이어간다 (긴 대화를 다시 읽지 않아 토큰을 아낌).
> 항상 **최신 상태 하나만** 둔다. 지난 기록은 CHANGELOG·docs/PLANS·git log 에 있다. 회원 실명·연락처는 쓰지 않는다.

상태: 진행 중 (배포는 v304 까지 완료 · main = dd2e784 · 저장 안 된 코드 없음)
갱신: 2026-10-17 17:41

## 지금 하던 일
- 2026-10-17 하루에 v292~v304 배포. 아요가 폰에서 TESTING #90~#103 확인하는 단계 (특히 #101~102: 격자 배경 커튼 거르기 뒤 서서 찍은 어깨 전신·맨발 발목·반소매 사진에서 손끝·발끝이 잘리지 않는지)
- 마지막 작업: v304 관리자 엑셀 — 지워진 기록의 보관 자료를 같은 이름 회원에 '삭제된 기록' 으로 합침(이름 중복 해결), 점 안 옮긴 항목은 수정후 칸에 '수정 없음'

## 다음 할 일 (순서대로, 바로 입력할 명령 포함)
1. **집·병원 PC 를 새로 받기** (git 기록에서 회원 실명을 지우느라 기록 번호가 모두 바뀜). 예전 폴더에서 push 하면 실명이 되살아남
   `Rename-Item posture-check posture-check-old` → `git clone https://github.com/ayoajeyo/posture-check` → 잘 열리면 예전 폴더 삭제
2. **GitHub 지원팀에 PR #1 캐시 삭제 요청** (아요가 직접, 브라우저) — https://support.github.com/contact → Remove sensitive data · 저장소 ayoajeyo/posture-check · PR #1 · 옛 커밋 03dfc18 28d94e3 a2d4c3a 3b2a3a3 52f0298 a8c14d4
3. 아요 폰 확인 결과 받기 → 어색한 곳은 `/fix` (격자 잘림이 보이면 `romMaskMerge` 의 둘레 1%·확신 0.5 기준 조정)
4. 다음 후보 `/fix` — 회원을 바꿔도 이전 회원 체형 사진이 남은 채 [측정 저장] 하면 다른 사람 사진이 새 회원 기록으로 저장될 수 있음 (privacy-guard 권장, BACKLOG '지금')
5. Supabase 가입 메일 Gmail SMTP — 2026-10-23 이후 재시도 (`supabase/SETUP.md` 3번 4, ADR-015). 앱 비밀번호는 Supabase 대시보드에만 입력
6. Play Console: 데이터 보안 양식 · 스토어 연락처 이메일 · 개인정보처리방침 URL (BACKLOG '지금' 첫 줄). 방침은 v295 로 보관 기간까지 적혀 있음

## 정해진 것 / 결정 대기
- 정해짐: 리포트는 문서형·네이비 하나(TASTE.md) · 고관절 굴곡 가로 기준선은 좌측=화면 왼쪽(ADR-016) · git 실명 지우기 완료(docs/PLANS/2026-10-17-git-기록-실명-지우기.md)
- 대기: ① 격자 화면 '지우개'(손으로 배경 지우기) 기능을 만들지 — 양말에 붙은 벽 안내문은 모델이 소품으로 확신해 자동 불가 ② 기록 삭제 때 관리자 보관 사진도 함께 지울지(삭제 동작이라 아요 확인 필요) ③ 비운 ROM 중복 기록 일괄 정리 기능 여부

## 주의할 점
- 배포는 `/ship` 만, 아요의 "확인했습니다" 뒤에만 main 에 push. 버전은 APP_VER(v304)·sw.js pma-v253·CHANGELOG 맨 위를 함께 올림
- 격자 배경(인물 분리) 고칠 때: 원본 사진으로 브라우저 재현이 필수 — 화면 캡처로는 재현이 안 됐음. 커튼 거르기에서 '확신 큰 곳 전부를 씨앗' 으로 하면 커튼이 되살아남, 피부 쪽 약한 곳을 옷 옆에서도 인정하면 손 아래 커튼 띠가 되살아남 (둘 다 시도 후 되돌림)
- 회원 사진을 확인용으로 받으면 임시 폴더에서만 쓰고 지운다. 저장소·커밋·문서에 실명 금지(테스트는 홍길동·김철수)
- 이 클라우드 환경은 jsDelivr·unpkg 가 막혀 있어 mediapipe 는 `npm pack @mediapipe/tasks-vision@0.10.14` 로 받고, 모델은 storage.googleapis.com 에서 받음. pytest 없음(`python -m pytest scripts/` 는 PC 에서)
- 대화 사용량: 주간 한도 경고 — 2026-10-18 21:00 초기화

## 관련 파일
- 격자 배경: `index.html` `segMulti`(옷·피부 분류) · `romStrongKeep`·`romDilate`·`romMaskMerge` · tests/rom-strong-near·rom-blue
- 저장 지문·확인창: `sessDiffList`·`sigKeep`·`confirmDiscard` · tests/dirty-list · 회원 전환 `mbAdoptFor` · tests/mb-adopt
- 회차 번호: `poseRounds`·`keepRounds` · tests/pose-rounds · 관리자 엑셀 `admxOrphans` · tests/admx-orphans
