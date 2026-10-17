/* 리포트 좌·우 사진의 몸 크기 맞추기 — 계산만 (화면·캔버스를 모름)
   우측 사진은 그대로 두고, 좌측 사진만 우측의 몸 크기에 맞춰 확대·축소한다 (2026-10-18 아요 결정).
   원본 사진·측정점은 읽기만 한다 — 리포트가 그릴 때 쓰는 임시 그림에만 적용.
   브라우저: index.html 이 먼저 불러와 window.AYO_LOGIC 으로 씀 · Node: require (테스트: tests/report-pair.test.js) */
(function(root){
  "use strict";

  var REF = { vup: 1, vdown: 1, hz: 1, hzside: 1, hzfwd: 1, hzfoot: 1, shperp: 1 };   // 화면 기준선 끝 — 몸이 아님
  var MAX = 1.6, MIN_DIFF = 0.05;   // 1.6배까지만(넘으면 잘못 잰 것으로 보고 그대로) · 5% 미만 차이는 그대로 (아요 답 3)

  function isBody(names, i){ return names && names[i] && !REF[names[i]]; }
  function len(a, b){ return Math.hypot(a.x - b.x, a.y - b.y); }

  /* 사진 속 몸 길이 — 3점 동작은 꼭짓점–①선 끝 + 꼭짓점–②선 끝, 4점 동작은 ①선 + ②선. 몸이 아닌 점이 낀 선은 뺀다 */
  function pairBodySize(pts, names){
    if(!pts || !names) return null;
    var segs = names.length >= 4 ? [[0, 1], [2, 3]] : [[0, 1], [0, 2]], sum = 0;
    for(var i = 0; i < segs.length; i++){
      var a = segs[i][0], b = segs[i][1];
      if(!isBody(names, a) || !isBody(names, b)) continue;
      if(!pts[a] || !pts[b]) return null;
      sum += len(pts[a], pts[b]);
    }
    return sum > 0 ? sum : null;
  }

  /* v313 몸통 길이 — 자세 인식 결과 L(원본 좌표, v = 확신도)에서 어깨 가운데(11·12) → 골반 가운데(23·24).
     움직이는 팔·다리는 카메라 쪽으로 기울면 짧아 보여 몸 크기 기준으로 믿을 수 없다(v312 어깨 굴곡·외전).
     네 점이 모두 확실(0.5 이상)하고 사진 안에 있을 때만 — 아니면 null (측정점 방식으로) */
  function pairTorso(L, W, H){
    if(!L) return null;
    var ok = function(p){ return p && p.v >= 0.5 && p.x >= 0 && p.y >= 0 && p.x <= W && p.y <= H; };
    var s1 = L[11], s2 = L[12], h1 = L[23], h2 = L[24];
    if(!ok(s1) || !ok(s2) || !ok(h1) || !ok(h2)) return null;
    var d = Math.hypot((s1.x + s2.x - h1.x - h2.x) / 2, (s1.y + s2.y - h1.y - h2.y) / 2);
    if(d < Math.max(W, H) * 0.05) return null;
    // 허리 아래가 사진 밖이면 골반을 어깨 옆에 '추측' 해 찍기도 한다(확신도는 높게) → 몸통이 귀→어깨 길이의 1.5배보다 짧으면 버림 (보통 2.5~3배)
    var ears = [L[7], L[8]].filter(ok);
    if(ears.length){
      var ex = ears.reduce(function(a, p){ return a + p.x; }, 0) / ears.length, ey = ears.reduce(function(a, p){ return a + p.y; }, 0) / ears.length;
      if(d < 1.5 * Math.hypot(ex - (s1.x + s2.x) / 2, ey - (s1.y + s2.y) / 2)) return null;
    }
    return d;
  }

  /* 확대할 때 가운데로 둘 곳 — 몸 측정점들의 가운데 */
  function pairAnchor(pts, names){
    var xs = 0, ys = 0, n = 0;
    (pts || []).forEach(function(p, i){ if(p && isBody(names, i)){ xs += p.x; ys += p.y; n++; } });
    return n ? { x: xs / n, y: ys / n } : null;
  }

  /* 좌측 배율 — L·R = { size: 원본 속 몸 길이, w: 원본 폭, cw·ch: 리포트 그림 폭·높이 }
     리포트 칸은 3:4 로 꽉 채워(넘치는 쪽은 잘림) 보이므로, 넓은 그림은 칸 높이에 맞춰 더 크게 보인다 → 그만큼 계산 */
  function shown(s){ return s.size / s.w * Math.max(1, (4 * s.cw) / (3 * s.ch)); }
  function pairZoom(L, R){
    if(!L || !R || !(L.size > 0) || !(R.size > 0) || !(L.w > 0) || !(R.w > 0) || !(L.cw > 0) || !(L.ch > 0) || !(R.cw > 0) || !(R.ch > 0)) return 1;
    var z = shown(R) / shown(L);
    if(Math.abs(z - 1) < MIN_DIFF) return 1;
    if(z > MAX + 1e-9 || z < 1 / MAX - 1e-9) return 1;   // v313 1.6배를 넘는 차이는 촬영 거리로 생길 수 없음 → 잘못 잰 것으로 보고 맞추지 않음 (잘라서 적용하면 엉뚱하게 커짐)
    return z;
  }

  /* 원본 좌표에서 보여 줄 영역 — 확대(z>1)는 기준점을 가운데로 하되 사진 밖으로 나가지 않게, 축소(z<1)는 사진을 가운데에 두고 둘레가 생김 */
  function pairView(W, H, z, ax, ay){
    if(!(z > 0) || z === 1) return { x0: 0, y0: 0, vw: W, vh: H };
    var vw = W / z, vh = H / z;
    if(z < 1) return { x0: (W - vw) / 2, y0: (H - vh) / 2, vw: vw, vh: vh };
    var cl = function(v, hi){ return Math.max(0, Math.min(hi, v)); };
    return { x0: cl((ax == null ? W / 2 : ax) - vw / 2, W - vw), y0: cl((ay == null ? H / 2 : ay) - vh / 2, H - vh), vw: vw, vh: vh };
  }

  var api = { pairBodySize: pairBodySize, pairTorso: pairTorso, pairAnchor: pairAnchor, pairZoom: pairZoom, pairView: pairView, PAIR_MAX: MAX };
  if(typeof module !== "undefined" && module.exports) module.exports = api;
  else root.AYO_LOGIC = Object.assign(root.AYO_LOGIC || {}, api);
})(this);
