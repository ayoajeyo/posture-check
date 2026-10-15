# 용어집 (코딩 초보자용)

| 용어 | 뜻 | 이 틀에서 어디에 나오나 |
|------|----|-----------------------|
| 저장소(리포지토리) | 프로젝트 파일과 변경 기록을 담는 폴더. GitHub 에 올라간 사본도 저장소 | `git clone`, GitHub |
| 커밋 | "여기까지 저장" 하는 기록. 메시지를 붙인다 | `git commit`, `/ship` |
| push / pull | 내 PC → GitHub 로 올리기 / GitHub → 내 PC 로 받기 | 병원·집 PC 오갈 때 |
| 브랜치 | 작업을 갈라서 하는 줄기. `main` 이 기본 줄기 | 실행기가 `feat-…` 브랜치를 만듦 |
| 충돌(conflict) | 두 PC 에서 같은 줄을 다르게 고쳐 git 이 못 합치는 상태 | `/sync` 가 풀어 준다 |
| 배포 | 사용자가 실제로 쓰는 곳에 올리기. 여기선 `main` 에 push | `/ship` |
| PWA | 폰 홈 화면에 앱처럼 추가되는 웹사이트 | `manifest.json`, `sw.js` |
| 서비스워커(sw.js) | 오프라인·캐시를 담당하는 파일. 버전을 올려야 새 화면이 보임 | `CACHE_VERSION` |
| localStorage / IndexedDB | 폰 브라우저 안의 작은 저장 공간 / 큰 저장 공간 | 설정 / 사진 |
| Supabase | 로그인·DB·파일 저장을 빌려주는 서비스 | 서버가 필요할 때 |
| RLS | DB 에서 "자기 데이터만 보게" 하는 잠금 | Supabase 테이블 |
| anon 키 / service_role 키 | 공개해도 되는 키 / 절대 공개하면 안 되는 키 | `js/config.js` / `.env` |
| `.env` | 비밀키를 넣는 파일. GitHub 에 올라가지 않음 | `.gitignore` |
| 훅(hook) | 특정 순간(파일 저장 전 등)에 자동 실행되는 검사 | `.claude/hooks/` |
| 에이전트 | 특정 역할(검토·테스트)만 맡는 보조 AI | `.claude/agents/` |
| 스킬 | AI 가 필요할 때 꺼내 보는 노하우 문서 | `.claude/skills/` |
| 슬래시 명령(`/start`) | Claude Code 대화창에서 정해진 절차를 실행하는 단축키 | `.claude/commands/` |
| step / phase | 실행기가 한 번에 시키는 작업 단위 / 그 묶음 | `phases/` |
| AC(완료 기준) | "이 명령이 통과하면 끝" 이라고 정한 검사 | `npm test` |
| TDD | 테스트를 먼저 쓰고 코드를 나중에 쓰는 방식 | `js/logic/` |
| lint | 코드 모양·실수를 자동으로 지적하는 검사 | Stop 훅 |
| ADR | 설계 결정을 "왜" 와 함께 적은 기록 | `docs/ADR.md` |
