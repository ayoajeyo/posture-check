// 리포트 차트 좌표·SVG — js/logic/report-charts.js
const test = require("node:test");
const assert = require("node:assert/strict");
const C = require("../js/logic/report-charts.js");

test("스파크라인: 빈 칸(null)에서 선이 끊긴다 — 세그먼트가 나뉘고 점은 빠진다", () => {
  const g = C.sparkGeom([58, null, 69, 74], { w: 160, h: 44 });
  assert.equal(g.segs.length, 2);
  assert.equal(g.segs[0].length, 1);          // 58 혼자
  assert.equal(g.segs[1].length, 2);          // 69 → 74
  assert.deepEqual(g.pts.map((p) => p.i), [0, 2, 3]);
  assert.equal(g.last.v, 74);
});

test("스파크라인: 값이 하나면 점 하나가 가운데", () => {
  const g = C.sparkGeom([58], { w: 160, h: 44 });
  assert.equal(g.pts.length, 1);
  assert.equal(g.pts[0].x, (4 + 150) / 2);
  assert.equal(g.segs.length, 1);
});

test("스파크라인: 한 축 — y 는 값이 클수록 위(작은 y), 기준선도 같은 축", () => {
  const g = C.sparkGeom([40, 100], { w: 160, h: 44, min: 40, max: 100, ref: 75 });
  assert.ok(g.pts[1].y < g.pts[0].y);
  assert.ok(g.refY > g.pts[1].y && g.refY < g.pts[0].y);
});

test("스파크라인: 범위 밖 값은 안으로 자르고, 기준선이 범위 밖이면 범위를 넓힌다", () => {
  const g = C.sparkGeom([120], { w: 160, h: 44, min: 40, max: 100 });
  assert.equal(g.pts[0].y, 6, "위쪽 여백(pt)까지만");
  const g2 = C.sparkGeom([50, 60], { ref: 75 });
  assert.equal(g2.max, 75);
});

test("스파크라인 SVG: 선·점·기준선이 들어가고 마지막 점이 크다", () => {
  const s = C.sparkSvg([58, 63, 69], { ref: 75, color: "#2B4FBF", labels: ["1차", "2차", "3차"] });
  assert.match(s, /^<svg /);
  assert.equal((s.match(/<circle /g) || []).length, 3);
  assert.match(s, /r="4\.5"/);
  assert.match(s, /stroke-dasharray/);
  assert.match(s, /data-tip="3차"/);
  assert.doesNotMatch(s, /<text/, "스파크라인에는 글자가 없다(축소돼도 13px 규칙을 안 깨게)");
});

test("스파크라인 SVG: 값이 하나면 선 없이 점만", () => {
  const s = C.sparkSvg([58]);
  assert.doesNotMatch(s, /<path/);
  assert.equal((s.match(/<circle /g) || []).length, 1);
});

test("아령: 정상 대비 % 를 가로 좌표로, a 가 없으면 점 하나", () => {
  const g = C.dumbbellGeom(71, 88, { w: 200, min: 40, max: 100 });
  assert.ok(g.xa < g.xb);
  assert.equal(C.dumbbellGeom(null, 88, { w: 200 }).xa, null);
  assert.equal(C.dumbbellGeom(0, 100, { w: 200, pl: 6, pr: 6 }).xa, 6, "범위 밖은 안으로");
  assert.equal(C.dumbbellGeom(0, 100, { w: 200, pl: 6, pr: 6 }).xb, 194);
});

test("아령 SVG: 좌측은 파랑, 우측은 청록, 첫 측정 점은 회색", () => {
  const L = C.dumbbellRowSvg({ a: 71, b: 88, side: "L" }), R = C.dumbbellRowSvg({ a: 71, b: 88, side: "R" });
  assert.match(L, /#2B4FBF/); assert.match(R, /#0E8F84/);
  assert.match(L, /#9AA3B2/);
  const one = C.dumbbellRowSvg({ a: null, b: 88, side: "L" });
  assert.doesNotMatch(one, /#9AA3B2/);
  assert.equal((one.match(/<circle /g) || []).length, 1);
});

test("상태색은 UI_GUIDE 값 그대로 (판정에만 쓴다)", () => {
  assert.equal(C.STATUS_COLOR.good, "#15803D");
  assert.equal(C.STATUS_COLOR.warn, "#B45309");
  assert.equal(C.STATUS_COLOR.crit, "#B91C1C");
});

// ---- v292 문서형 리포트 좌표 ----
test("trendGeom: 정상 띠·점·끊김이 축 범위 안에 놓인다", () => {
  const g = C.trendGeom({ values: [44, null, 52], min: 35, max: 65, ok: [55, 65] }, { w: 170, h: 92 });
  assert.equal(g.pts.length, 2); assert.equal(g.segs.length, 2, "가운데가 비면 선이 끊긴다");
  assert.ok(g.band[0] < g.band[1] && g.band[0] >= g.yMax && g.band[1] <= g.yMin, "띠는 위(65)에서 아래(55) 사이");
  assert.equal(g.last.v, 52); assert.equal(g.xs.length, 3);
});
test("divergingGeom: 좌는 가운데 왼쪽, 우는 오른쪽, 0 은 막대 없음", () => {
  const o = { w: 200, max: 4, t1: 1.5, t2: 3 };
  const L = C.divergingGeom({ v: 2, dir: -1 }, o), R = C.divergingGeom({ v: 2, dir: 1 }, o), Z = C.divergingGeom({ v: 0, dir: 0 }, o);
  assert.equal(L.xc, 100); assert.equal(L.barX, 50); assert.equal(L.barW, 50); assert.equal(R.barX, 100); assert.equal(R.barW, 50); assert.equal(Z.barW, 0);
  assert.deepEqual(L.band, [62.5, 137.5]);
});
test("romBarGeom·zoneGeom: % 와 구간이 폭에 비례하고 범위를 넘지 않는다", () => {
  const b = C.romBarGeom({ pct: 88, aPct: 120 }, { w: 300 });
  assert.equal(b.xb, 264); assert.equal(b.xa, 300, "100% 상한"); assert.deepEqual(b.ticks, [210, 270]);
  const z = C.zoneGeom({ min: 0, max: 12, zones: [{ from: 0, to: 5, cls: "good", label: "정상" }, { from: 5, to: 12, cls: "crit", label: "상담" }] }, 8, 4, { w: 120 });
  assert.deepEqual(z.zones.map((q) => [q.x0, q.x1]), [[0, 50], [50, 120]]); assert.equal(z.xa, 80); assert.equal(z.xb, 40);
});
