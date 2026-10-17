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
| 서비스워커(sw.js) | 오프라인·캐시를 담당하는 파일. 버전을 올려야 새 화면이 보임 | `VERSION`(`pma-vNNN`) |
| localStorage / IndexedDB | 폰 브라우저 안의 작은 저장 공간 / 큰 저장 공간 | 설정 / 사진 |
| Supabase | 로그인·DB·파일 저장을 빌려주는 서비스 | 서버가 필요할 때 |
| RLS | DB 에서 "자기 데이터만 보게" 하는 잠금 | Supabase 테이블 |
| anon 키 / service_role 키 | 공개해도 되는 키 / 절대 공개하면 안 되는 키 | `js/config.js` / `.env` |
| `.env` | 비밀키를 넣는 파일. GitHub 에 올라가지 않음 | `.gitignore` |
| 훅(hook) | 특정 순간(파일 저장 전 등)에 자동 실행되는 검사 | `.claude/hooks/` |
| 에이전트 | 특정 역할(검토·테스트)만 맡는 보조 AI | `.claude/agents/` |
| 스킬 | AI 가 필요할 때 꺼내 보는 노하우 문서 | `.claude/skills/` |
| 디자인 토큰 | 색·글자 크기·여백 같은 디자인 값을 이름 붙여 한 곳에 모은 것 (`--ink` = 네이비) | `design-system/tokens.css` |
| 견본(스타일가이드) | 버튼·카드·입력칸 같은 모양을 한 페이지에 모아 둔 표본. 새 화면은 여기서 복사 | `design-system/styleguide.html` |
| 시안 | 실제로 만들기 전에 보여 주는 화면 후보. 2~3개를 비교해 고른다 | `/design`, `design/` 폴더 |
| 화면 캡처 | 브라우저로 폰 크기 화면을 사진으로 찍는 것. AI 가 사진을 보고 판단 | `scripts/screenshot.py`, `.shots/` |
| 취향 기록 | 사용자가 디자인에 대해 한 말을 쌓아 두는 문서 | `docs/TASTE.md` |
| Pretendard | 한글·영문·숫자가 고르게 예쁜 무료 글꼴. 모든 앱 기본 | UI_GUIDE 3번 |
| 슬래시 명령(`/start`) | Claude Code 대화창에서 정해진 절차를 실행하는 단축키 | `.claude/commands/` |
| step / phase | 실행기가 한 번에 시키는 작업 단위 / 그 묶음 | `phases/` |
| AC(완료 기준) | "이 명령이 통과하면 끝" 이라고 정한 검사 | `npm test` |
| TDD | 테스트를 먼저 쓰고 코드를 나중에 쓰는 방식 | `js/logic/` |
| lint | 코드 모양·실수를 자동으로 지적하는 검사 | Stop 훅 |
| ADR | 설계 결정을 "왜" 와 함께 적은 기록 | `docs/ADR.md` |

## 이 앱의 말 (도메인 용어)
> 이 앱에서만 쓰는 말의 정확한 뜻. `/grill-with-docs` 와 `/improve-codebase-architecture` 가 대화 중에 채운다. 형식: `- **용어**: 1~2문장 정의. _피할 말_: 비슷하지만 쓰지 않는 말`

(아직 없음)
