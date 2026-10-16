// v281 기준선(세로·가로)이 각도축을 따라가지 못해 기울어지던 문제
// 어깨 굴곡 좌측: 학습 보정이 어깨 관절(0번 점)만 옆으로 옮기고 ①선 끝점은 두고 가서
// 폰 기울기 보정이 있을 때 ①선이 약 1.2° 기울어졌다.
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

const W = 1440, H = 2560;
const ctx = {
  console,
  rom: { side: "L" },
  ROM_LM: {}, ROM_DERIV: {}, ROM_MID: {},
  romGet: () => null,
  romJoint: () => ({ k: "shoulder", kind: "dir", pts: ["shj", "armend", "vdown"] }),
  romMove: () => ({ k: "flex", normal: 180 }),
  romSd: () => "L",
  romPts: () => ["shj", "armend", "vdown"],
  romS: null,
};
vm.createContext(ctx);
vm.runInContext(grab("  function romRotRef(d, roll){", "  function romAngleOf("), ctx);
vm.runInContext(grab("  var LEARN_ROM = ", "  function romSd(J, mv){"), ctx);
vm.runInContext(grab("  function romSynthA(name, V, D, L, W, H, roll){", "  var rom = { joint:"), ctx);
vm.runInContext(grab("  function romIsLm(n){", "  function romPtsLabel("), ctx);

// 어깨 관절(0) · 손목(1) · 세로 기준선 끝점(2)
const setup = (roll) => {
  const V = { x: 700, y: 760 }, D = { x: 250, y: 600 };
  const A = vm.runInContext("romSynthA", ctx)("vdown", V, D, null, W, H, roll);
  ctx.romS = { pts: [V, D, A], w: W, h: H, roll: roll, L: null, refCustom: null, autoPts: true };
  return { V, D, A };
};
// 화면은 사진을 -roll 만큼 돌려 보여 준다 → 화면에서의 ①선 기울기(수직 기준, 도)
const screenTilt = (roll) => {
  const [V, , A] = ctx.romS.pts;
  const r = -(roll || 0) * Math.PI / 180, c = Math.cos(r), s = Math.sin(r);
  const dx = A.x - V.x, dy = A.y - V.y;
  const rx = dx * c - dy * s, ry = dx * s + dy * c;
  return Math.abs(Math.atan2(rx, ry) * 180 / Math.PI);   // 0 이면 화면에서 정확히 수직
};

test("만들 때는 화면에서 정확히 수직이다 (폰 기울기가 있어도)", () => {
  for (const roll of [0, -0.6, 0.6, 1.5, -2.3]) {
    setup(roll);
    assert.ok(screenTilt(roll) < 0.01, `roll=${roll} 에서 기울기 ${screenTilt(roll)}°`);
  }
});

test("학습 보정이 어깨 관절을 옮겨도 ①선은 화면에서 수직을 지킨다", () => {
  for (const roll of [0, -0.6, 0.6, 1.5, -2.3]) {
    setup(roll);
    vm.runInContext("romLearnAdj()", ctx);
    const t = screenTilt(roll);
    assert.ok(t < 0.05, `roll=${roll} 에서 보정 뒤 ①선이 ${t.toFixed(2)}° 기울어짐 (수직이어야 함)`);
  }
});

test("학습 보정은 어깨 관절을 실제로 옮긴다 (보정이 사라지지 않았는지)", () => {
  setup(-0.6);
  const x0 = ctx.romS.pts[0].x;
  vm.runInContext("romLearnAdj()", ctx);
  assert.ok(Math.abs(ctx.romS.pts[0].x - x0 - (-1.4 / 100 * H)) < 0.01, "0번 점이 사진 높이의 -1.4% 만큼 움직여야 한다");
});

// v281 기준선 끝점을 사용자가 직접 옮겼으면 자동으로 되돌리지 않는다
test("사용자가 기준선 끝점을 옮겼으면(refMoved) 다시 세우지 않는다", () => {
  setup(-0.6);
  ctx.romS.refMoved = true;
  ctx.romS.pts[2] = { x: 900, y: 2400 };   // 사용자가 일부러 비스듬히 둠
  vm.runInContext("romRefReset()", ctx);
  assert.equal(ctx.romS.pts[2].x, 900);
  assert.equal(ctx.romS.pts[2].y, 2400);
});

test("기준선 각도를 직접 돌렸으면(refCustom) 다시 세우지 않는다", () => {
  setup(-0.6);
  ctx.romS.refCustom = { x: 0.3, y: 0.95 };
  ctx.romS.pts[2] = { x: 880, y: 2300 };
  vm.runInContext("romRefReset()", ctx);
  assert.equal(ctx.romS.pts[2].x, 880);
});

test("기준점이 실제 관절이면 건드리지 않는다 (무릎·팔꿈치처럼)", () => {
  setup(-0.6);
  const keep = { x: 400, y: 1200 };
  ctx.romS.pts[2] = keep;
  ctx.ROM_LM.shoulder = 11;                       // 기준점 이름이 랜드마크인 상황
  ctx.romPts = () => ["shj", "armend", "shoulder"];
  vm.runInContext("romRefReset()", ctx);
  assert.equal(ctx.romS.pts[2].x, 400);
  assert.equal(ctx.romS.pts[2].y, 1200);
  delete ctx.ROM_LM.shoulder;
  ctx.romPts = () => ["shj", "armend", "vdown"];
});

test("각도축을 손으로 옮긴 뒤에도 ①선은 화면에서 수직이다", () => {
  for (const roll of [0, -0.6, 1.2]) {
    setup(roll);
    ctx.romS.pts[0] = { x: 640, y: 820 };   // 어깨 관절을 사용자가 끌어 옮김
    vm.runInContext("romRefReset()", ctx);
    const t = screenTilt(roll);
    assert.ok(t < 0.05, `roll=${roll} 에서 ${t.toFixed(2)}° 기울어짐`);
  }
});
