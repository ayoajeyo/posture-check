---
name: pwa-release
description: PWA 설치(manifest·서비스워커·캐시 버전), GitHub Pages 배포, 안드로이드 앱(TWA/PWABuilder)으로 Google Play 에 올리는 절차와 버전 관리. /ship, 첫 배포, 스토어 등록, "폰에 예전 화면이 남아요" 문제에 사용한다.
---

# PWA 배포와 스토어 출시

## manifest.json 최소
```json
{ "name": "{앱 이름}", "short_name": "{짧은 이름}", "start_url": "./?source=pwa", "scope": "./",
  "display": "standalone", "background_color": "#F7F7F5", "theme_color": "#1E2A4A", "lang": "ko",
  "version": "1.0.0",
  "icons": [{ "src": "icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
            { "src": "icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any maskable" }] }
```
`<link rel="manifest" href="manifest.json">`, `<meta name="theme-color" content="#1E2A4A">`, iOS 용 `<link rel="apple-touch-icon" href="icons/icon-192.png">`.

## 서비스워커 (버전이 핵심)
```js
const CACHE_VERSION = "v1.0.0";           // ← 배포마다 올린다 (APP_VERSION 과 동일)
const ASSETS = ["./", "./index.html", "./css/style.css", "./js/app.js", "./manifest.json"];
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE_VERSION).then(c => c.addAll(ASSETS))); self.skipWaiting(); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k))))); self.clients.claim(); });
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET" || !e.request.url.startsWith(self.location.origin)) return; // Supabase 등 외부는 캐시 안 함
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});
```
앱에서 새 버전 감지 → "새 버전이 있습니다 [새로고침]" 토스트: `registration.addEventListener("updatefound", …)`.

## 버전 네 곳 (RELEASE.md)
`APP_VERSION`(js) = `manifest.version` = `CACHE_VERSION`(sw.js) = CHANGELOG 맨 위. `/ship` 이 한 번에 올린다. 화면 하단 "v1.0.0 · made by AYOAJEYO" 로 표시해 폰에서 확인.

## GitHub Pages
- 저장소 Settings → Pages → Branch `main` / root. 주소 `https://{계정}.github.io/{저장소}/`.
- 경로는 **상대경로**(`./css/…`)만. `/css/…` 로 쓰면 하위 경로에서 깨진다.
- 반영까지 1~2분. 확인: 시크릿 창에서 열어 버전 번호.
- 커스텀 도메인은 `CNAME` 파일 + DNS. HTTPS 자동.

## Google Play 에 올리기 (TWA)
1. PWABuilder(pwabuilder.com) 에 주소 입력 → Android 패키지 생성. **패키지 이름은 처음 정한 것 고정**(바꾸면 다른 앱으로 취급).
2. 다운로드한 zip 의 `assetlinks.json` 을 저장소 `.well-known/assetlinks.json` 에 올린다 → 주소창 없이 열림.
3. Play Console: 앱 만들기 → 내부 테스트 → `.aab` 업로드 → 스토어 등록정보(RELEASE.md 4번) → 데이터 안전(DATA.md 기준) → 개인정보처리방침 URL.
4. 다음 업데이트: 웹만 바꾸면 **앱 재업로드 불필요**(TWA 는 웹을 보여 줌). 아이콘·이름·패키지 변경 때만 `.aab` 재생성 + `versionCode` +1.
5. 결제(구독)는 Play Billing — TWA 에서는 Digital Goods API 필요. 별도 ADR 로 결정.

## iOS
App Store 는 TWA 불가. 홈 화면 추가(사파리 공유 → 홈 화면에 추가)로 배포하거나, 네이티브 래퍼(Capacitor) + Mac 필요. 별도 ADR.

## "예전 화면이 남아요"
1. `CACHE_VERSION` 올렸는지 → 2. 사용자 폰: 앱 완전 종료 후 다시 열기 → 3. 그래도면 설정 → 사이트 데이터 삭제. `/ship` 이 1번을 강제한다.
