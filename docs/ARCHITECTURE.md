# 아키텍처: 아요바디요

> `/adopt` 로 기존 코드(v262)에서 역으로 작성. 하네스 기본 구조(`js/` 분리)와 **다르다** — 현재 모든 코드가 `index.html` 한 파일에 있다.

## 1. 한눈에 보기
```
[폰 브라우저 / 안드로이드 TWA(com.physiomaster.posture) / PC]
   │  index.html 한 파일 (CSS + JS 인라인, 빌드 없음)
   │  └ MediaPipe tasks-vision 0.10.14 (jsDelivr) + pose 모델 (storage.googleapis)
   │
   ├─ 기기 저장: IndexedDB `ayo-posture` v4 (회원·기록·사진) / localStorage `ayo_*` (설정·상태)
   │
   └─ Supabase (로그인 시) ── Auth(이메일·구글·카카오·네이버)
         ├ DB: ayo_items(동기화) · ayo_profiles · ayo_subs · ayo_shares · ayo_centers (모두 RLS)
         ├ Storage: photos(비공개, 사진) · shares(비공개, 공유 리포트 이미지)
         └ Edge Functions: naver-auth · play-verify · share-view · delete-account
   GitHub Pages 가 배포 (main push = 배포) · GitHub Actions keepalive 가 매일 Supabase 깨움
```

## 2. 디렉토리 구조
```
index.html            # 앱 전체 (약 14,400줄). 화면 = <section class="view" id="view-*">
js/logic/judge.js     # 판정 기준 순수 함수(ADR-011) — 브라우저 window.AYO_LOGIC / Node require (scolJudge·romJudge·scoreBand)
js/logic/report-timeline.js  # 리포트 회차 시계열(buildTimeline)·ROM 평균 (계산만, v283)
js/logic/report-charts.js    # 리포트 차트 좌표(trendGeom·divergingGeom·romBarGeom·zoneGeom) — 화면 SVG 와 이미지 캔버스가 같은 좌표를 씀 (v283·v292)
js/logic/report-model.js     # 문서형 리포트 데이터 모델 buildReportDoc: 요약표·소견 문장·추이·체형 막대·ROM 막대·구간 띠·사진 순서·기록표 (v292)
tests/*.test.js       # node --test (npm test)
package.json          # 테스트 명령만 (앱 실행·배포엔 불필요)
r.html                # 회원용 공유 리포트 (?k=키) — share-view 함수 호출
c.html                # 센터 소개 공개 페이지 (?c=slug)
delete.html           # 계정·데이터 삭제 안내 (Play 정책)
download.html         # 설치 안내 (Play / APK / 아이폰)
privacy.html terms.html
manifest.webmanifest  # 앱 이름·아이콘 (version 필드 없음)
sw.js                 # 서비스워커. VERSION="pma-vNNN" (화면 캐시) · ASSETS 캐시(모델·글꼴, 버전 무관)
license-pub.json      # 이용 코드 검증용 공개키 (EC P-256)
PMA-posture.apk       # 직접 설치용 APK (git 에 올라가 있음)
guide/                # 측정 가이드 사진(body, rom), 실루엣(sil), 기준 데이터(ref)
icons/
supabase/             # schema.sql, v185_share.sql, v186_center.sql, functions/*, SETUP.md
.github/workflows/keepalive.yml
docs/  .claude/  scripts/(하네스)
```
`css/` 폴더는 없다. `js/` 에는 계산 로직(`js/logic/`)만 있다.

## 3. 데이터 흐름
```
촬영 → MediaPipe 자동 점 → 손으로 점 수정 → 계산(인라인 함수) → dbPut()
dbPut: 무거운 필드(records.photos, roms.img)는 blobs store 로 분리, 본 기록엔 blob:true
     → 동기화 큐 localStorage `ayo_sq` 에 "store|id" 기록
syncPush (로그인 시): 사진 → Storage photos/{uid}/blobs/... (WebP 0.85)
                    기록 → ayo_items upsert (store,id,data JSON, deleted)
syncPull: ayo_items 를 updated_at 기준으로 받아 IndexedDB 에 반영 (커서 `ayo_pull`)
리포트 → repRoundsRender(회차 묶음 S = mbBuildSessions) → renderRepDoc: buildTimeline → buildReportDoc(repDoc.doc) → 화면 HTML/SVG 섹션 01~08
       이미지·PDF → repGoOut → repDocPhotos(사진 준비) → buildReportPages(같은 repDoc.doc 을 캔버스 A4 쪽으로, 논리 833px × 2.4) → pagesToPdf() / 이미지 저장 / navigator.share (v292)
공유 링크 → 리포트 JPEG 를 shares/{uid}/{키}.jpg + ayo_shares 행 → r.html 이 share-view 로 10분짜리 서명 주소 받아 표시
```

