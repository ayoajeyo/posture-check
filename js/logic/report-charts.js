/* 리포트 "한눈에 보기" 차트 — 좌표 계산 + SVG 문자열 (화면을 모르는 순수 함수)
   화면(SVG)과 공유 이미지(캔버스)가 같은 좌표 함수를 쓰므로 수식이 한 곳에만 있다.
   브라우저: index.html 이 먼저 불러와 window.AYO_LOGIC 으로 씀 · Node: require (테스트: tests/report-charts.test.js)
   계열색: 좌측 #2B4FBF · 우측 #0E8F84 · 첫 측정 점 #9AA3B2 (색각 이상 검증 통과) · 단일 계열은 네이비 #1E2A4A (UI_GUIDE 포인트 색) */
(function(root){
  "use strict";
  var COLOR = { L: "#2B4FBF", R: "#0E8F84", C: "#1E2A4A", base: "#9AA3B2", ref: "#6B7280", grid: "#E5E7EB" };   // C = 단일 계열(KPI 추이) → 앱 포인트 색 네이비
  var STATUS = { good: "#15803D", warn: "#B45309", crit: "#B91C1C", "": "#6B7280" };
  var STATUS_BG = { good: "#ECFDF3", warn: "#FFF7E6", crit: "#FEF2F2", "": "#F3F4F6" };

  function sc(v, a, b, p0, p1){ return b === a ? (p0 + p1) / 2 : p0 + (v - a) / (b - a) * (p1 - p0); }
  function clamp(v, a, b){ return Math.max(a, Math.min(b, v)); }
  function esc(s){ return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;"); }
  function r1(x){ return Math.round(x * 10) / 10; }

  /* 스파크라인 좌표. values 에 null 이 있으면 선이 끊긴다(세그먼트가 나뉨).
     반환: { w, h, segs:[ [[x,y],…], … ], pts:[{x,y,v,i}], last:{x,y}|null, refY:number|null } */
  function sparkGeom(values, o){
    o = o || {};
    var w = o.w || 160, h = o.h || 44, pl = o.pl != null ? o.pl : 4, pr = o.pr != null ? o.pr : 10, pt = o.pt != null ? o.pt : 6, pb = o.pb != null ? o.pb : 6;
    var n = values.length, vs = values.filter(function(v){ return v != null; });
    var min = o.min != null ? o.min : (vs.length ? Math.min.apply(null, vs) : 0), max = o.max != null ? o.max : (vs.length ? Math.max.apply(null, vs) : 1);
    if(o.ref != null){ min = Math.min(min, o.ref); max = Math.max(max, o.ref); }
    if(max === min){ max = min + 1; }
    var x = function(i){ return n < 2 ? (pl + (w - pr)) / 2 : sc(i, 0, n - 1, pl, w - pr); };
    var y = function(v){ return sc(clamp(v, min, max), min, max, h - pb, pt); };
    var segs = [], cur = [], pts = [];
    values.forEach(function(v, i){
      if(v == null){ if(cur.length) segs.push(cur); cur = []; return; }
      var p = [r1(x(i)), r1(y(v))]; cur.push(p); pts.push({ x: p[0], y: p[1], v: v, i: i });
    });
    if(cur.length) segs.push(cur);
    return { w: w, h: h, segs: segs, pts: pts, last: pts.length ? pts[pts.length - 1] : null, refY: o.ref != null ? r1(y(o.ref)) : null, min: min, max: max };
  }

  /* 스파크라인 SVG 문자열. labels 가 있으면 점마다 data-tip 을 단다. */
  function sparkSvg(values, o){
    o = o || {};
    var g = sparkGeom(values, o), col = o.color || COLOR.C, ns = 'xmlns="http://www.w3.org/2000/svg"';
    var s = '<svg class="rd-spark" viewBox="0 0 ' + g.w + ' ' + g.h + '" ' + ns + ' aria-hidden="true" focusable="false">';
    if(g.refY != null) s += '<line x1="' + (o.pl != null ? o.pl : 4) + '" x2="' + (g.w - (o.pr != null ? o.pr : 10)) + '" y1="' + g.refY + '" y2="' + g.refY + '" stroke="' + COLOR.ref + '" stroke-width="1" stroke-dasharray="3 3"/>';
    g.segs.forEach(function(seg){
      if(seg.length < 2) return;
      s += '<path fill="none" stroke="' + col + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="' + seg.map(function(p, i){ return (i ? "L" : "M") + p[0] + "," + p[1]; }).join(" ") + '"/>';
    });
    g.pts.forEach(function(p){
      var last = g.last && p.i === g.last.i;
      s += '<circle cx="' + p.x + '" cy="' + p.y + '" r="' + (last ? 4.5 : 2.5) + '" fill="' + col + '" stroke="#fff" stroke-width="1.5"' + (o.labels ? ' data-tip="' + esc(o.labels[p.i] || "") + '"' : '') + '/>';
    });
    return s + '</svg>';
  }

  /* 아령 한 줄 좌표: 가로축 = 정상 대비 % (min~max). a 가 null 이면 점 하나. */
  function dumbbellGeom(a, b, o){
    o = o || {};
    var w = o.w || 200, min = o.min != null ? o.min : 40, max = o.max != null ? o.max : 100, pl = o.pl != null ? o.pl : 6, pr = o.pr != null ? o.pr : 6;
    var x = function(p){ return r1(sc(clamp(p, min, max), min, max, pl, w - pr)); };
    return { w: w, xa: a == null ? null : x(a), xb: x(b), ticks: [min, Math.round((min + max) / 2), max].map(x) };
  }
  function dumbbellRowSvg(row, o){
    o = o || {};
    var h = o.h || 24, g = dumbbellGeom(row.a, row.b, o), col = COLOR[row.side] || COLOR.C, cy = h / 2, ns = 'xmlns="http://www.w3.org/2000/svg"';
    var s = '<svg class="rd-db" viewBox="0 0 ' + g.w + ' ' + h + '" ' + ns + ' aria-hidden="true" focusable="false">';
    g.ticks.forEach(function(tx){ s += '<line x1="' + tx + '" x2="' + tx + '" y1="2" y2="' + (h - 2) + '" stroke="' + COLOR.grid + '" stroke-width="1"/>'; });
    if(g.xa != null){
      s += '<line x1="' + g.xa + '" x2="' + g.xb + '" y1="' + cy + '" y2="' + cy + '" stroke="' + col + '" stroke-width="2" stroke-linecap="round"/>';
      s += '<circle cx="' + g.xa + '" cy="' + cy + '" r="4" fill="' + COLOR.base + '" stroke="#fff" stroke-width="1.5"/>';
    }
    s += '<circle cx="' + g.xb + '" cy="' + cy + '" r="5.5" fill="' + col + '" stroke="#fff" stroke-width="1.5"/>';
    return s + '</svg>';
  }

  /* ===== 문서형 리포트(v292) 좌표 — 화면 SVG 와 공유 이미지 캔버스가 같이 쓴다 ===== */
  /* 02 회차별 변화: 작은 꺾은선. s = { values[], min, max, ok:[lo,hi] } */
  function trendGeom(s, o){
    o = o || {}; var w = o.w || 170, h = o.h || 92, pl = o.pl != null ? o.pl : 26, pr = o.pr != null ? o.pr : 30, pt = o.pt != null ? o.pt : 10, pb = o.pb != null ? o.pb : 6;
    var n = s.values.length, x = function(i){ return n < 2 ? (pl + w - pr) / 2 : sc(i, 0, n - 1, pl, w - pr); }, y = function(v){ return sc(clamp(v, s.min, s.max), s.min, s.max, h - pb, pt); };
    var segs = [], cur = [], pts = [];
    s.values.forEach(function(v, i){ if(v == null){ if(cur.length) segs.push(cur); cur = []; return; } var p = { x: r1(x(i)), y: r1(y(v)), v: v, i: i }; cur.push(p); pts.push(p); });
    if(cur.length) segs.push(cur);
    return { w: w, h: h, x0: pl, x1: w - pr, yMin: r1(y(s.min)), yMax: r1(y(s.max)), band: [r1(y(s.ok[1])), r1(y(s.ok[0]))], okY: r1(y(s.ok[0])), segs: segs, pts: pts, last: pts.length ? pts[pts.length - 1] : null, xs: s.values.map(function(v, i){ return r1(x(i)); }) };
  }
  /* 03 체형 정렬: 0 기준 양방향 막대 한 줄. row = { v, dir } · o = { w, max, t1, t2 } */
  function divergingGeom(row, o){
    var w = o.w || 200, X = function(v){ return r1(sc(clamp(v, -o.max, o.max), -o.max, o.max, 0, w)); }, v = row.v * (row.dir < 0 ? -1 : 1);
    return { w: w, xc: X(0), band: [X(-o.t1), X(o.t1)], t2: [X(-o.t2), X(o.t2)], barX: row.v > 0 ? Math.min(X(0), X(v)) : X(0), barW: row.v > 0 ? Math.abs(X(v) - X(0)) : 0, xv: X(v) };
  }
  /* 04 ROM: 정상 대비 % 막대. side = { pct, aPct } */
  function romBarGeom(side, o){
    var w = (o && o.w) || 300, X = function(p){ return r1(sc(clamp(p, 0, 100), 0, 100, 0, w)); };
    return { w: w, xb: X(side.pct), xa: side.aPct == null ? null : X(side.aPct), ticks: [X(70), X(90)] };
  }
  /* 05 구간 띠. spec = { min, max, zones:[{from,to,cls,label}] } */
  function zoneGeom(spec, prev, cur, o){
    var w = (o && o.w) || 340, X = function(v){ return r1(sc(clamp(v, spec.min, spec.max), spec.min, spec.max, 0, w)); };
    return { w: w, zones: spec.zones.map(function(z){ return { x0: X(z.from), x1: X(z.to), cls: z.cls, label: z.label, from: z.from, to: z.to }; }), xa: prev == null ? null : X(prev), xb: X(cur) };
  }

  var api = { CHART_COLOR: COLOR, STATUS_COLOR: STATUS, STATUS_BG: STATUS_BG, sparkGeom: sparkGeom, sparkSvg: sparkSvg, dumbbellGeom: dumbbellGeom, dumbbellRowSvg: dumbbellRowSvg,
              trendGeom: trendGeom, divergingGeom: divergingGeom, romBarGeom: romBarGeom, zoneGeom: zoneGeom };
  if(typeof module !== "undefined" && module.exports) module.exports = api;
  else root.AYO_LOGIC = Object.assign(root.AYO_LOGIC || {}, api);
})(this);
