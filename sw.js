/* AYO체형분석 — 서비스워커
   - 화면(index.html): 네트워크 우선 → GitHub에 올린 최신 버전이 바로 반영되고, 인터넷이 끊기면 저장본으로 열림
   - 인식 모델·라이브러리(MediaPipe)·글꼴: 한 번 받으면 폰에 저장해 두고 재사용 → 두 번째부터 빠르고 오프라인에서도 동작 */
const VERSION = "pma-v105";
const SHELL = "pma-shell-" + VERSION;
const ASSETS = "pma-assets-v1";   // 모델 파일은 버전과 무관하게 유지(약 25MB 재다운로드 방지)
const SHELL_FILES = ["./", "./index.html", "./manifest.webmanifest",
  "./icons/icon-192.png", "./icons/icon-512.png", "./icons/icon-maskable-512.png", "./icons/apple-touch-icon.png",
  // v126 체형분석 측정가이드 사진(예전엔 index.html 안에 있었음 → 오프라인에서도 보이게 미리 저장)
  "./guide/body/front_1.jpg", "./guide/body/front_2.jpg", "./guide/body/front_3.jpg", "./guide/body/front_4.jpg",
  "./guide/body/side_1.jpg", "./guide/body/side_2.jpg", "./guide/body/side_3.jpg", "./guide/body/side_4.jpg"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(SHELL).then((c) => c.addAll(SHELL_FILES)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((k) => k.startsWith("pma-shell-") && k !== SHELL).map((k) => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

function isAsset(url){
  return url.hostname === "cdn.jsdelivr.net" ||
         (url.hostname === "storage.googleapis.com" && url.pathname.startsWith("/mediapipe-models/")) ||
         url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com";
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if(req.method !== "GET") return;
  const url = new URL(req.url);

  // 인식 모델·라이브러리·글꼴: 저장본 우선
  if(isAsset(url)){
    e.respondWith(caches.open(ASSETS).then(async (c) => {
      const hit = await c.match(req);
      if(hit) return hit;
      const res = await fetch(req);
      if(res && (res.ok || res.type === "opaque")) c.put(req, res.clone());
      return res;
    }));
    return;
  }

  // 같은 사이트의 화면·파일: 네트워크 우선, 실패하면 저장본
  //  v123: 앱 화면은 4초 안에 응답이 없으면(약한 와이파이) 저장본으로 먼저 열고, 받아지면 다음 실행부터 반영
  if(url.origin === self.location.origin){
    const fallback = async () => {
      const hit = await caches.match(req, { ignoreSearch: true });
      if(hit) return hit;
      if(req.mode === "navigate") return caches.match("./index.html");
      return Response.error();
    };
    // v134 앱 화면은 브라우저 임시저장(최대 10분)도 건너뛰고 항상 최신본 확인
    const net = fetch(req.mode === "navigate" ? new Request(req.url, { cache: "no-cache", credentials: "same-origin" }) : req).then((res) => {
      if(res && res.ok){ const copy = res.clone(); caches.open(SHELL).then((c) => c.put(req, copy)); }
      return res;
    });
    if(req.mode !== "navigate"){ e.respondWith(net.catch(fallback)); return; }
    e.respondWith(new Promise((resolve) => {
      let done = false;
      const finish = (r) => { if(!done){ done = true; resolve(r); } };
      const t = setTimeout(async () => {
        const hit = await caches.match(req, { ignoreSearch: true }) || await caches.match("./index.html");
        if(hit) finish(hit);
      }, 4000);
      net.then((r) => { clearTimeout(t); finish(r); }).catch(async () => { clearTimeout(t); finish(await fallback()); });
    }));
    e.waitUntil(net.catch(() => {}));
  }
});