## 4. 저장소 표
| 데이터 | 어디에 | 민감도 | 보관 기간 | 지울 때 |
|--------|--------|--------|----------|---------|
| 회원 정보·서명 | IndexedDB `members` / `ayo_items`(store=members) | S2·S3 | 센터가 회원을 삭제할 때까지 (계정 삭제 시 전부) | 회원 삭제 시 기록·ROM·상담·결제·배정과 함께 삭제. 서버에는 id 만 남은 `deleted=true` 행 |
| 측정 사진 | IndexedDB `blobs` / Storage `photos` | S3 | 회원 삭제 시까지 | 회원·기록 삭제 시 함께 (단 관리자 `admx:` 보관본·공유 이미지는 남음 → BACKLOG) |
| 공유 리포트 이미지 | Storage `shares` + `ayo_shares` | S3 | 최대 100일(링크 기간) | 수동 중지 또는 계정 삭제 |
| 앱·센터 설정 | localStorage `ayo_settings` / `ayo_profiles.settings` | S1(센터 정보) | 계정 삭제까지 | 계정 삭제 |
자세한 필드는 `DATA.md`.

## 5. 외부 서비스
| 서비스 | 용도 | 키 종류 | 키 위치 |
|--------|------|---------|---------|
| GitHub Pages | 배포 | 없음 | — |
| Supabase | 로그인·DB·사진·서버 함수 | publishable(공개용) | `index.html`·`r.html`·`c.html` 인라인, `keepalive.yml` |
| | | secret / service_role | Edge Function 환경변수만 (`_cors.ts adminKey()`) — 코드엔 없음 |
| Google Play | 월 구독 결제·검증 | 서비스 계정 JSON | Edge Function secret `GOOGLE_PLAY_SA_JSON` |
| 네이버 로그인 | OAuth | client_id(공개) / client_secret | id 는 index.html, secret 은 Edge Function secret |
| 구글·카카오 로그인 | OAuth | Supabase 대시보드 설정 | — |
| jsDelivr / storage.googleapis | MediaPipe 라이브러리·모델 | 없음 | — |
| Google Fonts | 글꼴 | 없음 | — |
| Gmail SMTP (`smtp.gmail.com`) | Supabase Auth 가 가입 인증·비밀번호 재설정 메일을 `ayobodyyo@gmail.com` 으로 보냄 (ADR-015) | Google 앱 비밀번호 | Supabase 대시보드 SMTP 설정에만 — 코드·저장소엔 없음 |
| FormSubmit (formsubmit.co) | 개선·추가 기능 요청을 운영자 메일(`FB_MAIL`)로 전달 — 새 주소는 첫 요청 때 확인 메일로 활성화 필요 | 없음 | — |

## 6. 오프라인과 동기화
- 오프라인에서도 측정·저장 가능(IndexedDB). 로그인·동기화·공유 링크·구독 확인은 온라인 필요.
- 서비스워커: 앱 화면은 네트워크 우선(4초 넘으면 저장본), 모델·글꼴은 저장본 우선.
- 충돌 규칙: {확인 필요: 같은 기록을 두 기기에서 고치면 어떻게 되는지 — 코드상 updated_at 기준 pull}
- 로그아웃 시 기기의 IndexedDB 전체를 비운다.

## 7. 보안 경계
- 모든 `ayo_*` 표 RLS: 로그인한 본인(`auth.uid() = user_id`) 행만. `ayo_subs` 는 읽기만, 쓰기는 `play-verify` 만.
- 버킷 `photos`·`shares` 비공개, 첫 폴더 = 사용자 ID.
- 공유 링크 키: 20~64자 랜덤, 서버 함수만 열람(서명 URL 600초).
- Edge Function CORS: `https://ayoajeyo.github.io` 만 허용.
- 관리자 모드: 코드의 SHA-256 해시(`ADM_HASH`)를 브라우저에서 비교 — 서버 검증 아님.

## 8. 버전과 배포
- 현재: `APP_VER = "v262"` (index.html), `sw.js VERSION = "pma-v211"`, manifest 에 version 없음, CHANGELOG 는 이번에 작성.
- 하네스 표준(4곳 동일 번호)과 다름 → `RELEASE.md` 1번 참고.
- 배포 = `main` push. 되돌리기 = `git revert` 후 push.

## 9. 설계 패턴 (현재 코드)
- 화면 전환: `showView(v)` 가 `hidden` 속성 토글. 뒤로가기는 `history.pushState` 가드 + `popstate`.
- 저장: `dbPut/dbGet/dbDel` 헬퍼, localStorage 는 `lsGet/lsSet`.
- 계산 로직은 대부분 아직 index.html 안에 섞여 있다. `js/logic/` 로 하나씩 옮기며 테스트를 붙인다(ADR-011, 현재 `judge.js`·`report-timeline.js`·`report-charts.js`·`report-model.js` 4개).
- 문서형 리포트(v292): `repRoundsRender()` 가 만든 회차 묶음 S 를 `renderRepDoc(S, act, rs)` 가 받아 `buildTimeline`(선택 회차까지) → `buildReportDoc` 으로 **데이터 한 벌(repDoc.doc)** 을 만들고, 화면은 HTML/SVG(`rdSum`·`rdTrend`·`rdBodySec`·`rdRom`·`rdZone`·`rdPhotos`·`rdHist`), 이미지는 `buildReportPages` 가 같은 doc 을 캔버스에 그린다(좌표 함수 공유). 저장 전 '지금 측정 중' 체형은 마지막 회차(`__live`)로 붙여 계산. 모듈을 못 받으면 오류 상태 + [다시 시도].
