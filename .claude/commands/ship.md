---
description: 배포 — 점검 → 버전 2곳 갱신 → CHANGELOG → 폰 점검표 → push (RELEASE.md 절차)
argument-hint: [비워 둔다 — 버전은 vNNN 정수로 자동 +1]
---

`docs/RELEASE.md` 와 `pwa-release` 스킬 절차로 배포한다. 하나라도 실패하면 멈추고 이유와 해결책을 알린다.

사용자 메모: $ARGUMENTS

1. `git fetch` → 뒤처져 있으면 `git pull`. 저장 안 된 변경은 보여 주고 커밋 여부 확인.
2. `docs/PLANS/` 에 상태가 `승인됨`·`진행 중` 인 계획서가 있으면 보여 주고, 이번 배포에 포함되는지 확인한다(`초안` 은 승인 전이므로 배포에 들어가면 안 된다).
3. `node --check` 전체 js, 테스트(`package.json` 있으면 `npm test`).
4. `privacy-guard` — 🔴 있으면 **중단**.
5. `ui-checker` — 보고만.
6. 미출시 변경을 CHANGELOG 로 정리한다. 새 버전 번호는 지금 `APP_VER` 의 다음 정수(v267 → v268).
7. 버전 두 곳 갱신 (`docs/RELEASE.md` 1번):
   - `index.html` 의 `APP_VER` = `docs/CHANGELOG.md` 맨 위 `## vNNN` — **같은 번호**
   - `sw.js` 의 `VERSION` = `pma-v` 뒤 숫자만 +1 (앱 번호와 별개 카운터), 주석에 그때의 앱 버전을 적는다
   - `manifest.webmanifest` 는 version 칸이 없어 건드리지 않는다. 한 곳이라도 못 찾으면 멈추고 알린다.
8. **사용자에게 폰 수동 점검표**(`docs/TESTING.md` 3번) 를 보여 주고 "확인했습니다" 를 받는다. 받기 전에는 push 하지 않는다.
9. 커밋 `release: v{버전}` → `git push`.
10. 결과: 배포 주소, 반영 대기 1~2분, "폰에서 앱을 완전히 닫았다가 열어 버전 v{버전} 을 확인하세요".

체크리스트 표(항목 | ✅/❌ | 비고)로 진행 상황을 보여 준다.
