# 출시·배포: 아요바디요

> 배포는 항상 `/ship` 으로. 이 문서는 `/ship` 이 따르는 규칙과, 앱스토어 등록 때 필요한 정보 보관함이다.

## 1. 버전 번호

### 현재 상태 (2026-10-17 확인 · v302)
| 위치 | 값 |
|------|----|
| `index.html` `APP_VER` | `v302` (홈 맨 아래·`.app-ver-note` 에 표시) |
| `sw.js` `VERSION` | `pma-v251` (앱 번호와 별도로 배포마다 +1) |
| `manifest.webmanifest` | version 필드 없음 |
| `docs/CHANGELOG.md` 맨 위 | `## v302 — 2026.10.17` |
| Play `versionCode` | `15` (2026-10-16 아요 확인 · 처음에 12로 잘못 적었다가 정정 · 다음에 안드로이드 앱을 새로 올리면 16) |

> 이 표는 `/ship` 때마다 갱신한다. 값이 서로 다르면(앱 버전 ≠ CHANGELOG 맨 위) 배포가 덜 끝난 것이다.

### 이 프로젝트의 규칙 (2026-10-15 결정: vNNN 유지 · ADR-012)
- 버전은 정수 `vNNN` (v267 → v268). `1.4.2` 같은 소수점 방식은 쓰지 않는다.
- `/ship` 이 올리는 곳은 **두 곳 + CHANGELOG** 뿐이다:
  1. `index.html` `APP_VER` — `docs/CHANGELOG.md` 맨 위 `## vNNN` 과 **같은 번호**
  2. `sw.js` `VERSION` — `pma-v` 뒤 숫자만 +1 (앱 번호와 별개 카운터), 주석에 그때의 앱 버전을 적는다
- `manifest.webmanifest` 는 version 필드가 없어 건드리지 않는다.
- 안드로이드 앱(TWA)을 새로 올릴 때만 Play Console 의 `versionCode` 도 +1 한다. 웹 배포만 할 때는 필요 없다.
- 번호는 되돌릴 때도 내리지 않고 올린다 (3번 참고). 내리면 폰에 남은 예전 화면이 안 바뀐다.

## 2. 배포 절차 (`/ship` 이 자동으로 진행)
1. `git pull` → 저장 안 된 변경 확인
2. 자동 테스트 + 문법 검사
3. `privacy-guard` 점검 (🔴 있으면 중단)
4. `ui-checker` 점검 (보고만)
5. 버전 두 곳(`index.html`·`sw.js`) 갱신 + CHANGELOG 맨 위 작성
6. 사용자에게 **폰 수동 점검표**(TESTING.md 3번) 확인 요청
7. 커밋 `release: vNNN` (예: `release: v268`) → `main` push → GitHub Pages 반영(1~2분)
8. 폰에서 새 버전 번호 확인

## 3. 되돌리기
문제가 생기면: `git revert HEAD` → push. 버전은 다시 올린다(v267 → v268). 이전 번호로 내리면 캐시가 안 바뀐다.

## 4. 앱스토어 정보 보관함
| 항목 | 내용 |
|------|------|
| 앱 이름(스토어) | {확인 필요: 스토어 표기} (manifest: "아요바디요 - 체형·ROM·척추 균형 측정") |
| 패키지 이름 | `com.physiomaster.posture` — **절대 변경 금지** |
| 짧은 설명(80자) | {} |
| 긴 설명 | {} |
| 카테고리 | {확인 필요} (manifest: health, fitness, lifestyle) |
| 개인정보처리방침 URL | https://ayoajeyo.github.io/posture-check/privacy.html |
| 계정 삭제 안내 URL | https://ayoajeyo.github.io/posture-check/delete.html |
| 스크린샷 규격 | 폰 1080×1920 이상 2~8장, 태블릿은 선택 |
| 아이콘 | 512×512 PNG, 둥근 모서리 없이 |
| 테스트 계정 | {심사용 — 비밀번호는 여기 적지 않고 Play Console 에만} |
| 결제 | PRO 월 구독 `ayo_pro_monthly` (30일 체험) — 월 8,900원 |
| 서명 키 | {확인 필요: Play 앱 서명 사용 여부} |
| 직접 설치 APK | `PMA-posture.apk` (저장소 루트, download.html 에서 받음) |

## 5. 출시 전 최종 확인
- [ ] 개인정보처리방침 페이지가 실제로 열린다 (PRIVACY.md → `privacy.html`)
- [ ] 스토어 설명의 기능이 실제 앱과 같다
- [ ] 데이터 안전 섹션(Play Console)에 수집 항목이 DATA.md 와 같다
- [ ] 테스트 계정으로 핵심 흐름이 끝까지 된다
- [ ] `made by AYOAJEYO` 표기 확인
