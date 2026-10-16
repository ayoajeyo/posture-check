# 프로젝트: 아요바디요 (체형·ROM·척추 균형 측정)

> `/adopt` 로 기존 코드에서 역으로 채웠다(2026-10-15). `{확인 필요}` 는 사용자 답을 받아 채운다.

## AYOAJEYO 공통 규칙 (수정하지 않음)

### 소통
- 사용자는 코딩 초보다. 답변과 설명은 한국어로, 전문용어는 처음 나올 때 괄호로 풀이한다.
- 작업 결과는 "무엇을 바꿨나 → 사용자 입장에서 뭐가 달라지나" 순서로 짧게 알린다.
- 되돌리기 어려운 작업(데이터 삭제, 배포, 외부 서비스 설정 변경)은 실행 전에 사용자 확인을 받는다.

### 개인정보 (CRITICAL)
- CRITICAL: 회원·환자의 이름, 연락처, 출생연도, 신체 사진, 서명을 `console.log`·에러 메시지·커밋 메시지에 남기지 마라.
- CRITICAL: 비밀키(API 비밀키, Supabase service_role 키, 토큰)는 브라우저 코드에 쓰지 마라. 서버 함수 환경변수나 `.env`에만. 훅이 자동으로 막는다. (Supabase anon 키·URL 은 공개용이라 `js/config.js` 에 둔다)
- CRITICAL: 테스트·예시 데이터에는 가짜 정보만 쓴다 (예: 홍길동, 010-0000-0000).
- 사진 촬영·보관 기능에는 동의 확인과 동의 날짜 기록을 함께 만든다.

### 화면
- 디자인은 `docs/UI_GUIDE.md`와 `clean-ui` 스킬을 따른다: 심플·깔끔, 포인트 색은 네이비 `#1E2A4A` 하나.
- 버튼·문구는 UI_GUIDE 7번 표준 단어(저장/취소/닫기/삭제/다음/완료/공유/PDF 저장/촬영/측정)만 쓴다.
- 모든 목록·데이터 화면에 불러오는 중·비어 있음·오류·정상 4가지 상태를 만든다.
- 모바일(390px 폭)에서 먼저 만든다. 가로 스크롤 금지, 터치 영역 44px 이상.
- 같은 의미의 버튼·메뉴는 모든 화면에서 같은 이름과 모양을 쓴다.
- 메뉴·버튼 아래 중복 설명 문구는 넣지 않는다.
- 인쇄·공유용 리포트는 A4 여러 장으로 나뉘게 만든다.
- 앱 하단이나 리포트 끝에 제작자 표기 `made by AYOAJEYO`를 작게 넣는다.

### 작업 방식
- 일상 작업은 명령어로: 기능 `/feature`, 버그 `/fix`, 배포 `/ship`, 다른 PC 와 맞추기 `/sync`, 현황 `/status`. 새 앱 전체는 `/start` → `/harness`.
- 한 번에 한 기능씩 작게 만들고, 끝날 때마다 동작을 확인한 뒤 커밋한다. 배포(push to main)는 `/ship` 으로만.
- 새 데이터 필드는 코드보다 먼저 `docs/DATA.md` 에 적는다. 새 라이브러리·서비스·구조 변경은 `docs/ADR.md` 에 적는다.
- 작업 시작 전 `git pull`, 끝나면 커밋 (병원·집 PC를 오가며 작업한다). 되돌릴 수 없는 git 명령은 쓰지 않는다.
- 커밋 메시지는 conventional commits 형식(feat:, fix:, docs:, refactor:, release:)에 한국어 설명.
- 요청하지 않은 기능은 만들지 않고 `docs/BACKLOG.md` 에 적는다.

