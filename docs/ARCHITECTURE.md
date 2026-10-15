# 아키텍처: {프로젝트명}

> "**어떻게** 짜여 있나"를 적는다. 새 파일을 어디에 둘지, 데이터가 어디로 흐르는지 헷갈릴 때 이 문서가 답이어야 한다.
> 기본값은 `mobile-webapp` 스킬의 구성이다. 다르게 할 부분만 고친다.

## 1. 한눈에 보기
```
[폰 브라우저 / 홈 화면 앱]
   │  index.html + css + js (빌드 없음)
   │
   ├─ 기기 저장: localStorage(설정·소량) / IndexedDB(사진·기록)
   │
   └─ (필요할 때만) Supabase ── Auth(로그인) · DB(Postgres+RLS) · Storage(사진, 비공개)
         │
         └─ GitHub Pages 가 index.html 을 배포 (push = 배포)
```
{이 프로젝트가 다르면 여기 그림을 고친다}

## 2. 디렉토리 구조
```
index.html            # 첫 화면. 다른 화면은 섹션 전환 또는 pages/*.html
manifest.json         # 앱 이름·아이콘·테마색 (#1E2A4A)
sw.js                 # 오프라인 캐시. CACHE_VERSION 을 배포마다 올린다
css/style.css         # clean-ui 변수로 시작
js/app.js             # 화면 동작(이벤트·렌더링)만. 계산은 넣지 않는다
js/logic/*.js         # 순수 계산·변환 (화면을 모름, 테스트 대상)
js/store.js           # 저장소 접근 (localStorage/IndexedDB/Supabase 를 여기서만 호출)
js/report.js          # 리포트(A4) 생성
tests/*.test.js       # node --test
icons/                # 192·512px
docs/                 # 이 문서들
.claude/              # 하네스 도구
```
규칙: **화면(app.js) → 저장소(store.js) → 외부(Supabase)** 방향으로만 부른다. 거꾸로 부르지 않는다.

## 3. 데이터 흐름
```
{예:
사용자 입력 → app.js(검증) → logic/(계산) → store.js(저장) → app.js(화면 갱신)
사진 촬영 → canvas 축소(1600px) → IndexedDB → (동기화 켜짐) Supabase Storage(비공개 버킷)
리포트 → report.js → window.print() → A4 PDF}
```

## 4. 저장소 표
| 데이터 | 어디에 | 민감도 | 보관 기간 | 지울 때 |
|--------|--------|--------|----------|---------|
| {회원 기본 정보} | {IndexedDB / Supabase 테이블 members} | 높음 | {회원 삭제 시까지} | {사진·측정 기록도 같이 삭제} |
| {측정 사진} | {IndexedDB / Storage photos/} | 매우 높음 | | |
| {앱 설정} | localStorage | 낮음 | | |
자세한 필드는 `DATA.md`.

## 5. 외부 서비스
| 서비스 | 용도 | 키 종류 | 키 위치 |
|--------|------|---------|---------|
| GitHub Pages | 배포 | 없음 | — |
| {Supabase} | {로그인·DB·사진} | anon 키(공개용) | `js/config.js` |
| | | service_role(비밀) | **코드에 넣지 않음**. 서버 함수·.env 에만 |

## 6. 오프라인과 동기화
- 오프라인에서도 {측정·저장}은 된다. {공유·로그인}은 온라인 필요.
- 충돌 규칙: {예: 같은 회원을 두 기기에서 고치면 마지막 저장이 이김. 사진은 덮어쓰지 않고 추가}
- 서비스워커 캐시: `CACHE_VERSION` 을 올리면 다음 실행 때 새 파일로 교체.

## 7. 보안 경계
- 브라우저 코드는 **누구나 볼 수 있다**. 비밀은 넣지 않는다.
- Supabase 를 쓰면: 모든 테이블 RLS 켬, 사진 버킷 비공개 + 서명 URL(짧은 만료), 로그인한 본인 데이터만 읽기·쓰기.
- 공유 링크는 추측 불가능한 ID(UUID) 를 쓴다.

## 8. 버전과 배포
- 버전 표기: `APP_VERSION`(js) = `manifest.json` version = `sw.js` CACHE_VERSION = 변경 이력(CHANGELOG.md) 맨 위 항목. 네 곳이 항상 같다.
- 배포 = `main` 에 push. 되돌리기 = 이전 커밋으로 `git revert` 후 push.
- 자세한 절차는 `RELEASE.md`.

## 9. 설계 패턴
- 화면 상태는 `state` 객체 하나에 모으고, 바뀌면 `render()` 한 번으로 그린다.
- 긴 작업(사진 처리·업로드)은 진행 표시를 보여주고, 실패하면 사용자가 다시 시도할 수 있게 한다.
- 함수는 한 가지 일만. 50줄을 넘으면 쪼갠다.
