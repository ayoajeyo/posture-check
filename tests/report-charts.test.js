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