## 기술 스택
- 화면: HTML + CSS + 순수 JavaScript, 빌드 없음. **앱 대부분이 `index.html` 한 파일(약 14,400줄)** 안에 있다. 계산 로직만 `js/logic/` 로 하나씩 분리 중(ADR-011).
- 자세 인식: MediaPipe `@mediapipe/tasks-vision@0.10.14` (jsDelivr) + pose_landmarker 모델 (storage.googleapis.com)
- 배포: GitHub Pages (https://ayoajeyo.github.io/posture-check/) + 안드로이드 앱(TWA) 패키지 `com.physiomaster.posture`
- 서버·DB: Supabase (프로젝트 `ayobodyyo`) — 로그인(이메일·구글·카카오·네이버), DB `ayo_*` 표, 비공개 버킷 `photos`·`shares`, Edge Function 4개 (`supabase/functions/`)
- 결제: Google Play 월 구독 `ayo_pro_monthly` (Digital Goods API) + 오프라인 이용 코드(ECDSA, `license-pub.json`)

## 이 프로젝트만의 규칙
- 사용자 호칭은 **"아요"** 다. "원장님" 이라고 부르지 않는다 (2026-10-16 요청).
- 입력칸 예시(placeholder)의 센터명 '남다예 필라테스'·연락처 '070-5220-0919 · ayobodyyo@gmail.com'·주소 '부산 부산진구 중앙대로 708'·담당자 '남선생님' 은 **아요가 일부러 넣은 아요 본인 정보**다. 회원·환자 정보가 아니므로 개인정보 점검에서 가짜 값으로 바꾸지 않는다.
- CRITICAL: 안드로이드 패키지 이름 `com.physiomaster.posture` 는 **절대 바꾸지 않는다** (바꾸면 Play 스토어에서 다른 앱이 되고 구독이 끊긴다). 쓰이는 곳: `index.html`(PLAY_PKG·Play 링크), `supabase/functions/play-verify/index.ts`.
- CRITICAL: 기기 저장소 이름 `ayo-posture`(IndexedDB) 와 store 이름(members·records·roms…), Supabase `ayo_items.store` 값은 바꾸지 않는다 — 바꾸면 기존 회원 데이터가 안 보인다.
- 앱 버전은 `index.html` 의 `APP_VER = "v262"` 형식(정수 증가). 서비스워커 `sw.js` 의 `VERSION = "pma-v211"` 은 별도 카운터로 배포마다 +1 한다.
- 코드 주석에도 실제 회원 이름을 쓰지 않는다 (index.html 은 공개 저장소에 그대로 올라간다).

## 개발 프로세스
- 계산·변환처럼 결과가 정해진 로직은 `js/logic/` 에 두고 테스트를 먼저 작성한다 (TDD, `docs/TESTING.md`).
- 설계는 `architect`, 테스트는 `tester`, 원인 분석은 `debugger`, 검토는 `reviewer`, 개인정보는 `privacy-guard`, 화면은 `ui-checker`, 문서 동기화는 `docs-keeper` 에이전트.
- 버전은 정수 `vNNN`. `/ship` 이 `index.html` `APP_VER` 와 `CHANGELOG.md` 맨 위 번호를 같이 올리고, `sw.js` `VERSION` 은 `pma-v` 뒤 숫자만 +1 한다. manifest 는 version 칸이 없어 건드리지 않는다 (`docs/RELEASE.md` 1번).

## 명령어
- 미리보기: `python -m http.server 8000` 후 http://localhost:8000 (카메라·서비스워커 때문에 파일 더블클릭보다 서버로 연다. 로그인·공유는 Edge Function CORS 가 실제 주소만 허용해 로컬에선 안 된다)
- 테스트: `npm test` (계산 로직, `tests/*.test.js`) · 하네스 테스트 `python -m pytest scripts/`
- 배포: `/ship` (main 에 push = GitHub Pages 반영)
- 서버 함수 배포: `supabase functions deploy <이름>` (저장소에 `supabase/config.toml`·연결 정보가 있어 CLI 방식으로 보임. 이전 배포 방법은 사용자도 모름 — 배포 전 확인받기)
