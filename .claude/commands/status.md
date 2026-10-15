---
description: 지금 프로젝트 현황 — 진행 단계, 저장 안 된 변경, 다른 PC 와의 동기화, 미출시 변경, 문서 빈칸
---

현황을 초보자가 한눈에 보게 정리한다. 아무것도 수정하지 않는다.

확인:
1. `git status` / `git fetch` 후 `git status -sb` — 미커밋, push 필요(ahead), pull 필요(behind).
2. `phases/*/index.json` — 실행기 단계 상태(없으면 "없음").
3. `docs/CHANGELOG.md` 맨 위가 "미출시" 인지 → 배포 대기 변경.
4. `CLAUDE.md`, `docs/PRD.md`, `docs/DATA.md` 의 `{ }` 빈칸 개수.
5. `docs/BACKLOG.md` "지금" 항목 수.
6. 버전이 맞는지 — `index.html` 의 `APP_VER` 와 `docs/CHANGELOG.md` 맨 위 `## vNNN` 이 같은 번호인지, `sw.js` 의 `VERSION`(`pma-v…`) 주석이 그 버전을 가리키는지.
7. `docs/PLANS/*.md` 의 `상태:` 줄 — 초안(승인 대기)·승인됨·진행 중 계획을 목록으로(없으면 "없음"). 승인 대기 계획이 있으면 "지금 바로 할 일" 후보.

출력:
| 항목 | 상태 | 할 일 |
|------|------|------|
표 아래 "지금 바로 할 일" 1가지.
