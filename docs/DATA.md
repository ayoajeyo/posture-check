# 데이터 사전: 아요바디요

> `/adopt` 로 기존 코드(v262)에서 역으로 작성. 줄 번호는 `index.html` 기준(작성 시점).
> 새 필드를 추가하면 코드보다 먼저 여기에 적는다.

## 1. 민감도 등급
| 등급 | 뜻 | 예 | 취급 |
|------|----|----|------|
| S3 매우 높음 | 유출 시 개인 피해 큼 | 신체 사진, 서명, 건강 메모·상담 내용 | 비공개 버킷·서명 URL. 로그 금지 |
| S2 높음 | 개인 식별 가능 | 이름, 연락처, 출생연도, 운영자 이메일 | 로그 금지. 본인(센터)만 접근 |
| S1 낮음 | 식별 불가 | 각도 숫자, 앱 설정, 센터 공개 정보 | 일반 취급 |

## 2. 데이터 표

### 2-1. IndexedDB `ayo-posture` (v4, 모든 store keyPath `id`)
| 데이터 | 키(코드) | 형식 | 등급 | 서버 동기화 | 삭제 |
|---|---|---|---|---|---|
| 회원 이름 | `members.name` | 문자 | S2 | ayo_items | 회원 삭제 |
| 회원 번호 | `members.no` | 문자 | S2 | ayo_items | 회원 삭제 |
| 성별 | `members.sex` | 문자 | S2 | ayo_items | 회원 삭제 |
| 키 | `members.height` | 숫자 | S1 | ayo_items | 회원 삭제 |
| 연락처 | `members.phone` | 문자 | S2 | ayo_items | 회원 삭제 |
| 출생연도 | `members.birth` | 연도 | S2 | ayo_items | 회원 삭제 |
| 메모 | `members.memo` | 자유 글 | S3(건강 내용 가능) | ayo_items | 회원 삭제 |
| 담당자 | `members.staff` | 문자 | S1 | ayo_items | 회원 삭제 |
| 사진 동의 날짜 | `members.consentAt` | 날짜(처음 체크한 날, 해제 시 지움) | S2 | ayo_items | 회원 삭제 |
| 동의 서명 | `members.consentSign` | PNG dataURL ≤480×180 | S3 | ayo_items (본 기록에 포함) | 회원 삭제 |
| 서명 시각 | `members.consentSignAt` | 날짜 | S2 | ayo_items | 회원 삭제 |
| 공유 링크 목록 | `members.shareIds` | 문자 배열 (ayo_shares.id) — v264 부터 이 회원 리포트로 만든 링크 | S1 | ayo_items | 회원 삭제 시 이 목록의 링크·이미지도 서버에서 삭제 |
| 체형 기록 | `records.{memberId, at, score, f[], sd[], groups[], height, rf, rs, tg, editedAt}` | 숫자·객체 | S1 | ayo_items | 회원·기록 삭제 |
| 체형 썸네일 | `records.thumbs.{front,side}` | JPEG 300px q0.72 | S3 | ayo_items (본 기록에 포함) | 같음 |
| 체형 사진 | `records.photos.{front,side}.img` + 점 좌표 | JPEG 긴 변 1600px q0.86 → `blobs` 로 분리 | S3 | Storage photos (WebP) | 같음 |
| ROM 기록 | `roms.{memberId, at, joint, side, move, value, normal, pct, ref, pts[], roll, …}` | 숫자 | S1 | ayo_items | 같음 |
| ROM 썸네일 / 사진 | `roms.thumb` (400px) / `roms.img` (1440px q0.86 → blobs) | JPEG | S3 | ayo_items / Storage photos | 같음 |
| 사진 본체 | `blobs` `{id:"records:<id>" \| "roms:<id>", v, at}` | dataURL | S3 | Storage photos | `dbDel` 이 함께 삭제 |
| 관리자 수정 보관본 | `blobs` `admx:records:<id>:<front\|side>`, `admx:roms:<id>` — 회원 이름 + 수정 전·후 사진 | dataURL | S3 | **안 함(기기만)** | 회원 삭제 시 함께 (v264). 기록 하나만 지울 때는 남음 |
| 상담 기록 | `consults.{memberId, at, type, body, next}` | 자유 글 | S3 | ayo_items | 회원 삭제 |
| 결제 기록 | `sales.{memberId, at, method, item, amount, memo}` | 숫자·글 | S2 | ayo_items | 회원 삭제 |
| 프로그램 | `programs.{name, desc, exIds}` | | S1 | ayo_items | 직접 삭제 |
| 프로그램 배정 | `assigns.{memberId, programId, name, exIds, active}` | | S1 | ayo_items | 회원 삭제 |

