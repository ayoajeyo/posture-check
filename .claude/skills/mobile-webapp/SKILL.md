---
name: mobile-webapp
description: 폰에서 쓰는 웹앱(PWA)을 만들 때의 기본 기술 스택과 구조 — HTML/CSS/JS, GitHub Pages 배포, 필요하면 Supabase. 새 프로젝트의 기술 스택을 정하거나(/start), 앱 설치·오프라인·버전 갱신·사진 저장을 다룰 때 사용한다.
---

# 모바일 웹앱 기본 스택

사용자가 다른 스택을 정하지 않았다면 이 구성을 기본으로 쓴다. 목표는 **설치 없이 링크로 열리고, 폰 홈 화면에 앱처럼 추가되는 것**이다.

## 기본 구성
| 항목 | 기본값 | 이유 |
|------|--------|------|
| 화면 | HTML + CSS + 순수 JavaScript (빌드 도구 없음) | 초보자가 파일을 직접 열어 이해하기 쉽고, 빌드 실패가 없다 |
| 배포 | GitHub Pages | 무료, `git push`만 하면 반영 |
| 앱 설치 | `manifest.json` + `sw.js`(서비스워커) | 홈 화면 추가, 오프라인 실행 |
| 기기 저장 | 설정·작은 데이터는 `localStorage`, 사진은 `IndexedDB` | localStorage는 5MB 정도라 사진을 넣으면 꽉 찬다 |
| 서버(필요할 때만) | Supabase (로그인 + DB + 사진 저장소) | 여러 기기·여러 사람이 같은 데이터를 볼 때 |
| 테스트 | 계산·변환 로직을 `js/` 파일로 분리하고 `node --test`로 검사 | 화면 없이 빠르게 확인 가능 (Node 필요: `winget install OpenJS.NodeJS.LTS`) |

## 폴더 구조
```
index.html          # 첫 화면
manifest.json       # 앱 이름, 아이콘, 테마색
sw.js               # 오프라인 캐시 (CACHE_VERSION 포함)
css/style.css       # clean-ui 스킬의 CSS 변수로 시작
js/app.js           # 화면 동작
js/logic/*.js       # 계산 로직 (테스트 대상)
tests/*.test.js     # node --test 용
icons/              # 192px, 512px 아이콘
```

## 꼭 지킬 것
- **버전 갱신**: 배포할 때마다 `sw.js`의 캐시 버전을 올린다. 안 올리면 사용자 폰에 이전 화면이 남는다.
  - 위 구조와 이름(`manifest.json`·`CACHE_VERSION`)은 **새 프로젝트용 일반 예시**다. 아요바디요에서는 `index.html` 의 `APP_VER` 와 `sw.js` 의 `VERSION`(`pma-vNNN`), `manifest.webmanifest` 를 쓴다 (ADR-012 · `docs/RELEASE.md` 1번).
- **Supabase 키**: 화면 코드에는 anon(publishable) 키만 넣는다. service_role 키는 절대 넣지 않는다. 모든 테이블에 RLS를 켠다.
- **사진**: 업로드 전 긴 변을 1600px 정도로 줄여 저장 공간을 아낀다. 민감한 사진은 비공개 버킷 + 서명된 URL로 연다.
- **카메라·위치**: HTTPS(GitHub Pages는 기본 HTTPS)에서만 동작한다. 권한 거부 시 안내 문구를 보여준다.
- **인쇄용 리포트**: A4 여러 장으로 나뉘게 `@media print`와 `page-break-*`를 쓴다. 긴 이미지 한 장으로 만들지 않는다.

## package.json (테스트를 쓸 때만)
Stop 훅이 `lint → build → test`를 실행하므로 세 개 모두 있어야 한다.
```json
{ "scripts": { "lint": "echo no-lint", "build": "echo no-build", "test": "node --test tests/" } }
```
