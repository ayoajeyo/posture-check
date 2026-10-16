// 보조선 방식 각도 계산 — index.html 의 romAuxGeo 를 그대로 꺼내 실행
// v273 목(굴곡·신전·측방굴곡)은 기준 0°(바르게 선 자세), 발목은 기준 90°(정강이⊥발바닥)
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
const grab = (start, end) => {
  const i = html.indexOf(start), j = html.indexOf(end, i);
  assert.ok(i >= 0 && j > i, "index.html 에서 못 찾음: " + start);
  return html.slice(i, j);
};

const ctx = { MV: null, romMove: () => ctx.MV };
vm.createContext(ctx);
vm.runInContext(grab("  function romAuxGeo(P){", "  function romAuxPaint("), ctx);
const geo = (mv, P) => { ctx.MV = mv; return vm.runInContext("romAuxGeo", ctx)(P); };

const NECK = { sgn: 1, off: 0 };                 // 목: 바르게 선 자세가 0°
const ANKLE_D = { sgn: -1, off: 90 };            // 발목 배측굴곡
const P = (x, y) => ({ x, y });
// ①선 = 목관절(100,400) → 세로 기준선(100,0) = 화면 위쪽
const V1 = [P(100, 400), P(100, 0)];

test("목: 얼굴 선이 수직이면 0° (바르게 선 자세)", () => {
  const g = geo(NECK, [...V1, P(120, 300), P(120, 200)]);   // ②선 턱 앞 → 이마 앞 (수직 위)
  assert.equal(g.th, 0);
  assert.equal(g.val, 0);
});

test("목: 얼굴 선이 45° 기울면 45°", () => {
  const g = geo(NECK, [...V1, P(100, 300), P(170.71, 229.29)]);
  assert.equal(g.th, 45);
  assert.equal(g.val, 45);
});

test("목: 얼굴 선이 수평이면 90°", () => {
  const g = geo(NECK, [...V1, P(100, 300), P(200, 300)]);
  assert.equal(g.val, 90);
});

test("목: 보조선 방향은 ②선 방향과 같다 (보조선은 ①선 시작점을 지난다)", () => {
  const g = geo(NECK, [...V1, P(100, 300), P(170.71, 229.29)]);
  assert.ok(Math.abs(g.u2.x - 0.7071) < 0.001, "x 방향");
  assert.ok(Math.abs(g.u2.y + 0.7071) < 0.001, "y 방향");
});

test("발목은 전과 같이 직각(90°)이 0° — 기준값이 섞이지 않음", () => {
  const g = geo(ANKLE_D, [P(100, 300), P(100, 100), P(80, 320), P(180, 320)]);
  assert.equal(g.th, 90);
  assert.equal(g.val, 0);
});

test("발목 배측굴곡 20°: 사이각 70° → 90 − 70 = 20", () => {
  const g = geo(ANKLE_D, [P(100, 300), P(100, 100), P(100, 300), P(193.97, 265.8)]);
  assert.equal(g.th, 70);
  assert.equal(g.val, 20);
});

test("점이 모자라면 계산하지 않음 (null)", () => {
  assert.equal(geo(NECK, [P(1, 1), P(1, 0), P(2, 2)]), null);
  assert.equal(geo(NECK, null), null);
});

test("같은 자리를 두 번 찍어 선 길이가 0이면 계산하지 않음", () => {
  assert.equal(geo(NECK, [P(100, 400), P(100, 400), P(50, 50), P(60, 60)]), null);
  assert.equal(geo(NECK, [...V1, P(50, 50), P(50, 50)]), null);
});
