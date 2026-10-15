---
description: 배포 — 점검 → 버전 4곳 갱신 → CHANGELOG → 폰 점검표 → push (RELEASE.md 절차)
argument-hint: [patch|minor|major — 비우면 변경 내용으로 추천]
---

`docs/RELEASE.md` 와 `pwa-release` 스킬 절차로 배포한다. 하나라도 실패하면 멈추고 이유와 해결책을 알린다.

버전 올림 종류: $ARGUMENTS

1. `git fetch` → 뒤처져 있으면 `git pull`. 저장 안 된 변경은 보여 주고 커밋 여부 확인.
2. `docs/PLANS/` 에 상태가 `승인됨`·`진행 중` 인 계획서가 있으면 보여 주고, 이번 배포에 포함되는지 확인한다(`초안` 은 승인 전이므로 배포에 들어가면 안 된다).
3. `node --check` 전체 js, 테스트(`package.json` 있으면 `npm test`).
4. `privacy-guard` — 🔴 있으면 **중단**.
5. `ui-checker` — 보고만.
6. 미출시 변경을 CHANGELOG 로 정리하고, 변경 내용으로 patch/minor/major 를 추천(입력이 있으면 그대로).
7. 버전 네 곳 갱신: `APP_VERSION`, `manifest.json`, `sw.js` `CACHE_VERSION`, `CHANGELOG.md`. 한 곳이라도 못 찾으면 어디에 넣을지 제안.
8. **사용자에게 폰 수동 점검표**(`docs/TESTING.md` 3번) 를 보여 주고 "확인했습니다" 를 받는다. 받기 전에는 push 하지 않는다.
9. 커밋 `release: v{버전}` → `git push`.
10. 결과: 배포 주소, 반영 대기 1~2분, "폰에서 앱을 완전히 닫았다가 열어 버전 v{버전} 을 확인하세요".

체크리스트 표(항목 | ✅/❌ | 비고)로 진행 상황을 보여 준다.
