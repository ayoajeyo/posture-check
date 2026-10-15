---
description: 배포 후 문제가 생겼을 때 — 마지막 배포를 되돌리고 새 버전으로 다시 배포
argument-hint: [무엇이 잘못됐는지 한 줄]
---

마지막 배포(`release: v…` 커밋)를 안전하게 되돌린다. `git reset --hard` 나 강제 push 는 쓰지 않는다(기록이 남는 `revert` 만).

문제: $ARGUMENTS

1. `git log --oneline -10` 에서 마지막 `release:` 커밋과 그 이후 커밋을 보여 주고, 어디까지 되돌릴지 확인받는다. 보통 "마지막 release 이후 전부".
2. `git revert --no-edit <범위>` 로 되돌린다. 충돌이 나면 `git-two-pc` 스킬대로 쉬운 말로 설명하고 선택을 묻는다.
3. 버전을 **올린다**(patch). 이전 번호로 내리면 서비스워커 캐시가 안 바뀐다. `/ship` 의 6단계(네 곳 갱신)와 CHANGELOG 에 "### 수정 — v{이전} 의 {문제} 되돌림" 을 기록.
4. 테스트·`node --check` → `release: v{새 버전} (rollback)` 커밋 → push.
5. 결과: "1~2분 뒤 폰에서 앱을 완전히 닫았다가 열어 v{새 버전} 을 확인하세요." 그리고 되돌린 기능을 BACKLOG "지금" 에 "다시 만들기: {기능} — 원인: {문제}" 로 적는다.