### 2-2. localStorage
| 키 | 내용 | 등급 |
|---|---|---|
| `ayo_settings` | 센터명·연락처·전화·예약 링크·로고·공개 페이지·결제 기본값 | S1(센터 공개 정보) |
| `ayo_owner_email`, `ayo_agree_pending` | 운영자 이메일 | S2 |
| `ayo_owner` | Supabase 사용자 id | S1 |
| `sb-doltciamvnrrysoynbzo-auth-token` | Supabase 로그인 토큰(+이메일) | S2 |
| `ayo_sq` | 동기화 대기 `{"store\|id": ±버전}` (음수 = 삭제) | S1 |
| `ayo_pull` | 마지막 받은 시각 | S1 |
| `ayo_sub_<uid>`, `ayo_sub_chk_<uid>`, `ayo_license`, `ayo_license_v`, `ayo_lic_pub`, `ayo_trial_*`, `ayo_play` | 구독·체험·이용 코드 상태 | S1 |
| `ayo_consent_<uid>` | 약관 동의 확인 표시 | S1 |
| `ayo_nv_state` | 네이버 로그인 state | S1 |
| `ayo_bk_*`, `ayo_last_backup` | 백업 알림 주기 | S1 |
| `ayo_bench` | 정확도 재채점 결과 | S1 {확인 필요: 내용에 회원 정보 포함 여부} |
| `ayo_ui`, `ayo_skin`, `ayo_selfie_timer`, `ayo_admin`, `ayo_last_msr`, `ayo_seen_report`, `ayo_rom_any`, `ayo_rep_grid`, `ayo_rom_outline`, `ayo_rom_cam_*`, `ayo_blob_v1`, `ayo_blobfmt2`, `ayo_programs_seeded` | 화면·기기 설정, 이전 표시 | S1 |
sessionStorage: `ayo_view`(화면 상태), `4pm_ext_tried`.
로그아웃·계정 전환 시 지우는 키 목록: `ACCT_KEYS`.

### 2-3. Supabase
| 표/버킷 | 내용 | 등급 | RLS |
|---|---|---|---|
| `ayo_items` | 위 IndexedDB 기록 그대로(`store`, `id`, `data` JSON, `deleted`) | S2·S3 | 본인 행만 |
| `ayo_profiles` | `center_name`, `settings`(센터·이용 코드), `agreed_terms`, `agreed_sensitive`(동의 시각) | S1·S2 | 본인 |
| `ayo_subs` | Play 구독(`product_id`, `purchase_token`, `state`, `expires_at`) | S1 | 본인 읽기만 |
| `ayo_shares` | 공유 링크(`id`, `image_path`, `center`, `expires_at` ≤100일, 조회·전화·예약 수) | S1 | 본인 |
| `ayo_centers` | 센터 소개 페이지(`slug`, `published`, `profile`) | S1(공개용) | 본인 |
| 버킷 `photos` | `{uid}/blobs/{store_id}.json` + `{uid}/blobs/{id}/<키>.webp` | S3 | 비공개, 첫 폴더 = uid |
| 버킷 `shares` | `{uid}/{키}.jpg` 리포트 이미지(회원 이름·사진 포함) | S3 | 비공개, share-view 서명 URL 600초 |
| auth.users | 이메일, 네이버 이름(user_metadata) | S2 | Supabase 관리 |

## 2-4. 보관 기간
회원 사진·측정 기록·서명은 **센터가 회원을 삭제할 때까지** 보관한다(2026-10-15 결정). 계정을 삭제하면 전부 삭제. 자동 기간 만료 삭제는 없다.

## 3. 관계
```
member 1 ─ N records (1 ─ 1 blobs 사진)
       1 ─ N roms    (1 ─ 1 blobs 사진)
       1 ─ N consults / sales / assigns
program 1 ─ N assigns
계정(user) 1 ─ N ayo_items / ayo_shares, 1 ─ 1 ayo_profiles / ayo_subs / ayo_centers  (계정 삭제 시 ON DELETE CASCADE)
```
회원 삭제(`btnMbDelete`) = 공유 링크(`shareIds` → ayo_shares 행 + shares 이미지, 먼저·온라인 필요) → records·assigns·consults·sales·roms·사진 → 관리자 보관본(`admx:records:<기록id>:*`, `admx:roms:<기록id>`) 함께 삭제. 서버엔 `deleted=true, data={}` 행(id만)이 남는다. v264 이전에 만든 공유 링크는 회원과 연결 정보가 없어 자동 삭제되지 않는다(링크 목록에서 직접 중지, 최대 100일 뒤 만료). 한계: 다른 기기의 옛 회원 정보로 폼을 저장하면 `shareIds` 가 덮여 사라질 수 있고, 링크를 만든 계정과 다른 계정으로 로그인해 삭제하면 RLS 로 0건이 지워져도 오류 없이 넘어간다.
계정 삭제(`delete-account` 함수) = photos·shares 파일 전부 → 계정 삭제(표는 CASCADE).

## 4. 서버 저장 규칙
위 2-3 표. 모든 표 RLS 켜짐, 버킷 비공개.

## 5. 내보내기·가져오기
- 백업: `AYO_backup_YYYYMMDD_HHMM.json` — `{app, kind:"backup", version:2, exportedAt, members, records(사진 포함), programs, assigns, consults, sales, roms, settings}`. **암호화 없음.**
- 가져오기: `kind==="backup"` 만, id 기준 병합(덮어쓰지 않음).
- 이미지 내보내기 파일명 중 **회원 이름이 들어가는 것**: `AYO_ROM_<관절>_<동작>_<이름>_<날짜>.jpg`(ROM 저장마다 자동), `AYO_exercise_<이름>_<날짜>.jpg`, 관리자 엑셀 `아요바디요-<이름>-<회차>-<날짜>.xlsx`.

## 6. 예시 데이터 규칙
테스트·시연에는 가짜만: 이름 `홍길동`·`김예시`, 전화 `010-0000-0000`. 코드 주석에도 실제 회원 이름을 쓰지 않는다.
